import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Calculator, Download, FileText, AlertTriangle } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exporters";
import { format, differenceInDays } from "date-fns";

type Method = "FIFO" | "FEFO";

interface BatchRow {
  id: string; product_id: string; batch_number: string;
  quantity_available: number; unit_cost_at_receipt: number;
  received_date: string; expiry_date: string | null;
  products: { sku: string; name: string; expiry_trackable: boolean; current_sales_price: number };
}

const Valuation = () => {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<Method>("FIFO");

  useEffect(() => {
    supabase.from("inventory_batches")
      .select("id,product_id,batch_number,quantity_available,unit_cost_at_receipt,received_date,expiry_date,products(sku,name,expiry_trackable,current_sales_price)")
      .gt("quantity_available", 0)
      .then(({ data }) => setBatches((data ?? []) as any));
  }, []);

  /* ------- Valuation calculation -------
   * For each product: order its batches by FIFO (received_date asc) or FEFO (expiry_date asc, nulls last).
   * Each batch contributes qty * unit_cost_at_receipt to the product's total valuation.
   * Consumption order (sequence) is shown as "consume #" so users can see which batch sells first.
   */
  const grouped = useMemo(() => {
    const byProduct = new Map<string, { product: any; batches: BatchRow[] }>();
    for (const b of batches) {
      if (!byProduct.has(b.product_id)) byProduct.set(b.product_id, { product: b.products, batches: [] });
      byProduct.get(b.product_id)!.batches.push(b);
    }
    const result: { product_id: string; product: any; lines: (BatchRow & { sequence: number; line_value: number; days_to_expiry: number | null })[]; total_qty: number; total_value: number; weighted_avg: number; near_expiry_value: number }[] = [];
    for (const [product_id, { product, batches: list }] of byProduct) {
      const sorted = [...list].sort((a, b) => {
        if (method === "FEFO") {
          const ae = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
          const be = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
          if (ae !== be) return ae - be;
        }
        return new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
      });
      const today = new Date();
      const lines = sorted.map((b, i) => {
        const qty = Number(b.quantity_available);
        const cost = Number(b.unit_cost_at_receipt);
        const days = b.expiry_date ? differenceInDays(new Date(b.expiry_date), today) : null;
        return { ...b, sequence: i + 1, line_value: qty * cost, days_to_expiry: days };
      });
      const total_qty = lines.reduce((s, l) => s + Number(l.quantity_available), 0);
      const total_value = lines.reduce((s, l) => s + l.line_value, 0);
      const near_expiry_value = lines.filter(l => l.days_to_expiry !== null && l.days_to_expiry <= 14).reduce((s, l) => s + l.line_value, 0);
      result.push({
        product_id, product, lines, total_qty, total_value,
        weighted_avg: total_qty ? total_value / total_qty : 0,
        near_expiry_value,
      });
    }
    return result.sort((a, b) => b.total_value - a.total_value);
  }, [batches, method]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    return grouped.filter(g => g.product.name.toLowerCase().includes(q) || g.product.sku.toLowerCase().includes(q));
  }, [grouped, search]);

  const totals = useMemo(() => ({
    total_value: filtered.reduce((s, g) => s + g.total_value, 0),
    total_qty: filtered.reduce((s, g) => s + g.total_qty, 0),
    near_expiry: filtered.reduce((s, g) => s + g.near_expiry_value, 0),
    skus: filtered.length,
  }), [filtered]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [];
    filtered.forEach(g => {
      g.lines.forEach(l => {
        rows.push([
          g.product.sku, g.product.name, method, l.sequence, l.batch_number,
          format(new Date(l.received_date), "yyyy-MM-dd"),
          l.expiry_date ? format(new Date(l.expiry_date), "yyyy-MM-dd") : "",
          l.days_to_expiry ?? "",
          Number(l.quantity_available).toFixed(2),
          Number(l.unit_cost_at_receipt).toFixed(4),
          l.line_value.toFixed(2),
        ]);
      });
    });
    exportToCSV(`inventory-valuation-${method}-${Date.now()}.csv`,
      ["SKU","Product","Method","Consume #","Batch","Received","Expiry","Days to Expiry","Qty","Unit Cost","Line Value"], rows);
  };

  const exportPdf = () => {
    const rows = filtered.flatMap(g => g.lines.map(l => [
      g.product.sku, g.product.name.length > 30 ? g.product.name.slice(0, 28) + "…" : g.product.name,
      l.sequence, l.batch_number,
      format(new Date(l.received_date), "MMM d, yy"),
      l.expiry_date ? format(new Date(l.expiry_date), "MMM d, yy") : "—",
      l.days_to_expiry !== null ? `${l.days_to_expiry}d` : "—",
      Number(l.quantity_available).toFixed(0),
      `$${Number(l.unit_cost_at_receipt).toFixed(2)}`,
      `$${l.line_value.toFixed(2)}`,
    ]));
    exportToPDF({
      title: `Inventory Valuation Report — ${method}`,
      subtitle: `${method === "FIFO" ? "First-In-First-Out" : "First-Expired-First-Out"} cost methodology, batch-level breakdown.`,
      filename: `inventory-valuation-${method}-${Date.now()}.pdf`,
      headers: ["SKU","Product","Seq","Batch","Received","Expiry","Days","Qty","Unit Cost","Line Value"],
      rows,
      meta: {
        "Total SKUs": String(totals.skus),
        "Total Inventory Value": `$${totals.total_value.toFixed(2)}`,
        "Near-Expiry Exposure (≤14d)": `$${totals.near_expiry.toFixed(2)}`,
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Inventory Valuation"
        description="Batch-level cost calculations using FIFO and FEFO. The consume sequence shows which batch will be sold first."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="h-4 w-4 mr-2" />PDF</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><div className="stat-label">Total Value</div><div className="stat-value-gradient mt-2">${totals.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">Across {totals.skus} SKUs</div></div>
        <div className="stat-card"><div className="stat-label">Total Units</div><div className="stat-value mt-2">{totals.total_qty.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">Across all batches</div></div>
        <div className="stat-card"><div className="stat-label">Near-Expiry (≤14d)</div><div className="stat-value mt-2 text-warning">${totals.near_expiry.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">Markdown candidates</div></div>
        <div className="stat-card"><div className="stat-label">Method</div><div className="stat-value mt-2 gradient-text">{method}</div><div className="text-[11px] text-muted-foreground mt-1">{method === "FIFO" ? "First-in, first-out" : "First-expired, first-out"}</div></div>
      </div>

      <Tabs value={method} onValueChange={(v) => setMethod(v as Method)} className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="FIFO"><Calculator className="h-3.5 w-3.5 mr-1.5" />FIFO</TabsTrigger>
            <TabsTrigger value="FEFO"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />FEFO</TabsTrigger>
          </TabsList>
          <Input placeholder="Filter by SKU or product…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <TabsContent value="FIFO" className="mt-4"><ValuationTable groups={filtered} method="FIFO" /></TabsContent>
        <TabsContent value="FEFO" className="mt-4"><ValuationTable groups={filtered} method="FEFO" /></TabsContent>
      </Tabs>
    </>
  );
};

const ValuationTable = ({ groups, method }: { groups: any[]; method: Method }) => {
  if (groups.length === 0) return <Card className="page-section p-12 text-center text-muted-foreground">No batches with available stock.</Card>;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.product_id} className="page-section">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">{g.product.name} <span className="font-mono text-xs text-muted-foreground ml-2">{g.product.sku}</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {g.lines.length} batches · weighted avg cost <span className="font-mono">${g.weighted_avg.toFixed(4)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total Value</div>
              <div className="text-lg font-bold tabular-nums">${g.total_value.toFixed(2)}</div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Consume #</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Line Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {g.lines.map((l: any) => {
                const expiringSoon = l.days_to_expiry !== null && l.days_to_expiry <= 14;
                const expired = l.days_to_expiry !== null && l.days_to_expiry < 0;
                return (
                  <TableRow key={l.id} className={`table-row-hover ${l.sequence === 1 ? "bg-primary/5" : ""}`}>
                    <TableCell>
                      <Badge variant={l.sequence === 1 ? "default" : "outline"} className="font-mono">
                        {l.sequence === 1 ? `Next · ${method}` : `#${l.sequence}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.batch_number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(l.received_date), "PP")}</TableCell>
                    <TableCell className="text-xs">
                      {l.expiry_date ? (
                        <span className={expired ? "text-destructive font-semibold" : expiringSoon ? "text-warning font-medium" : ""}>
                          {format(new Date(l.expiry_date), "PP")}
                          {l.days_to_expiry !== null && <span className="text-muted-foreground ml-1">· {l.days_to_expiry}d</span>}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(l.quantity_available).toFixed(0)}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-xs">${Number(l.unit_cost_at_receipt).toFixed(4)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">${l.line_value.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ))}
    </div>
  );
};

export default Valuation;
