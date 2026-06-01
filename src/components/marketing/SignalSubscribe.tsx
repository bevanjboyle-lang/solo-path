// src/components/marketing/SignalSubscribe.tsx
//
// Quiet email-capture block for The Signal. Posts to the public subscribe-signal
// function. No spam framing per tone-of-voice. Used on the archive + edition pages.

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function SignalSubscribe({ source = "signal_page" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("subscribe-signal", { body: { email, source } });
      if (error) throw new Error(error.message);
      const ok = (data as { ok?: boolean })?.ok;
      if (ok) {
        setStatus("done");
        setMessage("You're on the list for The Signal.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage((data as { response_text?: string })?.response_text ?? "Please enter a valid email.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-foreground">{message}</p>;
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Get The Signal weekly</p>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">
        A weekly read on where independent work is opening up in your field. No spam, unsubscribe anytime.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@work.com"
          className="flex-1 rounded border border-stone-300 bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {status === "loading" ? "Adding…" : "Subscribe"}
        </button>
      </form>
      {status === "error" && message && <p className="mt-2 text-[12px] text-red-600">{message}</p>}
    </div>
  );
}
