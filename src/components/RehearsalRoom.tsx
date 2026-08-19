// src/components/RehearsalRoom.tsx
//
// Rehearsal Room v1 (ADR-025, 2026-06-11). Simulated-buyer roleplay inside
// /ask-solo: pick a scenario, talk to a realistic sceptical-but-fair UK buyer
// of your primary strand's service, end when ready for a short direct debrief.
// Backed by the rehearse-buyer edge function (verify_jwt:true, paid gate).
// Stateless server: this component sends the running transcript on each call.
//
// Editorial vocabulary per ADR-026: square chrome, hairline rules, buyer turns
// in Source Serif 4, user turns in plain display, .cta-block send, debrief as
// a ruled block. Separate from the Ask Solo conversation state entirely; this
// component owns its own transcript and never touches quota.

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Scenario = "discovery_call" | "pricing_pushback";

interface RehearsalMessage {
  role: "user" | "assistant";
  content: string;
}

interface RehearseResponse {
  response_text: string;
  ended?: boolean;
  gated?: boolean;
}

const SCENARIOS: { id: Scenario; title: string; blurb: string }[] = [
  {
    id: "discovery_call",
    title: "Discovery call",
    blurb:
      "A first exploratory call. The buyer has a real problem, limited patience, and a history of disappointing consultants. Earn the second meeting.",
  },
  {
    id: "pricing_pushback",
    title: "Pricing pushback",
    blurb:
      "They want the work but think your price is high. A cheaper quote is on the table and their finance director is asking questions. Defend the number.",
  },
];

const SERIF = "'Source Serif 4', Georgia, serif";

export default function RehearsalRoom({ onClose }: { onClose: () => void }) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<RehearsalMessage[]>([]);
  const [debrief, setDebrief] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [gated, setGated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, debrief, busy]);

  /* Send the running transcript; the server is stateless. */
  const callRehearse = async (
    nextMessages: RehearsalMessage[],
    activeScenario: Scenario,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke<RehearseResponse>(
        "rehearse-buyer",
        { body: { messages: nextMessages, scenario: activeScenario } },
      );
      if (fnErr) {
        const status = (fnErr as { context?: { status?: number } }).context?.status;
        if (status === 403) setGated(true);
        else setError("The rehearsal couldn't continue just now. Try again in a minute.");
        return;
      }
      if (!data?.response_text) {
        setError("The rehearsal couldn't continue just now. Try again in a minute.");
        return;
      }
      if (data.ended) {
        setDebrief(data.response_text);
      } else {
        setMessages([...nextMessages, { role: "assistant", content: data.response_text }]);
      }
    } catch {
      setError("The rehearsal couldn't continue just now. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  const startScenario = (s: Scenario) => {
    setScenario(s);
    setMessages([]);
    setDebrief(null);
    // Empty transcript = the buyer opens the conversation.
    callRehearse([], s);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || busy || !scenario || debrief) return;
    const next: RehearsalMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    callRehearse(next, scenario);
  };

  const handleEnd = () => {
    if (busy || !scenario || debrief) return;
    // The sentinel triggers the server's out-of-character debrief.
    callRehearse([...messages, { role: "user", content: "END REHEARSAL" }], scenario);
  };

  const handleRestart = () => {
    setScenario(null);
    setMessages([]);
    setDebrief(null);
    setInput("");
    setError(null);
  };

  return (
    <div className="border-b border-border px-5 sm:px-8 py-6" style={{ background: "#F3F1ED" }}>
      {/* Head */}
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-foreground">Rehearsal Room</span>
          {scenario && !debrief && (
            <span className="normal-case tracking-normal font-normal text-muted-foreground">
              · {SCENARIOS.find((s) => s.id === scenario)?.title}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
        >
          Close
        </button>
      </div>

      {/* Gated state (shouldn't normally happen on this paid surface) */}
      {gated && (
        <p className="mt-4 text-sm text-foreground">The Rehearsal Room unlocks with your report.</p>
      )}

      {/* Scenario picker */}
      {!gated && !scenario && (
        <>
          <p
            className="mt-3 max-w-[58ch]"
            style={{ fontFamily: SERIF, fontSize: "15.5px", lineHeight: 1.55, color: "#5A5650" }}
          >
            Practise the conversation before it counts. Solo plays a realistic buyer of your
            strongest strand: sceptical but fair. Say "end rehearsal" whenever you want the debrief.
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => startScenario(s.id)}
                className="text-left p-5 transition-colors hover:border-[#1A1915]"
                style={{ background: "#FAF9F7", border: "1px solid #D1CEC7" }}
              >
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#15735F" }}>
                  {s.title}
                </span>
                <span
                  className="mt-2 block"
                  style={{ fontFamily: SERIF, fontSize: "14.5px", lineHeight: 1.5, color: "#5A5650" }}
                >
                  {s.blurb}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Transcript */}
      {!gated && scenario && (
        <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className="py-4 border-t border-border first:border-t-0">
              <div className="flex items-baseline gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: m.role === "user" ? "#7A7670" : "#2ECDB0" }}
                />
                <span style={{ color: m.role === "user" ? "#1D2025" : "#15735F" }}>
                  {m.role === "user" ? "You" : "The buyer"}
                </span>
              </div>
              {m.role === "user" ? (
                <div
                  className="max-w-[62ch] font-display font-semibold text-[15.5px] text-foreground"
                  style={{ letterSpacing: "-0.01em", lineHeight: 1.45 }}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  className="max-w-[62ch] [&>p]:mb-2.5 [&>p:last-child]:mb-0"
                  style={{ fontFamily: SERIF, fontSize: "15.5px", lineHeight: 1.6, color: "#5A5650" }}
                >
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="py-4 border-t border-border first:border-t-0 flex items-center gap-2 text-[12px] italic text-muted-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {debrief === null && messages.length === 0
                ? "Setting up the call…"
                : "The buyer is thinking…"}
            </div>
          )}

          {/* Debrief, the ruled block */}
          {debrief && (
            <div className="mt-5">
              <div className="rule-head">The debrief</div>
              <div
                className="mt-4 max-w-[62ch] [&>p]:mb-2.5 [&>p:last-child]:mb-0 [&_strong]:text-foreground [&_strong]:font-semibold [&_ul]:mb-2.5 [&_ul]:pl-5 [&_li]:mb-1"
                style={{ fontFamily: SERIF, fontSize: "15.5px", lineHeight: 1.6, color: "#5A5650" }}
              >
                <ReactMarkdown>{debrief}</ReactMarkdown>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <button type="button" onClick={handleRestart} className="link-edit">
                  Rehearse again
                </button>
              </div>
            </div>
          )}

          {error && <p className="py-3 text-[13px] text-foreground">{error}</p>}

          <div ref={endRef} />
        </div>
      )}

      {/* Input dock */}
      {!gated && scenario && !debrief && (
        <div className="mt-4">
          <div
            className="p-3 grid grid-cols-[1fr_auto] gap-3 items-end"
            style={{ background: "#FAF9F7", border: "1px solid #D1CEC7" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={busy ? "The buyer is thinking…" : "Say it like you would on the call."}
              rows={1}
              disabled={busy}
              className="resize-none border-none outline-none bg-transparent text-[14.5px] leading-[1.5] text-foreground placeholder:text-muted-foreground min-h-[40px] py-1 disabled:cursor-not-allowed"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || busy}
              className="cta-block inline-flex items-center justify-center px-4 py-2 text-[13px] disabled:bg-[#ECEAE4] disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-100"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </button>
          </div>
          <div className="mt-2 flex justify-between items-baseline text-[11px] text-muted-foreground">
            <span className="italic">This rehearsal doesn't use your Ask Solo questions.</span>
            <button
              type="button"
              onClick={handleEnd}
              disabled={busy || messages.length === 0}
              className="underline underline-offset-[3px] decoration-[#D8D4CC] hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              End rehearsal and get the debrief
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
