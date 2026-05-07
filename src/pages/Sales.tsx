import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingBag, Plus, Trash2, AlertTriangle, Package, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { useAuth } from "@/hooks/useAuth";

interface CartLine {
  product_id: string;
  qty: number;
  /** FEFO allocations: which batches and how much from each */
  allocations: { batch_id: string; batch_number: string; expiry_date: string | null; qty: number; unit_price: number }[];
  insufficient?: number; // qty that couldn't be allocated
  blockedReason?: string;
}

const SELL_BY_BUFFER_DEFAULT = 0; // additional days before expiry where sale is blocked

const Sales = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  const reload = async () => {
    const [{ data: p }, { data: b }, { data: s }, { data: tx }] = await Promise.all([
      supabase.from("products").select("*").eq("active", true),
      supabase.from("inventory_batches").select("*").eq("status", "AVAILABLE").gt("quantity_available", 0),
      supabase.from("stores").select("*"),
      supabase.from("sales_transactions").select("*, sales_items(*, products(name,sku), inventory_batches(batch_number,expiry_date))").order("occurred_at", { ascending: false }).limit(50),
    ]);
    setProducts(p ?? []); setBatches(b ?? []); setStores(s ?? []); setRecent(tx ?? []);
    if (!storeId && s?.[0]) setStoreId(s[0].id);
  };
  useEffect(() => { reload(); }, []);

  const today = new Date();

  /** FEFO allocator: sorted by soonest expiry, blocks expired/sell-by-window batches. */
  const allocateFEFO = (productId: string, qty: number): CartLine => {
    const product = products.find(p => p.id === productId);
    const sellByBuffer = product?.sell_by_days ?? SELL_BY_BUFFER_DEFAULT;
    const candidates = batches
      .filter(b => b.product_id === productId && (!storeId || !b.store_id || b.store_id === storeId))
      .map(b => {
        const expiry = b.expiry_date ? new Date(b.expiry_date) : null;
        const daysToExpiry = expiry ? differenceInDays(expiry, today) : Infinity;
        const expired = expiry && expiry < today;
        const withinSellByBuffer = expiry && daysToExpiry < sellByBuffer;
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
          : `Skipped batch ${b.batch_number} — within sell-by buffer (${sellByBuffer}d)`;
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
    const line = allocateFEFO(productId, qty);
    setCart(c => [...c, line]);
  };

  const removeLine = (i: number) => setCart(c => c.filter((_, j) => j !== i));

  const cartTotal = useMemo(() =>
    cart.reduce((s, l) => s + l.allocations.reduce((ss, a) => ss + a.qty * a.unit_price, 0), 0),
  [cart]);

  const hasBlockers = cart.some(l => l.insufficient || l.allocations.length === 0);

  const checkout = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (hasBlockers) return toast.error("Resolve insufficient stock or expiry blocks before checkout");

    const txCode = `SO-${Date.now()}`;
    const { data: tx, error } = await supabase.from("sales_transactions").insert({
      transaction_id: txCode, store_id: storeId || null, total_amount: cartTotal,
    }).select().single();
    if (error || !tx) return toast.error(error?.message || "Failed to create sale");

    // Insert each allocation as a sales_item — DB trigger enforces FEFO/expiry and decrements batch.
    const items = cart.flatMap(l => l.allocations.map(a => ({
      transaction_id: tx.id, product_id: l.product_id, batch_id: a.batch_id,
      quantity: a.qty, unit_price: a.unit_price, discount_applied: 0, tax_amount: 0,
    })));
    const { error: itErr } = await supabase.from("sales_items").insert(items);
    if (itErr) {
      // Roll back the parent transaction since items failed (DB blocked the sale)
      await supabase.from("sales_transactions").delete().eq("id", tx.id);
      return toast.error(`Sale blocked: ${itErr.message}`);
    }
    await supabase.from("audit_log").insert({
      entity_type: "sales_transaction", entity_id: tx.id, action: "SALE",
      new_value: { transaction_id: txCode, total: cartTotal, lines: items.length, store_id: storeId },
      user_id: user?.id,
    });
    toast.success(`Sale ${txCode} posted · $${cartTotal.toFixed(2)}`);
    setCart([]); setOpen(false); reload();
  };

  return (
    <>
      <PageHeader
        title="Sales / POS"
        description="Record sales with automatic FEFO batch allocation. Expired and sell-by-blocked batches are refused at the database level."
        actions={
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
                  <span className="text-muted-foreground text-sm">Total</span>
                  <span className="text-2xl font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={checkout} disabled={hasBlockers || cart.length === 0}>
                  Checkout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        rows={recent as any[]}
        rowKey={(r: any) => r.id}
        exportFilename="sales"
        createdAtKey="occurred_at"
        columns={[
          { key: "tx", header: "Transaction", accessor: (r: any) => r.transaction_id, sortable: true, cell: (r: any) => <span className="font-mono text-xs font-medium">{r.transaction_id}</span> },
          { key: "when", header: "Occurred", accessor: (r: any) => r.occurred_at, sortable: true, cell: (r: any) => format(new Date(r.occurred_at), "PPp") },
          { key: "items", header: "Lines", accessor: (r: any) => r.sales_items?.length ?? 0, align: "right" },
          { key: "total", header: "Total", accessor: (r: any) => Number(r.total_amount), sortable: true, align: "right", cell: (r: any) => <span className="tabular-nums font-semibold">${Number(r.total_amount).toFixed(2)}</span> },
        ]}
        emptyMessage="No sales recorded yet."
      />
    </>
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
