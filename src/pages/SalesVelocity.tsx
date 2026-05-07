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
import { Download, Zap, Snowflake, TrendingUp } from "lucide-react";
import { exportToCSV } from "@/lib/exporters";

type Window = 7 | 30 | 90;

const SalesVelocity = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [salesByWindow, setSalesByWindow] = useState<Record<string, Record<Window, number>>>({});
  const [revenueByWindow, setRevenueByWindow] = useState<Record<string, Record<Window, number>>>({});
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<Window>(30);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<"all" | "fast" | "medium" | "slow" | "dead">("all");

  useEffect(() => {
    setLoading(true);
    const since = new Date(); since.setDate(since.getDate() - 90);
    Promise.all([
      supabase.from("products").select("id,sku,name,unit_cost,current_sales_price").eq("active", true),
      supabase.from("inventory_batches").select("product_id,quantity_available").gt("quantity_available", 0),
      supabase.from("sales_items").select("product_id,quantity,unit_price,sales_transactions!inner(occurred_at)").gte("sales_transactions.occurred_at", since.toISOString()),
    ]).then(([p, b, s]) => {
      setProducts(p.data ?? []);
      const sm: Record<string, number> = {};
      (b.data ?? []).forEach((r: any) => { sm[r.product_id] = (sm[r.product_id] ?? 0) + Number(r.quantity_available); });
      setStockMap(sm);
      const now = Date.now();
      const sw: Record<string, Record<Window, number>> = {};
      const rw: Record<string, Record<Window, number>> = {};
      (s.data ?? []).forEach((r: any) => {
        const days = (now - new Date(r.sales_transactions.occurred_at).getTime()) / 86400000;
        const pid = r.product_id;
        if (!sw[pid]) sw[pid] = { 7: 0, 30: 0, 90: 0 };
        if (!rw[pid]) rw[pid] = { 7: 0, 30: 0, 90: 0 };
        const qty = Number(r.quantity); const rev = qty * Number(r.unit_price);
        if (days <= 7) { sw[pid][7] += qty; rw[pid][7] += rev; }
        if (days <= 30) { sw[pid][30] += qty; rw[pid][30] += rev; }
        if (days <= 90) { sw[pid][90] += qty; rw[pid][90] += rev; }
      });
      setSalesByWindow(sw); setRevenueByWindow(rw);
      setLoading(false);
    });
  }, []);

  const rows = useMemo(() => products.map(p => {
    const sold = salesByWindow[p.id]?.[window] ?? 0;
    const rev = revenueByWindow[p.id]?.[window] ?? 0;
    const onHand = stockMap[p.id] ?? 0;
    const dailyVel = sold / window;
    const daysOfCover = dailyVel > 0 ? Math.round(onHand / dailyVel) : null;
    let velocityTier: "fast" | "medium" | "slow" | "dead";
    if (sold === 0) velocityTier = "dead";
    else if (dailyVel >= 5) velocityTier = "fast";
    else if (dailyVel >= 1) velocityTier = "medium";
    else velocityTier = "slow";
    return { ...p, sold, rev, onHand, dailyVel, daysOfCover, velocityTier };
  }), [products, salesByWindow, revenueByWindow, stockMap, window]);

  const filtered = useMemo(() => rows
    .filter(r => tier === "all" || r.velocityTier === tier)
    .filter(r => !search || r.sku.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.sold - a.sold),
  [rows, tier, search]);

  const totals = useMemo(() => ({
    fast: rows.filter(r => r.velocityTier === "fast").length,
    slow: rows.filter(r => r.velocityTier === "slow").length,
    dead: rows.filter(r => r.velocityTier === "dead").length,
    revenue: rows.reduce((s, r) => s + r.rev, 0),
  }), [rows]);

  const exportCsv = () => exportToCSV(`sales-velocity-${window}d-${Date.now()}.csv`,
    ["SKU","Product","Window (d)","Units sold","Revenue","Daily velocity","On hand","Days of cover","Tier"],
    filtered.map(r => [r.sku, r.name, window, r.sold, r.rev.toFixed(2), r.dailyVel.toFixed(2), r.onHand, r.daysOfCover ?? "", r.velocityTier]));

  return (
    <>
      <PageHeader
        title="Sales Velocity"
        description="Units sold per day, revenue, and days-of-cover by product. Identify fast movers and dead stock."
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="stat-card"><div className="stat-label">Fast movers</div><div className="stat-value mt-2 text-emerald-600">{totals.fast}</div></div>
        <div className="stat-card"><div className="stat-label">Slow movers</div><div className="stat-value mt-2 text-warning">{totals.slow}</div></div>
        <div className="stat-card"><div className="stat-label">Dead stock</div><div className="stat-value mt-2 text-destructive">{totals.dead}</div></div>
        <div className="stat-card"><div className="stat-label">Revenue ({window}d)</div><div className="stat-value-gradient mt-2">${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
      </div>

      <Card className="page-section p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]"><Label className="text-xs">Search</Label><Input placeholder="SKU or name…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-40">
          <Label className="text-xs">Window</Label>
          <Select value={String(window)} onValueChange={(v) => setWindow(Number(v) as Window)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Label className="text-xs">Tier</Label>
          <Select value={tier} onValueChange={(v) => setTier(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="fast">Fast (≥5/day)</SelectItem>
              <SelectItem value="medium">Medium (1–5/day)</SelectItem>
              <SelectItem value="slow">Slow (&lt;1/day)</SelectItem>
              <SelectItem value="dead">Dead (no sales)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="page-section">
        {loading ? <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead><TableHead>Tier</TableHead>
              <TableHead className="text-right">Units sold</TableHead><TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Per day</TableHead>
              <TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Days cover</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="table-row-hover">
                  <TableCell><div className="text-sm font-medium">{r.name}</div><div className="font-mono text-[10px] text-muted-foreground">{r.sku}</div></TableCell>
                  <TableCell>
                    {r.velocityTier === "fast" && <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20" variant="outline"><Zap className="h-3 w-3" />Fast</Badge>}
                    {r.velocityTier === "medium" && <Badge variant="outline" className="text-[10px] gap-1"><TrendingUp className="h-3 w-3" />Medium</Badge>}
                    {r.velocityTier === "slow" && <Badge className="text-[10px] bg-warning text-warning-foreground hover:bg-warning/90">Slow</Badge>}
                    {r.velocityTier === "dead" && <Badge variant="destructive" className="text-[10px] gap-1"><Snowflake className="h-3 w-3" />Dead</Badge>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{r.sold}</TableCell>
                  <TableCell className="text-right tabular-nums">${r.rev.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.dailyVel.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{r.onHand}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.daysOfCover === null ? "—" : `${r.daysOfCover}d`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
};

export default SalesVelocity;
