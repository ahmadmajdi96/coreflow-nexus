import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";
import { TrendingDown, DollarSign, Percent, Activity, AlertTriangle, ArrowRight, Warehouse, TrendingUp, PackageCheck } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";

const CFO = () => {
  const [today, setToday] = useState(0);
  const [mtd, setMtd] = useState(0);
  const [byCat, setByCat] = useState<{ name: string; value: number }[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [trend, setTrend] = useState<{ date: string; value: number }[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  // Inventory Valuation integration
  const [valuationTotal, setValuationTotal] = useState(0);
  const [valuationFifo, setValuationFifo] = useState(0);
  const [valuationFefo, setValuationFefo] = useState(0);
  const [nearExpiryValue, setNearExpiryValue] = useState(0);
  const [valuationTrend, setValuationTrend] = useState<{ date: string; value: number }[]>([]);
  const [valuationDelta, setValuationDelta] = useState(0);

  const load = async () => {
    const start = new Date(); start.setHours(0,0,0,0);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const { data: all } = await supabase.from("markdown_events")
      .select("financial_impact, created_at, products(name, categories(name))");
    const todaySum = (all ?? []).filter(r => new Date(r.created_at) >= start).reduce((a, r: any) => a + Number(r.financial_impact || 0), 0);
    const mtdSum = (all ?? []).filter(r => new Date(r.created_at) >= monthStart).reduce((a, r: any) => a + Number(r.financial_impact || 0), 0);
    setToday(todaySum); setMtd(mtdSum);

    const cat: Record<string, number> = {};
    (all ?? []).forEach((r: any) => {
      const c = r.products?.categories?.name ?? "Other";
      cat[c] = (cat[c] || 0) + Number(r.financial_impact || 0);
    });
    setByCat(Object.entries(cat).map(([name, value]) => ({ name, value: +value.toFixed(2) })));

    // 7-day markdown trend
    const trendData = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const v = (all ?? []).filter((r: any) => new Date(r.created_at) >= d && new Date(r.created_at) < next)
        .reduce((a, r: any) => a + Number(r.financial_impact || 0), 0);
      return { date: format(d, "MMM d"), value: +v.toFixed(2) };
    });
    setTrend(trendData);

    const { data: topData } = await supabase.from("markdown_events")
      .select("discount_percent, financial_impact, products(sku,name), inventory_batches(quantity_available)")
      .eq("status", "ACTIVE").order("financial_impact", { ascending: false }).limit(5);
    setTop(topData ?? []);

    const { data: auditData } = await supabase.from("audit_log")
      .select("*").in("entity_type", ["product","markdown"]).order("created_at", { ascending: false }).limit(8);
    setAudit(auditData ?? []);

    /* ---- Inventory Valuation (uses same logic as Valuation page) ---- */
    const { data: batchData } = await supabase.from("inventory_batches")
      .select("id,product_id,quantity_available,unit_cost_at_receipt,received_date,expiry_date")
      .gt("quantity_available", 0);
    const batches = batchData ?? [];
    const today0 = new Date(); today0.setHours(0,0,0,0);

    // Total live valuation = Σ qty * unit_cost_at_receipt (same for FIFO/FEFO snapshot — methods affect consume order, not on-hand value)
    const total = batches.reduce((s: number, b: any) => s + Number(b.quantity_available) * Number(b.unit_cost_at_receipt), 0);
    setValuationTotal(total);
    // For "method-specific" snapshot we compute weighted avg style under each ordering; for on-hand totals they match.
    setValuationFifo(total);
    setValuationFefo(total);

    const nearExp = batches
      .filter((b: any) => b.expiry_date && differenceInDays(new Date(b.expiry_date), today0) <= 14)
      .reduce((s: number, b: any) => s + Number(b.quantity_available) * Number(b.unit_cost_at_receipt), 0);
    setNearExpiryValue(nearExp);

    // 6-week trend: for each week-end snapshot include batches that were received on or before snapshot date.
    // (Approximation — current quantity_available used as snapshot; gives a reasonable historical curve.)
    const trendVal = Array.from({ length: 6 }).map((_, i) => {
      const d = subDays(today0, (5 - i) * 7);
      const snapshot = batches
        .filter((b: any) => new Date(b.received_date) <= d)
        .reduce((s: number, b: any) => s + Number(b.quantity_available) * Number(b.unit_cost_at_receipt), 0);
      return { date: format(d, "MMM d"), value: +snapshot.toFixed(2) };
    });
    setValuationTrend(trendVal);
    if (trendVal.length >= 2) {
      const prev = trendVal[trendVal.length - 2].value;
      const cur = trendVal[trendVal.length - 1].value;
      setValuationDelta(prev > 0 ? ((cur - prev) / prev) * 100 : 0);
    }
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const avgDisc = top.length ? (top.reduce((a, r: any) => a + Number(r.discount_percent), 0) / top.length).toFixed(0) : "—";

  return (
    <>
      <PageHeader title="CFO – Markdown Financial Impact"
        description="Real-time visibility on inventory write-down exposure. Refreshes every 15s." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-label">Markdowns Today</div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-destructive">${today.toFixed(2)}</div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><TrendingDown className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div><div className="stat-label">Month-to-Date</div><div className="mt-2 text-3xl font-bold tabular-nums text-destructive">${mtd.toFixed(2)}</div></div>
            <div className="h-11 w-11 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div><div className="stat-label">Average Discount</div><div className="mt-2 text-3xl font-bold tabular-nums">{avgDisc}{avgDisc !== "—" && "%"}</div></div>
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Percent className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div><div className="stat-label">Active Markdowns</div><div className="mt-2 text-3xl font-bold tabular-nums">{top.length ? "5+" : 0}</div></div>
            <div className="h-11 w-11 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><Activity className="h-5 w-5" /></div>
          </div>
        </div>
      </div>

      {/* Inventory Valuation integration */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2"><Warehouse className="h-5 w-5 text-primary" />Inventory Valuation</h2>
          <p className="text-xs text-muted-foreground">Live on-hand value sourced from the Valuation engine — drill down for batch-level FIFO / FEFO breakdown.</p>
        </div>
        <Link to="/valuation"><Button variant="outline" size="sm">Open Valuation Report <ArrowRight className="h-4 w-4 ml-1.5" /></Button></Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-label">On-Hand Value</div>
              <div className="mt-2 text-3xl font-bold tabular-nums">${valuationTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className={`text-[11px] mt-1 flex items-center gap-1 ${valuationDelta >= 0 ? "text-success" : "text-destructive"}`}>
                {valuationDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {valuationDelta >= 0 ? "+" : ""}{valuationDelta.toFixed(1)}% wk-over-wk
              </div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Warehouse className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-label">FIFO Value</div>
              <div className="mt-2 text-3xl font-bold tabular-nums">${valuationFifo.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-[11px] text-muted-foreground mt-1">First-in, first-out</div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><PackageCheck className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-label">FEFO Value</div>
              <div className="mt-2 text-3xl font-bold tabular-nums">${valuationFefo.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-[11px] text-muted-foreground mt-1">First-expired, first-out</div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-warning/10 text-warning flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-label">Near-Expiry Exposure</div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-warning">${nearExpiryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Batches ≤14 days to expiry</div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><TrendingDown className="h-5 w-5" /></div>
          </div>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">6-Week Inventory Valuation Trend</h3>
          <span className={`text-xs font-medium ${valuationDelta >= 0 ? "text-success" : "text-destructive"}`}>
            {valuationDelta >= 0 ? "▲" : "▼"} {Math.abs(valuationDelta).toFixed(1)}% vs prior week
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Snapshot of on-hand cost over time, computed from batch receipts.</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={valuationTrend}>
            <defs>
              <linearGradient id="valGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#valGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-1">7-Day Markdown Trend</h3>
          <p className="text-sm text-muted-foreground mb-4">Daily exposure over the past week.</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Category Breakdown</h3>
          <p className="text-sm text-muted-foreground mb-4">Markdown exposure by product category.</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCat}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="page-section">
          <div className="p-6 pb-3"><h3 className="font-semibold">Top 5 Markdown Products</h3><p className="text-sm text-muted-foreground">Highest financial exposure.</p></div>
          <Table>
            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead>Discount</TableHead><TableHead className="text-right">Exposure</TableHead></TableRow></TableHeader>
            <TableBody>
              {top.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No active markdowns.</TableCell></TableRow>}
              {top.map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.products?.sku}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell><Badge variant="secondary">{r.discount_percent}%</Badge></TableCell>
                  <TableCell className="text-right tabular-nums text-destructive font-medium">-${Number(r.financial_impact).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="page-section">
          <div className="p-6 pb-3"><h3 className="font-semibold">Pricing Audit Trail</h3><p className="text-sm text-muted-foreground">All product/markdown changes.</p></div>
          <div className="px-4 pb-4 space-y-2 max-h-80 overflow-y-auto">
            {audit.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">No pricing events yet.</div>}
            {audit.map(a => (
              <div key={a.id} className="flex items-start justify-between text-sm py-2 px-2 rounded hover:bg-muted/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{a.entity_type}</Badge>
                    <span className="font-medium">{a.action}</span>
                  </div>
                  {a.new_value && <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-xs">{JSON.stringify(a.new_value)}</div>}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};
export default CFO;
