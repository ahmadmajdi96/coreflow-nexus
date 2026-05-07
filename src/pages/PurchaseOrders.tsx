import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Trash2, Package, AlertCircle, CheckCircle2, XCircle, ThumbsUp, ThumbsDown,
  Wallet, FileWarning, Lock, Send, FileCheck, Edit3, Eye, Copy, Loader2,
  Clock, FileDown, ListChecks, Truck, DollarSign, TrendingUp, Upload, ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ReceiptStatusActions } from "@/components/ReceiptStatusActions";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { exportToPDF } from "@/lib/exporters";

interface Line { product_id: string; quantity: number; unit_cost: number }
interface BatchEntry { batch_number?: string; expiry_date?: string; mfg_date?: string }
interface ReceiptErrors { batch_number?: string; expiry_date?: string; mfg_date?: string }
interface Rule {
  id: string; department: string;
  budget_allocated: number; budget_spent_mtd: number;
  threshold_l1: number; threshold_l2: number;
  approver_l1_role: string; approver_l2_role: string; approver_l3_role: string;
  active: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  purchasing_manager: "Purchasing Manager",
  cfo: "CFO",
  system_admin: "System Admin",
};

const resolveApproval = (rule: Rule | undefined, total: number) => {
  if (!rule) return { level: "L1" as const, requiredRole: null as string | null, label: "Auto-approve" };
  if (total <= Number(rule.threshold_l1)) return { level: "L1" as const, requiredRole: null, label: "Auto-approve" };
  if (total <= Number(rule.threshold_l2)) return { level: "L2" as const, requiredRole: rule.approver_l2_role, label: ROLE_LABELS[rule.approver_l2_role] || rule.approver_l2_role };
  return { level: "L3" as const, requiredRole: rule.approver_l3_role, label: `${ROLE_LABELS[rule.approver_l3_role] || rule.approver_l3_role} (escalation)` };
};

const poHeaderIssues = (po: any): string[] => {
  const issues: string[] = [];
  if (!po.supplier_id) issues.push("Supplier missing");
  if (!po.department) issues.push("Department missing");
  if (!po.expected_date) issues.push("Expected date missing");
  if (!po.purchase_order_lines?.length) issues.push("No line items");
  (po.purchase_order_lines || []).forEach((l: any, i: number) => {
    if (!l.product_id) issues.push(`Line ${i + 1}: product missing`);
    if (!l.quantity || Number(l.quantity) <= 0) issues.push(`Line ${i + 1}: quantity must be > 0`);
    if (Number(l.unit_cost) < 0) issues.push(`Line ${i + 1}: unit cost invalid`);
  });
  if (!Number(po.total_amount)) issues.push("Total is zero");
  return issues;
};

const POs = () => {
  const { user, hasRole } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [open, setOpen] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [department, setDepartment] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: 1, unit_cost: 0 }]);

  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [receiving, setReceiving] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailPo, setDetailPo] = useState<any | null>(null);

  const load = () => {
    supabase.from("purchase_orders").select("*, suppliers(name), purchase_order_lines(*, products(sku,name,expiry_trackable,shelf_life_days,sell_by_days))").order("created_at", { ascending: false })
      .then(({ data }) => setPos(data ?? []));
  };
  useEffect(() => {
    load();
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts(data ?? []));
    supabase.from("suppliers").select("*").then(({ data }) => setSuppliers(data ?? []));
    supabase.from("approval_rules").select("*").eq("active", true).order("department").then(({ data }) => {
      const list = (data ?? []) as Rule[];
      setRules(list);
      if (!department && list[0]) setDepartment(list[0].department);
    });
  }, []);

  const setLineProduct = (i: number, productId: string) => {
    const p = products.find(p => p.id === productId);
    const c = [...lines];
    c[i].product_id = productId;
    if (p && !c[i].unit_cost) c[i].unit_cost = Number(p.unit_cost);
    setLines(c);
  };

  const supplierProducts = supplierId ? products.filter(p => p.primary_supplier_id === supplierId || !p.primary_supplier_id) : products;

  const total = lines.reduce((a, l) => a + Number(l.quantity) * Number(l.unit_cost), 0);
  const activeRule = rules.find(r => r.department === department);
  const approval = resolveApproval(activeRule, total);
  const projectedSpent = (activeRule?.budget_spent_mtd ? Number(activeRule.budget_spent_mtd) : 0) + total;
  const allocated = activeRule?.budget_allocated ? Number(activeRule.budget_allocated) : 0;
  const overBudget = allocated > 0 && projectedSpent > allocated;
  const overBy = overBudget ? projectedSpent - allocated : 0;
  const budgetUsedPct = allocated > 0 ? Math.min(100, (Number(activeRule!.budget_spent_mtd) / allocated) * 100) : 0;
  const projectedPct = allocated > 0 ? Math.min(100, (projectedSpent / allocated) * 100) : 0;

  const resetForm = () => {
    setLines([{ product_id: "", quantity: 1, unit_cost: 0 }]);
    setSupplierId(""); setExpected(""); setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lines.some(l => !l.product_id)) return toast.error("Fill all required fields");
    if (!department) return toast.error("Select a department");
    if (overBudget) return toast.error(`Order exceeds department budget by $${overBy.toFixed(2)}`);

    setSubmitting(true);
    try {
      const po_number = `PO-${Date.now()}`;
      const status = approval.level === "L1" ? "APPROVED" : "PENDING_APPROVAL";
      const { data: po, error } = await supabase.from("purchase_orders").insert({
        po_number, supplier_id: supplierId, total_amount: total, status,
        expected_date: expected || null, created_by: user?.id, notes: notes || null,
        department, receipt_status: "DRAFT",
      }).select().single();
      if (error || !po) { toast.error(error?.message); return; }
      const linesPayload = lines.map(l => ({ po_id: po.id, product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }));
      await supabase.from("purchase_order_lines").insert(linesPayload);
      await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "CREATE", new_value: { po_number, total, status, department, approval_level: approval.level }, user_id: user?.id });
      toast.success(`PO ${po_number} created · ${status.replace("_", " ")}`);
      setOpen(false); resetForm(); load();
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (po: any) => {
    setActingId(po.id);
    try {
      const oldVal = { status: po.status };
      await supabase.from("purchase_orders").update({ status: "APPROVED", approved_by: user?.id }).eq("id", po.id);
      await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "APPROVE", old_value: oldVal, new_value: { status: "APPROVED", approved_by: user?.id, total: po.total_amount }, user_id: user?.id });
      toast.success(`${po.po_number} approved`); load();
    } finally { setActingId(null); }
  };
  const reject = async () => {
    if (!rejecting) return;
    setActingId(rejecting.id);
    try {
      const oldVal = { status: rejecting.status };
      await supabase.from("purchase_orders").update({ status: "CANCELLED" }).eq("id", rejecting.id);
      await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: rejecting.id, action: "REJECT", old_value: oldVal, new_value: { status: "CANCELLED", reason: rejectReason }, user_id: user?.id });
      toast.success(`${rejecting.po_number} rejected`);
      setRejecting(null); setRejectReason(""); load();
    } finally { setActingId(null); }
  };

  const submitReceipt = async (po: any, batches: Record<string, BatchEntry>) => {
    setActingId(po.id);
    try {
      for (const line of po.purchase_order_lines) {
        const b = batches[line.id];
        await supabase.from("inventory_batches").insert({
          product_id: line.product_id,
          batch_number: b!.batch_number!,
          manufacturing_date: b?.mfg_date || null,
          expiry_date: b?.expiry_date || null,
          quantity_available: line.quantity,
          unit_cost_at_receipt: line.unit_cost,
          status: "AVAILABLE",
        });
      }
      await supabase.from("purchase_orders").update({
        receipt_status: "SUBMITTED",
        receipt_submitted_by: user?.id,
        receipt_submitted_at: new Date().toISOString(),
      }).eq("id", po.id);
      await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "RECEIPT_SUBMIT", new_value: { receipt_status: "SUBMITTED", lines: po.purchase_order_lines.length }, user_id: user?.id });
      toast.success(`Receipt for ${po.po_number} submitted — awaiting posting`);
      setReceiving(null); load();
    } finally { setActingId(null); }
  };

  const postReceipt = async (po: any) => {
    setActingId(po.id);
    try {
      await supabase.from("purchase_orders").update({
        receipt_status: "POSTED",
        receipt_posted_by: user?.id,
        receipt_posted_at: new Date().toISOString(),
        status: "RECEIVED",
        received_date: new Date().toISOString().slice(0, 10),
      }).eq("id", po.id);
      await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "RECEIPT_POST", new_value: { receipt_status: "POSTED", po_status: "RECEIVED" }, user_id: user?.id });
      toast.success(`Receipt for ${po.po_number} posted to inventory`);
      load();
    } finally { setActingId(null); }
  };

  const clonePo = (po: any) => {
    setSupplierId(po.supplier_id);
    setDepartment(po.department || "");
    setNotes(po.notes ? `Cloned from ${po.po_number}\n${po.notes}` : `Cloned from ${po.po_number}`);
    setExpected("");
    setLines((po.purchase_order_lines || []).map((l: any) => ({
      product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost),
    })));
    setDetailPo(null);
    setOpen(true);
    toast.info(`Cloned ${po.po_number} into a new draft`);
  };

  const pendingApprovals = pos.filter(p => p.status === "PENDING_APPROVAL");
  const activeOrders = pos;
  const pendingReceipts = pos.filter(p => p.status === "APPROVED" && (p.receipt_status === "DRAFT" || p.receipt_status === "SUBMITTED"));

  // KPI calculations
  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
  const mtdSpend = pos
    .filter(p => p.status !== "CANCELLED" && new Date(p.created_at) >= startMonth)
    .reduce((a, p) => a + Number(p.total_amount), 0);
  const overBudgetCount = rules.filter(r => Number(r.budget_allocated) > 0 && Number(r.budget_spent_mtd) > Number(r.budget_allocated)).length;

  const canPost = (po: any) => {
    if (hasRole("system_admin")) return true;
    if (!hasRole("cfo") && !hasRole("purchasing_manager")) return false;
    return po.receipt_submitted_by !== user?.id;
  };

  // ── DataTable columns ──
  const columns: DataTableColumn<any>[] = [
    {
      key: "po_number", header: "PO #", accessor: (r) => r.po_number, sortable: true, filter: "text",
      cell: (r) => <span className="font-mono text-xs font-medium">{r.po_number}</span>,
    },
    { key: "department", header: "Department", accessor: (r) => r.department || "—", filter: "select", sortable: true },
    { key: "supplier", header: "Supplier", accessor: (r) => r.suppliers?.name || "—", filter: "select", sortable: true },
    {
      key: "lines", header: "Lines", accessor: (r) => r.purchase_order_lines?.length || 0,
      align: "center", sortable: true,
      cell: (r) => <Badge variant="outline">{r.purchase_order_lines?.length || 0}</Badge>,
    },
    {
      key: "expected", header: "Expected", accessor: (r) => r.expected_date, sortable: true, filter: "date",
      cell: (r) => <span className="text-sm text-muted-foreground">{r.expected_date ? format(new Date(r.expected_date), "PP") : "—"}</span>,
    },
    {
      key: "total", header: "Total", accessor: (r) => Number(r.total_amount), align: "right", sortable: true,
      cell: (r) => <span className="tabular-nums font-semibold">${Number(r.total_amount).toFixed(2)}</span>,
      exportValue: (r) => Number(r.total_amount).toFixed(2),
    },
    {
      key: "status", header: "Status", accessor: (r) => r.status, filter: "select", sortable: true,
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "receipt_status", header: "Receipt", accessor: (r) => r.receipt_status, filter: "select", sortable: true,
      cell: (r) => <ReceiptStatusBadge status={r.receipt_status} />,
    },
    {
      key: "actions", header: "Actions", accessor: () => "", exportable: false, alwaysVisible: true,
      cell: (r) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDetailPo(r); }}><Eye className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); clonePo(r); }} title="Clone"><Copy className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Create POs with budget checks, route approvals via configurable rules, and post goods receipts."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild><Button className="shadow-md hover:shadow-lg transition-shadow"><Plus className="h-4 w-4 mr-2" />New PO</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create purchase order</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Department *</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{rules.map(r => <SelectItem key={r.id} value={r.department}>{r.department}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Supplier *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Expected Date</Label><Input type="date" value={expected} onChange={e => setExpected(e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Line items ({lines.length})</Label>
                    <span className="text-xs text-muted-foreground">Subtotals update live</span>
                  </div>
                  {lines.map((l, i) => {
                    const sub = Number(l.quantity) * Number(l.unit_cost);
                    return (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                        <Select value={l.product_id} onValueChange={v => setLineProduct(i, v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Product (auto-fills cost)" /></SelectTrigger>
                          <SelectContent>{supplierProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" min={1} placeholder="Qty" className="w-20" value={l.quantity} onChange={e => { const c = [...lines]; c[i].quantity = Number(e.target.value); setLines(c); }} />
                        <Input type="number" step="0.01" placeholder="Unit cost" className="w-28" value={l.unit_cost} onChange={e => { const c = [...lines]; c[i].unit_cost = Number(e.target.value); setLines(c); }} />
                        <span className="w-24 text-right text-sm font-medium tabular-nums">${sub.toFixed(2)}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setLines([...lines, { ...l }])} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { product_id: "", quantity: 1, unit_cost: 0 }])}><Plus className="h-4 w-4 mr-1" />Add line</Button>
                </div>

                <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" /></div>

                <BudgetPanel rule={activeRule} total={total} approval={approval} overBudget={overBudget} overBy={overBy} projectedSpent={projectedSpent} budgetUsedPct={budgetUsedPct} projectedPct={projectedPct} />

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">PO Total · {lines.length} line{lines.length !== 1 ? "s" : ""} · {lines.reduce((a, l) => a + Number(l.quantity), 0)} units</span>
                  <span className="text-2xl font-bold tabular-nums">${total.toFixed(2)}</span>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" disabled={overBudget || total === 0 || submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Submit PO
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4 animate-fade-in">
        <KpiCard icon={ListChecks} label="Pending Approval" value={pendingApprovals.length} accent="warning" />
        <KpiCard icon={Truck} label="Awaiting Receipt" value={pendingReceipts.length} accent="primary" />
        <KpiCard icon={CheckCircle2} label="Posted (MTD)" value={pos.filter(p => p.receipt_status === "POSTED" && new Date(p.receipt_posted_at || p.created_at) >= startMonth).length} accent="success" />
        <KpiCard icon={DollarSign} label="MTD Spend" value={`$${mtdSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent="primary" />
        <KpiCard icon={FileWarning} label="Over-Budget Depts" value={overBudgetCount} accent={overBudgetCount > 0 ? "destructive" : "muted"} />
      </div>

      <Tabs defaultValue="approvals" className="animate-fade-in">
        <TabsList className="mb-4">
          <TabsTrigger value="approvals" className="relative">Approvals
            {pendingApprovals.length > 0 && <Badge className="ml-2 bg-warning text-warning-foreground h-5 px-1.5">{pendingApprovals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="receipts">Goods Receipts
            {pendingReceipts.length > 0 && <Badge className="ml-2 bg-primary text-primary-foreground h-5 px-1.5">{pendingReceipts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all">All Orders ({activeOrders.length})</TabsTrigger>
        </TabsList>

        {/* APPROVALS */}
        <TabsContent value="approvals" className="space-y-3">
          {pendingApprovals.length === 0 ? (
            <Card className="page-section p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All POs are up to date — no orders awaiting approval.</p>
            </Card>
          ) : pendingApprovals.map(po => {
            const rule = rules.find(r => r.department === po.department);
            const ap = resolveApproval(rule, Number(po.total_amount));
            const allocated2 = rule?.budget_allocated ? Number(rule.budget_allocated) : 0;
            const wouldExceed = allocated2 > 0 && (Number(rule!.budget_spent_mtd) + Number(po.total_amount)) > allocated2;
            const userCanApprove = ap.requiredRole ? hasRole(ap.requiredRole as any) || hasRole("system_admin") : false;
            const isActing = actingId === po.id;
            return (
              <Card key={po.id} className="page-section p-5 hover-lift">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <button onClick={() => setDetailPo(po)} className="font-mono text-sm font-semibold hover:underline">{po.po_number}</button>
                      <Badge className="bg-warning/15 text-warning-foreground border-warning/30">Pending Approval</Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">{ap.level} → {ap.label}</Badge>
                      {wouldExceed && <Badge className="bg-destructive/15 text-destructive border-destructive/30"><FileWarning className="h-3 w-3 mr-1" />Over budget by ${(Number(rule!.budget_spent_mtd) + Number(po.total_amount) - allocated2).toFixed(0)}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      <span className="text-foreground font-medium">{po.department || "—"}</span> · {po.suppliers?.name} · {po.purchase_order_lines.length} lines · expected {po.expected_date ? format(new Date(po.expected_date), "PP") : "—"}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div><div className="text-muted-foreground">Order Value</div><div className="text-lg font-bold tabular-nums">${Number(po.total_amount).toFixed(2)}</div></div>
                      <div><div className="text-muted-foreground">L1 → L2 thresholds</div><div className="text-sm font-medium tabular-nums text-muted-foreground">${rule?.threshold_l1 || 0} / ${rule?.threshold_l2 || 0}</div></div>
                      <div><div className="text-muted-foreground">Budget After</div><div className={`text-lg font-bold tabular-nums ${wouldExceed ? "text-destructive" : "text-success"}`}>${(Number(rule?.budget_spent_mtd || 0) + Number(po.total_amount)).toLocaleString()}</div></div>
                    </div>
                    {po.notes && <p className="text-xs italic text-muted-foreground mt-3 p-2 bg-muted/40 rounded">{po.notes}</p>}
                    {(() => {
                      const issues = poHeaderIssues(po);
                      if (!issues.length) return null;
                      return (
                        <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                          <div className="font-semibold flex items-center gap-1 mb-1"><ListChecks className="h-3 w-3" />Pre-submit checklist failed:</div>
                          <ul className="list-disc list-inside space-y-0.5">{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {userCanApprove ? (
                      <>
                        {(() => {
                          const issues = poHeaderIssues(po);
                          const blocked = wouldExceed || isActing || issues.length > 0;
                          return <>
                            <Button size="sm" onClick={() => approve(po)} disabled={blocked} className="bg-success hover:bg-success/90 text-success-foreground" title={issues.length ? issues.join("; ") : ""}>
                              {isActing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-1.5" />}Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRejecting(po)} disabled={isActing} className="border-destructive/30 text-destructive hover:bg-destructive/10"><ThumbsDown className="h-4 w-4 mr-1.5" />Reject</Button>
                          </>;
                        })()}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic max-w-[180px] text-right">Requires {ap.label}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        {/* RECEIPTS */}
        <TabsContent value="receipts" className="space-y-3">
          {pendingReceipts.length === 0 ? (
            <Card className="page-section p-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No approved POs awaiting goods receipt.</p>
            </Card>
          ) : pendingReceipts.map(po => {
            const isCapturer = hasRole("inventory_manager") || hasRole("purchasing_manager") || hasRole("system_admin");
            const captureBlocked = !isCapturer ? "Only Inventory or Purchasing managers can capture receipts." : null;
            const canPostNow = canPost(po);
            const postBlocked = po.receipt_submitted_by === user?.id && !hasRole("system_admin")
              ? "Segregation of duties: a different approver must post this receipt."
              : !canPostNow ? "Requires CFO, Purchasing Manager, or System Admin role to post." : null;

            const actions = po.receipt_status === "DRAFT"
              ? [{ label: "Capture & Submit", icon: Send, next: "SUBMITTED" as const, onClick: () => setReceiving(po), blockedReason: captureBlocked }]
              : po.receipt_status === "SUBMITTED"
              ? [{ label: actingId === po.id ? "Posting…" : "Post to Inventory", icon: actingId === po.id ? Loader2 : FileCheck, next: "POSTED" as const, onClick: () => postReceipt(po), blockedReason: actingId === po.id ? "Posting in progress…" : postBlocked, variant: "success" as const }]
              : [];

            return (
              <Card key={po.id} className="page-section p-5 hover-lift">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => setDetailPo(po)} className="font-mono text-sm font-semibold hover:underline">{po.po_number}</button>
                      <Badge variant="outline">{po.department || "—"}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {po.suppliers?.name} · {po.purchase_order_lines.length} lines · ${Number(po.total_amount).toFixed(2)}
                    </div>
                    {po.receipt_status === "SUBMITTED" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted {po.receipt_submitted_at ? format(new Date(po.receipt_submitted_at), "PPp") : ""} — awaiting independent posting.
                      </p>
                    )}
                  </div>
                </div>
                <ReceiptStatusActions current={po.receipt_status as any} actions={actions} />
              </Card>
            );
          })}
        </TabsContent>

        {/* ALL — DataTable */}
        <TabsContent value="all">
          <DataTable
            tableId="purchase_orders"
            rows={activeOrders}
            columns={columns}
            rowKey={(r) => r.id}
            createdAtKey="created_at"
            exportFilename="purchase-orders"
            emptyMessage="No purchase orders yet."
            onRowClick={(r) => setDetailPo(r)}
            pageSize={25}
          />
        </TabsContent>
      </Tabs>

      <ReceiveDialog po={receiving} onClose={() => setReceiving(null)} onSubmit={submitReceipt} acting={actingId === receiving?.id} />

      <Dialog open={!!rejecting} onOpenChange={() => { setRejecting(null); setRejectReason(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject {rejecting?.po_number}?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This will cancel the purchase order. Provide a reason for the audit log.</p>
            <div><Label>Reason *</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Duplicate order, supplier issue…" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={!rejectReason.trim() || actingId === rejecting?.id}>
              {actingId === rejecting?.id && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PoDetailDialog po={detailPo} rules={rules} onClose={() => setDetailPo(null)} onClone={clonePo} />
    </>
  );
};

const KpiCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent: "primary" | "success" | "warning" | "destructive" | "muted" }) => {
  const map = {
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning-foreground border-warning/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Card className="p-4 hover-lift">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${map[accent]}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-bold tabular-nums truncate">{value}</div>
        </div>
      </div>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const cls = status === "RECEIVED" ? "bg-success/10 text-success border-success/30"
    : status === "APPROVED" ? "bg-primary/10 text-primary border-primary/30"
    : status === "CANCELLED" ? "bg-destructive/10 text-destructive border-destructive/30"
    : status === "PENDING_APPROVAL" ? "bg-warning/10 text-warning-foreground border-warning/30"
    : "bg-muted text-muted-foreground border-border";
  return <span className={`pill ${cls}`}>{status.replace(/_/g, " ")}</span>;
};

const ReceiptStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    DRAFT:     { cls: "bg-muted text-muted-foreground border-border", icon: Edit3, label: "Draft" },
    SUBMITTED: { cls: "bg-warning/10 text-warning-foreground border-warning/30", icon: Send, label: "Submitted" },
    POSTED:    { cls: "bg-success/10 text-success border-success/30", icon: Lock, label: "Posted · locked" },
  };
  const it = map[status] || map.DRAFT;
  const Icon = it.icon;
  return <span className={`pill ${it.cls}`}><Icon className="h-3 w-3" />{it.label}</span>;
};

const BudgetPanel = ({ rule, total, approval, overBudget, overBy, projectedSpent, budgetUsedPct, projectedPct }: any) => {
  if (!rule) return <Card className="p-4 border-warning/30 bg-warning/5 text-sm"><AlertCircle className="h-4 w-4 inline mr-2 text-warning" />Select a department to evaluate budget rules.</Card>;
  return (
    <Card className={`p-4 border-2 ${overBudget ? "border-destructive bg-destructive/5" : approval.level === "L3" ? "border-warning/40 bg-warning/5" : approval.level === "L2" ? "border-primary/30 bg-primary/5" : "border-success/30 bg-success/5"}`}>
      <div className="flex items-start gap-3">
        <Wallet className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
        <div className="flex-1 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">{rule.department} · Budget & Approval Routing</div>
            <Badge variant="outline" className="font-mono">{approval.level} · {approval.label}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
            <div><div className="text-muted-foreground">Allocated</div><div className="tabular-nums font-medium">${Number(rule.budget_allocated).toLocaleString()}</div></div>
            <div><div className="text-muted-foreground">Spent MTD</div><div className="tabular-nums font-medium">${Number(rule.budget_spent_mtd).toLocaleString()}</div></div>
            <div><div className="text-muted-foreground">After this PO</div><div className={`tabular-nums font-bold ${overBudget ? "text-destructive" : "text-success"}`}>${projectedSpent.toLocaleString()}</div></div>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${budgetUsedPct}%`, background: "hsl(var(--muted-foreground) / 0.5)" }} />
            <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${projectedPct}%`, background: overBudget ? "hsl(var(--destructive))" : "var(--gradient-primary)", opacity: 0.85 }} />
          </div>
          {overBudget ? (
            <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div><strong>Submission blocked.</strong> Exceeds {rule.department} budget by <span className="font-mono font-bold">${overBy.toFixed(2)}</span>. Reduce order, defer to next month, or request budget increase from CFO.</div>
            </div>
          ) : approval.level !== "L1" && (
            <div className="mt-2 text-xs text-muted-foreground">
              ⓘ Order ≥ ${approval.level === "L2" ? Number(rule.threshold_l1).toLocaleString() : Number(rule.threshold_l2).toLocaleString()} → routed to <span className="font-semibold text-foreground">{approval.label}</span> for approval before receiving.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const PoDetailDialog = ({ po, onClose, onClone }: { po: any; onClose: () => void; onClone: (po: any) => void }) => {
  const [audit, setAudit] = useState<any[]>([]);
  useEffect(() => {
    if (!po) return;
    supabase.from("audit_log").select("*").eq("entity_type", "purchase_order").eq("entity_id", po.id).order("created_at", { ascending: true })
      .then(({ data }) => setAudit(data ?? []));
  }, [po?.id]);

  if (!po) return null;

  const timeline = [
    { label: "Created", at: po.created_at, by: po.created_by, done: true },
    { label: "Approved", at: po.status === "CANCELLED" ? null : (po.status === "APPROVED" || po.status === "RECEIVED" ? po.updated_at : null), by: po.approved_by, done: po.status === "APPROVED" || po.status === "RECEIVED" },
    { label: "Receipt Submitted", at: po.receipt_submitted_at, by: po.receipt_submitted_by, done: !!po.receipt_submitted_at },
    { label: "Receipt Posted", at: po.receipt_posted_at, by: po.receipt_posted_by, done: po.receipt_status === "POSTED" },
  ];

  const downloadPdf = () => {
    const headers = ["#", "SKU", "Product", "Qty", "Unit Cost", "Subtotal"];
    const rows = (po.purchase_order_lines || []).map((l: any, i: number) => [
      i + 1, l.products?.sku || "—", l.products?.name || "—",
      Number(l.quantity), `$${Number(l.unit_cost).toFixed(2)}`,
      `$${(Number(l.quantity) * Number(l.unit_cost)).toFixed(2)}`,
    ]);
    rows.push(["", "", "", "", "TOTAL", `$${Number(po.total_amount).toFixed(2)}`]);
    exportToPDF({
      title: `Purchase Order ${po.po_number}`,
      filename: `${po.po_number}.pdf`,
      subtitle: `${po.suppliers?.name || ""} · ${po.department || ""}`,
      headers, rows,
      meta: {
        "PO Number": po.po_number,
        "Status": po.status,
        "Receipt": po.receipt_status,
        "Supplier": po.suppliers?.name || "—",
        "Department": po.department || "—",
        "Expected": po.expected_date ? format(new Date(po.expected_date), "PP") : "—",
        "Created": format(new Date(po.created_at), "PPp"),
        "Notes": po.notes || "—",
      },
    });
  };

  return (
    <Dialog open={!!po} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{po.po_number}</span>
            <StatusBadge status={po.status} />
            <ReceiptStatusBadge status={po.receipt_status} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Field label="Supplier" value={po.suppliers?.name} />
          <Field label="Department" value={po.department} />
          <Field label="Expected" value={po.expected_date ? format(new Date(po.expected_date), "PP") : "—"} />
          <Field label="Total" value={`$${Number(po.total_amount).toFixed(2)}`} bold />
        </div>

        {po.notes && <Card className="p-3 bg-muted/40 text-sm italic">{po.notes}</Card>}

        <Separator />

        <div>
          <h4 className="text-sm font-semibold mb-2">Line items ({po.purchase_order_lines?.length || 0})</h4>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr><th className="text-left p-2">SKU</th><th className="text-left p-2">Product</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit Cost</th><th className="text-right p-2">Subtotal</th></tr>
              </thead>
              <tbody>
                {(po.purchase_order_lines || []).map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{l.products?.sku}</td>
                    <td className="p-2">{l.products?.name}</td>
                    <td className="p-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="p-2 text-right tabular-nums">${Number(l.unit_cost).toFixed(2)}</td>
                    <td className="p-2 text-right tabular-nums font-medium">${(Number(l.quantity) * Number(l.unit_cost)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={4} className="p-2 text-right">Total</td>
                  <td className="p-2 text-right tabular-nums">${Number(po.total_amount).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</h4>
          <div className="space-y-2">
            {timeline.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`h-2 w-2 rounded-full ${t.done ? "bg-success" : "bg-muted"}`} />
                <span className={`font-medium ${t.done ? "" : "text-muted-foreground"}`}>{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.at ? format(new Date(t.at), "PPp") : "Pending"}</span>
              </div>
            ))}
          </div>
        </div>

        {audit.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Audit log ({audit.length})</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                {audit.map(a => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="font-mono text-[10px]">{a.action}</Badge>
                    <span className="text-muted-foreground">{format(new Date(a.created_at), "PPp")}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onClone(po)}><Copy className="h-4 w-4 mr-1.5" />Clone</Button>
          <Button variant="outline" onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1.5" />Download PDF</Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, value, bold }: { label: string; value: any; bold?: boolean }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`${bold ? "text-lg font-bold tabular-nums" : "font-medium"}`}>{value || "—"}</div>
  </div>
);

const ReceiveDialog = ({ po, onClose, onSubmit, acting }: any) => {
  const [batches, setBatches] = useState<Record<string, BatchEntry>>({});
  const [errors, setErrors] = useState<Record<string, ReceiptErrors>>({});
  const [touched, setTouched] = useState(false);

  if (!po) return null;
  const today = new Date().toISOString().slice(0, 10);

  const validateLine = (lineId: string, isExp: boolean, b: BatchEntry): ReceiptErrors => {
    const e: ReceiptErrors = {};
    if (!b.batch_number?.trim()) e.batch_number = "Batch number is required";
    else if (b.batch_number.length < 3) e.batch_number = "Min 3 characters";
    if (isExp) {
      if (!b.expiry_date) e.expiry_date = "Expiry date is required for expiry-tracked items";
      else if (b.expiry_date <= today) e.expiry_date = "Expiry must be in the future";
    }
    if (b.mfg_date && b.expiry_date && b.mfg_date >= b.expiry_date) e.mfg_date = "Mfg date must be before expiry";
    if (b.mfg_date && b.mfg_date > today) e.mfg_date = "Mfg date cannot be in the future";
    return e;
  };

  const updateBatch = (lineId: string, field: keyof BatchEntry, value: string, isExp: boolean) => {
    const next = { ...batches, [lineId]: { ...batches[lineId], [field]: value } };
    setBatches(next);
    if (touched) setErrors({ ...errors, [lineId]: validateLine(lineId, isExp, next[lineId]) });
  };

  const submit = () => {
    setTouched(true);
    const allErrors: Record<string, ReceiptErrors> = {};
    let hasErrors = false;
    for (const line of po.purchase_order_lines) {
      const e = validateLine(line.id, line.products.expiry_trackable, batches[line.id] || {});
      if (Object.keys(e).length) { allErrors[line.id] = e; hasErrors = true; }
    }
    setErrors(allErrors);
    if (hasErrors) return toast.error("Please fix the validation errors before submitting");
    onSubmit(po, batches);
  };

  const expCount = po.purchase_order_lines.filter((l: any) => l.products.expiry_trackable).length;

  return (
    <Dialog open={!!po} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capture Goods Receipt — {po.po_number}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            <Badge variant="outline" className="mr-2">Step 1 of 2 · Submit for Posting</Badge>
            After submit, a different approver must <strong>Post</strong> the receipt to inventory (segregation of duties).
            {expCount > 0 && <> <span className="text-primary font-medium">{expCount} expiry-tracked line{expCount > 1 ? "s" : ""}</span> require valid batch and expiry data.</>}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          {po.purchase_order_lines.map((l: any) => {
            const isExp = l.products.expiry_trackable;
            const b = batches[l.id] || {};
            const e = errors[l.id] || {};
            return (
              <Card key={l.id} className={`p-4 transition-all ${isExp ? "border-l-4 border-l-primary" : ""} ${Object.keys(e).length ? "border-destructive/40 bg-destructive/5" : ""}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium">{l.products.name} <span className="text-muted-foreground font-mono text-xs ml-2">{l.products.sku}</span></div>
                    <div className="text-sm text-muted-foreground">Qty: {l.quantity} @ ${Number(l.unit_cost).toFixed(2)}</div>
                  </div>
                  {isExp && <Badge className="bg-primary/10 text-primary border-primary/30">Expiry Tracked</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Batch # <span className="text-destructive">*</span></Label>
                    <Input value={b.batch_number || ""} onChange={ev => updateBatch(l.id, "batch_number", ev.target.value, isExp)} placeholder="e.g. B20260501" className={e.batch_number ? "border-destructive" : ""} aria-invalid={!!e.batch_number} />
                    {e.batch_number && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" />{e.batch_number}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Mfg date</Label>
                    <Input type="date" max={today} value={b.mfg_date || ""} onChange={ev => updateBatch(l.id, "mfg_date", ev.target.value, isExp)} className={e.mfg_date ? "border-destructive" : ""} />
                    {e.mfg_date && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" />{e.mfg_date}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Expiry {isExp && <span className="text-destructive">*</span>}</Label>
                    <Input type="date" min={today} value={b.expiry_date || ""} onChange={ev => updateBatch(l.id, "expiry_date", ev.target.value, isExp)} className={e.expiry_date ? "border-destructive" : ""} aria-invalid={!!e.expiry_date} />
                    {e.expiry_date && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" />{e.expiry_date}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={acting}>Cancel</Button>
          <Button onClick={submit} disabled={acting}>
            {acting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}Submit Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default POs;
