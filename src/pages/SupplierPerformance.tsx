import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Star, Award } from "lucide-react";
import { exportToCSV } from "@/lib/exporters";

const ScoreBar = ({ value, label }: { value: number; label: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] text-muted-foreground"><span>{label}</span><span className="tabular-nums font-medium">{(value * 100).toFixed(0)}%</span></div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full ${value >= 0.95 ? "bg-emerald-500" : value >= 0.85 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${value * 100}%` }} />
    </div>
  </div>
);

const SupplierPerformance = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("suppliers").select("*"),
      supabase.from("purchase_orders").select("supplier_id,total_amount,status,expected_date,received_date,created_at"),
    ]).then(([s, p]) => {
      setSuppliers(s.data ?? []); setPos(p.data ?? []);
      setLoading(false);
    });
  }, []);

  const rows = useMemo(() => suppliers.map(s => {
    const sPos = pos.filter(p => p.supplier_id === s.id);
    const totalSpend = sPos.reduce((sum, p) => sum + Number(p.total_amount), 0);
    const completedPos = sPos.filter(p => p.status === "RECEIVED" || p.received_date);
    const onTime = completedPos.filter(p => p.received_date && p.expected_date && new Date(p.received_date) <= new Date(p.expected_date)).length;
    const observedOnTime = completedPos.length > 0 ? onTime / completedPos.length : Number(s.on_time_rate);
    const score = (observedOnTime * 0.5) + (Number(s.fill_rate) * 0.5);
    let grade: "A" | "B" | "C" | "D";
    if (score >= 0.95) grade = "A"; else if (score >= 0.88) grade = "B"; else if (score >= 0.78) grade = "C"; else grade = "D";
    return {
      ...s, totalSpend, poCount: sPos.length, completedCount: completedPos.length,
      observedOnTime, score, grade,
    };
  }).sort((a, b) => b.score - a.score), [suppliers, pos]);

  const filtered = useMemo(() => rows.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())), [rows, search]);

  const totals = useMemo(() => ({
    avgScore: rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0,
    aGrade: rows.filter(r => r.grade === "A").length,
    dGrade: rows.filter(r => r.grade === "D").length,
    totalSpend: rows.reduce((s, r) => s + r.totalSpend, 0),
  }), [rows]);

  const exportCsv = () => exportToCSV(`supplier-performance-${Date.now()}.csv`,
    ["Supplier","Grade","Score","On-time","Fill rate","Lead days","POs","Spend"],
    filtered.map(r => [r.name, r.grade, (r.score * 100).toFixed(1), (r.observedOnTime * 100).toFixed(1), (r.fill_rate * 100).toFixed(1), r.lead_time_days, r.poCount, r.totalSpend.toFixed(2)]));

  return (
    <>
      <PageHeader
        title="Supplier Performance"
        description="Scorecard of on-time delivery, fill rate, lead time, and total spend per supplier."
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="stat-card"><div className="stat-label">Avg performance</div><div className="stat-value-gradient mt-2">{(totals.avgScore * 100).toFixed(0)}%</div></div>
        <div className="stat-card"><div className="stat-label">A-grade suppliers</div><div className="stat-value mt-2 text-emerald-600">{totals.aGrade}</div></div>
        <div className="stat-card"><div className="stat-label">D-grade suppliers</div><div className="stat-value mt-2 text-destructive">{totals.dGrade}</div></div>
        <div className="stat-card"><div className="stat-label">Total spend</div><div className="stat-value mt-2">${totals.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
      </div>

      <Card className="page-section p-4 mb-4">
        <Label className="text-xs">Search supplier</Label>
        <Input placeholder="Name…" value={search} onChange={e => setSearch(e.target.value)} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
        {loading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />) :
        filtered.slice(0, 9).map(r => (
          <Card key={r.id} className="page-section p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-sm">{r.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{r.contact_email ?? "—"}</div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold text-xs ${
                r.grade === "A" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                r.grade === "B" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                r.grade === "C" ? "bg-warning/20 text-warning" :
                "bg-destructive/15 text-destructive"
              }`}>
                {r.grade === "A" && <Award className="h-3 w-3" />}{r.grade}
              </div>
            </div>
            <div className="space-y-2">
              <ScoreBar value={r.observedOnTime} label="On-time delivery" />
              <ScoreBar value={Number(r.fill_rate)} label="Fill rate" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
              <div><div className="text-[10px] text-muted-foreground">Lead</div><div className="text-sm font-semibold">{r.lead_time_days}d</div></div>
              <div><div className="text-[10px] text-muted-foreground">POs</div><div className="text-sm font-semibold">{r.poCount}</div></div>
              <div><div className="text-[10px] text-muted-foreground">Spend</div><div className="text-sm font-semibold">${r.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="page-section">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <div className="font-semibold text-sm">All suppliers ranking</div>
        </div>
        {loading ? <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-12">#</TableHead><TableHead>Supplier</TableHead><TableHead>Grade</TableHead>
              <TableHead className="text-right">Score</TableHead><TableHead className="text-right">On-time</TableHead>
              <TableHead className="text-right">Fill</TableHead><TableHead className="text-right">Lead</TableHead>
              <TableHead className="text-right">POs</TableHead><TableHead className="text-right">Spend</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r.id} className="table-row-hover">
                  <TableCell className="font-mono text-xs text-muted-foreground">#{i + 1}</TableCell>
                  <TableCell className="text-sm font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant={r.grade === "A" ? "default" : r.grade === "D" ? "destructive" : "outline"} className="text-[10px] font-bold">{r.grade}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{(r.score * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{(r.observedOnTime * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{(Number(r.fill_rate) * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.lead_time_days}d</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.poCount}</TableCell>
                  <TableCell className="text-right tabular-nums">${r.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
};

export default SupplierPerformance;
