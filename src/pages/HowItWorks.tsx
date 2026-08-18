// src/pages/HowItWorks.tsx
//
// /how-it-works — the trust/method page (PR-1). Turns the decision engine's
// rigour into visible credibility for an anonymous brand. Copy from
// admin/trust-layer-design.md. Editorial single-column panel matching /signal.
// Tone-of-voice compliant: specific, calm, no em dashes, no banned words.

import { useEffect } from "react";
import TopBar from "@/components/TopBar";
import { Link } from "react-router-dom";

function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-border pt-6 first:mt-6 first:border-t-0 first:pt-0">
      {eyebrow && (
        <p className="eyebrow">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-display text-lg font-bold leading-snug tracking-tight text-foreground md:text-xl">
        {title}
      </h2>
      <div className="standfirst mt-3 space-y-3 text-[14px]">{children}</div>
    </section>
  );
}

export default function HowItWorks() {
  useEffect(() => {
    const original = document.title;
    document.title = "How Solo works — the method behind your report";
    return () => { document.title = original; };
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16">
      <div className="mx-auto max-w-2xl px-6">
        <div>
          <header>
            <p className="eyebrow">How Solo works</p>
            <h1 className="title-h1 mt-3">
              Solo doesn't guess. It decides.
            </h1>
            <p className="standfirst mt-3">
              Most "AI career tools" are a chatbot with a nice font. Solo is a structured decision engine
              with a curated library behind it. Here is exactly what happens between your answers and your
              report, so you can judge it before you pay.
            </p>
          </header>

          <Section title="The library">
            <p>
              Solo classifies you against 95 professional archetypes across 14 domains, then scores your fit
              against 480 independent business models using 2,159 archetype-to-model combinations. Your report
              is not generated from a blank page. It is selected from a library built for people with your kind
              of experience.
            </p>
          </Section>

          <Section title="It eliminates before it recommends">
            <p>
              Most paths are wrong for most people. Solo scores every model on speed to revenue, credibility
              gap, sales difficulty, and income potential, then removes the weak fits before you ever see them.
              You get the ones that actually suit your background, not a brainstorm of everything.
            </p>
          </Section>

          <Section title="Priced for where you actually sit">
            <p>
              A senior manager and a partner do not command the same rate for the same work. Solo calibrates
              every pricing band to your seniority and years of experience, and the income outlook is
              deliberately conservative. If the first months are slow, the report says so.
            </p>
          </Section>

          <Section title="It tells you what will go wrong">
            <p>
              Every report names the most likely failure mode and what you will find hard. Honest difficulty
              is part of the product. Solo would rather you trust it than flatter you.
            </p>
          </Section>

          <Section title="Every report is quality-checked">
            <p>
              Before a report reaches you it is checked against a fixed quality standard: is it specific to you,
              is the pricing realistic, is the recommendation reasoned. Solo runs its own outputs through an
              independent scoring process and holds them to that bar.
            </p>
          </Section>

          <Section title="Your data">
            <p>
              You can upload your CV to skip most of the questions. It is processed to read your work history
              and then discarded. Solo never publishes anything, never emails your employer, never sells your
              data, and you can delete everything from your account in one click.
            </p>
          </Section>

          <footer className="mt-10 border-t border-border pt-6 text-center">
            <p className="font-display text-base font-bold leading-snug text-foreground">
              See it on a real example, then decide.
            </p>
            {/* Sprint 1: CTA hierarchy corrected to canon; "Find what works" is the mint primary, the sample report is the underline secondary. */}
            <div className="mt-4 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/cv-upload"
                className="cta-block"
              >
                Find what works
              </Link>
              <Link
                to="/sample-report"
                className="link-edit"
              >
                See the sample report
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
    </div>
  );
}
