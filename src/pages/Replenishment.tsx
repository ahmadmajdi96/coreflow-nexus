import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exporters";

type Status = "all" | "out_of_stock" | "below_reorder" | "reorder_soon" | "healthy";

const Replenishment = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [salesMap, setSalesMap] = useState<Record<string, number>>({}); // 30-day units
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");

  useEffect(() => {
    setLoading(true);
    const since = new Date(); since.setDate(since.getDate() - 30);
    Promise.all([
      supabase.from("products").select("id,sku,name,unit_cost,reorder_point,reorder_quantity,lead_time_days,active,suppliers:primary_supplier_id(name)").eq("active", true),
      supabase.from("inventory_batches").select("product_id,quantity_available").gt("quantity_available", 0),
      supabase.from("sales_items").select("product_id,quantity,sales_transactions!inner(occurred_at)").gte("sales_transactions.occurred_at", since.toISOString()),
    ]).then(([p, b, s]) => {
      setProducts(p.data ?? []);
      const sm: Record<string, number> = {};
      (b.data ?? []).forEach((r: any) => { sm[r.product_id] = (sm[r.product_id] ?? 0) + Number(r.quantity_available); });
      setStockMap(sm);
      const vm: Record<string, number> = {};
      (s.data ?? []).forEach((r: any) => { vm[r.product_id] = (vm[r.product_id] ?? 0) + Number(r.quantity); });
      setSalesMap(vm);
      setLoading(false);
    });
  }, []);

  const rows = useMemo(() => products.map(p => {
    const onHand = stockMap[p.id] ?? 0;
    const sold30 = salesMap[p.id] ?? 0;
    const dailyVel = sold30 / 30;
    const daysOfCover = dailyVel > 0 ? Math.round(onHand / dailyVel) : null;
    const reorderPoint = Number(p.reorder_point);
    const lead = Number(p.lead_time_days);
    const leadDemand = dailyVel * lead;
    const suggestedQty = onHand <= reorderPoint
      ? Math.max(Number(p.reorder_quantity), Math.ceil(leadDemand * 1.5 - onHand))
      : 0;
    let st: Status = "healthy";
    if (onHand <= 0) st = "out_of_stock";
    else if (onHand <= reorderPoint) st = "below_reorder";
    else if (daysOfCover !== null && lead > 0 && daysOfCover <= lead + 3) st = "reorder_soon";
    return {
      ...p, onHand, sold30, dailyVel, daysOfCover, reorderPoint, lead, suggestedQty,
      suggestedCost: suggestedQty * Number(p.unit_cost), st,
    };
  }), [products, stockMap, salesMap]);

  const filtered = useMemo(() => rows
    .filter(r => status === "all" || r.st === status)
    .filter(r => !search || r.sku.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const order: Record<Status, number> = { out_of_stock: 0, below_reorder: 1, reorder_soon: 2, healthy: 3, all: 4 };
      return (order[a.st] - order[b.st]) || (a.daysOfCover ?? 999) - (b.daysOfCover ?? 999);
    }),
  [rows, status, search]);

  const totals = useMemo(() => ({
    out: rows.filter(r => r.st === "out_of_stock").length,
    below: rows.filter(r => r.st === "below_reorder").length,
    soon: rows.filter(r => r.st === "reorder_soon").length,
    suggestedSpend: rows.reduce((s, r) => s + r.suggestedCost, 0),
  }), [rows]);

  const exportCsv = () => exportToCSV(`replenishment-${Date.now()}.csv`,
    ["SKU","Product","Supplier","On hand","Reorder pt","Lead days","30d sold","Daily vel","Days cover","Suggested qty","Suggested cost","Status"],
    filtered.map(r => [r.sku, r.name, r.suppliers?.name ?? "", r.onHand, r.reorderPoint, r.lead, r.sold30, r.dailyVel.toFixed(2), r.daysOfCover ?? "", r.suggestedQty, r.suggestedCost.toFixed(2), r.st]));

  const exportPdf = () => exportToPDF({
    title: "Replenishment Suggestions",
    subtitle: `${filtered.length} items · suggested spend $${totals.suggestedSpend.toFixed(0)}`,
    filename: `replenishment-${Date.now()}.pdf`,
    headers: ["SKU","Product","On hand","Reorder","Lead","Cover","Sugg Qty","Sugg Cost","Status"],
    rows: filtered.map(r => [r.sku, r.name.slice(0, 32), r.onHand, r.reorderPoint, `${r.lead}d`, r.daysOfCover !== null ? `${r.daysOfCover}d` : "—", r.suggestedQty, `$${r.suggestedCost.toFixed(0)}`, r.st]),
    meta: { "Out of stock": String(totals.out), "Below reorder": String(totals.below), "Reorder soon": String(totals.soon) },
  });

  return (
    <>
      <PageHeader
        title="Replenishment"
        description="Reorder suggestions based on stock on hand, sales velocity, lead time, and reorder points."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="h-4 w-4 mr-2" />PDF</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="stat-card"><div className="stat-label">Out of stock</div><div className="stat-value mt-2 text-destructive">{totals.out}</div></div>
        <div className="stat-card"><div className="stat-label">Below reorder</div><div className="stat-value mt-2 text-warning">{totals.below}</div></div>
        <div className="stat-card"><div className="stat-label">Reorder soon</div><div className="stat-value mt-2">{totals.soon}</div></div>
        <div className="stat-card"><div className="stat-label">Suggested spend</div><div className="stat-value-gradient mt-2">${totals.suggestedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
      </div>

      <Card className="page-section p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]"><Label className="text-xs">Search</Label><Input placeholder="SKU or name…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-56">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
              <SelectItem value="below_reorder">Below reorder point</SelectItem>
              <SelectItem value="reorder_soon">Reorder soon</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="page-section">
        {loading ? <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead><TableHead>Supplier</TableHead>
              <TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Reorder pt</TableHead>
              <TableHead className="text-right">Lead</TableHead><TableHead className="text-right">30d sales</TableHead>
              <TableHead className="text-right">Days cover</TableHead><TableHead className="text-right">Suggested</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="table-row-hover">
                  <TableCell><div className="text-sm font-medium">{r.name}</div><div className="font-mono text-[10px] text-muted-foreground">{r.sku}</div></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.suppliers?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{r.onHand}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{r.reorderPoint}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.lead}d</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.sold30}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {r.daysOfCover === null ? <span className="text-muted-foreground">—</span> :
                      <span className={r.daysOfCover <= r.lead ? "text-destructive font-semibold" : r.daysOfCover <= r.lead + 7 ? "text-warning font-medium" : ""}>{r.daysOfCover}d</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.suggestedQty > 0 ? (
                      <div><div className="font-bold tabular-nums">{r.suggestedQty}</div><div className="text-[10px] text-muted-foreground">${r.suggestedCost.toFixed(0)}</div></div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    {r.st === "out_of_stock" && <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />Out</Badge>}
                    {r.st === "below_reorder" && <Badge className="text-[10px] gap-1 bg-warning text-warning-foreground hover:bg-warning/90"><RefreshCw className="h-3 w-3" />Reorder</Badge>}
                    {r.st === "reorder_soon" && <Badge variant="outline" className="text-[10px]">Soon</Badge>}
                    {r.st === "healthy" && <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-300/50"><TrendingUp className="h-3 w-3" />Healthy</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
};

export default Replenishment;
