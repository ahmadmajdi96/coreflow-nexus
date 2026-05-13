import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Lightbulb, ArrowRight, ExternalLink, Loader2, RefreshCw, Layers, ShoppingCart, Package, Receipt, Undo2, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

const ICONS: Record<string, any> = { batch: Layers, po: ShoppingCart, product: Package, sale: Receipt, return: Undo2 };

interface Brief { brief_date: string; headline: string; insights: any[]; actions: any[]; links: any[] }

const DailyBrief = () => {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [b, s] = await Promise.all([
      supabase.from("ai_daily_briefs").select("*").order("brief_date", { ascending: false }).limit(7),
      user ? supabase.from("ai_brief_subscriptions").select("enabled").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setBriefs((b.data as any) ?? []);
    setSubscribed(!!(s as any)?.data?.enabled);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

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

  const toggleSub = async (val: boolean) => {
    if (!user) return;
    setSubscribed(val);
    const { error } = await supabase.from("ai_brief_subscriptions").upsert({ user_id: user.id, enabled: val }, { onConflict: "user_id" });
    if (error) { toast.error("Failed"); setSubscribed(!val); }
    else toast.success(val ? "Subscribed to daily brief" : "Unsubscribed");
  };

  return (
    <>
      <PageHeader title="AI Operations Brief" description="Daily AI-generated summary of expiring batches, replenishment urgency, and sales anomalies." />

      <Card className="p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Bell className="h-5 w-5" /></div>
          <div>
            <div className="font-medium text-sm">Daily notification</div>
            <div className="text-xs text-muted-foreground">Receive the brief in your inbox each morning at 7am.</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2"><Switch checked={subscribed} onCheckedChange={toggleSub} /><span className="text-sm">{subscribed ? "On" : "Off"}</span></div>
          <Button size="sm" variant="outline" onClick={generateNow} disabled={generating}>
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} Generate now
          </Button>
        </div>
      </Card>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!loading && briefs.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">No briefs yet. Click <strong>Generate now</strong> to create today's brief.</Card>
      )}

      <div className="space-y-4">
        {briefs.map((b) => (
          <Card key={b.brief_date} className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ background: "var(--gradient-primary)" }} />
            <div className="flex items-center justify-between mb-3 relative">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {format(new Date(b.brief_date), "EEEE, MMM d, yyyy")}</h3>
            </div>
            {b.headline && <div className="text-sm font-medium mb-3 relative">{b.headline}</div>}
            {b.insights?.length > 0 && (
              <div className="space-y-2 mb-4 relative">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><Lightbulb className="h-3 w-3" /> Insights</div>
                <ul className="space-y-1.5">
                  {b.insights.map((i: string, idx: number) => <li key={idx} className="text-sm flex gap-2"><span className="text-primary mt-1">•</span><span>{i}</span></li>)}
                </ul>
              </div>
            )}
            {b.links?.length > 0 && (
              <div className="space-y-2 mb-4 pt-2 border-t border-border relative">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Drill down</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {b.links.map((l: any, idx: number) => {
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
                  {b.actions.map((a: string, idx: number) => <li key={idx} className="text-sm flex gap-2"><span className="text-success mt-1">→</span><span>{a}</span></li>)}
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
