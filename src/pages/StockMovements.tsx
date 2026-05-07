import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftRight, Download, Plus, Trash2, ClipboardCheck, Boxes } from "lucide-react";
import { exportToCSV } from "@/lib/exporters";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type MovementType = "ADJUSTMENT" | "TRANSFER" | "WRITE_OFF" | "CYCLE_COUNT" | "RECEIPT" | "SALE";
const TYPE_META: Record<MovementType, { label: string; icon: any; tone: string }> = {
  ADJUSTMENT: { label: "Adjustment", icon: ClipboardCheck, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  TRANSFER: { label: "Transfer", icon: ArrowLeftRight, tone: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  WRITE_OFF: { label: "Write-off", icon: Trash2, tone: "bg-destructive/15 text-destructive" },
  CYCLE_COUNT: { label: "Cycle count", icon: ClipboardCheck, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  RECEIPT: { label: "Receipt", icon: Boxes, tone: "bg-primary/15 text-primary" },
  SALE: { label: "Sale", icon: Boxes, tone: "bg-muted text-muted-foreground" },
};

const StockMovements = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    movement_type: "ADJUSTMENT", product_id: "", quantity: "", reason: "", notes: "",
    from_store_id: "", to_store_id: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("products").select("id,sku,name").eq("active", true).order("name"),
      supabase.from("stores").select("id,name").order("name"),
    ]).then(([m, p, s]) => {
      setRows(m.data ?? []);
      setProducts(p.data ?? []);
      setStores(s.data ?? []);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const storeMap = useMemo(() => Object.fromEntries(stores.map(s => [s.id, s])), [stores]);

  const filtered = useMemo(() => rows.filter(r => {
    if (filterType !== "all" && r.movement_type !== filterType) return false;
    if (search) {
      const p = productMap[r.product_id];
      const q = search.toLowerCase();
      if (!p?.name.toLowerCase().includes(q) && !p?.sku.toLowerCase().includes(q) && !(r.reason || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, filterType, search, productMap]);

  const totals = useMemo(() => {
    const t = { ADJUSTMENT: 0, TRANSFER: 0, WRITE_OFF: 0, CYCLE_COUNT: 0 };
    rows.forEach(r => { if (t[r.movement_type as keyof typeof t] !== undefined) t[r.movement_type as keyof typeof t]++; });
    const writeOffValue = rows.filter(r => r.movement_type === "WRITE_OFF").reduce((s, r) => s + Number(r.quantity) * Number(r.unit_cost), 0);
    return { ...t, writeOffValue };
  }, [rows]);

  const submit = async () => {
    if (!form.product_id || !form.quantity) { toast({ title: "Missing fields", description: "Product and quantity are required" }); return; }
    const product = productMap[form.product_id];
    const { error } = await supabase.from("stock_movements").insert({
      movement_type: form.movement_type,
      product_id: form.product_id,
      quantity: Number(form.quantity),
      unit_cost: product?.unit_cost ?? 0,
      reason: form.reason || null,
      notes: form.notes || null,
      from_store_id: form.from_store_id || null,
      to_store_id: form.to_store_id || null,
      created_by: user?.id ?? null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Movement recorded" });
    setOpen(false);
    setForm({ movement_type: "ADJUSTMENT", product_id: "", quantity: "", reason: "", notes: "", from_store_id: "", to_store_id: "" });
    load();
  };

  const exportCsv = () => {
    exportToCSV(`stock-movements-${Date.now()}.csv`,
      ["Date","Type","SKU","Product","Quantity","Unit Cost","From Store","To Store","Reason","Notes"],
      filtered.map(r => [
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
        r.movement_type,
        productMap[r.product_id]?.sku ?? "—",
        productMap[r.product_id]?.name ?? "—",
        r.quantity, r.unit_cost,
        storeMap[r.from_store_id]?.name ?? "",
        storeMap[r.to_store_id]?.name ?? "",
        r.reason ?? "", r.notes ?? "",
      ]));
  };

  return (
    <>
      <PageHeader
        title="Stock Movements"
        description="Track all inventory adjustments, transfers, write-offs, and cycle counts across stores."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />New movement</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record stock movement</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={form.movement_type} onValueChange={(v) => setForm({ ...form, movement_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                        <SelectItem value="WRITE_OFF">Write-off</SelectItem>
                        <SelectItem value="CYCLE_COUNT">Cycle count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Product</Label>
                    <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} · {p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Reason</Label>
                      <Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Damaged" />
                    </div>
                  </div>
                  {form.movement_type === "TRANSFER" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">From store</Label>
                        <Select value={form.from_store_id} onValueChange={(v) => setForm({ ...form, from_store_id: v })}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">To store</Label>
                        <Select value={form.to_store_id} onValueChange={(v) => setForm({ ...form, to_store_id: v })}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submit}>Record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <div className="stat-card"><div className="stat-label">Adjustments</div><div className="stat-value mt-2">{totals.ADJUSTMENT}</div></div>
        <div className="stat-card"><div className="stat-label">Transfers</div><div className="stat-value mt-2">{totals.TRANSFER}</div></div>
        <div className="stat-card"><div className="stat-label">Write-offs</div><div className="stat-value mt-2 text-destructive">{totals.WRITE_OFF}</div></div>
        <div className="stat-card"><div className="stat-label">Cycle counts</div><div className="stat-value mt-2">{totals.CYCLE_COUNT}</div></div>
        <div className="stat-card"><div className="stat-label">Write-off value</div><div className="stat-value mt-2 text-destructive">${totals.writeOffValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
      </div>

      <Card className="page-section p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <Input placeholder="Product, SKU or reason…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-48">
          <Label className="text-xs">Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="page-section">
        {loading ? <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
        filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">No movements recorded.</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead>
              <TableHead>From → To</TableHead><TableHead>Reason</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => {
                const M = TYPE_META[r.movement_type as MovementType];
                const Icon = M?.icon ?? Boxes;
                const p = productMap[r.product_id];
                return (
                  <TableRow key={r.id} className="table-row-hover">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell><Badge className={`${M?.tone} font-medium gap-1`} variant="outline"><Icon className="h-3 w-3" />{M?.label}</Badge></TableCell>
                    <TableCell><div className="text-sm">{p?.name ?? "—"}</div><div className="font-mono text-[10px] text-muted-foreground">{p?.sku}</div></TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{Number(r.quantity).toFixed(0)}</TableCell>
                    <TableCell className="text-right tabular-nums">${(Number(r.quantity) * Number(r.unit_cost)).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{storeMap[r.from_store_id]?.name ?? "—"} → {storeMap[r.to_store_id]?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reason ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
};

export default StockMovements;
