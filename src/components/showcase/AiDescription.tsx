import { useState } from "react";
import { Sparkles, RefreshCw, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleData } from "./ModuleData";

type Mode = "enhance" | "shorter" | "technical" | "executive";

const MODES: { key: Mode; label: string }[] = [
  { key: "enhance", label: "Enhance" },
  { key: "executive", label: "Executive" },
  { key: "technical", label: "Technical" },
  { key: "shorter", label: "Shorter" },
];

const AiDescription = ({ mod }: { mod: ModuleData }) => {
  const [text, setText] = useState(mod.description);
  const [original] = useState(mod.description);
  const [loading, setLoading] = useState<Mode | null>(null);

  const run = async (mode: Mode) => {
    setLoading(mode);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { moduleTitle: `${mod.title} — ${mod.subtitle}`, currentDescription: text, mode },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const next = (data as any)?.description?.trim();
      if (!next) throw new Error("Empty AI response");
      setText(next);
      toast.success(`Description rewritten (${mode})`);
    } catch (e: any) {
      toast.error(e?.message || "AI request failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="pp-muted-text leading-relaxed">{text}</p>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
          style={{
            background: "hsl(var(--ai-color) / 0.1)",
            color: "hsl(var(--ai-color))",
            border: "1px solid hsl(var(--ai-color) / 0.25)",
          }}
        >
          <Sparkles className="w-3 h-3" /> AI
        </div>
        {MODES.map((m) => (
          <Button
            key={m.key}
            size="sm"
            variant="outline"
            disabled={loading !== null}
            onClick={() => run(m.key)}
            className="h-7 text-xs gap-1.5 bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            {loading === m.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {m.label}
          </Button>
        ))}
        {text !== original && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setText(original)}
            className="h-7 text-xs gap-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
};
export default AiDescription;
