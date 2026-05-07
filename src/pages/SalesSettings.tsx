import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Settings2, ShieldCheck, Clock, History } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

const SalesSettings = () => {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("system_admin") || hasRole("cfo");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [buffer, setBuffer] = useState(0);
  const [threshold, setThreshold] = useState(5000);
  const [updaterName, setUpdaterName] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: st } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
    if (st) {
      setSettings(st);
      setBuffer(Number(st.sell_by_buffer_days ?? 0));
      setThreshold(Number(st.sales_approval_threshold ?? 5000));
      if (st.updated_by) {
        const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", st.updated_by).maybeSingle();
        setUpdaterName(prof?.full_name || prof?.email || null);
      }
    }
    const { data: log } = await supabase.from("audit_log")
      .select("*").eq("entity_type", "app_settings").order("created_at", { ascending: false }).limit(10);
    setAuditTrail(log ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const dirty = settings && (
    Number(settings.sell_by_buffer_days) !== buffer ||
    Number(settings.sales_approval_threshold) !== threshold
  );

  const save = async () => {
    if (!settings || !canEdit) return;
    if (buffer < 0 || threshold < 0) return toast.error("Values must be non-negative");
    setSaving(true);
    const old = { sell_by_buffer_days: settings.sell_by_buffer_days, sales_approval_threshold: settings.sales_approval_threshold };
    const next = { sell_by_buffer_days: buffer, sales_approval_threshold: threshold };
    const { error } = await supabase.from("app_settings")
      .update({ ...next, updated_at: new Date().toISOString(), updated_by: user?.id } as any)
      .eq("id", settings.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({
      entity_type: "app_settings", entity_id: settings.id, action: "SETTINGS_UPDATED",
      old_value: old, new_value: next, user_id: user?.id,
    });
    toast.success("Sales settings saved");
    load();
  };

  return (
    <>
      <PageHeader
        title="Sales Settings"
        description="Configure FEFO sell-by buffer and approval threshold for sales orders."
        badge={<Badge variant="outline"><Settings2 className="h-3 w-3 mr-1" />Admin / CFO</Badge>}
      />

      {!canEdit && (
        <Card className="p-4 mb-4 border-warning/40 bg-warning/5 text-sm">
          You can view these settings but only Admin or CFO can change them.
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Sell-by Buffer</div>
              <div className="text-xs text-muted-foreground">Block batches expiring within this many days from being sold.</div>
            </div>
          </div>
          <div>
            <Label>Days</Label>
            <Input type="number" min={0} value={buffer} onChange={e => setBuffer(Number(e.target.value))} disabled={!canEdit || loading} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Effective buffer = max(global, product-level <code>sell_by_days</code>).
            </p>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Approval Threshold</div>
              <div className="text-xs text-muted-foreground">Sales at or above this total require approval before posting.</div>
            </div>
          </div>
          <div>
            <Label>Amount ($)</Label>
            <Input type="number" min={0} value={threshold} onChange={e => setThreshold(Number(e.target.value))} disabled={!canEdit || loading} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Below threshold: sale posts immediately. At/above: status enters PENDING until APPROVED.
            </p>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-muted-foreground">
          {settings?.updated_at && (
            <>Last updated {format(new Date(settings.updated_at), "PPp")}{updaterName ? ` by ${updaterName}` : ""}</>
          )}
        </div>
        <Button onClick={save} disabled={!canEdit || !dirty || saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <Card className="p-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <div className="font-semibold text-sm">Recent changes</div>
        </div>
        {auditTrail.length === 0 ? (
          <div className="text-sm text-muted-foreground">No history yet.</div>
        ) : (
          <div className="space-y-2">
            {auditTrail.map(a => (
              <div key={a.id} className="text-xs border rounded p-2 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{a.action}</div>
                  <div className="text-muted-foreground">
                    Buffer {a.old_value?.sell_by_buffer_days ?? "—"} → <b>{a.new_value?.sell_by_buffer_days ?? "—"}</b> ·
                    Threshold ${a.old_value?.sales_approval_threshold ?? "—"} → <b>${a.new_value?.sales_approval_threshold ?? "—"}</b>
                  </div>
                </div>
                <div className="text-muted-foreground whitespace-nowrap">{format(new Date(a.created_at), "PPp")}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

export default SalesSettings;
