import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Package, AlertCircle, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, Wallet, FileWarning } from "lucide-react";
import { format } from "date-fns";

interface Line { product_id: string; quantity: number; unit_cost: number }
interface BatchEntry { batch_number?: string; expiry_date?: string; mfg_date?: string }
interface ReceiptErrors { batch_number?: string; expiry_date?: string; mfg_date?: string }

// Mock departmental budgets — NFR stub
const DEPT_BUDGET = { allocated: 50000, spent_mtd: 32400, department: "Operations · Q2 2026" };
const APPROVAL_THRESHOLD = 5000;

const POs = () => {
  const { user, hasRole } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: 1, unit_cost: 0 }]);
  const [receiving, setReceiving] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    supabase.from("purchase_orders").select("*, suppliers(name), purchase_order_lines(*, products(sku,name,expiry_trackable,shelf_life_days,sell_by_days))").order("created_at", { ascending: false })
      .then(({ data }) => setPos(data ?? []));
  };
  useEffect(() => {
    load();
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts(data ?? []));
    supabase.from("suppliers").select("*").then(({ data }) => setSuppliers(data ?? []));
  }, []);

  const setLineProduct = (i: number, productId: string) => {
    const p = products.find(p => p.id === productId);
    const c = [...lines];
    c[i].product_id = productId;
    if (p && !c[i].unit_cost) c[i].unit_cost = Number(p.unit_cost);
    setLines(c);
  };

  const supplierProducts = supplierId ? products.filter(p => p.primary_supplier_id === supplierId || !p.primary_supplier_id) : products;
  const total = lines.reduce((a, l) => a + Number(l.quantity) * Number(l.unit_cost), 0);
  const projectedSpent = DEPT_BUDGET.spent_mtd + total;
  const overBudget = projectedSpent > DEPT_BUDGET.allocated;
  const needsApproval = total >= APPROVAL_THRESHOLD;
  const budgetUsedPct = Math.min(100, (DEPT_BUDGET.spent_mtd / DEPT_BUDGET.allocated) * 100);
  const projectedPct = Math.min(100, (projectedSpent / DEPT_BUDGET.allocated) * 100);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lines.some(l => !l.product_id)) return toast.error("Fill all fields");
    if (overBudget) return toast.error("Order exceeds department budget");
    const po_number = `PO-${Date.now()}`;
    const status = needsApproval ? "PENDING_APPROVAL" : "APPROVED";
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      po_number, supplier_id: supplierId, total_amount: total, status,
      expected_date: expected || null, created_by: user?.id, notes: notes || null,
    }).select().single();
    if (error || !po) return toast.error(error?.message);
    const linesPayload = lines.map(l => ({ po_id: po.id, product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }));
    await supabase.from("purchase_order_lines").insert(linesPayload);
    await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "CREATE", new_value: { po_number, total, status, supplier_id: supplierId, lines: lines.length }, user_id: user?.id });
    toast.success(`PO ${po_number} created · ${status.replace("_", " ")}`);
    setOpen(false); setLines([{ product_id: "", quantity: 1, unit_cost: 0 }]); setSupplierId(""); setExpected(""); setNotes(""); load();
  };

  const approve = async (po: any) => {
    const oldVal = { status: po.status };
    await supabase.from("purchase_orders").update({ status: "APPROVED", approved_by: user?.id }).eq("id", po.id);
    await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "APPROVE", old_value: oldVal, new_value: { status: "APPROVED", approved_by: user?.id, total: po.total_amount }, user_id: user?.id });
    toast.success(`${po.po_number} approved`); load();
  };

  const reject = async () => {
    if (!rejecting) return;
    const oldVal = { status: rejecting.status };
    await supabase.from("purchase_orders").update({ status: "CANCELLED" }).eq("id", rejecting.id);
    await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: rejecting.id, action: "REJECT", old_value: oldVal, new_value: { status: "CANCELLED", reason: rejectReason }, user_id: user?.id });
    toast.success(`${rejecting.po_number} rejected`);
    setRejecting(null); setRejectReason(""); load();
  };

  const receive = async (po: any, batches: Record<string, BatchEntry>) => {
    for (const line of po.purchase_order_lines) {
      const b = batches[line.id];
      await supabase.from("inventory_batches").insert({
        product_id: line.product_id,
        batch_number: b!.batch_number!,
        manufacturing_date: b?.mfg_date || null,
        expiry_date: b?.expiry_date || null,
        quantity_available: line.quantity,
        unit_cost_at_receipt: line.unit_cost,
        status: "AVAILABLE",
      });
      await supabase.from("audit_log").insert({ entity_type: "inventory_batch", action: "RECEIVE", new_value: { batch: b!.batch_number, qty: line.quantity, expiry: b?.expiry_date }, user_id: user?.id });
    }
    await supabase.from("purchase_orders").update({ status: "RECEIVED", received_date: new Date().toISOString().slice(0, 10) }).eq("id", po.id);
    toast.success(`Goods received for ${po.po_number}`);
    setReceiving(null); load();
  };

  const pendingApprovals = pos.filter(p => p.status === "PENDING_APPROVAL");
  const activeOrders = pos.filter(p => p.status !== "PENDING_APPROVAL");

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Create POs with budget checks, approve high-value orders, and capture batch info on goods receipt."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md hover:shadow-lg transition-shadow">
                <Plus className="h-4 w-4 mr-2" />New PO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create purchase order</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Supplier *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Expected Date</Label><Input type="date" value={expected} onChange={e => setExpected(e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Line items</Label>
                  {lines.map((l, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select value={l.product_id} onValueChange={v => setLineProduct(i, v)}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Product (auto-fills cost)" /></SelectTrigger>
                        <SelectContent>{supplierProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" placeholder="Qty" className="w-24" value={l.quantity} onChange={e => { const c = [...lines]; c[i].quantity = Number(e.target.value); setLines(c); }} />
                      <Input type="number" step="0.01" placeholder="Unit cost" className="w-28" value={l.unit_cost} onChange={e => { const c = [...lines]; c[i].unit_cost = Number(e.target.value); setLines(c); }} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { product_id: "", quantity: 1, unit_cost: 0 }])}><Plus className="h-4 w-4 mr-1" />Add line</Button>
                </div>

                <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" /></div>

                <BudgetCheckPanel total={total} overBudget={overBudget} needsApproval={needsApproval} projectedSpent={projectedSpent} budgetUsedPct={budgetUsedPct} projectedPct={projectedPct} />

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">PO Total</span>
                  <span className="text-2xl font-bold tabular-nums">${total.toFixed(2)}</span>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={overBudget || total === 0}>Submit PO</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="approvals" className="animate-fade-in">
        <TabsList className="mb-4">
          <TabsTrigger value="approvals" className="relative">
            Approvals
            {pendingApprovals.length > 0 && (
              <Badge className="ml-2 bg-warning text-warning-foreground h-5 px-1.5">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Orders ({activeOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-4">
          <Card className="page-section p-5">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "var(--gradient-primary)" }}>
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{DEPT_BUDGET.department}</h3>
                <p className="text-xs text-muted-foreground mb-3">Department spending budget · refreshed monthly</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><div className="text-muted-foreground text-xs">Allocated</div><div className="font-bold tabular-nums">${DEPT_BUDGET.allocated.toLocaleString()}</div></div>
                  <div><div className="text-muted-foreground text-xs">Spent MTD</div><div className="font-bold tabular-nums">${DEPT_BUDGET.spent_mtd.toLocaleString()}</div></div>
                  <div><div className="text-muted-foreground text-xs">Remaining</div><div className="font-bold tabular-nums text-success">${(DEPT_BUDGET.allocated - DEPT_BUDGET.spent_mtd).toLocaleString()}</div></div>
                </div>
                <div className="h-2 mt-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${budgetUsedPct}%`, background: "var(--gradient-primary)" }} />
                </div>
              </div>
            </div>
          </Card>

          {pendingApprovals.length === 0 ? (
            <Card className="page-section p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All POs are up to date — no orders awaiting approval.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(po => {
                const wouldExceed = (DEPT_BUDGET.spent_mtd + Number(po.total_amount)) > DEPT_BUDGET.allocated;
                return (
                  <Card key={po.id} className="page-section p-5 hover-lift">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold">{po.po_number}</span>
                          <Badge className="bg-warning/15 text-warning-foreground border-warning/30">Pending Approval</Badge>
                          {wouldExceed && <Badge className="bg-destructive/15 text-destructive border-destructive/30"><FileWarning className="h-3 w-3 mr-1" />Over budget</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {po.suppliers?.name} · {po.purchase_order_lines.length} line items · expected {po.expected_date ? format(new Date(po.expected_date), "PP") : "—"}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div><div className="text-muted-foreground">Order Value</div><div className="text-lg font-bold tabular-nums">${Number(po.total_amount).toFixed(2)}</div></div>
                          <div><div className="text-muted-foreground">Threshold</div><div className="text-lg font-bold tabular-nums text-muted-foreground">${APPROVAL_THRESHOLD}</div></div>
                          <div><div className="text-muted-foreground">Budget After</div><div className={`text-lg font-bold tabular-nums ${wouldExceed ? "text-destructive" : "text-success"}`}>${(DEPT_BUDGET.spent_mtd + Number(po.total_amount)).toLocaleString()}</div></div>
                        </div>
                        {po.notes && <p className="text-xs italic text-muted-foreground mt-3 p-2 bg-muted/40 rounded">{po.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {hasRole("cfo") || hasRole("system_admin") ? (
                          <>
                            <Button size="sm" onClick={() => approve(po)} disabled={wouldExceed} className="bg-success hover:bg-success/90 text-success-foreground">
                              <ThumbsUp className="h-4 w-4 mr-1.5" />Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRejecting(po)} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                              <ThumbsDown className="h-4 w-4 mr-1.5" />Reject
                            </Button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">CFO approval required</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          <Card className="page-section">
            <Table>
              <TableHeader>
                <TableRow><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Expected</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {activeOrders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No purchase orders yet.</TableCell></TableRow>}
                {activeOrders.map(po => (
                  <TableRow key={po.id} className="table-row-hover">
                    <TableCell className="font-mono text-xs font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.suppliers?.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.expected_date ? format(new Date(po.expected_date), "PP") : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">${Number(po.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`pill ${
                        po.status === "RECEIVED" ? "bg-success/10 text-success border-success/30" :
                        po.status === "APPROVED" ? "bg-primary/10 text-primary border-primary/30" :
                        po.status === "CANCELLED" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        "bg-muted text-muted-foreground border-border"
                      }`}>{po.status.replace("_", " ")}</span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {po.status === "APPROVED" && (
                        <Button size="sm" variant="outline" onClick={() => setReceiving(po)}><Package className="h-4 w-4 mr-1" />Receive</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceiveDialog po={receiving} onClose={() => setReceiving(null)} onReceive={receive} />

      <Dialog open={!!rejecting} onOpenChange={() => { setRejecting(null); setRejectReason(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject {rejecting?.po_number}?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This will cancel the purchase order. Provide a reason for the audit log.</p>
            <div><Label>Reason *</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Duplicate order, supplier issue…" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={!rejectReason.trim()}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const BudgetCheckPanel = ({ total, overBudget, needsApproval, projectedSpent, budgetUsedPct, projectedPct }: any) => (
  <Card className={`p-4 border-2 ${overBudget ? "border-destructive bg-destructive/5" : needsApproval ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5"}`}>
    <div className="flex items-start gap-3">
      {overBudget ? <AlertCircle className="h-5 w-5 text-destructive shrink-0" /> : needsApproval ? <AlertCircle className="h-5 w-5 text-warning shrink-0" /> : <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
      <div className="flex-1 text-sm">
        <div className="font-semibold mb-2">Department Budget Check</div>
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          <div><div className="text-muted-foreground">Allocated</div><div className="tabular-nums font-medium">${DEPT_BUDGET.allocated.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">Spent MTD</div><div className="tabular-nums font-medium">${DEPT_BUDGET.spent_mtd.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">After this PO</div><div className={`tabular-nums font-bold ${overBudget ? "text-destructive" : "text-success"}`}>${projectedSpent.toLocaleString()}</div></div>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${budgetUsedPct}%`, background: "hsl(var(--muted-foreground) / 0.5)" }} />
          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${projectedPct}%`, background: overBudget ? "hsl(var(--destructive))" : "var(--gradient-primary)", opacity: 0.85 }} />
        </div>
        {needsApproval && !overBudget && <div className="text-xs mt-2 text-warning-foreground/80">⚠ Order ≥ ${APPROVAL_THRESHOLD.toLocaleString()} → routed to CFO for approval before receiving.</div>}
        {overBudget && <div className="text-xs mt-2 text-destructive font-medium">✕ Submission blocked: exceeds department budget by ${(projectedSpent - DEPT_BUDGET.allocated).toLocaleString()}.</div>}
      </div>
    </div>
  </Card>
);

const ReceiveDialog = ({ po, onClose, onReceive }: any) => {
  const [batches, setBatches] = useState<Record<string, BatchEntry>>({});
  const [errors, setErrors] = useState<Record<string, ReceiptErrors>>({});
  const [touched, setTouched] = useState(false);

  if (!po) return null;
  const today = new Date().toISOString().slice(0, 10);

  const validateLine = (lineId: string, isExp: boolean, b: BatchEntry): ReceiptErrors => {
    const e: ReceiptErrors = {};
    if (!b.batch_number?.trim()) e.batch_number = "Batch number is required";
    else if (b.batch_number.length < 3) e.batch_number = "Min 3 characters";
    if (isExp) {
      if (!b.expiry_date) e.expiry_date = "Expiry date is required for expiry-tracked items";
      else if (b.expiry_date <= today) e.expiry_date = "Expiry must be in the future";
    }
    if (b.mfg_date && b.expiry_date && b.mfg_date >= b.expiry_date) e.mfg_date = "Mfg date must be before expiry";
    if (b.mfg_date && b.mfg_date > today) e.mfg_date = "Mfg date cannot be in the future";
    return e;
  };

  const updateBatch = (lineId: string, field: keyof BatchEntry, value: string, isExp: boolean) => {
    const next = { ...batches, [lineId]: { ...batches[lineId], [field]: value } };
    setBatches(next);
    if (touched) setErrors({ ...errors, [lineId]: validateLine(lineId, isExp, next[lineId]) });
  };

  const submit = () => {
    setTouched(true);
    const allErrors: Record<string, ReceiptErrors> = {};
    let hasErrors = false;
    for (const line of po.purchase_order_lines) {
      const e = validateLine(line.id, line.products.expiry_trackable, batches[line.id] || {});
      if (Object.keys(e).length) { allErrors[line.id] = e; hasErrors = true; }
    }
    setErrors(allErrors);
    if (hasErrors) return toast.error("Please fix the validation errors before submitting");
    onReceive(po, batches);
  };

  const expCount = po.purchase_order_lines.filter((l: any) => l.products.expiry_trackable).length;

  return (
    <Dialog open={!!po} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive {po.po_number}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Capture batch number and expiry data per line item. {expCount > 0 && <span className="text-primary font-medium">{expCount} expiry-tracked line{expCount > 1 ? "s" : ""}</span>} require valid batch and expiry data.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          {po.purchase_order_lines.map((l: any) => {
            const isExp = l.products.expiry_trackable;
            const b = batches[l.id] || {};
            const e = errors[l.id] || {};
            return (
              <Card key={l.id} className={`p-4 transition-all ${isExp ? "border-l-4 border-l-primary" : ""} ${Object.keys(e).length ? "border-destructive/40 bg-destructive/5" : ""}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium">{l.products.name} <span className="text-muted-foreground font-mono text-xs ml-2">{l.products.sku}</span></div>
                    <div className="text-sm text-muted-foreground">Qty: {l.quantity} @ ${Number(l.unit_cost).toFixed(2)}</div>
                  </div>
                  {isExp && <Badge className="bg-primary/10 text-primary border-primary/30">Expiry Tracked</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Batch # <span className="text-destructive">*</span></Label>
                    <Input
                      value={b.batch_number || ""}
                      onChange={ev => updateBatch(l.id, "batch_number", ev.target.value, isExp)}
                      placeholder="e.g. B20260501"
                      className={e.batch_number ? "border-destructive" : ""}
                      aria-invalid={!!e.batch_number}
                    />
                    {e.batch_number && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" />{e.batch_number}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Mfg date</Label>
                    <Input
                      type="date" max={today}
                      value={b.mfg_date || ""}
                      onChange={ev => updateBatch(l.id, "mfg_date", ev.target.value, isExp)}
                      className={e.mfg_date ? "border-destructive" : ""}
                    />
                    {e.mfg_date && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" />{e.mfg_date}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Expiry {isExp && <span className="text-destructive">*</span>}</Label>
                    <Input
                      type="date" min={today}
                      value={b.expiry_date || ""}
                      onChange={ev => updateBatch(l.id, "expiry_date", ev.target.value, isExp)}
                      className={e.expiry_date ? "border-destructive" : ""}
                      aria-invalid={!!e.expiry_date}
                    />
                    {e.expiry_date && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" />{e.expiry_date}</p>}
                  </div>
                </div>
                {isExp && b.expiry_date && !e.expiry_date && l.products.sell_by_days && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Sell-by window: {l.products.sell_by_days} days before expiry
                  </p>
                )}
              </Card>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Confirm Receipt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default POs;
