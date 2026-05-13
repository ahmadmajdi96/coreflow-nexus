import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, ArrowRight, ExternalLink, Loader2, RefreshCw, Layers, ShoppingCart, Package, Receipt, Undo2, Bell, FileDown, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { exportToCSV, exportToPDF } from "@/lib/exporters";
import { filterLinks, filterInsights, canSeeLink } from "@/lib/aiAccess";

const ICONS: Record<string, any> = { batch: Layers, po: ShoppingCart, product: Package, sale: Receipt, return: Undo2 };

interface Brief { brief_date: string; headline: string; insights: string[]; actions: string[]; links: any[]; context: any }
interface Sub { id: string; user_id: string; enabled: boolean; frequency: string; delivery_hour: number; team: string | null }

const FREQS = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays only" },
  { value: "weekly", label: "Weekly (Monday)" },
];

const DailyBrief = () => {
  const { user, roles, hasRole } = useAuth();
  const isManager = hasRole("system_admin") || hasRole("cfo");

  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [mySub, setMySub] = useState<Sub | null>(null);
  const [allSubs, setAllSubs] = useState<Sub[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [b, s, all] = await Promise.all([
      supabase.from("ai_daily_briefs").select("*").order("brief_date", { ascending: false }).limit(7),
      user ? supabase.from("ai_brief_subscriptions").select("*").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      isManager ? supabase.from("ai_brief_subscriptions").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    setBriefs((b.data as any) ?? []);
    setMySub((s as any).data ?? null);
    const subs = ((all as any).data ?? []) as Sub[];
    setAllSubs(subs);
    if (subs.length) {
      const ids = Array.from(new Set(subs.map((x) => x.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,email,full_name").in("id", ids);
      const m: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { m[p.id] = p.full_name || p.email || p.id; });
      setProfiles(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id, isManager]);

  const generateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-daily-brief", { body: {} });
      if (error || (data as any)?.error) throw new Error((error as any)?.message || (data as any)?.error);
      toast.success("Brief generated");
      await load();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setGenerating(false); }
  };

  const upsertSub = async (patch: Partial<Sub>) => {
    if (!user) return;
    const next = { user_id: user.id, enabled: true, frequency: "daily", delivery_hour: 7, ...mySub, ...patch };
    setMySub(next as Sub);
    const { error } = await supabase.from("ai_brief_subscriptions").upsert(next, { onConflict: "user_id" });
    if (error) toast.error("Failed to save preferences");
    else toast.success("Preferences saved");
  };

  const updateOtherSub = async (id: string, patch: Partial<Sub>) => {
    const { error } = await supabase.from("ai_brief_subscriptions").update(patch).eq("id", id);
    if (error) toast.error("Failed"); else { toast.success("Updated"); load(); }
  };

  // Filter brief content by persona
  const visibleBriefs = useMemo(() => briefs.map((b) => ({
    ...b,
    insights: filterInsights(b.insights ?? [], roles),
    links: filterLinks(b.links ?? [], roles),
  })), [briefs, roles]);

  const last = visibleBriefs[0];

  const exportPdf = () => {
    if (!last) return;
    const rows: (string | number)[][] = [];
    last.insights.forEach((i) => rows.push(["Insight", i]));
    last.actions.forEach((a) => rows.push(["Action", a]));
    last.links.forEach((l: any) => rows.push([`Link · ${l.type}`, l.label]));
    exportToPDF({
      title: "AI Operations Brief",
      subtitle: last.headline,
      filename: `ai-brief-${last.brief_date}.pdf`,
      headers: ["Type", "Detail"],
      rows,
      meta: { Date: last.brief_date, "Generated for": user?.email ?? "", Roles: roles.join(", ") || "—" },
    });
  };

  const exportCsv = () => {
    if (!last) return;
    const rows: (string | number)[][] = [];
    last.insights.forEach((i) => rows.push(["insight", "", i]));
    last.actions.forEach((a) => rows.push(["action", "", a]));
    last.links.forEach((l: any) => rows.push(["link", l.type, l.label]));
    exportToCSV(`ai-brief-${last.brief_date}.csv`, ["Type", "Subtype", "Detail"], rows);
  };

  return (
    <>
      <PageHeader title="AI Operations Brief" description="Daily AI-generated summary of expiring batches, replenishment urgency, and sales anomalies — filtered to your role." />

      {/* My subscription */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Bell className="h-5 w-5" /></div>
          <div className="flex-1">
            <div className="font-medium text-sm">My notification preferences</div>
            <div className="text-xs text-muted-foreground">Choose how often and when you receive the brief.</div>
          </div>
          <Button size="sm" variant="outline" onClick={generateNow} disabled={generating}>
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} Generate now
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Enabled</label>
            <div className="h-9 flex items-center"><Switch checked={!!mySub?.enabled} onCheckedChange={(v) => upsertSub({ enabled: v })} /></div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Frequency</label>
            <Select value={mySub?.frequency ?? "daily"} onValueChange={(v) => upsertSub({ frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FREQS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Delivery hour (0–23)</label>
            <Input type="number" min={0} max={23} value={mySub?.delivery_hour ?? 7} onChange={(e) => upsertSub({ delivery_hour: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Team (optional)</label>
            <Input value={mySub?.team ?? ""} onChange={(e) => upsertSub({ team: e.target.value })} placeholder="e.g. Operations EU" />
          </div>
        </div>
      </Card>

      {/* Manager: all subscriptions */}
      {isManager && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Team subscriptions</h3>
            <Badge variant="outline" className="text-[10px]">{allSubs.length} users</Badge>
          </div>
          {allSubs.length === 0 && <div className="text-xs text-muted-foreground">No subscriptions yet.</div>}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {allSubs.map((s) => (
              <div key={s.id} className="grid grid-cols-12 items-center gap-2 text-xs py-1.5 border-b border-border last:border-0">
                <div className="col-span-3 truncate font-medium">{profiles[s.user_id] || s.user_id.slice(0, 8)}</div>
                <div className="col-span-2 text-muted-foreground truncate">{s.team || "—"}</div>
                <div className="col-span-3">
                  <Select value={s.frequency} onValueChange={(v) => updateOtherSub(s.id, { frequency: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 text-muted-foreground">{s.delivery_hour}:00</div>
                <div className="col-span-2 flex justify-end"><Switch checked={s.enabled} onCheckedChange={(v) => updateOtherSub(s.id, { enabled: v })} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Export */}
      {last && (
        <Card className="p-3 mb-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Export the most recent brief for compliance auditing.</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv}><FileDown className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            <Button size="sm" variant="outline" onClick={exportPdf}><FileDown className="h-3.5 w-3.5 mr-1" /> PDF</Button>
          </div>
        </Card>
      )}

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!loading && visibleBriefs.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">No briefs yet. Click <strong>Generate now</strong> to create today's brief.</Card>
      )}

      <div className="space-y-4">
        {visibleBriefs.map((b) => (
          <Card key={b.brief_date} className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ background: "var(--gradient-primary)" }} />
            <div className="flex items-center justify-between mb-3 relative">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {format(new Date(b.brief_date), "EEEE, MMM d, yyyy")}</h3>
              <Badge variant="outline" className="text-[10px]">Filtered to your role</Badge>
            </div>
            {b.headline && <div className="text-sm font-medium mb-3 relative">{b.headline}</div>}
            {b.insights?.length > 0 ? (
              <div className="space-y-2 mb-4 relative">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><Lightbulb className="h-3 w-3" /> Insights</div>
                <ul className="space-y-1.5">
                  {b.insights.map((i, idx) => <li key={idx} className="text-sm flex gap-2"><span className="text-primary mt-1">•</span><span>{i}</span></li>)}
                </ul>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mb-4">No insights in your access scope for this brief.</div>
            )}
            {b.links?.length > 0 && (
              <div className="space-y-2 mb-4 pt-2 border-t border-border relative">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Drill down</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {b.links.map((l: any, idx: number) => {
                    if (!canSeeLink(l.type, roles)) return null;
                    const Icon = ICONS[l.type] ?? ExternalLink;
                    return (
                      <Link key={idx} to={l.href} className="flex items-center gap-2 text-xs p-2 rounded-md border border-border bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{l.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {b.actions?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border relative">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><ArrowRight className="h-3 w-3" /> Recommended actions</div>
                <ul className="space-y-1.5">
                  {b.actions.map((a, idx) => <li key={idx} className="text-sm flex gap-2"><span className="text-success mt-1">→</span><span>{a}</span></li>)}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
};

export default DailyBrief;
