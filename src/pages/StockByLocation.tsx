import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, MapPin } from "lucide-react";
import { exportToCSV } from "@/lib/exporters";

const StockByLocation = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("stores").select("id,name,store_code,location").order("name"),
      supabase.from("inventory_batches").select("product_id,store_id,quantity_available,unit_cost_at_receipt,products(sku,name)").gt("quantity_available", 0),
    ]).then(([s, b]) => {
      setStores(s.data ?? []);
      setBatches(b.data ?? []);
      setLoading(false);
    });
  }, []);

  // Aggregate per (store, product)
  const grid = useMemo(() => {
    const map = new Map<string, any>();
    batches.forEach((b: any) => {
      const sid = b.store_id ?? "unassigned";
      const key = `${sid}|${b.product_id}`;
      const existing = map.get(key) ?? {
        store_id: sid, product_id: b.product_id,
        product: b.products, quantity: 0, value: 0,
      };
      existing.quantity += Number(b.quantity_available);
      existing.value += Number(b.quantity_available) * Number(b.unit_cost_at_receipt);
      map.set(key, existing);
    });
    return Array.from(map.values());
  }, [batches]);

  const storeMap = useMemo(() => Object.fromEntries(stores.map(s => [s.id, s])), [stores]);

  const filtered = useMemo(() => grid
    .filter(r => storeId === "all" || r.store_id === storeId)
    .filter(r => !search || r.product?.name?.toLowerCase().includes(search.toLowerCase()) || r.product?.sku?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.value - a.value),
  [grid, storeId, search]);

  const storeTotals = useMemo(() => {
    const t: Record<string, { qty: number; value: number; skus: Set<string> }> = {};
    grid.forEach(r => {
      if (!t[r.store_id]) t[r.store_id] = { qty: 0, value: 0, skus: new Set() };
      t[r.store_id].qty += r.quantity;
      t[r.store_id].value += r.value;
      t[r.store_id].skus.add(r.product_id);
    });
    return t;
  }, [grid]);

  const exportCsv = () => exportToCSV(`stock-by-location-${Date.now()}.csv`,
    ["Store","SKU","Product","Quantity","Value"],
    filtered.map(r => [storeMap[r.store_id]?.name ?? "Unassigned", r.product?.sku, r.product?.name, r.quantity.toFixed(0), r.value.toFixed(2)]));

  return (
    <>
      <PageHeader
        title="Stock by Location"
        description="Inventory on hand and value across all stores and warehouses."
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>}
      />

      {/* Per-store cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {stores.map(s => {
          const t = storeTotals[s.id] ?? { qty: 0, value: 0, skus: new Set() };
          return (
            <Card key={s.id} className="page-section p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setStoreId(s.id)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-semibold text-sm">{s.name}</span></div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{s.store_code}{s.location ? ` · ${s.location}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums">${t.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div className="text-[10px] text-muted-foreground">{t.skus.size} SKUs · {t.qty.toFixed(0)} units</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="page-section p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]"><Label className="text-xs">Search</Label><Input placeholder="SKU or product…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-64">
          <Label className="text-xs">Store</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stores</SelectItem>
              {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="page-section">
        {loading ? <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
        filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">No stock found.</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Store</TableHead><TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Value</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={`${r.store_id}-${r.product_id}-${i}`} className="table-row-hover">
                  <TableCell className="text-xs">{storeMap[r.store_id]?.name ?? "Unassigned"}</TableCell>
                  <TableCell><div className="text-sm">{r.product?.name}</div><div className="font-mono text-[10px] text-muted-foreground">{r.product?.sku}</div></TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{r.quantity.toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">${r.value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
};

export default StockByLocation;
