import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LogOut, Send, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Exchange {
  role: "assistant" | "user";
  text: string;
}

export default function Checkin() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replanning, setReplanning] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [complete, setComplete] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [checkinState, setCheckinState] = useState("open");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [exchanges]);

  // Load session and open check-in
  useEffect(() => {
    if (!sessionId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("tracker_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!data) {
        navigate("/tracker", { replace: true });
        return;
      }
      setSession(data);
      // Trigger opening call
      try {
        const { data: result, error } = await supabase.functions.invoke("process-checkin", {
          body: {
            call_type: "opening",
            tracker_session_id: sessionId,
            user_id: user.id,
            current_day: data.current_day,
            working_plan: data.working_plan,
            running_narrative: data.running_narrative,
            exchange_count: 0,
          },
        });
        if (error) throw error;
        setExchanges([{ role: "assistant", text: result.response_text }]);
        setExchangeCount(result.exchange_count || 1);
        setCheckinState(result.state || "open");
      } catch (err) {
        console.error("Opening check-in error:", err);
        setExchanges([{ role: "assistant", text: "Hi — let's check in on today's plan. How did it go?" }]);
      }
      setLoading(false);
    })();
  }, [sessionId, user]);

  const handleSend = async () => {
    if (!input.trim() || sending || complete) return;
    const userMsg = input.trim();
    setInput("");
    setExchanges((prev) => [...prev, { role: "user", text: userMsg }]);
    setSending(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("process-checkin", {
        body: {
          call_type: "follow_up",
          tracker_session_id: sessionId,
          user_id: user!.id,
          current_day: session.current_day,
          working_plan: session.working_plan,
          running_narrative: session.running_narrative,
          user_message: userMsg,
          exchange_count: exchangeCount,
          previous_state: checkinState,
        },
      });
      if (error) throw error;

      setExchanges((prev) => [...prev, { role: "assistant", text: result.response_text }]);
      setExchangeCount(result.exchange_count || exchangeCount + 1);
      setCheckinState(result.state || "open");

      // Apply plan updates
      if (result.plan_updates?.length > 0) {
        await supabase
          .from("tracker_sessions")
          .update({ working_plan: result.updated_working_plan || session.working_plan })
          .eq("id", sessionId);
      }

      // Save narrative
      if (result.narrative_addition) {
        const newNarrative = (session.running_narrative || "") + "\n" + result.narrative_addition;
        await supabase
          .from("tracker_sessions")
          .update({ running_narrative: newNarrative })
          .eq("id", sessionId);
        setSession((s: any) => ({ ...s, running_narrative: newNarrative }));
      }

      if (result.check_in_complete) {
        setComplete(true);
        // Save checkin history
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("checkin_history").insert({
          tracker_session_id: sessionId!,
          user_id: user!.id,
          day_number: session.current_day,
          checkin_date: today,
          state: result.state || "closed",
          exchanges: [...exchanges, { role: "user", text: userMsg }, { role: "assistant", text: result.response_text }] as any,
          plan_updates: result.plan_updates || [],
          narrative_addition: result.narrative_addition || null,
          replan_triggered: result.replan_required || false,
        });

        // Advance day
        await supabase
          .from("tracker_sessions")
          .update({
            current_day: session.current_day + 1,
            last_checkin_date: today,
          })
          .eq("id", sessionId);

        // Handle replan
        if (result.replan_required) {
          setReplanning(true);
          try {
            const { data: replanResult } = await supabase.functions.invoke("trigger-replan", {
              body: {
                tracker_session_id: sessionId,
                user_id: user!.id,
                current_day: session.current_day,
                working_plan: session.working_plan,
                running_narrative: session.running_narrative,
                replan_context: result.replan_context,
              },
            });
            if (replanResult?.phases) {
              const newPlan = { ...session.working_plan, activation_plan: { ...session.working_plan?.activation_plan, phases: replanResult.phases } };
              await supabase
                .from("tracker_sessions")
                .update({ working_plan: newPlan })
                .eq("id", sessionId);

              await supabase.from("replans").insert({
                tracker_session_id: sessionId!,
                user_id: user!.id,
                triggered_day: session.current_day,
                replan_context: result.replan_context || {},
                replan_output: replanResult,
                replan_summary: replanResult.replan_summary || null,
              });

              setExchanges((prev) => [...prev, { role: "assistant", text: `✅ Plan updated: ${replanResult.replan_summary || "Your plan has been adapted."}` }]);
            }
          } catch (err) {
            console.error("Replan error:", err);
            setExchanges((prev) => [...prev, { role: "assistant", text: "I tried to rebuild your plan but hit an issue. Your existing plan is still intact." }]);
          }
          setReplanning(false);
        }
      }
    } catch (err) {
      console.error("Check-in error:", err);
      setExchanges((prev) => [...prev, { role: "assistant", text: "Something went wrong — try again." }]);
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/tracker")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-base font-semibold tracking-tight">Day {session?.current_day} Check-in</span>
          </div>
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 space-y-4">
          <AnimatePresence>
            {exchanges.map((ex, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${ex.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  ex.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}>
                  {ex.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {(sending || replanning) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3 text-sm text-muted-foreground">
                {replanning ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Rebuilding your plan…
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking…
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-6 py-4">
          {complete ? (
            <button
              onClick={() => navigate("/tracker")}
              className="w-full rounded-lg px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
              style={{ background: "var(--gradient-cta)" }}
            >
              Back to tracker →
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your response…"
                disabled={sending}
                className="flex-1 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--gradient-cta)" }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
