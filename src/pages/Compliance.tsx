import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileSearch, FileText, Truck, ShoppingCart, ShieldCheck, ArrowRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { exportToPDF } from "@/lib/exporters";
import { toast } from "sonner";

const Compliance = () => {
  const [batchNumber, setBatchNumber] = useState("");
  const [trace, setTrace] = useState<any | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("inventory_batches").select("*, products(sku,name)").order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setRecent(data ?? []));
  }, []);

  const search = async (bn?: string) => {
    const q = (bn ?? batchNumber).trim();
    if (!q) return;
    setBatchNumber(q);
    // Batch + product
    const { data: batch } = await supabase.from("inventory_batches")
      .select("*, products(sku,name,expiry_trackable,shelf_life_days,sell_by_days,primary_supplier_id,unit_cost,current_sales_price)")
      .eq("batch_number", q).maybeSingle();
    if (!batch) { setTrace({ notFound: true, batchNumber: q }); return; }

    // Supplier
    const { data: supplier } = batch.products?.primary_supplier_id
      ? await supabase.from("suppliers").select("*").eq("id", batch.products.primary_supplier_id).maybeSingle()
      : { data: null };

    // PO that received this product around received_date
    const { data: poLines } = await supabase.from("purchase_order_lines")
      .select("*, purchase_orders(*, suppliers(name))")
      .eq("product_id", batch.product_id);
    const matchedPO = poLines?.find((l: any) =>
      l.purchase_orders?.received_date === batch.received_date
    ) || poLines?.[0];

    // Sales
    const { data: sales } = await supabase.from("sales_items")
      .select("*, sales_transactions(transaction_id, occurred_at, store_id)")
      .eq("batch_id", batch.id);

    // Markdowns affecting this batch
    const { data: markdowns } = await supabase.from("markdown_events")
      .select("*").or(`batch_id.eq.${batch.id},product_id.eq.${batch.product_id}`)
      .order("effective_date", { ascending: false });

    // Audit trail for this batch
    const { data: audit } = await supabase.from("audit_log").select("*")
      .eq("entity_id", batch.id).order("created_at", { ascending: false });

    setTrace({ batch, supplier, po: matchedPO?.purchase_orders, poLine: matchedPO, sales: sales ?? [], markdowns: markdowns ?? [], audit: audit ?? [] });
  };

  const exportReport = () => {
    if (!trace?.batch) return toast.error("Run a trace first");
    const b = trace.batch;
    const today = new Date();
    const daysToExpiry = b.expiry_date ? differenceInDays(new Date(b.expiry_date), today) : null;

    // Build a flat report: timeline events.
    const events: { when: string; phase: string; detail: string }[] = [];
    if (trace.po) events.push({ when: trace.po.created_at, phase: "PO Created", detail: `${trace.po.po_number} · ${trace.supplier?.name || trace.po.suppliers?.name || "n/a"} · $${Number(trace.po.total_amount).toFixed(2)}` });
    events.push({ when: b.created_at, phase: "Goods Received", detail: `Batch ${b.batch_number} · qty ${b.quantity_available} · cost $${Number(b.unit_cost_at_receipt).toFixed(2)}/unit` });
    (trace.markdowns || []).forEach((m: any) => events.push({ when: m.effective_date, phase: "Markdown Applied", detail: `${m.discount_percent}% off · ${m.reason_code} · price $${Number(m.original_price).toFixed(2)} → $${Number(m.new_price).toFixed(2)}` }));
    (trace.sales || []).forEach((s: any) => events.push({ when: s.sales_transactions?.occurred_at || b.created_at, phase: "Sale", detail: `Tx ${s.sales_transactions?.transaction_id || "—"} · qty ${s.quantity} @ $${Number(s.unit_price).toFixed(2)}` }));
    events.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());

    exportToPDF({
      title: `Batch Traceability Report — ${b.batch_number}`,
      subtitle: `${b.products.name} (${b.products.sku})`,
      filename: `batch-trace-${b.batch_number}-${Date.now()}.pdf`,
      headers: ["When", "Phase", "Detail"],
      rows: events.map(e => [format(new Date(e.when), "yyyy-MM-dd HH:mm"), e.phase, e.detail]),
      meta: {
        "Batch":          b.batch_number,
        "Product":        `${b.products.name} (${b.products.sku})`,
        "Supplier":       trace.supplier?.name || trace.po?.suppliers?.name || "—",
        "PO Number":      trace.po?.po_number || "—",
        "Mfg Date":       b.manufacturing_date ? format(new Date(b.manufacturing_date), "yyyy-MM-dd") : "—",
        "Expiry Date":    b.expiry_date ? `${format(new Date(b.expiry_date), "yyyy-MM-dd")} (${daysToExpiry}d)` : "—",
        "Received":       format(new Date(b.received_date), "yyyy-MM-dd"),
        "Qty Available":  String(b.quantity_available),
        "Cost at Receipt": `$${Number(b.unit_cost_at_receipt).toFixed(4)}`,
        "Status":         b.status,
        "Sales Records":  String(trace.sales?.length || 0),
        "Markdowns":      String(trace.markdowns?.length || 0),
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Compliance & Traceability"
        description="Full batch lifecycle from supplier to sale — required for recall, food-safety and regulatory audits."
        actions={
          <Button variant="outline" size="sm" onClick={exportReport} disabled={!trace?.batch}>
            <FileText className="h-4 w-4 mr-2" />Export Trace Report
          </Button>
        }
      />

      <Card className="p-6 mb-6">
        <Label>Batch Number Lookup</Label>
        <div className="flex gap-2 mt-2 max-w-xl">
          <Input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="Enter batch number" onKeyDown={e => e.key === "Enter" && search()} />
          <Button onClick={() => search()}><Search className="h-4 w-4 mr-2" />Trace</Button>
        </div>

        {trace?.notFound && <p className="text-sm text-destructive mt-4">Batch <span className="font-mono">{trace.batchNumber}</span> not found.</p>}

        {trace?.batch && <TraceTimeline trace={trace} />}
      </Card>

      <h3 className="font-semibold mb-3">Recent Batches</h3>
      <Card className="p-2">
        {recent.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">No batches yet.</div>
        ) : (
          <div className="divide-y">
            {recent.map(b => (
              <div key={b.id} className="flex items-center justify-between p-2.5 hover:bg-muted/40 rounded">
                <div>
                  <div className="font-mono text-xs font-medium">{b.batch_number}</div>
                  <div className="text-xs text-muted-foreground">{b.products?.sku} — {b.products?.name}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => search(b.batch_number)}>Trace</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

const TraceTimeline = ({ trace }: { trace: any }) => {
  const { batch, supplier, po, sales, markdowns, audit } = trace;
  const today = new Date();
  const daysToExpiry = batch.expiry_date ? differenceInDays(new Date(batch.expiry_date), today) : null;
  const expired = daysToExpiry !== null && daysToExpiry < 0;
  const expiring = daysToExpiry !== null && daysToExpiry <= 14;

  return (
    <div className="mt-6 space-y-5">
      {/* Hero card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card md:col-span-2">
          <div className="stat-label">Batch</div>
          <div className="text-2xl font-bold font-mono mt-1">{batch.batch_number}</div>
          <div className="text-sm text-muted-foreground mt-1">{batch.products.name} <span className="font-mono text-xs ml-1">({batch.products.sku})</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="mt-2"><Badge>{batch.status}</Badge></div>
          <div className="text-xs text-muted-foreground mt-2">Qty available: <span className="font-semibold tabular-nums">{Number(batch.quantity_available).toFixed(0)}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expiry</div>
          <div className={`text-xl font-bold mt-1 ${expired ? "text-destructive" : expiring ? "text-warning" : ""}`}>
            {batch.expiry_date ? format(new Date(batch.expiry_date), "PP") : "N/A"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{daysToExpiry !== null ? (expired ? `Expired ${Math.abs(daysToExpiry)}d ago` : `${daysToExpiry} days remaining`) : "Not expiry-tracked"}</div>
        </div>
      </div>

      {/* Lifecycle stages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stage icon={Truck} label="Supplier" headline={supplier?.name || po?.suppliers?.name || "—"} sub={supplier?.contact_email || "—"} />
        <Stage icon={ShoppingCart} label="Purchase Order" headline={po?.po_number || "—"} sub={po ? `$${Number(po.total_amount).toFixed(2)} · ${po.status}` : "—"} />
        <Stage icon={FileSearch} label="Goods Receipt" headline={format(new Date(batch.received_date), "PP")} sub={`Cost $${Number(batch.unit_cost_at_receipt).toFixed(2)} · qty ${batch.quantity_available}`} />
        <Stage icon={ShieldCheck} label="Sales / Outbound" headline={`${sales.length} txns`} sub={markdowns.length ? `${markdowns.length} markdown(s) applied` : "No markdowns"} />
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-primary" />Inbound Provenance</h4>
          <dl className="text-sm space-y-1.5">
            <Row label="Supplier" value={supplier?.name || po?.suppliers?.name || "—"} />
            <Row label="Contact" value={supplier?.contact_email || "—"} mono />
            <Row label="PO Number" value={po?.po_number || "—"} mono />
            <Row label="PO Created" value={po ? format(new Date(po.created_at), "PP") : "—"} />
            <Row label="PO Total" value={po ? `$${Number(po.total_amount).toFixed(2)}` : "—"} />
            <Row label="Manufacturing Date" value={batch.manufacturing_date ? format(new Date(batch.manufacturing_date), "PP") : "—"} />
            <Row label="Received Date" value={format(new Date(batch.received_date), "PP")} />
            <Row label="Cost at Receipt" value={`$${Number(batch.unit_cost_at_receipt).toFixed(4)}`} mono />
          </dl>
        </Card>

        <Card className="p-5">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-success" />Outbound History</h4>
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Markdowns</div>
            {markdowns.length === 0 ? <p className="text-xs text-muted-foreground">No markdowns applied.</p> :
              markdowns.slice(0, 3).map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-mono">{m.discount_percent}% off</Badge>
                  <span className="text-muted-foreground">{m.reason_code} · {format(new Date(m.effective_date), "PP")}</span>
                </div>
              ))
            }
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Sales</div>
            {sales.length === 0 ? <p className="text-xs text-muted-foreground">No sales recorded yet.</p> :
              sales.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs border-b last:border-0 pb-1">
                  <span className="font-mono text-muted-foreground">{s.sales_transactions?.transaction_id || "—"}</span>
                  <span className="tabular-nums">qty {s.quantity} @ ${Number(s.unit_price).toFixed(2)}</span>
                </div>
              ))
            }
          </div>
        </Card>
      </div>

      {/* Audit timeline */}
      {audit.length > 0 && (
        <Card className="p-5">
          <h4 className="font-semibold mb-3 text-sm">Audit Events for this Batch</h4>
          <div className="space-y-2">
            {audit.slice(0, 6).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground tabular-nums">{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
                <span className="text-muted-foreground truncate">{a.new_value ? JSON.stringify(a.new_value).slice(0, 60) : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const Stage = ({ icon: Icon, label, headline, sub }: any) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
    <div className="text-sm font-semibold truncate">{headline}</div>
    <div className="text-xs text-muted-foreground truncate">{sub}</div>
  </Card>
);

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className={`text-xs ${mono ? "font-mono" : "font-medium"} text-right truncate`}>{value}</dd>
  </div>
);

export default Compliance;
