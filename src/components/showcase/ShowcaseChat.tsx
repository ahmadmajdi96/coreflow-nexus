import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Citation = { id: string; label: string; route: string; section: string };
interface Msg { role: "user" | "assistant"; content: string; citations?: Citation[] }

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
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // autoscroll new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // open/close lifecycle: focus management + Esc + body scroll lock
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // focus the close button initially (predictable for SR), then input
    const t = setTimeout(() => { inputRef.current?.focus(); }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
      if (e.key === "Tab" && dialogRef.current) {
        // simple focus trap
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("showcase-chat", {
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = (data as any)?.reply || "(no response)";
      const citations: Citation[] = Array.isArray((data as any)?.citations) ? (data as any).citations : [];
      setMessages((m) => [...m, { role: "assistant", content: reply, citations }]);
    } catch (e: any) {
      toast.error(e?.message || "Chat request failed");
    } finally {
      setLoading(false);
      // return focus to input after answer
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [messages, loading]);

  return (
    <>
      <button
        ref={openerRef}
        onClick={() => setOpen(true)}
        aria-label="Open CORTA ERP chat assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed z-40 bottom-5 right-5 min-h-12 min-w-12 h-12 px-4 rounded-full flex items-center gap-2 border border-white/20 bg-black/70 text-white backdrop-blur hover:bg-black/90 hover:border-white/40 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <MessageSquare className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium hidden sm:inline">Ask about CORTA ERP</span>
        <span className="text-sm font-medium sm:hidden">Ask</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="showcase-chat-title"
            aria-describedby="showcase-chat-desc"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[440px] h-[100dvh] sm:h-[640px] sm:max-h-[85dvh] sm:mr-4 sm:rounded-2xl rounded-t-2xl sm:rounded-t-2xl border border-white/15 bg-[hsl(220_22%_10%)] text-white flex flex-col shadow-2xl overflow-hidden"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-violet-500/20 text-violet-300 shrink-0">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="showcase-chat-title" className="text-sm font-semibold truncate">CORTA ERP Assistant</h2>
                  <p id="showcase-chat-desc" className="text-[11px] text-white/60 truncate">
                    Answers only about this system, with links to relevant pages.
                  </p>
                </div>
              </div>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="text-white/80 hover:text-white p-2 -m-2 rounded-md min-h-11 min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-busy={loading}
              tabIndex={0}
            >
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-white/60">Try a question about CORTA ERP:</p>
                  <ul className="grid grid-cols-1 gap-2 list-none p-0 m-0">
                    {SUGGESTIONS.map((s) => (
                      <li key={s}>
                        <button
                          onClick={() => send(s)}
                          disabled={loading}
                          className="w-full text-left text-sm p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25 transition-colors text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60"
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const hasCites = !!m.citations?.length;
                const isOpen = expanded[i] ?? true;
                return (
                  <article
                    key={i}
                    aria-label={isUser ? "Your message" : "Assistant message"}
                    className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isUser ? "bg-white/10 text-white" : "bg-violet-500/20 text-violet-300"
                      }`}
                      aria-hidden="true"
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={`max-w-[82%] p-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border ${
                        isUser
                          ? "bg-white/10 border-white/15 text-white"
                          : "bg-white/5 border-white/10 text-white/90"
                      }`}
                    >
                      <div>{m.content}</div>
                      {hasCites && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <button
                            onClick={() => setExpanded((s) => ({ ...s, [i]: !isOpen }))}
                            aria-expanded={isOpen}
                            aria-controls={`citations-${i}`}
                            className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded px-1 py-0.5"
                          >
                            <span>References ({m.citations!.length})</span>
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
                          </button>
                          {isOpen && (
                            <ul id={`citations-${i}`} className="mt-2 space-y-1 list-none p-0">
                              {m.citations!.map((c) => (
                                <li key={c.id}>
                                  <Link
                                    to={c.route}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                                  >
                                    <span className="truncate">
                                      <span className="text-white/50 mr-1">{c.section} ›</span>
                                      <span className="text-white">{c.label}</span>
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-white/60 shrink-0" aria-hidden="true" />
                                    <span className="sr-only">Open {c.label} page</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {loading && (
                <div className="flex gap-2" aria-hidden="true">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-violet-500/20 text-violet-300">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-2.5 rounded-lg border border-white/10 bg-white/5">
                    <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                  </div>
                </div>
              )}
              {loading && <span className="sr-only">Assistant is typing…</span>}
            </div>

            <form
              className="border-t border-white/10 p-3 flex gap-2 shrink-0"
              onSubmit={(e) => { e.preventDefault(); send(input); }}
            >
              <label htmlFor="showcase-chat-input" className="sr-only">
                Ask a question about CORTA ERP
              </label>
              <input
                id="showcase-chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about CORTA ERP…"
                autoComplete="off"
                enterKeyHint="send"
                disabled={loading}
                className="flex-1 min-h-11 h-11 rounded-lg bg-white/5 border border-white/15 px-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="min-h-11 min-w-11 h-11 w-11 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ShowcaseChat;
