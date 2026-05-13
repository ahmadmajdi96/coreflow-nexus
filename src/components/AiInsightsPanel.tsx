import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, Lightbulb, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InsightData { headline: string; insights: string[]; actions: string[] }

const AiInsightsPanel = ({ kind, title }: { kind: "dashboard" | "replenishment" | "sales_anomalies"; title?: string }) => {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("ai-insights", { body: { kind } });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as InsightData);
    } catch (e: any) {
      toast.error(e?.message || "AI insights failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ background: "var(--gradient-primary)" }} />
      <div className="flex items-center justify-between mb-4 relative">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title ?? "AI Insights"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">AI-generated analysis from your live data</p>
        </div>
        <Button size="sm" variant={data ? "outline" : "default"} onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : data ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Analyzing…" : data ? "Refresh" : "Generate"}
        </Button>
      </div>

      {!data && !loading && (
        <div className="text-sm text-muted-foreground py-4 relative">Click <strong>Generate</strong> to get AI-powered insights.</div>
      )}

      {data && (
        <div className="space-y-4 relative">
          {data.headline && (
            <div className="text-sm font-medium leading-relaxed">{data.headline}</div>
          )}
          {data.insights?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><Lightbulb className="h-3 w-3" /> Insights</div>
              <ul className="space-y-1.5">
                {data.insights.map((i, idx) => (
                  <li key={idx} className="text-sm flex gap-2"><span className="text-primary mt-1">•</span><span>{i}</span></li>
                ))}
              </ul>
            </div>
          )}
          {data.actions?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><ArrowRight className="h-3 w-3" /> Recommended actions</div>
              <ul className="space-y-1.5">
                {data.actions.map((a, idx) => (
                  <li key={idx} className="text-sm flex gap-2"><span className="text-success mt-1">→</span><span>{a}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AiInsightsPanel;
