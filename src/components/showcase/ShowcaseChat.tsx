import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "What modules does CORTA ERP include?",
  "How does FEFO allocation work?",
  "What can the AI Copilot do?",
  "Which roles can approve POs?",
];

export const ShowcaseChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("showcase-chat", {
        body: { messages: next },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages((m) => [...m, { role: "assistant", content: (data as any)?.reply || "(no response)" }]);
    } catch (e: any) {
      toast.error(e?.message || "Chat request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open CORTA ERP chat"
        className="fixed z-40 bottom-5 right-5 h-12 px-4 rounded-full flex items-center gap-2 border border-white/20 bg-black/70 text-white backdrop-blur hover:bg-black/90 hover:border-white/40 shadow-lg transition-all"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-medium">Ask about CORTA ERP</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[420px] h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl border border-white/15 bg-[hsl(220_22%_10%)] text-white flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-violet-500/20 text-violet-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">CORTA ERP Assistant</div>
                  <div className="text-[11px] text-white/60">Answers only about this system</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="text-white/70 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-white/60">Try a question about CORTA ERP:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        disabled={loading}
                        className="text-left text-sm p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25 transition-colors text-white/90"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      m.role === "user" ? "bg-white/10 text-white" : "bg-violet-500/20 text-violet-300"
                    }`}
                  >
                    {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div
                    className={`max-w-[82%] p-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border ${
                      m.role === "user"
                        ? "bg-white/10 border-white/15 text-white"
                        : "bg-white/5 border-white/10 text-white/90"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-violet-500/20 text-violet-300">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-2.5 rounded-lg border border-white/10 bg-white/5">
                    <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about CORTA ERP…"
                className="flex-1 h-10 rounded-lg bg-white/5 border border-white/15 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="h-10 w-10 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShowcaseChat;
