import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Settings2, AlertTriangle, ChevronRight } from "lucide-react";
import { DataTable } from "@/components/DataTable";

const ROLES = [
  { value: "purchasing_manager", label: "Purchasing Manager" },
  { value: "cfo", label: "CFO" },
  { value: "system_admin", label: "System Admin" },
];

interface Rule {
  id: string;
  department: string;
  budget_allocated: number;
  budget_spent_mtd: number;
  threshold_l1: number;
  threshold_l2: number;
  approver_l1_role: string;
  approver_l2_role: string;
  approver_l3_role: string;
  active: boolean;
  created_at?: string;
}

const empty: Partial<Rule> = {
  department: "", budget_allocated: 0, budget_spent_mtd: 0,
  threshold_l1: 5000, threshold_l2: 25000,
  approver_l1_role: "purchasing_manager", approver_l2_role: "cfo", approver_l3_role: "system_admin",
  active: true,
};

const ApprovalRules = () => {
  const { hasRole, user } = useAuth();
  const canEdit = hasRole("system_admin") || hasRole("cfo");
  const [rules, setRules] = useState<Rule[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Rule>>(empty);

  const load = () => supabase.from("approval_rules").select("*").order("department").then(({ data }) => setRules((data ?? []) as any));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.department?.trim()) return toast.error("Department is required");
    if ((editing.threshold_l2 ?? 0) <= (editing.threshold_l1 ?? 0)) return toast.error("L2 threshold must be greater than L1");
    const payload = { ...editing } as any;
    const isUpdate = !!editing.id;
    const { error } = isUpdate
      ? await supabase.from("approval_rules").update(payload).eq("id", editing.id!)
      : await supabase.from("approval_rules").insert(payload);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({
      entity_type: "approval_rule", action: isUpdate ? "UPDATE" : "CREATE", new_value: payload, user_id: user?.id,
    });
    toast.success(`Rule ${isUpdate ? "updated" : "created"}`);
    setOpen(false); setEditing(empty); load();
  };

  return (
    <>
      <PageHeader
        title="Approval Rules"
        description="Configure per-department PO approval thresholds, escalation paths, and budgets."
        actions={canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(empty); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Rule</Button></DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing.id ? "Edit" : "Create"} approval rule</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Department *</Label><Input value={editing.department || ""} onChange={e => setEditing({ ...editing, department: e.target.value })} placeholder="e.g. Operations" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Budget Allocated ($)</Label><Input type="number" value={editing.budget_allocated} onChange={e => setEditing({ ...editing, budget_allocated: Number(e.target.value) })} /></div>
                  <div><Label>Spent MTD ($)</Label><Input type="number" value={editing.budget_spent_mtd} onChange={e => setEditing({ ...editing, budget_spent_mtd: Number(e.target.value) })} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Escalation thresholds</Label>
                  <Card className="p-3 space-y-3 bg-muted/30">
                    <RuleRow level="L1" thresholdLabel="Auto-approve below" value={editing.threshold_l1!} onValue={(v: number) => setEditing({ ...editing, threshold_l1: v })} role={editing.approver_l1_role!} onRole={(r: string) => setEditing({ ...editing, approver_l1_role: r })} />
                    <RuleRow level="L2" thresholdLabel="Standard approval up to" value={editing.threshold_l2!} onValue={(v: number) => setEditing({ ...editing, threshold_l2: v })} role={editing.approver_l2_role!} onRole={(r: string) => setEditing({ ...editing, approver_l2_role: r })} />
                    <RuleRow level="L3" thresholdLabel="Above L2 (escalation)" value={null} onValue={() => {}} role={editing.approver_l3_role!} onRole={(r: string) => setEditing({ ...editing, approver_l3_role: r })} />
                  </Card>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={editing.active ?? true} onCheckedChange={(v: boolean) => setEditing({ ...editing, active: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      {!canEdit && (
        <Card className="p-4 mb-4 border-warning/40 bg-warning/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div className="text-sm"><div className="font-semibold">Read-only view</div><p className="text-muted-foreground text-xs">Only Admin and CFO roles can edit approval rules.</p></div>
        </Card>
      )}

      <DataTable
        rows={rules as any[]}
        rowKey={(r: any) => r.id}
        exportFilename="approval-rules"
        createdAtKey="created_at"
        columns={[
          { key: "department", header: "Department", accessor: (r: any) => r.department, sortable: true, filter: "text", cell: (r: any) => <div className="font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" />{r.department}</div> },
          { key: "budget", header: "Budget", accessor: (r: any) => Number(r.budget_allocated), sortable: true, align: "right", cell: (r: any) => (
            <div className="text-right text-sm">
              <div className="tabular-nums font-medium">${Number(r.budget_allocated).toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">spent ${Number(r.budget_spent_mtd).toLocaleString()}</div>
            </div>
          ) },
          { key: "utilization", header: "Utilization", accessor: (r: any) => r.budget_allocated > 0 ? (Number(r.budget_spent_mtd) / Number(r.budget_allocated)) * 100 : 0, sortable: true, cell: (r: any) => {
            const used = r.budget_allocated > 0 ? (Number(r.budget_spent_mtd) / Number(r.budget_allocated)) * 100 : 0;
            const overBudget = used > 100;
            return (
              <div className="w-48">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${Math.min(100, used)}%`, background: overBudget ? "hsl(var(--destructive))" : "var(--gradient-primary)" }} />
                </div>
                <div className={`text-[11px] tabular-nums mt-0.5 ${overBudget ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{used.toFixed(0)}% used</div>
              </div>
            );
          } },
          { key: "approval_path", header: "Approval Path", accessor: (r: any) => `L1<=${r.threshold_l1}/L2<=${r.threshold_l2}`, cell: (r: any) => (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="pill bg-success/10 border-success/30 text-success">&le; ${Number(r.threshold_l1).toLocaleString()}<span className="text-muted-foreground ml-1">auto</span></span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="pill bg-primary/10 border-primary/30 text-primary">&le; ${Number(r.threshold_l2).toLocaleString()}<span className="text-muted-foreground ml-1">{labelFor(r.approver_l2_role)}</span></span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="pill bg-warning/10 border-warning/30 text-warning-foreground">&gt; ${Number(r.threshold_l2).toLocaleString()}<span className="text-muted-foreground ml-1">{labelFor(r.approver_l3_role)}</span></span>
            </div>
          ) },
          { key: "active", header: "Status", accessor: (r: any) => r.active ? "Active" : "Inactive", filter: "select", cell: (r: any) => <Badge variant={r.active ? "default" : "outline"}>{r.active ? "Active" : "Inactive"}</Badge> },
          ...(canEdit ? [{ key: "actions", header: "", accessor: () => "", exportable: false, align: "right" as const, cell: (r: any) => <Button size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); setEditing(r); setOpen(true); }}>Edit</Button> }] : []),
        ]}
        emptyMessage="No approval rules configured."
      />
    </>
  );
};

const RuleRow = ({ level, thresholdLabel, value, onValue, role, onRole }: any) => (
  <div className="grid grid-cols-[60px_1fr_1fr] gap-2 items-end">
    <Badge className="justify-center">{level}</Badge>
    <div>
      <Label className="text-xs">{thresholdLabel}</Label>
      {value !== null ? (
        <Input type="number" value={value} onChange={e => onValue(Number(e.target.value))} />
      ) : <Input value="∞" disabled />}
    </div>
    <div>
      <Label className="text-xs">Approver role</Label>
      <Select value={role} onValueChange={onRole}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  </div>
);

const labelFor = (role: string) => ROLES.find(r => r.value === role)?.label || role;

export default ApprovalRules;
