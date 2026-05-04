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

    // 7-day trend
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
