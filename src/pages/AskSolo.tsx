import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Lock, MessageCircle, Plus, PanelLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { navigateAuthed } from "@/lib/handlers";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import GlassCard from "@/components/ui/GlassCard";

/* ── Types ── */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Thread {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  pinned?: boolean;
  conversationId: string;
  messages: ChatMessage[];
}

/* ── Constants ── */
const QUOTA_TOTAL = 10;

const PROMPT_SUGGESTIONS = [
  "What's the strongest path in my report?",
  "How should I approach my first conversation?",
  "What rate should I charge in my first month?",
];

/* ── Component ── */
export default function AskSolo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contextId = searchParams.get("context");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStarting, setSessionStarting] = useState(false);
  const [threadDrawerOpen, setThreadDrawerOpen] = useState(false);

  // Subscription state — active subscribers have unlimited questions
  const { isActive: isSubscriber } = useSubscriptionStatus();
  const questionsUsed = 3;
  const quotaExhausted = !isSubscriber && questionsUsed >= QUOTA_TOTAL;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartedRef = useRef(false);

  // ── Start session on mount ──
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    const FALLBACK_GREETING =
      "I can see your plan and our previous conversation. What would you like to work through?";

    const startSession = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ask-solo", {
          body: { call_type: "start_session" },
        });
        if (!error && data) {
          setConversationId(data.conversation_id);
          const greeting =
            (data.context_cue as string | undefined)?.trim() ||
            (data.response_text as string | undefined)?.trim() ||
            FALLBACK_GREETING;
          setMessages([{
            role: "assistant",
            content: greeting,
            timestamp: new Date(),
          }]);
        }
      } catch (err) {
        console.error("[AskSolo] Failed to start session:", err);
      }
      setLoading(false);
    };

    startSession();
  }, []);

  // ── End session on unmount ──
  useEffect(() => {
    const currentConvId = conversationId;
    return () => {
      if (currentConvId) {
        supabase.functions.invoke("ask-solo", {
          body: { call_type: "end_session", conversation_id: currentConvId },
        }).catch(() => {});
      }
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Context deep-link
  useEffect(() => {
    if (contextId && !loading && messages.length <= 1) {
      setInput("I'd like to understand more about this topic.");
    }
  }, [contextId, loading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || quotaExhausted) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setSending(true);

    // Create thread if none active
    let currentConvId = conversationId;
    if (!activeThreadId) {
      // Start a fresh session for a new thread if we don't have one
      if (!currentConvId) {
        try {
          const { data } = await supabase.functions.invoke("ask-solo", {
            body: { call_type: "start_session" },
          });
          if (data?.conversation_id) {
            currentConvId = data.conversation_id;
            setConversationId(data.conversation_id);
          }
        } catch {}
      }

      const newThread: Thread = {
        id: crypto.randomUUID(),
        title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
        lastMessage: text,
        timestamp: new Date(),
        conversationId: currentConvId || "",
        messages: updated,
      };
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
    }

    try {
      const { data, error } = await supabase.functions.invoke("ask-solo", {
        body: {
          call_type: "conversation",
          message: text,
          conversation_id: currentConvId,
          history: updated.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data?.response || "Sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update thread's last message
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, lastMessage: assistantMsg.content.slice(0, 80), messages: [...updated, assistantMsg] }
            : t
        )
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date() },
      ]);
    }
    setSending(false);
    inputRef.current?.focus();
  }, [input, sending, messages, activeThreadId, quotaExhausted, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const newThread = useCallback(async () => {
    // End current session
    if (conversationId) {
      supabase.functions.invoke("ask-solo", {
        body: { call_type: "end_session", conversation_id: conversationId },
      }).catch(() => {});
    }

    setActiveThreadId(null);
    setMessages([]);
    setConversationId(null);
    setInput("");

    const FALLBACK_GREETING =
      "I can see your plan and our previous conversation. What would you like to work through?";

    // Start a new session
    try {
      const { data } = await supabase.functions.invoke("ask-solo", {
        body: { call_type: "start_session" },
      });
      if (data) {
        setConversationId(data.conversation_id);
        const greeting =
          (data.context_cue as string | undefined)?.trim() ||
          (data.response_text as string | undefined)?.trim() ||
          FALLBACK_GREETING;
        setMessages([{
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        }]);
      }
    } catch {}

    inputRef.current?.focus();
  }, [conversationId]);

  const selectThread = useCallback((thread: Thread) => {
    setActiveThreadId(thread.id);
    setMessages(thread.messages);
    setConversationId(thread.conversationId);
    setThreadDrawerOpen(false);
  }, []);

  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col text-foreground">
        <TopBar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  /* ── Thread list sidebar content ── */
  const threadListContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Your conversations</h2>
        <button
          onClick={newThread}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {threads.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">No conversations yet.</p>
        ) : (
          <div className="space-y-1">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => selectThread(t)}
                className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                  activeThreadId === t.id
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-[hsl(var(--surface-inset))] hover:text-foreground"
                }`}
              >
                <p className="text-xs font-medium truncate">{t.title}</p>
                <p className="text-[10px] mt-0.5 truncate">{t.lastMessage}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <TopBar />

      {quotaExhausted && (
        <div className="px-6">
          <Banner variant="info">
            You've used all {QUOTA_TOTAL} questions in your report.{" "}
            <button onClick={handleSubscribe} className="underline font-medium">Subscribe</button> for unlimited access.
          </Banner>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 60px)" }}>
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-r border-border bg-[hsl(var(--surface-panel))]">
          {threadListContent}
        </aside>

        {/* Main column */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile thread trigger */}
              <Sheet open={threadDrawerOpen} onOpenChange={setThreadDrawerOpen}>
                <SheetTrigger asChild>
                  <button className="lg:hidden text-muted-foreground hover:text-foreground">
                    <PanelLeft className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  {threadListContent}
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <h1 className="text-sm font-semibold text-foreground">Ask Solo</h1>
              </div>
            </div>

            {/* Quota indicator */}
            {!isSubscriber && (
              <span className="text-[11px] text-muted-foreground">
                {questionsUsed} of {QUOTA_TOTAL} questions used
              </span>
            )}
          </div>

          {/* Messages */}
          <main className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-2xl space-y-4">
              {contextId && messages.length <= 1 && (
                <GlassCard className="px-4 py-3 mb-2">
                  <p className="text-xs text-primary/80">About: [Article title for {contextId}]</p>
                </GlassCard>
              )}

              {messages.length === 0 && !contextId && (
                <div className="py-16 text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-6">Ask anything about your plan.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {PROMPT_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
                        }`}
                        style={
                          msg.role === "user"
                            ? { background: "hsl(var(--surface-inset))", color: "hsl(var(--foreground))" }
                            : { background: "hsl(var(--surface-panel))", border: "1px solid hsl(var(--border))" }
                        }
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 text-foreground">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
                      </div>
                      <span className={`text-[10px] text-muted-foreground/50 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div
                    className="rounded-2xl rounded-bl-md px-4 py-3"
                    style={{ background: "hsl(var(--surface-panel))", border: "1px solid hsl(var(--border))" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-[6px] w-[6px] rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "0ms" }} />
                      <span className="h-[6px] w-[6px] rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "200ms" }} />
                      <span className="h-[6px] w-[6px] rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "400ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 7/10 nudge */}
              {!isSubscriber && questionsUsed >= 7 && questionsUsed < QUOTA_TOTAL && messages.length > 0 && (
                <p className="text-center text-xs text-muted-foreground/70 py-2">
                  You've got {QUOTA_TOTAL - questionsUsed} questions left. Consider saving them for harder moments.
                </p>
              )}

              <div ref={bottomRef} />
            </div>
          </main>

          {/* Input bar */}
          <div className="border-t border-border bg-[hsl(var(--surface-panel))] px-6 py-4">
            <div className="mx-auto flex max-w-2xl items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={quotaExhausted ? "Quota reached" : "Ask anything about your plan."}
                rows={1}
                disabled={sending || quotaExhausted}
                className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground max-h-32 transition-all focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none disabled:opacity-50"
                style={{ minHeight: "44px" }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending || quotaExhausted}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
