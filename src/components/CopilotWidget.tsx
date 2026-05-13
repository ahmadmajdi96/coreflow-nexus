import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, Sparkles, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "What should I reorder this week?",
  "Show me batches expiring in the next 14 days",
  "Sales summary for the last 7 days",
  "List pending PO approvals",
];

const CopilotWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  if (!user) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-copilot", { body: { messages: next } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages((m) => [...m, { role: "assistant", content: (data as any)?.reply || "(no response)" }]);
    } catch (e: any) {
      toast.error(e?.message || "Copilot request failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          style={{ background: "var(--gradient-primary)" }}
          aria-label="Open AI Copilot"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ background: "var(--gradient-primary)" }}>
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <div>
                <div className="font-semibold text-sm">CoreERP Copilot</div>
                <div className="text-[10px] opacity-80">AI assistant · live data</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ask me anything about your inventory, sales, or POs.</p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} disabled={loading} className="text-left text-xs p-2.5 rounded-lg border border-border bg-secondary/30 hover:border-primary/40 transition-colors disabled:opacity-50">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-secondary" : "bg-primary/15 text-primary"}`}>
                  {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[85%] p-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-secondary/40 border border-border"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/15 text-primary"><Bot className="w-3.5 h-3.5" /></div>
                <div className="p-2.5 rounded-lg bg-secondary/40 border border-border"><Loader2 className="w-3.5 h-3.5 animate-spin" /></div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Copilot…"
              rows={1}
              className="resize-none min-h-[40px] max-h-32 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              disabled={loading}
            />
            <Button size="icon" onClick={() => send(input)} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CopilotWidget;
