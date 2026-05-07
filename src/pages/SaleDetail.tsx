import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, CheckCircle2, Clock, XCircle, FileCheck2, User, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/exporters";

type Step = {
  key: "CREATED" | "PENDING" | "APPROVED" | "REJECTED" | "POSTED";
  label: string;
  at?: string | null;
  by?: string | null;
  active: boolean;
  done: boolean;
  failed?: boolean;
};

const StepIcon = ({ s }: { s: Step }) => {
  if (s.failed) return <XCircle className="h-5 w-5 text-destructive" />;
  if (s.done) return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (s.active) return <Clock className="h-5 w-5 text-warning" />;
  return <Clock className="h-5 w-5 text-muted-foreground/40" />;
};

const SaleDetail = () => {
  const { id = "" } = useParams();
  const [tx, setTx] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from("sales_transactions").select("*").eq("id", id).maybeSingle();
      const { data: it } = await supabase.from("sales_items")
        .select("*, products(name,sku), inventory_batches(batch_number, expiry_date)")
        .eq("transaction_id", id);
      const { data: a } = await supabase.from("audit_log")
        .select("*").eq("entity_type", "sales_transaction").eq("entity_id", id)
        .order("created_at", { ascending: true });
      setTx(t); setItems(it ?? []); setAudit(a ?? []);

      const ids = Array.from(new Set([t?.approved_by, t?.posted_by, ...(a ?? []).map((x: any) => x.user_id)].filter(Boolean)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.email || p.id; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-muted-foreground p-6">Loading…</div>;
  if (!tx) return <div className="text-muted-foreground p-6">Sale not found.</div>;

  const status = tx.approval_status as string;
  const rejected = status === "REJECTED";
  const posted = !!tx.posted_at;
  const requiresApproval = status === "PENDING" || status === "APPROVED" || status === "REJECTED";

  const steps: Step[] = [
    { key: "CREATED", label: "Created", at: tx.created_at, by: null, done: true, active: false },
    ...(requiresApproval ? [{
      key: "PENDING" as const, label: "Pending Approval",
      at: tx.created_at, done: status !== "PENDING", active: status === "PENDING",
    }] : []),
    ...(rejected ? [{
      key: "REJECTED" as const, label: "Rejected",
      at: tx.approved_at, by: tx.approved_by ? profiles[tx.approved_by] : null,
      done: true, active: false, failed: true,
    }] : requiresApproval ? [{
      key: "APPROVED" as const, label: "Approved",
      at: tx.approved_at, by: tx.approved_by ? profiles[tx.approved_by] : null,
      done: status === "APPROVED" || posted, active: status === "PENDING" ? false : !posted,
    }] : []),
    ...(!rejected ? [{
      key: "POSTED" as const, label: "Posted to Inventory",
      at: tx.posted_at, by: tx.posted_by ? profiles[tx.posted_by] : null,
      done: posted, active: !posted && (status === "APPROVED" || status === "NOT_REQUIRED"),
    }] : []),
  ];

  const buildExportRows = () => {
    const timelineRows = steps.map((s) => [
      "Timeline",
      s.label,
      s.failed ? "REJECTED" : s.done ? "DONE" : s.active ? "CURRENT" : "PENDING",
      s.at ? format(new Date(s.at), "PPp") : "—",
      s.by ?? "—",
      "",
    ]);
    const auditRows = audit.map((a) => [
      "Audit",
      a.action,
      "",
      format(new Date(a.created_at), "PPp"),
      a.user_id ? (profiles[a.user_id] || a.user_id.slice(0, 8)) : "—",
      a.new_value ? JSON.stringify(a.new_value) : "",
    ]);
    return [...timelineRows, ...auditRows];
  };

  const handleExportCSV = () => {
    exportToCSV(`sale-${tx.transaction_id}-audit.csv`,
      ["Source", "Event", "Status", "When", "User", "Details"],
      buildExportRows());
  };
  const handleExportPDF = () => {
    exportToPDF({
      title: `Sale ${tx.transaction_id} — Audit & Timeline`,
      subtitle: tx.customer_name ? `Customer: ${tx.customer_name}` : undefined,
      filename: `sale-${tx.transaction_id}-audit.pdf`,
      headers: ["Source", "Event", "Status", "When", "User", "Details"],
      rows: buildExportRows(),
      meta: {
        Invoice: tx.invoice_number || "—",
        Payment: tx.payment_status,
        Approval: tx.approval_status,
        Total: `$${Number(tx.total_amount).toFixed(2)}`,
      },
    });
  };

  return (
    <>
      <PageHeader
        title={`Sale ${tx.transaction_id}`}
        description={tx.customer_name ? `Customer: ${tx.customer_name}` : "Customer: —"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />PDF
            </Button>
            <Button asChild variant="outline">
              <Link to="/sales"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="font-semibold mb-4 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" />Status Timeline
          </div>
          <ol className="space-y-4 relative border-l border-border/60 ml-2 pl-6">
            {steps.map((s) => (
              <li key={s.key} className="relative">
                <div className="absolute -left-[33px] top-0 bg-background rounded-full p-0.5">
                  <StepIcon s={s} />
                </div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {s.label}
                  {s.active && <Badge variant="outline" className="border-warning/40 text-warning">current</Badge>}
                  {s.failed && <Badge variant="outline" className="border-destructive/40 text-destructive">rejected</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.at ? format(new Date(s.at), "PPp") : "—"}
                  {s.by && <> · <User className="inline h-3 w-3" /> {s.by}</>}
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="font-semibold flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" />Summary</div>
          <Row k="Invoice" v={tx.invoice_number || "—"} />
          <Row k="Customer" v={tx.customer_name || "—"} />
          <Row k="Email" v={tx.customer_email || "—"} />
          <Row k="Payment" v={<Badge variant="outline">{tx.payment_status}</Badge>} />
          <Row k="Approval" v={<Badge variant="outline">{tx.approval_status}</Badge>} />
          <Row k="Total" v={<span className="font-bold tabular-nums">${Number(tx.total_amount).toFixed(2)}</span>} />
          {tx.notes && <Row k="Notes" v={<span className="text-xs">{tx.notes}</span>} />}
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <div className="font-semibold mb-3">Lines ({items.length})</div>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No posted lines yet (sale may still be pending).</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm border rounded p-2">
                <div>
                  <div className="font-medium">{it.products?.name} <span className="font-mono text-xs text-muted-foreground">{it.products?.sku}</span></div>
                  <div className="text-xs text-muted-foreground">
                    Batch <span className="font-mono">{it.inventory_batches?.batch_number || "—"}</span>
                    {it.inventory_batches?.expiry_date && <> · exp {it.inventory_batches.expiry_date}</>}
                    {Number(it.quantity_returned) > 0 && <> · returned {it.quantity_returned}</>}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div>{it.quantity} × ${Number(it.unit_price).toFixed(2)}</div>
                  <div className="font-semibold">${(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 mt-4">
        <div className="font-semibold mb-3">Audit Trail</div>
        {audit.length === 0 ? (
          <div className="text-sm text-muted-foreground">No audit entries.</div>
        ) : (
          <div className="space-y-1">
            {audit.map((a) => (
              <div key={a.id} className="text-xs flex justify-between border-b last:border-0 py-1.5">
                <div>
                  <span className="font-mono">{a.action}</span>
                  {a.user_id && <span className="text-muted-foreground"> · by {profiles[a.user_id] || a.user_id.slice(0, 8)}</span>}
                </div>
                <span className="text-muted-foreground">{format(new Date(a.created_at), "PPp")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

const Row = ({ k, v }: { k: string; v: any }) => (
  <div className="flex justify-between text-sm py-1 border-b last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span className="text-right">{v}</span>
  </div>
);

export default SaleDetail;
