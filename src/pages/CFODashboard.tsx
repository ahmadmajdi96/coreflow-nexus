import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const CFO = () => {
  const [today, setToday] = useState(0);
  const [mtd, setMtd] = useState(0);
  const [byCat, setByCat] = useState<{ name: string; value: number }[]>([]);
  const [top, setTop] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
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

      const { data: topData } = await supabase.from("markdown_events")
        .select("discount_percent, financial_impact, products(sku,name), inventory_batches(quantity_available)")
        .eq("status", "ACTIVE").order("financial_impact", { ascending: false }).limit(5);
      setTop(topData ?? []);
    })();
  }, []);

  return (
    <>
      <PageHeader title="CFO – Markdown Financial Impact" description="Real-time visibility on inventory write-down exposure." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="stat-label">Markdowns Today</div><div className="stat-value mt-2 text-destructive">${today.toFixed(2)}</div></Card>
        <Card className="p-5"><div className="stat-label">Month-to-Date</div><div className="stat-value mt-2 text-destructive">${mtd.toFixed(2)}</div></Card>
        <Card className="p-5"><div className="stat-label">Average Discount</div><div className="stat-value mt-2">{top.length ? `${(top.reduce((a,r:any)=>a+Number(r.discount_percent),0)/top.length).toFixed(0)}%` : "—"}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Category Breakdown</h3>
          <p className="text-sm text-muted-foreground mb-4">Markdown exposure by product category.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCat}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="p-6 pb-3"><h3 className="font-semibold">Top Markdown Products</h3><p className="text-sm text-muted-foreground">Highest financial exposure.</p></div>
          <Table>
            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead>Discount</TableHead><TableHead className="text-right">Exposure</TableHead></TableRow></TableHeader>
            <TableBody>
              {top.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No active markdowns.</TableCell></TableRow>}
              {top.map((r: any, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.products?.sku}</TableCell>
                  <TableCell>{r.products?.name}</TableCell>
                  <TableCell><Badge variant="secondary">{r.discount_percent}%</Badge></TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">-${Number(r.financial_impact).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
};
export default CFO;
