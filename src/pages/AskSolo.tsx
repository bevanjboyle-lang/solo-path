import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus, PanelLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { navigateAuthed } from "@/lib/handlers";
import { supabase } from "@/integrations/supabase/client";
import AskSoloInfoPopover from "@/components/AskSoloInfoPopover";
import TopBar from "@/components/TopBar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/*
 * AskSolo — Pass 1 /ask-solo v1 (2026-05-18) — sixth Phase 2 surface
 *
 * Editorial reskin of the conversation surface. Two-column shell: 280px
 * ThreadList left, conversation main right, joined at the seam as one
 * composite ivory surface. Inherits TopBar.authed (no current item).
 *
 * Locked decisions from admin/pass-1-ask-solo-decisions.md:
 *   F1 — Thread list is a distinct ThreadList (inline composite),
 *     NOT AreaSidebar. Different list semantics (chronological,
 *     user-titled, time-grouped) but shared active-state vocabulary.
 *   F2 — Citations DROPPED for Pass 1 (backend doesn't surface them).
 *     Post-facelift backlog.
 *   F3 — Empty-state suggestions as serif underlined questions, not
 *     button-chips with emoji.
 *   F4 — Streaming visual: text cursor + drafting flag. NOT iMessage
 *     three-bouncing-dots.
 *   F5 — Quota nudge copy: spec's shorter version. No fractional-FD-
 *     flavoured examples (would need server-side strand-aware copy).
 *   F6 — Input-foot persistent nudge DROPPED. Quota pill in header
 *     does the persistent work; input-foot keeps keyboard-shortcut hint.
 *   F7 — Context deep-link "You'll ask" preview block DROPPED. Pre-
 *     filled textarea alone is enough; no phantom message.
 *
 * Cadence: one dark moment — the quota-exhausted banner above the app
 * shell. Mirrors /plan Day-31 wall + /library Day-31 banner vocabulary.
 * Everything else stays calm-ivory. Subscribers see zero dark.
 *
 * Message vocabulary is typographic, not bubble:
 *   - Speaker row: mint dot + small-caps "You asked" / "Solo replied"
 *     + right-aligned timestamp.
 *   - User content: display 600, 18px.
 *   - Assistant content: Source Serif 4, 16.5px / 1.65 (same serif
 *     exception used on /report + /library + /checkin-history).
 *   - Hairline rules between messages; no bubbles, no avatars, no
 *     alternating backgrounds.
 *
 * Preserves: all state machinery (session start/end, threads, messages,
 * conversation_id, optimistic UI), supabase ask-solo edge function
 * calls, useSubscriptionStatus hook, AskSoloInfoPopover composite.
 */

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

const PROMPT_SUGGESTIONS: { q: string; meta: string }[] = [
  { q: "What's the strongest path in my report, and why?", meta: "Strand · 30 sec" },
  { q: "How should I approach my first conversation with a CEO?", meta: "Direct move · 1 min" },
  { q: "What rate should I charge in my first month?", meta: "Pricing · 45 sec" },
];

/* ── Time-grouping helper for thread list ── */
function timeGroupOf(d: Date): "This week" | "Last week" | "Earlier" {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < 7 * day) return "This week";
  if (diffMs < 14 * day) return "Last week";
  return "Earlier";
}

function fmtRelative(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "Today";
  if (diffMs < 2 * day) return "Yesterday";
  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day);
    return `${days} days ago`;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

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
  const [threadDrawerOpen, setThreadDrawerOpen] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const { isActive: isSubscriber } = useSubscriptionStatus();
  const questionsUsed = 3;
  const questionsLeft = QUOTA_TOTAL - questionsUsed;
  const quotaExhausted = !isSubscriber && questionsUsed >= QUOTA_TOTAL;
  const quotaWarning = !isSubscriber && questionsLeft <= 3 && !quotaExhausted;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartedRef = useRef(false);

  /* ── Start session on mount ── */
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

  /* ── End session on unmount ── */
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

  /* ── Auto-scroll on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  /* ── Context deep-link pre-fill ── */
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

    let currentConvId = conversationId;
    if (!activeThreadId) {
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

      const newThreadObj: Thread = {
        id: crypto.randomUUID(),
        title: text.slice(0, 60) + (text.length > 60 ? "…" : ""),
        lastMessage: text,
        timestamp: new Date(),
        conversationId: currentConvId || "",
        messages: updated,
      };
      setThreads((prev) => [newThreadObj, ...prev]);
      setActiveThreadId(newThreadObj.id);
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

  const handleNewThread = useCallback(async () => {
    if (quotaExhausted) return;
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
  }, [conversationId, quotaExhausted]);

  const selectThread = useCallback((thread: Thread) => {
    setActiveThreadId(thread.id);
    setMessages(thread.messages);
    setConversationId(thread.conversationId);
    setThreadDrawerOpen(false);
  }, []);

  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /* ── Grouped thread list ── */
  const threadGroups: Record<string, Thread[]> = { "This week": [], "Last week": [], "Earlier": [] };
  for (const t of threads) {
    threadGroups[timeGroupOf(t.timestamp)].push(t);
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main className="pt-[68px]">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Loading…</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── Quota-exhausted banner (the cadence moment) ── */
  const exhaustedBanner = quotaExhausted ? (
    <div className="panel-dark px-6 sm:px-10 py-5 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto_auto] gap-3 lg:gap-6 items-center">
      <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(250,249,247,0.65)" }}>
        <span className="inline-block w-2 h-2 rounded-full bg-primary" />
        <span style={{ color: "#FAF9F7" }}>Quota used</span>
      </div>
      <div className="font-display text-[15px] leading-[1.4]" style={{ color: "#FAF9F7", letterSpacing: "-0.012em" }}>
        <strong>You've used all {QUOTA_TOTAL} questions in your report.</strong>{" "}
        Past threads stay readable. Subscribe for unlimited.
      </div>
      <div className="text-[11px] tabular-nums tracking-[0.04em]" style={{ color: "rgba(250,249,247,0.55)" }}>
        {QUOTA_TOTAL} / {QUOTA_TOTAL}
      </div>
      <button
        onClick={handleSubscribe}
        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-[12.5px] font-semibold text-white whitespace-nowrap"
        style={{ background: "#2ECDB0" }}
      >
        Subscribe — £19/mo →
      </button>
    </div>
  ) : null;

  /* ── Default render ── */
  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main className="pt-[68px]">
        {exhaustedBanner}

        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 min-h-[760px]">

            {/* ── Thread list (desktop) ── */}
            <aside className="hidden lg:block panel-ivory rounded-r-none border-r-0">
              <ThreadList
                threadGroups={threadGroups}
                activeThreadId={activeThreadId}
                onSelect={selectThread}
                onNewThread={handleNewThread}
                isExhausted={quotaExhausted}
              />
            </aside>

            {/* ── Conversation main column ── */}
            <section className="panel-ivory lg:rounded-l-none flex flex-col overflow-hidden">

              {/* Header: mobile thread trigger + thread title + quota pill */}
              <div className="px-5 sm:px-8 py-4 border-b border-[#E5E2DC] grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                <Sheet open={threadDrawerOpen} onOpenChange={setThreadDrawerOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="lg:hidden text-muted-foreground hover:text-foreground"
                      aria-label="Open thread list"
                    >
                      <PanelLeft className="h-5 w-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] p-0">
                    <ThreadList
                      threadGroups={threadGroups}
                      activeThreadId={activeThreadId}
                      onSelect={selectThread}
                      onNewThread={handleNewThread}
                      isExhausted={quotaExhausted}
                    />
                  </SheetContent>
                </Sheet>

                <div className="min-w-0 lg:col-start-1">
                  <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-foreground">{activeThreadId ? "Conversation" : "New conversation"}</span>
                    {contextId && messages.length <= 1 && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="normal-case tracking-normal text-[11px] font-normal text-muted-foreground/80">
                          From the Library
                        </span>
                      </>
                    )}
                    <AskSoloInfoPopover
                      isSubscriber={isSubscriber}
                      questionsRemaining={QUOTA_TOTAL - questionsUsed}
                      totalQuestions={QUOTA_TOTAL}
                    />
                  </div>
                  <h2 className="font-display text-[16px] sm:text-[18px] font-bold text-foreground truncate" style={{ letterSpacing: "-0.018em" }}>
                    {threads.find((t) => t.id === activeThreadId)?.title || "Ask anything about your plan."}
                  </h2>
                </div>

                <QuotaPill
                  isSubscriber={isSubscriber}
                  questionsLeft={questionsLeft}
                  exhausted={quotaExhausted}
                  warning={quotaWarning}
                />
              </div>

              {/* Context-note strip (deep-link state) */}
              {contextId && messages.length <= 1 && (
                <div
                  className="px-5 sm:px-8 py-3 border-b border-[#E5E2DC] grid grid-cols-[auto_1fr_auto] gap-3 items-baseline"
                  style={{ background: "#F3F1ED" }}
                >
                  <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#1A8A72" }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    About
                  </span>
                  <span className="font-display text-[13.5px] font-semibold text-foreground truncate" style={{ letterSpacing: "-0.012em" }}>
                    Library article · {contextId}
                  </span>
                  <button
                    onClick={() => navigate("/ask-solo", { replace: true })}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
                  >
                    Clear context
                  </button>
                </div>
              )}

              {/* Conversation scroll area */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-12 py-6 sm:py-8">

                {/* Empty welcome state */}
                {messages.length === 0 && !contextId && (
                  <EmptyWelcome onSuggest={(q) => { setInput(q); inputRef.current?.focus(); }} />
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                  <Message key={i} msg={msg} formatTime={formatTime} />
                ))}

                {/* Streaming message — text cursor + drafting flag */}
                {sending && (
                  <div className="py-5 border-t border-[#EDEBE6] first:border-t-0">
                    <div className="flex items-baseline gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] mb-3.5" style={{ color: "#1A8A72" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                      <span style={{ color: "#1A8A72", fontWeight: 700 }}>Solo replied</span>
                      <span
                        className="ml-auto text-[10px] italic normal-case tracking-[0.04em] text-muted-foreground/80 font-medium inline-flex items-center gap-1.5"
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        drafting
                      </span>
                    </div>
                    <div
                      className="max-w-[64ch]"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "16.5px", lineHeight: "1.65", color: "#5A5650" }}
                    >
                      <span
                        className="inline-block align-text-bottom ml-0.5"
                        style={{ width: "2px", height: "1em", background: "#2ECDB0", animation: "cursor-blink 1.1s steps(2, end) infinite" }}
                      />
                    </div>
                  </div>
                )}

                {/* 7/10 inline nudge — only show when quota is in warning state and not yet dismissed */}
                {quotaWarning && messages.length > 0 && !nudgeDismissed && (
                  <div
                    className="my-5 px-5 py-3.5 rounded-r grid grid-cols-[auto_1fr_auto] gap-x-4 items-baseline"
                    style={{ background: "#F3F1ED", borderLeft: "2px solid #2ECDB0" }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#1A8A72" }}>
                      Heads up
                    </span>
                    <div className="text-[13px] text-foreground/90 leading-[1.5]">
                      <strong>You've got {questionsLeft} questions left in your report.</strong>{" "}
                      Consider saving them for harder moments.
                    </div>
                    <button
                      onClick={() => setNudgeDismissed(true)}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
                    >
                      Got it
                    </button>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input dock */}
              <div className="border-t border-[#E5E2DC] px-5 sm:px-8 py-4">
                <div
                  className={`rounded-md p-3 grid grid-cols-[1fr_auto] gap-3 items-end transition-colors ${
                    quotaExhausted ? "opacity-55 cursor-not-allowed" : ""
                  }`}
                  style={{
                    background: quotaExhausted ? "#F3F1ED" : "#FAF9F7",
                    border: "1.5px solid #D5D0C8",
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      quotaExhausted
                        ? "No questions left in your report — subscribe for unlimited."
                        : sending
                        ? "Solo is drafting…"
                        : "Ask anything about your plan."
                    }
                    rows={1}
                    disabled={sending || quotaExhausted}
                    className="resize-none border-none outline-none bg-transparent text-[15px] leading-[1.5] text-foreground placeholder:text-muted-foreground/60 min-h-[44px] py-1.5 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending || quotaExhausted}
                    className="inline-flex items-center justify-center rounded-md px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-[#ECEAE4] disabled:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-100"
                    style={!input.trim() || sending || quotaExhausted ? undefined : { background: "#2ECDB0" }}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
                  </button>
                </div>
                <div className="mt-2 flex justify-between items-baseline text-[11px] text-muted-foreground/70 tracking-[0.02em]">
                  <span className="italic">
                    {quotaExhausted ? (
                      <span style={{ color: "#A09A92" }}>Past conversations stay readable. Subscribe to keep asking.</span>
                    ) : sending ? (
                      "Solo is drafting your reply…"
                    ) : (
                      <>Press <strong>Enter</strong> to send · <strong>Shift + Enter</strong> for a new line.</>
                    )}
                  </span>
                  <span
                    className={isSubscriber ? "font-semibold" : ""}
                    style={
                      isSubscriber
                        ? { color: "#1A8A72" }
                        : quotaExhausted
                        ? { color: "#D4940A", fontWeight: 600 }
                        : undefined
                    }
                  >
                    {isSubscriber
                      ? "Unlimited"
                      : quotaExhausted
                      ? "0 of 10 left."
                      : `${questionsLeft} of ${QUOTA_TOTAL} questions left this report.`}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Inline keyframes for the streaming cursor blink. */}
      <style>{`
        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── ThreadList composite (inline) ─────────────────────────── */

function ThreadList({
  threadGroups, activeThreadId, onSelect, onNewThread, isExhausted,
}: {
  threadGroups: Record<string, Thread[]>;
  activeThreadId: string | null;
  onSelect: (t: Thread) => void;
  onNewThread: () => void;
  isExhausted: boolean;
}) {
  const totalThreads =
    threadGroups["This week"].length +
    threadGroups["Last week"].length +
    threadGroups["Earlier"].length;

  return (
    <div className="flex flex-col h-full py-5">
      <div className="px-5 pb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        <span>Your conversations</span>
      </div>

      <button
        type="button"
        onClick={onNewThread}
        disabled={isExhausted}
        className="mx-4 mb-4 px-3.5 py-2.5 rounded-md inline-flex items-center gap-2 text-[13px] font-semibold text-foreground transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
        style={{ background: "#F3F1ED", border: "1.5px solid #D5D0C8" }}
      >
        <Plus className="h-3.5 w-3.5" style={{ color: "#2ECDB0" }} />
        <span>New conversation</span>
      </button>

      <div className="flex-1 overflow-y-auto px-0">
        {totalThreads === 0 ? (
          <p className="px-5 py-8 text-center text-[12px] italic text-muted-foreground/60 leading-[1.5]">
            No conversations yet.<br />Start one to the right.
          </p>
        ) : (
          (Object.keys(threadGroups) as Array<keyof typeof threadGroups>).map((group) => {
            const list = threadGroups[group];
            if (list.length === 0) return null;
            return (
              <div key={group as string}>
                <div className="px-5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  {group as string}
                </div>
                {list.map((t) => {
                  const isActive = t.id === activeThreadId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelect(t)}
                      className={`w-full text-left px-5 py-3 transition-colors border-l-2 ${
                        isActive
                          ? "border-primary"
                          : "border-transparent hover:bg-[#F3F1ED]/60"
                      }`}
                      style={
                        isActive
                          ? { background: "linear-gradient(to right, rgba(46,205,176,0.06), transparent 60%)" }
                          : undefined
                      }
                    >
                      <div
                        className={`font-display text-[13.5px] text-foreground line-clamp-2 ${
                          isActive ? "font-bold" : "font-semibold"
                        }`}
                        style={{ letterSpacing: "-0.01em", lineHeight: 1.3 }}
                      >
                        {t.title}
                      </div>
                      <div className="mt-1 flex items-baseline gap-2 text-[11px] text-muted-foreground/70 tracking-[0.02em]">
                        <span>{fmtRelative(t.timestamp)}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span>{t.messages.length} messages</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Quota pill ─────────────────────────── */

function QuotaPill({
  isSubscriber, questionsLeft, exhausted, warning,
}: {
  isSubscriber: boolean;
  questionsLeft: number;
  exhausted: boolean;
  warning: boolean;
}) {
  if (isSubscriber) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] whitespace-nowrap"
        style={{ background: "#D6F5EE", color: "#1A8A72" }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        Subscriber
      </div>
    );
  }
  if (exhausted) {
    return (
      <div
        className="inline-flex items-baseline gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-[0.04em] whitespace-nowrap"
        style={{ background: "#1D2025" }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(250,249,247,0.65)" }}>
          Questions used
        </span>
        <span className="font-display font-bold tabular-nums" style={{ color: "#FAF9F7" }}>10 of 10</span>
      </div>
    );
  }
  return (
    <div
      className="inline-flex items-baseline gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-[0.04em] whitespace-nowrap"
      style={{ background: warning ? "#FDF8E8" : "#F3F1ED" }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: warning ? "#D4940A" : "#A09A92" }}
      >
        Questions left
      </span>
      <span className="font-display font-bold tabular-nums text-foreground">
        {questionsLeft} of {QUOTA_TOTAL}
      </span>
    </div>
  );
}

/* ─────────────────────────── Single message ─────────────────────────── */

function Message({ msg, formatTime }: { msg: ChatMessage; formatTime: (d: Date) => string }) {
  const isUser = msg.role === "user";
  return (
    <div className="py-5 border-t border-[#EDEBE6] first:border-t-0">
      <div className="flex items-baseline gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] mb-3.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: isUser ? "#7A7670" : "#2ECDB0" }}
        />
        <span style={{ color: isUser ? "#1D2025" : "#1A8A72", fontWeight: isUser ? 600 : 700 }}>
          {isUser ? "You asked" : "Solo replied"}
        </span>
        <span className="ml-auto text-[10px] normal-case tracking-[0.04em] text-muted-foreground/60 font-medium">
          {formatTime(msg.timestamp)}
        </span>
      </div>
      {isUser ? (
        <div
          className="max-w-[64ch] font-display font-semibold text-[17px] sm:text-[18px] text-foreground"
          style={{ letterSpacing: "-0.012em", lineHeight: 1.4 }}
        >
          {msg.content}
        </div>
      ) : (
        <div
          className="max-w-[64ch] [&>p]:mb-3 [&>p:last-child]:mb-0 [&_strong]:text-foreground [&_strong]:font-semibold"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "16.5px", lineHeight: "1.65", color: "#5A5650" }}
        >
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Empty welcome state ─────────────────────────── */

function EmptyWelcome({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="pt-12 sm:pt-16 pb-6">
      <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-foreground">Ask Solo</span>
      </div>
      <h1 className="title-h1 max-w-[18ch]">
        Ask anything about your plan.
      </h1>
      <p className="mt-4 font-display text-[16px] sm:text-[17px] font-medium text-muted-foreground leading-[1.45] max-w-[46ch]">
        Your report, your strands, your check-ins. Solo replies in plain language and links back to the modules it's drawing on.
      </p>

      <div className="mt-12 pt-6 border-t border-[#E5E2DC]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 mb-4">
          Three places people usually start
        </div>
        <div>
          {PROMPT_SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggest(s.q)}
              className={`w-full text-left grid grid-cols-[1fr_auto] gap-4 items-baseline py-3.5 ${
                i > 0 ? "border-t border-[#EDEBE6]" : ""
              }`}
            >
              <span
                className="text-[16px] sm:text-[17px] underline underline-offset-[4px] decoration-[#D8D4CC] hover:decoration-muted-foreground"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: "#5A5650", lineHeight: 1.45 }}
              >
                {s.q}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 whitespace-nowrap">
                {s.meta}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
