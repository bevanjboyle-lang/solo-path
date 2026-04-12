import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Send, Lock, Zap, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/GlassCard";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AskSolo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [contextCue, setContextCue] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check subscription + start session
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("subscription_active")
        .eq("user_id", user.id)
        .maybeSingle();
      const active = data?.subscription_active ?? false;
      setSubscriptionActive(active);

      if (active) {
        try {
          const { data: sessionData } = await supabase.functions.invoke("ask-solo", {
            body: { call_type: "start_session" },
          });
          if (sessionData) {
            setSessionId(sessionData.session_id);
            setConversationId(sessionData.conversation_id);
            setContextCue(sessionData.context_cue);
          }
        } catch (err) {
          console.error("Failed to start session:", err);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (conversationId) {
        supabase.functions.invoke("ask-solo", {
          body: { call_type: "end_session", conversation_id: conversationId },
        });
      }
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !user) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("ask-solo", {
        body: {
          call_type: "conversation",
          session_id: sessionId,
          conversation_id: conversationId,
          message: text,
          history: updated.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.response || "Sorry, I couldn't generate a response. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date() },
      ]);
    }
    setSending(false);
    inputRef.current?.focus();
  }, [input, sending, user, messages, sessionId, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Paywall
  if (subscriptionActive === false) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-center px-6 pt-14">
          <Card className="bg-card border-border/50 max-w-lg w-full">
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-5">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Unlock Ask Solo
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Ask Solo is your AI advisory companion, available with an active plan. Keep going to start a conversation.
              </p>
              <Button
                onClick={() => navigate("/pricing")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="h-4 w-4 mr-1.5" />
                View Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Chat UI
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageCircle className="h-4 w-4 text-primary" />
            Ask Solo
          </div>
          <div className="w-16" />
        </div>
      </nav>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto pt-14 pb-[88px]">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-4">
          {/* Context cue banner */}
          {contextCue && (
            <GlassCard className="metallic-border px-4 py-3 mb-2">
              <p className="text-xs text-primary/80">{contextCue}</p>
            </GlassCard>
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
                      msg.role === "user"
                        ? "rounded-br-md"
                        : "rounded-bl-md"
                    }`}
                    style={
                      msg.role === "user"
                        ? { background: "#F3F1ED", color: "#1D2025" }
                        : {
                            background: "rgba(250,249,247,0.7)",
                            backdropFilter: "blur(20px)",
                            border: "1px solid rgba(229,226,220,0.5)",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                            // subtle mint tint
                            backgroundImage: "linear-gradient(135deg, rgba(46,205,176,0.03), transparent)",
                          }
                    }
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0" style={{ color: "#1D2025" }}>
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

          {/* Typing indicator - three pulsing mint dots */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div
                className="rounded-2xl rounded-bl-md px-4 py-3"
                style={{
                  background: "rgba(250,249,247,0.7)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(229,226,220,0.5)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-[6px] w-[6px] rounded-full animate-typing-dot" style={{ background: "#2ECDB0", animationDelay: "0ms" }} />
                  <span className="h-[6px] w-[6px] rounded-full animate-typing-dot" style={{ background: "#2ECDB0", animationDelay: "200ms" }} />
                  <span className="h-[6px] w-[6px] rounded-full animate-typing-dot" style={{ background: "#2ECDB0", animationDelay: "400ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border/50"
        style={{
          backdropFilter: "blur(12px)",
          background: "rgba(250,249,247,0.8)",
        }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-3 px-6 py-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/50 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground max-h-32 transition-all"
            style={{
              minHeight: "44px",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(46,205,176,0.4)";
              e.currentTarget.style.borderColor = "#2ECDB0";
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "";
            }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
