import { useState } from "react";
import { Sparkles, RefreshCw, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleData } from "./ModuleData";
import { useShowcaseSettings } from "./ShowcaseSettings";

type Mode = "enhance" | "shorter" | "technical" | "executive";

type ModeDef = {
  key: Mode;
  label: string;
  tip: string;
  /** vivid color tokens [text, border, hoverBg] */
  vivid: { text: string; border: string; bg: string };
};

const MODES: ModeDef[] = [
  {
    key: "enhance",
    label: "Enhance",
    tip: "Rewrites for clarity, flow and stronger word choice — keeps length similar.",
    vivid: { text: "#c4b5fd", border: "rgba(167,139,250,0.45)", bg: "rgba(167,139,250,0.12)" },
  },
  {
    key: "executive",
    label: "Executive",
    tip: "Reframes the copy for a C-suite audience — outcomes, ROI and business value.",
    vivid: { text: "#fcd34d", border: "rgba(251,191,36,0.45)", bg: "rgba(251,191,36,0.12)" },
  },
  {
    key: "technical",
    label: "Technical",
    tip: "Adds precise terminology, architecture and integration details for engineers.",
    vivid: { text: "#67e8f9", border: "rgba(34,211,238,0.45)", bg: "rgba(34,211,238,0.12)" },
  },
  {
    key: "shorter",
    label: "Shorter",
    tip: "Compresses to the essential value proposition — roughly half the length.",
    vivid: { text: "#6ee7b7", border: "rgba(52,211,153,0.45)", bg: "rgba(52,211,153,0.12)" },
  },
];

const presetStyle = (m: ModeDef, preset: string, active: boolean) => {
  if (preset === "mono") {
    return {
      color: active ? "#0a0a0a" : "#e5e7eb",
      background: active ? "#e5e7eb" : "rgba(255,255,255,0.05)",
      borderColor: "rgba(255,255,255,0.25)",
    };
  }
  if (preset === "pastel") {
    return {
      color: m.vivid.text,
      background: active ? m.vivid.bg : "rgba(255,255,255,0.04)",
      borderColor: m.vivid.border,
    };
  }
  return {
    color: m.vivid.text,
    background: active ? m.vivid.bg : "rgba(255,255,255,0.05)",
    borderColor: active ? m.vivid.border : "rgba(255,255,255,0.18)",
  };
};

const AiDescription = ({ mod }: { mod: ModuleData }) => {
  const [text, setText] = useState(mod.description);
  const [original] = useState(mod.description);
  const [loading, setLoading] = useState<Mode | null>(null);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const { settings } = useShowcaseSettings();

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
      setActiveMode(mode);
      toast.success(`Description rewritten (${mode})`);
    } catch (e: any) {
      toast.error(e?.message || "AI request failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
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
          {MODES.map((m) => {
            const isActive = activeMode === m.key;
            const isLoading = loading === m.key;
            const style = presetStyle(m, settings.buttons, isActive);
            return (
              <Tooltip key={m.key}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading !== null}
                    onClick={() => run(m.key)}
                    aria-pressed={isActive}
                    className="h-7 text-xs gap-1.5 border font-medium transition-colors disabled:opacity-60"
                    style={style}
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {m.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-0.5">{m.label} mode</p>
                  <p className="text-muted-foreground">{m.tip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {text !== original && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setText(original); setActiveMode(null); }}
              className="h-7 text-xs gap-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
export default AiDescription;
