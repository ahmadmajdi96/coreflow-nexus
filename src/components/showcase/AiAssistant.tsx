import { useState } from "react";
import { Sparkles, Loader2, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Explain CORTA-PL in one paragraph for a CFO",
  "Write a LinkedIn post about our MES module",
  "Draft an executive summary for a BRCGS audit",
  "Compare MES vs QMS in 3 bullet points",
];

const AiAssistant = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          moduleTitle: "CORTA-PL Production Suite",
          currentDescription: text,
          mode: "enhance",
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages((m) => [...m, { role: "assistant", content: (data as any)?.description || "(no response)" }]);
    } catch (e: any) {
      toast.error(e?.message || "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="ai" className="py-16 sm:py-24 px-4 sm:px-6 border-t pp-border scroll-mt-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
            style={{
              background: "hsl(var(--ai-color) / 0.1)",
              color: "hsl(var(--ai-color))",
              border: "1px solid hsl(var(--ai-color) / 0.25)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Copilot
          </div>
          <h2 className="section-title mb-4">Ask the CORTA-PL AI</h2>
          <p className="section-subtitle mx-auto">
            Generate executive summaries, marketing copy, audit briefs or rewrite product
            descriptions on demand — every answer auditable.
          </p>
        </div>

        <div className="data-card">
          <div className="space-y-4 mb-4 max-h-[420px] overflow-y-auto">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm pp-muted-text">Try one of these prompts:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={loading}
                      className="text-left text-sm p-3 rounded-lg border pp-border hover:border-white/30 transition-colors"
                      style={{ background: "hsl(220 22% 13% / 0.6)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === "user" ? "" : ""
                  }`}
                  style={{
                    background:
                      m.role === "user"
                        ? "hsl(220 22% 16%)"
                        : "hsl(var(--ai-color) / 0.18)",
                    color: m.role === "user" ? undefined : "hsl(var(--ai-color))",
                  }}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className="max-w-[80%] p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border pp-border"
                  style={{
                    background:
                      m.role === "user"
                        ? "hsl(var(--mes-color) / 0.1)"
                        : "hsl(220 22% 13% / 0.6)",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "hsl(var(--ai-color) / 0.18)",
                    color: "hsl(var(--ai-color))",
                  }}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div
                  className="p-3 rounded-lg border pp-border"
                  style={{ background: "hsl(220 22% 13% / 0.6)" }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about CORTA-PL…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
export default AiAssistant;
