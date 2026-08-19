// Landing — editorial front page (ADR-026 v2.0, 2026-06-10).
//
// The FT-register rebuild approved from admin/visual-overhaul-2026-06-10/
// solo-ft-mock-v1.html. One flat ivory surface; newspaper lead grid (lead
// story + dark engine panel + live radar rail); the 2026-05-18 accordion
// model is RETIRED — persuasion renders as open editorial bands separated by
// rules. All handler wiring (useHomeHandlers, report_id recovery redirect,
// render self-check) preserved from the previous build. The radar rail and
// the ticker share the public get-ticker feed (real data, never fabricated).

import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import SignalSection from "@/components/marketing/SignalSection";
import { useTicker } from "@/hooks/useTicker";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";

/* ─── Handler wiring (unchanged) ─── */
function useHomeHandlers() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && /(?:^|[#&])error=/.test(hash)) {
      navigate(`/auth${hash}`, { replace: true });
    }
  }, [navigate]);

  return {
    handleStartTest: () => startTest(navigate),
    handleOpenPlan: () => navigateAuthed(navigate, "/plan"),
    handleSampleReport: () => navigate("/sample-report"),
    isAuthed: !!user,
  };
}

/* ─── Content (carried over from the previous build) ─── */

const STEPS = [
  {
    num: "01",
    title: "Start with your CV",
    body:
      "Drop in your CV and Solo reads your role, sector and seniority from it, then asks only what a CV cannot say: your situation, your appetite, the evidence people already come to you. The full test carries your answers forward, so most of the typing is already done. About 8 minutes end to end.",
    meta: "≈ 8 min · your CV does the typing",
  },
  {
    num: "02",
    title: "Get your report",
    body:
      "Solo classifies you against 95 professional archetypes and matches your capability profile across 480 business models. Your options arrive in honest bands: the front runners we would pursue first, the credible paths behind them, and each backed by live UK market signals from this fortnight.",
    meta: "Delivered in < 8 min",
  },
  {
    num: "03",
    title: "Start when you're ready",
    body:
      "Your 30-day plan waits in your back pocket until you press fire. The clock only starts when you say so, weeks or months after you buy. When you do start, daily check-ins track your progress, named contacts are ready, and Ask Solo knows your situation.",
    meta: "30 days · ~15 min / day · starts on your signal",
  },
] as const;

const PROPS = [
  {
    num: "01",
    eyebrow: "Decision engine",
    title: "A stress-tested set of feasible options, not a brainstorm",
    body:
      "Solo classifies your profile against 95 professional archetypes and scores it across 480 business models. By the time you see your options, the weak ones are already gone. What's left is specific to your background, your network, and your financial reality.",
    big: true,
  },
  {
    num: "02",
    eyebrow: "In your back pocket",
    title: "Buy now. Start when you're ready.",
    body:
      "The 30-day clock only starts when you press fire, not when you pay. Your report and plan sit in your back pocket for as long as you need, weeks or months. When you do start, the plan adapts daily to what actually happens.",
    big: false,
  },
  {
    num: "03",
    eyebrow: "Named outreach contacts",
    title: "Real names. Not \"try LinkedIn.\"",
    body:
      "For paths that involve direct contact, Solo finds actual people, by name, role, and company. When you're ready to send a message, Solo drafts it for you, in your voice, for that specific person. The harder part deciding to send it is yours.",
    big: false,
  },
  {
    num: "04",
    eyebrow: "Contextual coaching",
    title: "The more you use it, the sharper it gets",
    body:
      "Ask Solo anything about your progress, your options, or your next move. Every answer draws on everything it has built about you, your archetype, your active paths, your check-in history, your blockers. Not generic advice. A specific answer to your specific situation.",
    big: true,
  },
  {
    num: "05",
    eyebrow: "Guidance library",
    title: "Guidance for the hard parts",
    body:
      "Going independent involves challenges that are genuinely difficult, pricing your work, positioning yourself, handling rejection. All 32 guidance modules are written for them.",
    big: false,
  },
  {
    num: "06",
    eyebrow: "Four types of move",
    title: "Every move drafted. You decide whether to make it.",
    body:
      "Whether your path calls for a direct approach to a named contact, registering on a marketplace, writing a LinkedIn post, or joining the right community, Solo generates the move. You don't have to figure out what to do next. The next move is always ready.",
    big: false,
  },
] as const;

const PERSONAS = [
  {
    num: "01",
    tag: "The Finance Director, 11 years in",
    body: "A senior FP&A or finance leader in a corporate, Big Four, or FTSE-listed business. Two restructures already behind them. The next one feels close. They are not looking for inspiration. They want a concrete shortlist of work they could actually go and win in the next quarter, with realistic numbers attached.",
  },
  {
    num: "02",
    tag: "The Programme Director, 9 years in",
    body: "A senior delivery or operations lead in a regulated business, financial services, defence, healthcare, infrastructure. The exit is not tomorrow but it is not five years either. They want the plan built properly and sitting in the drawer, ready to act on when something shifts, rather than assembled in panic when it does.",
  },
  {
    num: "03",
    tag: "The Comms or Marketing Director, 10 years in",
    body: "A senior communications, marketing, or strategy leader watching colleagues leave for fractional work and noticing the AI conversation in their function sharpen every quarter. Not in immediate trouble, but no longer confident the role they have built will look the same in three years. They want a credible independent path that uses their actual skills, not a side hustle to fill the gap.",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Is this AI?",
    a:
      "AI runs the classifier and drafts the moves. The scoring model, the archetype taxonomy, and the move templates are built by humans. We don't lead with \"AI\" because the user is buying the conclusions, not the technology.",
  },
  {
    q: "What if my profile doesn't fit a clean archetype?",
    a: "Most don't fit cleanly. The classifier returns the closest match plus the two nearest alternatives. The report reflects the blend.",
  },
  {
    q: "Will my employer find out I've used this?",
    a: "No. Solo never publishes, never emails employers, never indexes your data. Your CV is processed and discarded.",
  },
] as const;

/* ─── Small composable bits ─── */

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="cta-block">
      {children}
    </button>
  );
}

function EngineExhibit() {
  // A + C blend (2026-06-10): replaces the orbital "EngineArt". The "Solo Index"
  // (the three credibility figures as a typographic stack) sits over a real
  // specimen entry drawn from the knowledge base. Sober, editorial, no motion.
  // Figures and the specimen (Enterprise Risk Management / ARCH_ERM) are real as
  // of 2026-06-10; refresh the specimen if the KB mapping changes materially.
  const serif = { fontFamily: "'Source Serif 4', Georgia, serif" };
  const index = [
    { n: "95", label: "career archetypes" },
    { n: "480", label: "business models" },
    { n: "2,159", label: "scored combinations" },
  ];
  const specimen = [
    { k: "Domain", v: "Risk & Governance" },
    { k: "Viable models", v: "18" },
    { k: "Top match", v: "Enterprise Risk Advisory" },
  ];
  return (
    <div className="flex h-full flex-col justify-center px-7 py-9">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2ECDB0]">
        The Solo index
      </div>
      <div className="mt-3.5 border-t" style={{ borderColor: "rgba(250,249,247,.14)" }}>
        {index.map((r) => (
          <div
            key={r.n}
            className="flex items-baseline justify-between border-b py-2.5"
            style={{ borderColor: "rgba(250,249,247,.09)" }}
          >
            <span style={{ ...serif, fontSize: "27px", lineHeight: 1, color: "#FAF9F7" }}>{r.n}</span>
            <span className="text-[11px]" style={{ color: "rgba(250,249,247,.6)" }}>{r.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-[12px] leading-[1.5]" style={{ color: "rgba(250,249,247,.7)" }}>
        Your report is selected from this tested library, not generated from a blank page.
      </p>

      <div className="mt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2ECDB0]">
        A specimen entry
      </div>
      <h3 className="mt-2" style={{ ...serif, fontSize: "20px", lineHeight: 1.2, color: "#FAF9F7" }}>
        Enterprise Risk Management
      </h3>
      <div className="mt-3">
        {specimen.map((r, i) => (
          <div
            key={r.k}
            className={"flex items-baseline justify-between py-2" + (i < specimen.length - 1 ? " border-b" : "")}
            style={{ borderColor: "rgba(250,249,247,.09)" }}
          >
            <span className="text-[11.5px]" style={{ color: "rgba(250,249,247,.6)" }}>{r.k}</span>
            <span className="text-[12.5px]" style={{ color: "#FAF9F7" }}>{r.v}</span>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-[10.5px]" style={{ color: "rgba(250,249,247,.5)" }}>
        One of 95 archetypes. Yours is built the same way.
      </p>
    </div>
  );
}

/* ─── Page ─── */

export default function Landing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleStartTest, handleOpenPlan, handleSampleReport, isAuthed } = useHomeHandlers();
  const renderRegression = useMainContentSelfCheck();
  const { items: radarItems, signal } = useTicker();

  // report_id recovery redirect, never renders the page
  useEffect(() => {
    const reportId = searchParams.get("report_id");
    if (reportId) {
      navigate(`/teaser?report_id=${reportId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const railTenders = radarItems.slice(0, 2);

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      {renderRegression && (
        <Banner variant="error">
          Something went wrong rendering this page. Please refresh.
        </Banner>
      )}

      <main>
        {/* ═══ LEAD GRID · lead story / engine panel / radar rail ═══ */}
        <section className="mx-auto max-w-6xl px-6 pt-8 pb-9 lg:pb-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr_.74fr] lg:gap-0">

            {/* Lead story */}
            <div className="lg:pr-7">
              <div className="eyebrow">A Plan B engine for mid-career professionals</div>
              <h1 className="title-h1 title-h1--hero mt-3.5">
                If you needed to earn an independent income fast, what would you do?
              </h1>
              <p className="standfirst mt-4 max-w-[36ch]">
                Most professionals don't have a credible answer to that. Solo builds one, from your actual career, not a template.
              </p>
              <div className="mt-6 flex items-center gap-5">
                {isAuthed ? (
                  <PrimaryButton onClick={handleOpenPlan}>Open my plan</PrimaryButton>
                ) : (
                  <PrimaryButton onClick={handleStartTest}>Find what works</PrimaryButton>
                )}
                {/* Sprint 1: secondary CTA label normalised to canon. */}
                <button onClick={handleSampleReport} className="link-edit">
                  See the sample report
                </button>
              </div>
              {!isAuthed && (
                /* Sprint 1: the free diagnostic (the capture centrepiece) was
                   unreachable from the landing; one quiet bridge, no competing
                   weight against the primary. */
                <div className="mt-3 text-[12.5px] text-muted-foreground">
                  Not ready for the full test?{" "}
                  <Link to="/diagnostic" className="font-medium text-foreground underline decoration-[#2ECDB0] decoration-2 underline-offset-4 hover:decoration-[#15735F]">
                    Try the free 90-second diagnostic →
                  </Link>
                </div>
              )}
              <div className="mt-7 flex gap-5 border-t border-border pt-3.5 text-[11.5px] text-muted-foreground">
                <span><b className="font-semibold text-foreground">£19.99</b> one-time</span>
                <span><b className="font-semibold text-foreground">8 min</b> test</span>
                <span><b className="font-semibold text-foreground">No</b> subscription required</span>
              </div>
            </div>

            {/* The engine — dark visual panel */}
            <div className="lg:border-l lg:border-border lg:px-7">
              <div className="panel-dark flex h-full flex-col">
                <EngineExhibit />
              </div>
            </div>

            {/* Radar rail — real items from the public feed */}
            <div className="lg:border-l lg:border-border lg:pl-7">
              <h4 className="rule-head flex items-baseline justify-between">
                This week on the radar
                <span className="text-[10px] tracking-[0.1em] text-[#15735F]">● Live</span>
              </h4>
              {railTenders.map((t, i) => (
                <div key={i} className="border-b border-border py-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t.category} · Tender{t.value_text && <> · <span className="text-[#15735F]">{t.value_text}</span></>}
                  </div>
                  <h5 className="mt-1.5 font-display text-[14.5px] font-bold leading-[1.3] tracking-tight">{t.title}</h5>
                </div>
              ))}
              {railTenders.length === 0 && (
                <div className="border-b border-border py-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">The Radar</div>
                  <h5 className="mt-1.5 font-display text-[14.5px] font-bold leading-[1.3] tracking-tight">
                    Live UK market openings, matched to your profile every Monday.
                  </h5>
                </div>
              )}
              {signal && (
                <div className="border-b border-border py-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">The Signal · This week</div>
                  <Link to="/signal" className="mt-1.5 block font-display text-[14.5px] font-bold leading-[1.3] tracking-tight hover:text-[#15735F]">
                    {signal.headline}
                  </Link>
                </div>
              )}
              <div className="pt-3.5 text-[12px]">
                <button onClick={isAuthed ? () => navigate("/radar") : handleStartTest} className="link-edit">
                  Your radar unlocks with your report →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS · three steps on rules ═══ */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-5 flex items-baseline justify-between">
              <h4 className="rule-head border-b-0 pb-0">How it works</h4>
              <span className="text-[12px] text-muted-foreground">From experience to income path in 8 minutes</span>
            </div>
            <div className="grid gap-9 lg:grid-cols-3 lg:gap-0">
              {STEPS.map((step, i) => (
                <div key={step.num} className={i === 0 ? "lg:pr-8" : "lg:border-l lg:border-border lg:px-8"}>
                  <div className="font-display text-[2.6rem] font-semibold leading-none text-[#15735F] tabular-nums">{step.num}</div>
                  <h3 className="mt-4 font-display text-[18px] font-bold leading-[1.25] tracking-tight">{step.title}</h3>
                  <p className="standfirst mt-2.5 text-[14px]">{step.body}</p>
                  <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{step.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ WHY SOLO · six propositions, asymmetric editorial grid ═══ */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="mb-5 flex items-baseline justify-between">
              <h4 className="rule-head border-b-0 pb-0">Why Solo</h4>
              <span className="text-[12px] text-muted-foreground">Six structural propositions</span>
            </div>
            {/* Sprint 3: the grid now tiles 8+4 / 4+8 / 6+6, so the sixth
              * proposition no longer sits beside an eight-column hole, and
              * the hairline falls on the second column of each row instead
              * of every odd index. */}
            <div className="grid gap-x-10 gap-y-9 lg:grid-cols-12">
              {PROPS.map((p, i) => {
                const SPANS = [
                  "lg:col-span-8",
                  "lg:col-span-4 lg:border-l lg:border-border lg:pl-10",
                  "lg:col-span-4",
                  "lg:col-span-8 lg:border-l lg:border-border lg:pl-10",
                  "lg:col-span-6",
                  "lg:col-span-6 lg:border-l lg:border-border lg:pl-10",
                ];
                return (
                <div key={p.num} className={SPANS[i] ?? "lg:col-span-4"}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="mr-2 text-[#15735F] tabular-nums">{p.num}</span>{p.eyebrow}
                  </div>
                  <h3 className={`mt-2.5 font-display font-bold tracking-tight ${p.big ? "text-[24px] leading-[1.15] lg:text-[30px]" : "text-[17px] leading-[1.3]"}`}>
                    {p.title}
                  </h3>
                  <p className={`mt-3 text-muted-foreground ${p.big ? "text-[14.5px] leading-[1.65]" : "text-[13.5px] leading-[1.6]"}`}>{p.body}</p>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ THE CHATGPT DIFFERENCE · dark polemic band (mint top stripe) ═══ */}
        <section className="panel-dark" style={{ borderTop: "4px solid #2ECDB0" }}>
          <div className="mx-auto max-w-6xl px-6 py-12 text-center">
            <h3 className="mx-auto max-w-3xl font-display text-[24px] font-bold leading-[1.18] tracking-tight sm:text-[30px]" style={{ color: "#FAF9F7" }}>
              ChatGPT can help you think about independence.<br />Solo will help you actually get there.
            </h3>
            <div className="mx-auto mt-8 grid max-w-4xl gap-6 text-left md:grid-cols-2 md:gap-10">
              <p className="text-[14.5px] leading-[1.7]" style={{ color: "rgba(250,249,247,.85)" }}>
                General-purpose AI will give you a framework. A list of options. Advice to "build a personal brand" and "network with people in your target sector." It does not know who you are. Every session starts from scratch.
              </p>
              <p className="text-[14.5px] leading-[1.7]" style={{ color: "rgba(250,249,247,.85)" }}>
                Solo runs your profile against a decision engine built from 95 archetypes, 480 business models, and 2,159 scored match combinations. The context it builds over time, your history, your progress, your blockers, is something no general-purpose AI can replicate.
              </p>
            </div>
            <p className="mx-auto mt-8 max-w-3xl text-[14.5px] font-medium leading-[1.6]" style={{ color: "#FAF9F7" }}>
              You can spend ten hours prompting ChatGPT, still not have a plan, and still not know who to actually contact. Or take the Solo test, and walk away with a real plan and a real list of people to contact.
            </p>
            <div className="mt-7">
              <PrimaryButton onClick={isAuthed ? handleOpenPlan : handleStartTest}>
                {isAuthed ? "Open my plan" : "Find what works"}
              </PrimaryButton>
            </div>
          </div>
        </section>

        {/* ═══ WHO IT'S FOR · three personas on rules ═══ */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-5 flex items-baseline justify-between">
              <h4 className="rule-head border-b-0 pb-0">Who it's for</h4>
              <span className="text-[12px] text-muted-foreground">Three professionals Solo was built for</span>
            </div>
            <p className="standfirst mb-6 max-w-[68ch]">
              Solo can be useful to anyone considering independent work. It is calibrated for a particular kind of professional: senior, structured, mid-career, with a real career to protect and a real reason to be thinking ahead.
            </p>
            <div className="grid gap-9 lg:grid-cols-3 lg:gap-0">
              {PERSONAS.map((p, i) => (
                <div key={p.num} className={i === 0 ? "lg:pr-8" : "lg:border-l lg:border-border lg:px-8"}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span className="mr-2 text-[#15735F] tabular-nums">{p.num}</span>{p.tag}
                  </div>
                  <p className="standfirst mt-3.5 text-[14px]">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PRICING · editorial summary band ═══ */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <h4 className="rule-head border-b-0 pb-0">Pricing</h4>
                <h3 className="mt-4 font-display text-[24px] font-bold leading-[1.2] tracking-tight">
                  Your independence dossier, live for 30 days.
                </h3>
                <p className="standfirst mt-3 text-[14.5px]">
                  £19.99 builds it: the report, a 30-day activation plan and the daily tracker, refreshed every Monday with live signals from your market. £19 a month keeps it live past day 30, with weekly check-ins, all 32 guidance modules and unlimited Ask Solo.
                </p>
                <Link to="/pricing" className="link-edit mt-4 inline-block">See full pricing →</Link>
              </div>
              <div className="lg:col-span-7">
                <div className="grid gap-0 sm:grid-cols-2">
                  <div className="border-t-[3px] border-foreground py-4 sm:pr-8">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-[16px] font-bold">One-time</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#15735F]">Most start here</span>
                    </div>
                    <div className="mt-3 font-display text-[34px] font-extrabold leading-none tabular-nums">£19.99 <span className="text-[13px] font-normal text-muted-foreground">once</span></div>
                    <ul className="mt-4 space-y-1.5 text-[13px] leading-[1.55] text-muted-foreground">
                      <li>Full report, 10 scored business paths</li>
                      <li>30-day activation plan + daily tracker</li>
                      <li>Live evidence refreshed every Monday</li>
                      <li>3 of the 32 guidance modules</li>
                      <li>Permanent access to your report</li>
                    </ul>
                  </div>
                  <div className="border-t-[3px] border-border py-4 sm:border-l sm:border-l-border sm:pl-8">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-[16px] font-bold">Monthly</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Optional</span>
                    </div>
                    <div className="mt-3 font-display text-[34px] font-extrabold leading-none tabular-nums">£19 <span className="text-[13px] font-normal text-muted-foreground">/month, cancel any time</span></div>
                    <ul className="mt-4 space-y-1.5 text-[13px] leading-[1.55] text-muted-foreground">
                      <li>Your dossier stays live past day 30</li>
                      <li>All 32 guidance modules</li>
                      <li>The Opportunity Radar, weekly</li>
                      <li>Unlimited Ask Solo</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ABOUT · editorial column ═══ */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <h4 className="rule-head border-b-0 pb-0">About Solo</h4>
                <h3 className="mt-4 font-display text-[22px] font-bold leading-[1.25] tracking-tight">
                  Plan B conversations are usually held too late, and usually with the wrong person.
                </h3>
              </div>
              <div className="prose-serif lg:col-span-8 lg:border-l lg:border-border lg:pl-12">
                <p>
                  Solo was built by someone who has worked through three of these conversations themselves and has run them with several hundred mid-career professionals. The product is the artefact of those conversations, the spreadsheets, the scoring system, the move templates, the questions you ask when someone walks into the room not yet ready to say "I might leave."
                </p>
                <p>
                  The version you're using is built around a simple position: Plan B work is structured analysis, not motivational performance. Mid-career professionals are intelligent adults who want specificity over encouragement. Every part of Solo, from how the questions read to how the report writes back, follows that position.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ QUESTIONS · open FAQ rows ═══ */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <h4 className="rule-head border-b-0 pb-0">Questions, answered</h4>
                <Link to="/faq" className="link-edit mt-4 inline-block">See all questions →</Link>
              </div>
              <div className="lg:col-span-8">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={item.q} className={`py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                    <h5 className="font-display text-[16px] font-bold leading-snug tracking-tight">{item.q}</h5>
                    <p className="standfirst mt-2 text-[14px]">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ THE SIGNAL · existing component, on a rule ═══ */}
        <div className="border-t border-border">
          <SignalSection />
        </div>

        {/* ═══ CLOSING · flat ink band ═══ */}
        <section className="panel-dark">
          <div className="mx-auto max-w-6xl px-6 py-14 text-center sm:py-16">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,247,.6)" }}>
              {isAuthed ? "Pick up where you left off" : "Ready when you are"}
            </div>
            <h2 className="mt-4 font-display text-[32px] font-extrabold tracking-tight sm:text-[40px]" style={{ color: "#FAF9F7", letterSpacing: "-0.025em" }}>
              {isAuthed ? "Your plan is waiting." : "Your Plan B should already exist."}
            </h2>
            <p className="standfirst mx-auto mt-3 max-w-[54ch]" style={{ color: "rgba(250,249,247,.8)" }}>
              {isAuthed
                ? "Your report, your 30-day plan, and your check-in history are right where you left them."
                : "The test takes 8 minutes. You'll see your archetype, your top income paths, and your first recommended move before you pay anything."}
            </p>
            <div className="mt-7">
              {isAuthed ? (
                <PrimaryButton onClick={handleOpenPlan}>Open my plan</PrimaryButton>
              ) : (
                <PrimaryButton onClick={handleStartTest}>Find what works</PrimaryButton>
              )}
            </div>
            {!isAuthed && (
              <div className="mt-4 text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(250,249,247,.65)" }}>
                £19.99 one-time · No subscription required
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
