import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseFefoError } from "@/lib/fefoErrors";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ShoppingBag, Plus, Trash2, AlertTriangle, Package, Clock, Settings2, ShieldCheck, Check, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { useAuth } from "@/hooks/useAuth";

type SaleStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED" | "POSTED";

interface CartLine {
  product_id: string;
  qty: number;
  allocations: { batch_id: string; batch_number: string; expiry_date: string | null; qty: number; unit_price: number }[];
  insufficient?: number;
  blockedReason?: string;
}

const statusBadge = (s: SaleStatus) => {
  const map: Record<SaleStatus, string> = {
    NOT_REQUIRED: "border-muted text-muted-foreground",
    PENDING: "border-warning/40 text-warning",
    APPROVED: "border-info/40 text-info",
    REJECTED: "border-destructive/40 text-destructive",
    POSTED: "border-success/40 text-success",
  };
  return map[s] ?? "border-muted text-muted-foreground";
};

const computeStatus = (tx: any): SaleStatus => {
  if (tx.approval_status === "REJECTED") return "REJECTED";
  if (tx.approval_status === "PENDING") return "PENDING";
  // NOT_REQUIRED or APPROVED → posted iff items exist (sales_items length > 0) OR posted_at set
  if (tx.posted_at || (tx.sales_items && tx.sales_items.length > 0)) return "POSTED";
  if (tx.approval_status === "APPROVED") return "APPROVED";
  return "NOT_REQUIRED";
};

const Sales = () => {
  const { user, hasRole } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});

  const [settings, setSettings] = useState<{ id: string; sell_by_buffer_days: number; sales_approval_threshold: number } | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID" | "PARTIAL" | "REFUNDED">("PENDING");
  const [notes, setNotes] = useState("");

  const canApprove = hasRole("system_admin") || hasRole("cfo");
  const canManageSettings = canApprove;

  const [submitting, setSubmitting] = useState<null | "post" | "approve-now">(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const reload = async () => {
    const [{ data: p }, { data: b }, { data: s }, { data: tx }, { data: st }] = await Promise.all([
      supabase.from("products").select("*").eq("active", true),
      supabase.from("inventory_batches").select("*").eq("status", "AVAILABLE").gt("quantity_available", 0),
      supabase.from("stores").select("*"),
      supabase.from("sales_transactions").select("*, sales_items(id, quantity, unit_price, products(name,sku), inventory_batches(batch_number,expiry_date))").order("occurred_at", { ascending: false }).limit(100),
      supabase.from("app_settings").select("*").limit(1).maybeSingle(),
    ]);
    setProducts(p ?? []); setBatches(b ?? []); setStores(s ?? []); setRecent(tx ?? []);
    if (!storeId && s?.[0]) setStoreId(s[0].id);
    if (st) setSettings(st as any);

    // Resolve approver/poster names
    const ids = Array.from(new Set((tx ?? []).flatMap((t: any) => [t.approved_by, t.posted_by]).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((pr: any) => { map[pr.id] = pr.full_name || pr.email || pr.id; });
      setProfilesById(map);
    }
  };
  useEffect(() => { reload(); }, []);

  const today = new Date();
  const sellByBuffer = settings?.sell_by_buffer_days ?? 0;
  const approvalThreshold = settings?.sales_approval_threshold ?? 5000;

  const allocateFEFO = (productId: string, qty: number, freshBatches?: any[]): CartLine => {
    const product = products.find(p => p.id === productId);
    const productBuffer = product?.sell_by_days ?? 0;
    const effectiveBuffer = Math.max(sellByBuffer, productBuffer);
    const src = freshBatches ?? batches;
    const candidates = src
      .filter(b => b.product_id === productId && (!storeId || !b.store_id || b.store_id === storeId))
      .map(b => {
        const expiry = b.expiry_date ? new Date(b.expiry_date) : null;
        const daysToExpiry = expiry ? differenceInDays(expiry, today) : Infinity;
        const expired = expiry && expiry < today;
        const withinSellByBuffer = expiry && daysToExpiry < effectiveBuffer;
        return { ...b, _daysToExpiry: daysToExpiry, _blocked: expired || withinSellByBuffer, _expired: expired };
      })
      .sort((a, b) => a._daysToExpiry - b._daysToExpiry);

    const allocations: CartLine["allocations"] = [];
    let remaining = qty;
    let blockedReason: string | undefined;
    for (const b of candidates) {
      if (remaining <= 0) break;
      if (b._blocked) {
        if (!blockedReason) blockedReason = b._expired
          ? `Skipped expired batch ${b.batch_number} (${b.expiry_date})`
          : `Skipped batch ${b.batch_number} — within sell-by buffer (${effectiveBuffer}d)`;
        continue;
      }
      const take = Math.min(remaining, Number(b.quantity_available));
      allocations.push({
        batch_id: b.id, batch_number: b.batch_number, expiry_date: b.expiry_date,
        qty: take, unit_price: Number(product?.current_sales_price ?? product?.default_sales_price ?? 0),
      });
      remaining -= take;
    }
    return { product_id: productId, qty, allocations, insufficient: remaining > 0 ? remaining : undefined, blockedReason };
  };

  const addToCart = (productId: string, qty: number) => {
    if (!productId || qty <= 0) return;
    setCart(c => [...c, allocateFEFO(productId, qty)]);
  };
  const removeLine = (i: number) => setCart(c => c.filter((_, j) => j !== i));

  const cartTotal = useMemo(() =>
    cart.reduce((s, l) => s + l.allocations.reduce((ss, a) => ss + a.qty * a.unit_price, 0), 0),
  [cart]);
  const hasBlockers = cart.some(l => l.insufficient || l.allocations.length === 0);
  const requiresApproval = cartTotal >= approvalThreshold;

  const resetForm = () => {
    setCart([]); setCustomerName(""); setCustomerEmail(""); setInvoiceNumber("");
    setPaymentStatus("PENDING"); setNotes("");
  };

  /** Insert sales_items for a tx; returns true on success. */
  const postItems = async (txId: string, lines: CartLine[]) => {
    const items = lines.flatMap(l => l.allocations.map(a => ({
      transaction_id: txId, product_id: l.product_id, batch_id: a.batch_id,
      quantity: a.qty, unit_price: a.unit_price, discount_applied: 0, tax_amount: 0,
    })));
    if (!items.length) return { ok: false, error: "No items to post" };
    const { error } = await supabase.from("sales_items").insert(items);
    if (error) {
      const p = parseFefoError(error.message);
      return { ok: false, error: `${p.title}: ${p.detail}` };
    }
    return { ok: true as const };
  };

  const submitSale = async (autoApprove: boolean) => {
    if (submitting) return;
    if (!cart.length) return toast.error("Cart is empty");
    if (hasBlockers) return toast.error("Resolve insufficient stock or expiry blocks before posting");
    setSubmitting(autoApprove ? "approve-now" : "post");
    try {

    const willPostNow = !requiresApproval || (autoApprove && canApprove);
    const approvalStatus = requiresApproval ? (willPostNow ? "APPROVED" : "PENDING") : "NOT_REQUIRED";

    const txCode = `SO-${Date.now()}`;
    const { data: tx, error } = await supabase.from("sales_transactions").insert({
      transaction_id: txCode, store_id: storeId || null, total_amount: cartTotal,
      customer_name: customerName || null, customer_email: customerEmail || null,
      invoice_number: invoiceNumber || null, payment_status: paymentStatus,
      approval_status: approvalStatus,
      approved_by: willPostNow && requiresApproval ? user?.id : null,
      approved_at: willPostNow && requiresApproval ? new Date().toISOString() : null,
      notes: notes || null,
      pending_cart: willPostNow ? null : (cart as any),
    } as any).select().single();
    if (error || !tx) { toast.error(error?.message || "Failed to create sale"); return; }

    if (willPostNow) {
      const r = await postItems(tx.id, cart);
      if (!r.ok) {
        await supabase.from("sales_transactions").delete().eq("id", tx.id);
        toast.error(`Sale blocked: ${r.error}`); return;
      }
      await supabase.from("sales_transactions").update({
        posted_at: new Date().toISOString(), posted_by: user?.id,
      } as any).eq("id", tx.id);
    }

    await supabase.from("audit_log").insert({
      entity_type: "sales_transaction", entity_id: tx.id,
      action: willPostNow ? "SALE_POSTED" : "SALE_PENDING_APPROVAL",
      new_value: {
        transaction_id: txCode, total: cartTotal, customer: customerName,
        invoice: invoiceNumber, payment_status: paymentStatus, approval_status: approvalStatus,
      }, user_id: user?.id,
    });

    toast.success(willPostNow
      ? `Sale ${txCode} posted · $${cartTotal.toFixed(2)}`
      : `Sale ${txCode} submitted — awaiting approval`);
    resetForm(); setOpen(false); reload();
    } finally {
      setSubmitting(null);
    }
  };

  const approveSale = async (tx: any) => {
    if (!canApprove) return toast.error("You cannot approve sales");
    if (tx.approval_status !== "PENDING") return;
    if (approvingId || rejectingId) return;
    const pending = (tx.pending_cart ?? []) as CartLine[];
    if (!pending.length) return toast.error("No pending cart attached to this sale");
    setApprovingId(tx.id);
    try {
      const { data: fresh } = await supabase.from("inventory_batches")
        .select("*").eq("status", "AVAILABLE").gt("quantity_available", 0);
      const reallocated = pending.map((l: CartLine) => allocateFEFO(l.product_id, l.qty, fresh ?? []));
      if (reallocated.some(l => l.insufficient || !l.allocations.length)) {
        toast.error("Insufficient stock or expiry blocks at approval time. Reject and recreate."); return;
      }
      const r = await postItems(tx.id, reallocated);
      if (!r.ok) { toast.error(`Posting failed: ${r.error}`); return; }
      const now = new Date().toISOString();
      await supabase.from("sales_transactions").update({
        approval_status: "APPROVED", approved_by: user?.id, approved_at: now,
        posted_at: now, posted_by: user?.id, pending_cart: null,
      } as any).eq("id", tx.id);
      await supabase.from("audit_log").insert({
        entity_type: "sales_transaction", entity_id: tx.id, action: "SALE_APPROVED_AND_POSTED",
        new_value: { transaction_id: tx.transaction_id, total: tx.total_amount }, user_id: user?.id,
      });
      toast.success(`Approved & posted ${tx.transaction_id}`);
      reload();
    } finally {
      setApprovingId(null);
    }
  };

  const rejectSale = async (tx: any) => {
    if (!canApprove) return;
    if (approvingId || rejectingId) return;
    setRejectingId(tx.id);
    try {
      const { error } = await supabase.from("sales_transactions").update({
        approval_status: "REJECTED", approved_by: user?.id, approved_at: new Date().toISOString(),
        pending_cart: null,
      } as any).eq("id", tx.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from("audit_log").insert({
        entity_type: "sales_transaction", entity_id: tx.id, action: "SALE_REJECTED",
        new_value: { transaction_id: tx.transaction_id }, user_id: user?.id,
      });
      toast.success(`Rejected ${tx.transaction_id}`);
      reload();
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <TooltipProvider>
      <PageHeader
        title="Sales / POS"
        description={`FEFO allocator with ${sellByBuffer}-day sell-by buffer · approval required ≥ $${approvalThreshold.toLocaleString()}`}
        actions={
          <div className="flex gap-2">
            {canManageSettings && (
              <Button variant="outline" asChild>
                <Link to="/sales-settings"><Settings2 className="h-4 w-4 mr-2" />Settings</Link>
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><ShoppingBag className="h-4 w-4 mr-2" />New Sale</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New Sale</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Store</Label>
                      <Select value={storeId} onValueChange={setStoreId}>
                        <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                        <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Invoice Number</Label>
                      <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-2026-0001" />
                    </div>
                    <div>
                      <Label>Customer Name</Label>
                      <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Acme Co." />
                    </div>
                    <div>
                      <Label>Customer Email</Label>
                      <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="ap@acme.co" />
                    </div>
                    <div>
                      <Label>Payment Status</Label>
                      <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="PAID">Paid</SelectItem>
                          <SelectItem value="PARTIAL">Partial</SelectItem>
                          <SelectItem value="REFUNDED">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>

                  <AddLine products={products} onAdd={addToCart} />

                  <div className="space-y-2">
                    {cart.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Cart is empty.</Card>}
                    {cart.map((l, i) => {
                      const product = products.find(p => p.id === l.product_id);
                      const lineTotal = l.allocations.reduce((s, a) => s + a.qty * a.unit_price, 0);
                      return (
                        <Card key={i} className={`p-3 ${l.insufficient ? "border-destructive/40 bg-destructive/5" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                {product?.name} <span className="text-muted-foreground font-mono text-xs">{product?.sku}</span>
                                <Badge variant="outline">Qty {l.qty}</Badge>
                              </div>
                              <div className="mt-2 space-y-1">
                                {l.allocations.map((a, ai) => {
                                  const days = a.expiry_date ? differenceInDays(new Date(a.expiry_date), today) : null;
                                  return (
                                    <div key={ai} className="text-xs flex items-center gap-2 pl-6">
                                      <Badge className="bg-success/10 text-success border-success/30 font-mono">{a.batch_number}</Badge>
                                      <span className="text-muted-foreground">×{a.qty} @ ${a.unit_price.toFixed(2)}</span>
                                      {a.expiry_date && (
                                        <span className={`text-[11px] flex items-center gap-1 ${days !== null && days <= 7 ? "text-warning" : "text-muted-foreground"}`}>
                                          <Clock className="h-3 w-3" />exp {a.expiry_date} ({days}d)
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {l.insufficient && (
                                  <div className="text-xs text-destructive flex items-center gap-1 pl-6">
                                    <AlertTriangle className="h-3 w-3" />Insufficient stock — {l.insufficient} unit(s) unallocated.
                                  </div>
                                )}
                                {l.blockedReason && (
                                  <div className="text-[11px] text-warning pl-6 italic">{l.blockedReason}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold tabular-nums">${lineTotal.toFixed(2)}</div>
                              <Button size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="text-sm">
                      {requiresApproval && (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          <ShieldCheck className="h-3 w-3 mr-1" />Approval required (≥ ${approvalThreshold.toLocaleString()})
                        </Badge>
                      )}
                    </div>
                    <span className="text-2xl font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={!!submitting}>Cancel</Button>
                  {requiresApproval && canApprove && (
                    <Button variant="secondary" onClick={() => submitSale(true)}
                      disabled={hasBlockers || cart.length === 0 || !!submitting}>
                      {submitting === "approve-now"
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Posting…</>
                        : "Approve & Post"}
                    </Button>
                  )}
                  <Button onClick={() => submitSale(false)}
                    disabled={hasBlockers || cart.length === 0 || !!submitting}>
                    {submitting === "post"
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{requiresApproval ? "Submitting…" : "Posting…"}</>
                      : (requiresApproval ? "Submit for Approval" : "Post Sale")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <DataTable
        rows={recent as any[]}
        rowKey={(r: any) => r.id}
        exportFilename="sales"
        createdAtKey="occurred_at"
        tableId="sales"
        columns={[
          { key: "tx", header: "Transaction", accessor: (r: any) => r.transaction_id, sortable: true, cell: (r: any) => <Link to={`/sales/${r.id}`} className="font-mono text-xs font-medium text-primary hover:underline">{r.transaction_id}</Link> },
          { key: "invoice", header: "Invoice", accessor: (r: any) => r.invoice_number ?? "", cell: (r: any) => <span className="text-xs">{r.invoice_number || "—"}</span> },
          { key: "customer", header: "Customer", accessor: (r: any) => r.customer_name ?? "", cell: (r: any) => <span className="text-xs">{r.customer_name || "—"}</span> },
          { key: "when", header: "Occurred", accessor: (r: any) => r.occurred_at, sortable: true, filter: "date", cell: (r: any) => format(new Date(r.occurred_at), "PPp") },
          { key: "items", header: "Lines", accessor: (r: any) => r.sales_items?.length ?? 0, align: "right" },
          {
            key: "payment", header: "Payment", accessor: (r: any) => r.payment_status, filter: "select",
            options: ["PENDING", "PAID", "PARTIAL", "REFUNDED"],
            cell: (r: any) => <Badge variant="outline" className={
              r.payment_status === "PAID" ? "border-success/40 text-success" :
              r.payment_status === "REFUNDED" ? "border-destructive/40 text-destructive" :
              "border-warning/40 text-warning"
            }>{r.payment_status}</Badge>,
          },
          {
            key: "status", header: "Status", accessor: (r: any) => computeStatus(r), filter: "select",
            options: ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED", "POSTED"],
            cell: (r: any) => {
              const s = computeStatus(r);
              const approver = r.approved_by ? profilesById[r.approved_by] : null;
              const poster = r.posted_by ? profilesById[r.posted_by] : null;
              const tooltip = (
                <div className="text-xs space-y-0.5">
                  <div>Status: <b>{s}</b></div>
                  {r.approved_at && <div>Approved: {format(new Date(r.approved_at), "PPp")}{approver ? ` by ${approver}` : ""}</div>}
                  {r.posted_at && <div>Posted: {format(new Date(r.posted_at), "PPp")}{poster ? ` by ${poster}` : ""}</div>}
                  {!r.approved_at && !r.posted_at && <div className="text-muted-foreground">No state changes yet</div>}
                </div>
              );
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`${statusBadge(s)} cursor-help`}>{s}</Badge>
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              );
            },
          },
          {
            key: "approver", header: "Approver", accessor: (r: any) => r.approved_by ? (profilesById[r.approved_by] ?? "—") : "",
            cell: (r: any) => r.approved_by ? <span className="text-xs">{profilesById[r.approved_by] ?? r.approved_by.slice(0, 8)}</span> : <span className="text-muted-foreground">—</span>,
          },
          { key: "total", header: "Total", accessor: (r: any) => Number(r.total_amount), sortable: true, align: "right", cell: (r: any) => <span className="tabular-nums font-semibold">${Number(r.total_amount).toFixed(2)}</span> },
          {
            key: "actions", header: "", accessor: () => "", exportable: false,
            cell: (r: any) => r.approval_status === "PENDING" && canApprove ? (
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="outline" onClick={() => approveSale(r)}
                  disabled={approvingId === r.id || rejectingId === r.id} title="Approve & post">
                  {approvingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectSale(r)}
                  disabled={approvingId === r.id || rejectingId === r.id} title="Reject">
                  {rejectingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </Button>
              </div>
            ) : null,
            align: "right",
          },
        ]}
        emptyMessage="No sales recorded yet."
      />
    </TooltipProvider>
  );
};

const AddLine = ({ products, onAdd }: { products: any[]; onAdd: (id: string, qty: number) => void }) => {
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState(1);
  return (
    <Card className="p-3 bg-muted/30">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Product</Label>
          <Select value={pid} onValueChange={setPid}>
            <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
            <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-24">
          <Label className="text-xs">Qty</Label>
          <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
        </div>
        <Button type="button" onClick={() => { onAdd(pid, qty); setPid(""); setQty(1); }} disabled={!pid || qty <= 0}>
          <Plus className="h-4 w-4 mr-1" />Add
        </Button>
      </div>
    </Card>
  );
};

export default Sales;
