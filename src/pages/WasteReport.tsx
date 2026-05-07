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
import { Download, AlertTriangle, Trash2 } from "lucide-react";
import { exportToCSV } from "@/lib/exporters";
import { differenceInDays, format } from "date-fns";

const WasteReport = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [writeOffs, setWriteOffs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const since = new Date(); since.setDate(since.getDate() - 90);
    Promise.all([
      supabase.from("inventory_batches").select("id,product_id,batch_number,quantity_available,unit_cost_at_receipt,expiry_date,products(sku,name)").gt("quantity_available", 0).not("expiry_date", "is", null),
      supabase.from("stock_movements").select("*").eq("movement_type", "WRITE_OFF").gte("created_at", since.toISOString()),
      supabase.from("products").select("id,sku,name"),
    ]).then(([b, w, p]) => {
      setBatches(b.data ?? []); setWriteOffs(w.data ?? []); setProducts(p.data ?? []);
      setLoading(false);
    });
  }, []);

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);

  const today = new Date();
  const expired = useMemo(() => batches
    .map(b => ({ ...b, days: differenceInDays(new Date(b.expiry_date), today), value: Number(b.quantity_available) * Number(b.unit_cost_at_receipt) }))
    .filter(b => b.days < 0)
    .filter(b => !search || b.products?.name?.toLowerCase().includes(search.toLowerCase()) || b.products?.sku?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.days - b.days),
  [batches, search]);

  const expiringSoon = useMemo(() => batches
    .map(b => ({ ...b, days: differenceInDays(new Date(b.expiry_date), today), value: Number(b.quantity_available) * Number(b.unit_cost_at_receipt) }))
    .filter(b => b.days >= 0 && b.days <= 14)
    .filter(b => !search || b.products?.name?.toLowerCase().includes(search.toLowerCase()) || b.products?.sku?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.days - b.days),
  [batches, search]);

  const totals = useMemo(() => ({
    expiredValue: expired.reduce((s, b) => s + b.value, 0),
    expiringValue: expiringSoon.reduce((s, b) => s + b.value, 0),
    writeOffCount: writeOffs.length,
    writeOffValue: writeOffs.reduce((s, w) => s + Number(w.quantity) * Number(w.unit_cost), 0),
  }), [expired, expiringSoon, writeOffs]);

  const exportCsv = () => exportToCSV(`waste-report-${Date.now()}.csv`,
    ["Type","SKU","Product","Batch","Qty","Unit cost","Value","Expiry","Days"],
    [
      ...expired.map(b => ["EXPIRED", b.products?.sku, b.products?.name, b.batch_number, b.quantity_available, b.unit_cost_at_receipt, b.value.toFixed(2), b.expiry_date, b.days]),
      ...expiringSoon.map(b => ["EXPIRING", b.products?.sku, b.products?.name, b.batch_number, b.quantity_available, b.unit_cost_at_receipt, b.value.toFixed(2), b.expiry_date, b.days]),
    ]);

  return (
    <>
      <PageHeader
        title="Waste & Shrinkage"
        description="Expired stock, near-expiry exposure, and recorded write-offs over the past 90 days."
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="stat-card"><div className="stat-label">Expired value</div><div className="stat-value mt-2 text-destructive">${totals.expiredValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">{expired.length} batches</div></div>
        <div className="stat-card"><div className="stat-label">Expiring (≤14d)</div><div className="stat-value mt-2 text-warning">${totals.expiringValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">{expiringSoon.length} batches</div></div>
        <div className="stat-card"><div className="stat-label">Write-offs (90d)</div><div className="stat-value mt-2">{totals.writeOffCount}</div></div>
        <div className="stat-card"><div className="stat-label">Write-off value</div><div className="stat-value mt-2 text-destructive">${totals.writeOffValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
      </div>

      <Card className="page-section p-4 mb-4">
        <Label className="text-xs">Search</Label>
        <Input placeholder="SKU or product…" value={search} onChange={e => setSearch(e.target.value)} />
      </Card>

      <Card className="page-section mb-4">
        <div className="px-4 py-3 border-b bg-destructive/5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <div className="font-semibold text-sm">Expired stock — write-off candidates</div>
          <Badge variant="destructive" className="text-[10px] ml-auto">{expired.length}</Badge>
        </div>
        {loading ? <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
        expired.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No expired stock 🎉</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead><TableHead>Batch</TableHead><TableHead>Expired on</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {expired.map(b => (
                <TableRow key={b.id} className="table-row-hover">
                  <TableCell><div className="text-sm">{b.products?.name}</div><div className="font-mono text-[10px] text-muted-foreground">{b.products?.sku}</div></TableCell>
                  <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                  <TableCell className="text-xs"><span className="text-destructive font-medium">{format(new Date(b.expiry_date), "PP")}</span> <span className="text-muted-foreground">· {Math.abs(b.days)}d ago</span></TableCell>
                  <TableCell className="text-right tabular-nums">{Number(b.quantity_available).toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">${b.value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="page-section mb-4">
        <div className="px-4 py-3 border-b bg-warning/10 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <div className="font-semibold text-sm">Expiring soon (≤14 days)</div>
          <Badge className="text-[10px] ml-auto bg-warning text-warning-foreground hover:bg-warning/90">{expiringSoon.length}</Badge>
        </div>
        {expiringSoon.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No imminent expiries.</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead><TableHead>Batch</TableHead><TableHead>Expires</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {expiringSoon.map(b => (
                <TableRow key={b.id} className="table-row-hover">
                  <TableCell><div className="text-sm">{b.products?.name}</div><div className="font-mono text-[10px] text-muted-foreground">{b.products?.sku}</div></TableCell>
                  <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                  <TableCell className="text-xs"><span className="text-warning font-medium">{format(new Date(b.expiry_date), "PP")}</span> <span className="text-muted-foreground">· {b.days}d</span></TableCell>
                  <TableCell className="text-right tabular-nums">{Number(b.quantity_available).toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">${b.value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="page-section">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
          <div className="font-semibold text-sm">Recent write-offs (90 days)</div>
          <Badge variant="outline" className="text-[10px] ml-auto">{writeOffs.length}</Badge>
        </div>
        {writeOffs.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No write-offs recorded.</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Reason</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {writeOffs.map(w => (
                <TableRow key={w.id} className="table-row-hover">
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(w.created_at), "MMM d")}</TableCell>
                  <TableCell><div className="text-sm">{productMap[w.product_id]?.name ?? "—"}</div><div className="font-mono text-[10px] text-muted-foreground">{productMap[w.product_id]?.sku}</div></TableCell>
                  <TableCell className="text-right tabular-nums">{Number(w.quantity).toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums">${(Number(w.quantity) * Number(w.unit_cost)).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
};

export default WasteReport;
