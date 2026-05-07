import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator, Download, FileText, AlertTriangle, Filter, ChevronDown, ChevronRight,
  Package, TrendingDown, X, ArrowUpDown, Sparkles, Info,
} from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exporters";
import { format, differenceInDays } from "date-fns";

type Method = "FIFO" | "FEFO";
type ExpiryStatus = "all" | "expired" | "critical" | "warning" | "healthy" | "no_expiry";
type SortKey = "value_desc" | "value_asc" | "qty_desc" | "expiry_asc" | "name_asc";

interface BatchRow {
  id: string; product_id: string; batch_number: string;
  quantity_available: number; unit_cost_at_receipt: number;
  received_date: string; expiry_date: string | null;
  products: {
    sku: string; name: string; expiry_trackable: boolean;
    current_sales_price: number; category_id: string | null;
  };
}

const Valuation = () => {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<Method>("FIFO");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>("all");
  const [sortBy, setSortBy] = useState<SortKey>("value_desc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("inventory_batches")
        .select("id,product_id,batch_number,quantity_available,unit_cost_at_receipt,received_date,expiry_date,products(sku,name,expiry_trackable,current_sales_price,category_id)")
        .gt("quantity_available", 0),
      supabase.from("categories").select("id,name").order("name"),
    ]).then(([b, c]) => {
      setBatches((b.data ?? []) as any);
      setCategories((c.data ?? []) as any);
      setLoading(false);
    });
  }, []);

  const dateFiltered = useMemo(() => batches.filter(b => {
    if (fromDate && b.received_date < fromDate) return false;
    if (toDate && b.received_date > toDate) return false;
    if (categoryId !== "all" && b.products?.category_id !== categoryId) return false;
    return true;
  }), [batches, fromDate, toDate, categoryId]);

  const grouped = useMemo(() => {
    const byProduct = new Map<string, { product: any; batches: BatchRow[] }>();
    for (const b of dateFiltered) {
      if (!byProduct.has(b.product_id)) byProduct.set(b.product_id, { product: b.products, batches: [] });
      byProduct.get(b.product_id)!.batches.push(b);
    }
    const today = new Date();
    const result: any[] = [];
    for (const [product_id, { product, batches: list }] of byProduct) {
      const sorted = [...list].sort((a, b) => {
        if (method === "FEFO") {
          const ae = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
          const be = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
          if (ae !== be) return ae - be;
        }
        return new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
      });
      const lines = sorted.map((b, i) => {
        const qty = Number(b.quantity_available);
        const cost = Number(b.unit_cost_at_receipt);
        const days = b.expiry_date ? differenceInDays(new Date(b.expiry_date), today) : null;
        return { ...b, sequence: i + 1, line_value: qty * cost, days_to_expiry: days };
      });
      const total_qty = lines.reduce((s, l) => s + Number(l.quantity_available), 0);
      const total_value = lines.reduce((s, l) => s + l.line_value, 0);
      const expired_value = lines.filter(l => l.days_to_expiry !== null && l.days_to_expiry < 0).reduce((s, l) => s + l.line_value, 0);
      const critical_value = lines.filter(l => l.days_to_expiry !== null && l.days_to_expiry >= 0 && l.days_to_expiry <= 7).reduce((s, l) => s + l.line_value, 0);
      const near_expiry_value = lines.filter(l => l.days_to_expiry !== null && l.days_to_expiry >= 0 && l.days_to_expiry <= 14).reduce((s, l) => s + l.line_value, 0);
      const min_days = lines.reduce((m, l) => l.days_to_expiry !== null && (m === null || l.days_to_expiry < m) ? l.days_to_expiry : m, null as number | null);
      result.push({
        product_id, product, lines, total_qty, total_value,
        weighted_avg: total_qty ? total_value / total_qty : 0,
        near_expiry_value, expired_value, critical_value, min_days,
      });
    }
    return result;
  }, [dateFiltered, method]);

  const filtered = useMemo(() => {
    let out = grouped;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(g => g.product.name.toLowerCase().includes(q) || g.product.sku.toLowerCase().includes(q));
    }
    if (expiryStatus !== "all") {
      out = out.filter(g => {
        const d = g.min_days;
        if (expiryStatus === "no_expiry") return d === null;
        if (d === null) return false;
        if (expiryStatus === "expired") return d < 0;
        if (expiryStatus === "critical") return d >= 0 && d <= 7;
        if (expiryStatus === "warning") return d > 7 && d <= 30;
        if (expiryStatus === "healthy") return d > 30;
        return true;
      });
    }
    const sorted = [...out].sort((a, b) => {
      switch (sortBy) {
        case "value_asc": return a.total_value - b.total_value;
        case "qty_desc": return b.total_qty - a.total_qty;
        case "expiry_asc": {
          const av = a.min_days ?? Number.MAX_SAFE_INTEGER;
          const bv = b.min_days ?? Number.MAX_SAFE_INTEGER;
          return av - bv;
        }
        case "name_asc": return a.product.name.localeCompare(b.product.name);
        default: return b.total_value - a.total_value;
      }
    });
    return sorted;
  }, [grouped, search, expiryStatus, sortBy]);

  const totals = useMemo(() => ({
    total_value: filtered.reduce((s, g) => s + g.total_value, 0),
    total_qty: filtered.reduce((s, g) => s + g.total_qty, 0),
    near_expiry: filtered.reduce((s, g) => s + g.near_expiry_value, 0),
    expired: filtered.reduce((s, g) => s + g.expired_value, 0),
    critical: filtered.reduce((s, g) => s + g.critical_value, 0),
    skus: filtered.length,
    batches: filtered.reduce((s, g) => s + g.lines.length, 0),
  }), [filtered]);

  const maxValue = useMemo(() => filtered.reduce((m, g) => Math.max(m, g.total_value), 0), [filtered]);

  const activeFilterCount =
    (fromDate ? 1 : 0) + (toDate ? 1 : 0) + (search ? 1 : 0) +
    (categoryId !== "all" ? 1 : 0) + (expiryStatus !== "all" ? 1 : 0);

  const clearAll = () => {
    setFromDate(""); setToDate(""); setSearch("");
    setCategoryId("all"); setExpiryStatus("all");
  };

  const toggleAll = () => {
    const next = !allOpen;
    setAllOpen(next);
    const map: Record<string, boolean> = {};
    filtered.forEach(g => { map[g.product_id] = next; });
    setExpanded(map);
  };

  const filterDescription = () => {
    const parts: string[] = [`Method: ${method}`];
    if (fromDate || toDate) parts.push(`Received: ${fromDate || "earliest"} → ${toDate || "today"}`);
    if (search) parts.push(`Search: "${search}"`);
    if (categoryId !== "all") parts.push(`Category: ${categories.find(c => c.id === categoryId)?.name ?? "—"}`);
    if (expiryStatus !== "all") parts.push(`Expiry: ${expiryStatus}`);
    parts.push(`SKUs: ${totals.skus}`);
    return parts.join(" · ");
  };

  const exportCsv = () => {
    if (includeBreakdown) {
      const rows: (string | number)[][] = [];
      filtered.forEach(g => {
        g.lines.forEach((l: any) => {
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
      exportToCSV(`inventory-valuation-${method}-batches-${Date.now()}.csv`,
        ["SKU","Product","Method","Consume #","Batch","Received","Expiry","Days to Expiry","Qty","Unit Cost","Line Value"], rows);
    } else {
      const rows = filtered.map(g => [
        g.product.sku, g.product.name, method,
        g.lines.length, g.total_qty.toFixed(2),
        g.weighted_avg.toFixed(4), g.total_value.toFixed(2), g.near_expiry_value.toFixed(2),
      ]);
      exportToCSV(`inventory-valuation-${method}-summary-${Date.now()}.csv`,
        ["SKU","Product","Method","# Batches","Total Qty","Weighted Avg Cost","Total Value","Near-Expiry Value"], rows);
    }
  };

  const exportPdf = () => {
    const meta: Record<string, string> = {
      "Method": method === "FIFO" ? "FIFO (First-In, First-Out)" : "FEFO (First-Expired, First-Out)",
      "Date Range": (fromDate || toDate) ? `${fromDate || "earliest"} → ${toDate || "today"}` : "All time",
      "Category": categoryId === "all" ? "All" : (categories.find(c => c.id === categoryId)?.name ?? "—"),
      "Expiry Filter": expiryStatus,
      "Search Filter": search || "—",
      "Total SKUs": String(totals.skus),
      "Total Inventory Value": `$${totals.total_value.toFixed(2)}`,
      "Expired Value": `$${totals.expired.toFixed(2)}`,
      "Near-Expiry Exposure (≤14d)": `$${totals.near_expiry.toFixed(2)}`,
      "Detail Level": includeBreakdown ? "Batch breakdown" : "Product summary",
    };
    if (includeBreakdown) {
      const rows = filtered.flatMap(g => g.lines.map((l: any) => [
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
        title: `Inventory Valuation Report — ${method} (Batch breakdown)`,
        subtitle: filterDescription(),
        filename: `inventory-valuation-${method}-batches-${Date.now()}.pdf`,
        headers: ["SKU","Product","Seq","Batch","Received","Expiry","Days","Qty","Unit Cost","Line Value"],
        rows, meta,
      });
    } else {
      const rows = filtered.map(g => [
        g.product.sku, g.product.name.length > 36 ? g.product.name.slice(0, 34) + "…" : g.product.name,
        g.lines.length, Number(g.total_qty).toFixed(0),
        `$${g.weighted_avg.toFixed(4)}`, `$${g.total_value.toFixed(2)}`, `$${g.near_expiry_value.toFixed(2)}`,
      ]);
      exportToPDF({
        title: `Inventory Valuation Report — ${method} (Summary)`,
        subtitle: filterDescription(),
        filename: `inventory-valuation-${method}-summary-${Date.now()}.pdf`,
        headers: ["SKU","Product","# Batches","Total Qty","Avg Cost","Total Value","Near-Expiry"],
        rows, meta,
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Inventory Valuation"
        description="Batch-level cost calculations with FIFO and FEFO removal strategies. The consume sequence shows which batch will be sold first."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="h-4 w-4 mr-2" />PDF</Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <div className="stat-card"><div className="stat-label">Total Value</div><div className="stat-value-gradient mt-2">${totals.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">{totals.skus} SKUs · {totals.batches} batches</div></div>
        <div className="stat-card"><div className="stat-label">Total Units</div><div className="stat-value mt-2">{totals.total_qty.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">In available batches</div></div>
        <div className="stat-card"><div className="stat-label">Expired</div><div className="stat-value mt-2 text-destructive">${totals.expired.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">Write-off risk</div></div>
        <div className="stat-card"><div className="stat-label">Critical (≤7d)</div><div className="stat-value mt-2 text-destructive">${totals.critical.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">Urgent markdown</div></div>
        <div className="stat-card"><div className="stat-label">Near-Expiry (≤14d)</div><div className="stat-value mt-2 text-warning">${totals.near_expiry.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[11px] text-muted-foreground mt-1">Markdown candidates</div></div>
        <div className="stat-card"><div className="stat-label">Method</div><div className="stat-value mt-2 gradient-text">{method}</div><div className="text-[11px] text-muted-foreground mt-1">{method === "FIFO" ? "First-in, first-out" : "First-expired, first-out"}</div></div>
      </div>

      {/* Sticky toolbar */}
      <Card className="page-section p-4 mb-4 sticky top-2 z-20 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && <Badge variant="secondary" className="text-[10px]">{activeFilterCount} active</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
              <TabsList className="h-8">
                <TabsTrigger value="FIFO" className="text-xs h-6"><Calculator className="h-3 w-3 mr-1.5" />FIFO</TabsTrigger>
                <TabsTrigger value="FEFO" className="text-xs h-6"><AlertTriangle className="h-3 w-3 mr-1.5" />FEFO</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="sm" className="h-8" onClick={toggleAll}>
              {allOpen ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
              {allOpen ? "Collapse all" : "Expand all"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs">Search SKU / product</Label>
            <Input placeholder="Filter by SKU or name…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Expiry status</Label>
            <Select value={expiryStatus} onValueChange={(v) => setExpiryStatus(v as ExpiryStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="critical">Critical (≤7d)</SelectItem>
                <SelectItem value="warning">Warning (8–30d)</SelectItem>
                <SelectItem value="healthy">Healthy (&gt;30d)</SelectItem>
                <SelectItem value="no_expiry">No expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><ArrowUpDown className="h-3 w-3" />Sort by</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="value_desc">Total value (high → low)</SelectItem>
                <SelectItem value="value_asc">Total value (low → high)</SelectItem>
                <SelectItem value="qty_desc">Quantity (high → low)</SelectItem>
                <SelectItem value="expiry_asc">Soonest expiry first</SelectItem>
                <SelectItem value="name_asc">Product name (A → Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Received from</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Received to</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 md:col-span-3">
            <Switch id="bd" checked={includeBreakdown} onCheckedChange={setIncludeBreakdown} />
            <Label htmlFor="bd" className="text-xs cursor-pointer">Include batch breakdown in export</Label>
          </div>
          {activeFilterCount > 0 && (
            <div className="md:col-span-2 flex justify-end">
              <Button variant="outline" size="sm" className="h-8" onClick={clearAll}>
                <X className="h-3 w-3 mr-1" />Clear filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Method explainer */}
      <div className="text-[11px] text-muted-foreground mb-4 flex items-start gap-2 px-1">
        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>
          <span className="font-semibold">{method === "FIFO" ? "FIFO" : "FEFO"}:</span>{" "}
          {method === "FIFO"
            ? "Oldest received batch is consumed first. Best for non-perishable cost accounting."
            : "Closest-to-expiry batch is consumed first. Reduces spoilage on perishables."}
        </span>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="page-section p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <div className="font-semibold">No batches match the current filters</div>
          <div className="text-xs text-muted-foreground mt-1">Try clearing filters or adjusting the date range.</div>
          {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>Clear all filters</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((g, idx) => (
            <ProductValuationCard
              key={g.product_id}
              g={g}
              method={method}
              rank={idx + 1}
              maxValue={maxValue}
              open={expanded[g.product_id] ?? false}
              onOpenChange={(o) => setExpanded(prev => ({ ...prev, [g.product_id]: o }))}
            />
          ))}
        </div>
      )}
    </>
  );
};

const ProductValuationCard = ({
  g, method, rank, maxValue, open, onOpenChange,
}: {
  g: any; method: Method; rank: number; maxValue: number;
  open: boolean; onOpenChange: (o: boolean) => void;
}) => {
  const valuePct = maxValue ? (g.total_value / maxValue) * 100 : 0;
  const expiryBadge = g.min_days === null ? null
    : g.min_days < 0 ? <Badge variant="destructive" className="text-[10px]">Expired</Badge>
    : g.min_days <= 7 ? <Badge variant="destructive" className="text-[10px]">≤7d</Badge>
    : g.min_days <= 30 ? <Badge className="text-[10px] bg-warning text-warning-foreground hover:bg-warning/90">≤30d</Badge>
    : <Badge variant="outline" className="text-[10px]">{g.min_days}d</Badge>;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="page-section overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full text-left hover:bg-muted/30 transition-colors">
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="text-[10px] font-mono text-muted-foreground w-6">#{rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{g.product.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{g.product.sku}</span>
                  {expiryBadge}
                  {g.product.expiry_trackable && <Badge variant="outline" className="text-[10px]"><Sparkles className="h-2.5 w-2.5 mr-0.5" />Perishable</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {g.lines.length} {g.lines.length === 1 ? "batch" : "batches"} · {Number(g.total_qty).toFixed(0)} units · avg <span className="font-mono">${g.weighted_avg.toFixed(4)}</span>
                  {g.near_expiry_value > 0 && (
                    <span className="ml-2 text-warning"><TrendingDown className="h-3 w-3 inline mr-0.5" />${g.near_expiry_value.toFixed(0)} near-expiry</span>
                  )}
                </div>
                {/* Mini value bar */}
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${valuePct}%` }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Value</div>
                <div className="text-base font-bold tabular-nums">${g.total_value.toFixed(2)}</div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Consume #</TableHead>
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
                  const expiringSoon = l.days_to_expiry !== null && l.days_to_expiry <= 14 && l.days_to_expiry >= 0;
                  const expired = l.days_to_expiry !== null && l.days_to_expiry < 0;
                  return (
                    <TableRow key={l.id} className={`table-row-hover ${l.sequence === 1 ? "bg-primary/5" : ""}`}>
                      <TableCell>
                        <Badge variant={l.sequence === 1 ? "default" : "outline"} className="font-mono text-[10px]">
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
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default Valuation;
