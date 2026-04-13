import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  BookOpen,
  MessageSquare,
  FileText,
  Download,
} from "lucide-react";

/* ───────────── SECTION 1 — Hero ───────────── */
function HeroSection() {
  return (
    <div className="rounded-2xl px-6 py-16 sm:px-12 sm:py-20 text-center" style={{ background: "#1D2025" }}>
      <span className="inline-block rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide"
        style={{ borderColor: "rgba(46,205,176,0.3)", color: "#2ECDB0", background: "rgba(46,205,176,0.08)" }}>
        Personalised to your situation
      </span>

      <h1 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl" style={{ letterSpacing: "-1px", lineHeight: 1.15 }}>
        Practical guidance, built around <em className="not-italic" style={{ color: "#2ECDB0" }}>your</em> career move
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "#B0ADA8" }}>
        25 focused modules covering every stage of going independent — from setting your rates to landing your first client to building for the long term.
      </p>

      <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-6">
        {[
          { num: "25", label: "Guidance modules" },
          { num: "3", label: "Included with your report" },
          { num: "22", label: "Unlocked with subscription" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl font-bold" style={{ color: "#2ECDB0" }}>{s.num}</p>
            <p className="mt-1 text-xs" style={{ color: "#9B9893" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── SECTION 2 — How it works ───────────── */
function HowItWorksSection() {
  const steps = [
    { icon: BookOpen, title: "A module becomes available", desc: "Modules unlock as you progress through your 30-day plan — at the moment they're most relevant to what you're working on." },
    { icon: MessageSquare, title: "We ask a few quick questions", desc: "Most of your context comes straight from your report. We ask 2–3 focused questions to fill in anything specific to that module." },
    { icon: FileText, title: "You get a personalised plan", desc: "A complete, specific action plan — built around your background, your market, and your situation. Saved permanently in your library." },
  ];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em", color: "#1D2025" }}>
        Guidance that knows your situation
      </h2>
      <p className="mt-2 max-w-xl text-sm" style={{ color: "#5A5650" }}>
        Each module is built around you — your background, your plan, where you are in your first 30 days. You're not reading generic advice. You're getting a specific plan.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <GlassCard key={i} className="p-6">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "rgba(46,205,176,0.1)" }}>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: "#1D2025" }}>{s.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#5A5650" }}>{s.desc}</p>
          </GlassCard>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl p-5" style={{ background: "rgba(46,205,176,0.06)", border: "1px solid rgba(46,205,176,0.15)" }}>
          <p className="text-xs font-semibold text-primary">Included with your report</p>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#5A5650" }}>
            The first 3 modules are unlocked immediately — covering your opening moves, first conversations, and how to present yourself before you've made anything official.
          </p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "rgba(217,168,60,0.06)", border: "1px solid rgba(217,168,60,0.15)" }}>
          <p className="text-xs font-semibold" style={{ color: "#B8860B" }}>Full library with subscription</p>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#5A5650" }}>
            All 25 modules unlock with a Solo subscription. Covers clients, pricing, contracts, pipeline, positioning, long-term growth, and sector-specific guidance.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── SECTION 3 — Library View ───────────── */
type ModuleStatus = "completed" | "active" | "locked";

interface ModuleRow {
  status: ModuleStatus;
  title: string;
  subtext: string;
  action: string;
}

function ModuleRowItem({ row }: { row: ModuleRow }) {
  const statusConfig: Record<ModuleStatus, { icon: React.ReactNode; color: string }> = {
    completed: { icon: <CheckCircle2 className="h-4 w-4" style={{ color: "#2ECDB0" }} />, color: "#2ECDB0" },
    active: { icon: <Sparkles className="h-4 w-4" style={{ color: "#2ECDB0" }} />, color: "#2ECDB0" },
    locked: { icon: <Lock className="h-4 w-4" style={{ color: "#B0ADA8" }} />, color: "#B0ADA8" },
  };
  const cfg = statusConfig[row.status];

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors"
      style={{
        borderLeft: row.status === "active" ? "3px solid #2ECDB0" : "3px solid transparent",
        background: row.status === "active" ? "rgba(46,205,176,0.04)" : undefined,
        opacity: row.status === "locked" ? 0.6 : 1,
      }}
    >
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: row.status === "locked" ? "#9B9893" : "#1D2025" }}>{row.title}</p>
        <p className="text-xs" style={{ color: "#9B9893" }}>{row.subtext}</p>
      </div>
      <span
        className="shrink-0 text-xs font-medium"
        style={{ color: row.status === "locked" ? "#B0ADA8" : "#2ECDB0" }}
      >
        {row.action}
      </span>
    </div>
  );
}

function LibraryGroup({
  title, badge, badgeColor, progress, modules, collapsed, extra,
  onToggle,
}: {
  title: string;
  badge: string;
  badgeColor: "mint" | "amber";
  progress: string;
  modules: ModuleRow[];
  collapsed?: boolean;
  extra?: string;
  onToggle?: () => void;
}) {
  const colors = badgeColor === "mint"
    ? { bg: "rgba(46,205,176,0.1)", text: "#2ECDB0" }
    : { bg: "rgba(217,168,60,0.12)", text: "#B8860B" };

  return (
    <div className="border-b" style={{ borderColor: "rgba(229,226,220,0.5)" }}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          {collapsed ? <ChevronRight className="h-4 w-4" style={{ color: "#9B9893" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#9B9893" }} />}
          <span className="text-sm font-semibold" style={{ color: "#1D2025" }}>{title}</span>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: colors.bg, color: colors.text }}>
            {badge}
          </span>
        </div>
        <span className="text-xs" style={{ color: "#9B9893" }}>{progress}</span>
      </button>

      {!collapsed && (
        <div className="pb-3 space-y-0.5">
          {modules.map((m, i) => <ModuleRowItem key={i} row={m} />)}
          {extra && (
            <p className="px-4 py-2 text-xs" style={{ color: "#9B9893" }}>{extra}</p>
          )}
        </div>
      )}
    </div>
  );
}

function LibraryViewSection() {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({
    0: true, 1: true, 2: true, 3: false, 4: false,
  });
  const toggle = (i: number) => setExpandedGroups((p) => ({ ...p, [i]: !p[i] }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your library</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em", color: "#1D2025" }}>
        What you'll see in your guidance library
      </h2>
      <p className="mt-2 max-w-xl text-sm" style={{ color: "#5A5650" }}>
        Modules are organised by stage of the journey. Your progress is tracked as you work through them.
      </p>

      {/* Context bar */}
      <div className="mt-6 rounded-lg px-4 py-2.5 text-xs" style={{ background: "rgba(46,205,176,0.06)", border: "1px solid rgba(46,205,176,0.15)", color: "#5A5650" }}>
        Sarah Okafor · Finance Business Partner · 11 years · FTSE 100 retail banking · <em>Example output</em>
      </div>

      {/* Library frame */}
      <GlassCard noHover className="mt-4 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: "rgba(229,226,220,0.5)" }}>
          <span className="text-sm font-semibold" style={{ color: "#1D2025" }}>Guidance library</span>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "#9B9893" }}>1 of 25 complete</span>
            <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: "rgba(229,226,220,0.5)" }}>
              <div className="h-full rounded-full" style={{ width: "4%", background: "#2ECDB0" }} />
            </div>
          </div>
        </div>

        {/* Groups */}
        <LibraryGroup
          title="First steps"
          badge="Included"
          badgeColor="mint"
          progress="1 of 3 complete"
          onToggle={() => toggle(0)}
          collapsed={!expandedGroups[0]}
          modules={[
            { status: "completed", title: "Understanding your starting position", subtext: "Completed · Day 2", action: "View" },
            { status: "active", title: "How to talk about what you're doing", subtext: "Ready now · 3 quick questions", action: "Start →" },
            { status: "locked", title: "Presenting yourself in the market", subtext: "Unlocks at Day 7", action: "Locked" },
          ]}
        />
        <LibraryGroup
          title="Landing your first clients"
          badge="Subscription"
          badgeColor="amber"
          progress="0 of 6 complete"
          onToggle={() => toggle(1)}
          collapsed={!expandedGroups[1]}
          modules={[
            { status: "locked", title: "Finding your first client conversation", subtext: "Unlocks at Day 5", action: "Locked" },
            { status: "locked", title: "Writing a proposal that converts", subtext: "Unlocks at Day 10", action: "Locked" },
          ]}
          extra="+ 4 more modules in this group"
        />
        <LibraryGroup
          title="Pricing & commercial strategy"
          badge="Subscription"
          badgeColor="amber"
          progress="0 of 6 complete"
          onToggle={() => toggle(2)}
          collapsed={!expandedGroups[2]}
          modules={[
            { status: "locked", title: "Managing scope and avoiding overrun", subtext: "Unlocks at Day 8", action: "Locked" },
            { status: "locked", title: "Managing your cash flow in year one", subtext: "Unlocks at Day 12", action: "Locked" },
            { status: "active", title: "Setting your day rate and pricing strategy", subtext: "Ready now · 2 quick questions", action: "Start →" },
            { status: "locked", title: "Holding your rate under pressure", subtext: "Complete the pricing module first", action: "Locked" },
          ]}
          extra="+ 2 more modules in this group"
        />
        <LibraryGroup
          title="Growing your practice"
          badge="Subscription"
          badgeColor="amber"
          progress="4 modules"
          onToggle={() => toggle(3)}
          collapsed={!expandedGroups[3]}
          modules={[]}
        />
        <LibraryGroup
          title="Your sector"
          badge="Subscription"
          badgeColor="amber"
          progress="6 modules"
          onToggle={() => toggle(4)}
          collapsed={!expandedGroups[4]}
          modules={[]}
        />
      </GlassCard>
    </div>
  );
}

/* ───────────── SECTION 4 — Example Output ───────────── */
function ExampleOutputSection() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Example output</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em", color: "#1D2025" }}>
        What you get back
      </h2>
      <p className="mt-2 max-w-xl text-sm" style={{ color: "#5A5650" }}>
        Specific, structured, and built around your actual background. Here's Sarah Okafor's pricing module output — Finance Business Partner, 11 years, FTSE 100 retail banking.
      </p>

      {/* Output panel */}
      <div className="mt-6 overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(229,226,220,0.5)" }}>
        {/* Output header */}
        <div className="px-6 py-6 sm:px-8" style={{ background: "#1D2025" }}>
          <p className="text-xs" style={{ color: "#9B9893" }}>Pricing &amp; commercial strategy · Generated 14 Apr 2026</p>
          <h3 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Your day rate and pricing strategy
          </h3>
          <p className="mt-1 text-sm" style={{ color: "#B0ADA8" }}>
            Built around your FTSE 100 banking background and 11 years of senior experience
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ background: "rgba(46,205,176,0.15)", color: "#2ECDB0" }}>Personalised to you</span>
            <span className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: "#9B9893" }}>Saved to your library</span>
          </div>
        </div>

        {/* Output body */}
        <div className="space-y-0" style={{ background: "rgba(250,249,247,0.95)" }}>

          {/* Block 1 — Rate headline */}
          <div className="px-6 py-8 sm:px-8" style={{ background: "#1D2025" }}>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9B9893" }}>Your target day rate</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  <span style={{ color: "#2ECDB0" }}>£800</span> – £950<span className="text-lg">/day</span>
                </p>
                <p className="mt-1 text-xs" style={{ color: "#B0ADA8" }}>Floor: £750/day. Do not go below this.</p>
                <p className="mt-3 text-[10px] leading-relaxed" style={{ color: "#6B6860" }}>
                  Based on: £82,500 salary estimate ÷ 220 working days × 2.2 multiplier, adjusted for sector premium
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9B9893" }}>Retainer equivalent</p>
                <p className="mt-2 text-xl font-bold text-white">£6,400–£9,500<span className="text-sm font-normal" style={{ color: "#B0ADA8" }}> per month</span></p>
                <p className="mt-1 text-xs" style={{ color: "#B0ADA8" }}>8–10 day commitment</p>
              </div>
            </div>
          </div>

          {/* Block 2 — Market comparison */}
          <div className="px-6 py-8 sm:px-8">
            <h4 className="text-sm font-semibold" style={{ color: "#1D2025" }}>Where your rate sits in the market</h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Finance contractor, no FS/FTSE background", rate: "£600–£850", note: "Standard mid-market range", highlight: false },
                { label: "Your range — FTSE + banking background", rate: "£800–£950", note: "Your justified target", highlight: true },
                { label: "Big 4 / consulting context, senior", rate: "£1,200–£1,800", note: "High end of market", highlight: false },
              ].map((col) => (
                <div
                  key={col.label}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: col.highlight ? "rgba(46,205,176,0.08)" : "rgba(243,241,237,0.8)",
                    border: col.highlight ? "1px solid rgba(46,205,176,0.25)" : "1px solid rgba(229,226,220,0.5)",
                  }}
                >
                  <p className="text-[10px] font-medium" style={{ color: "#9B9893" }}>{col.label}</p>
                  <p className="mt-2 text-lg font-bold" style={{ color: col.highlight ? "#2ECDB0" : "#1D2025" }}>{col.rate}</p>
                  <p className="mt-1 text-[10px]" style={{ color: "#9B9893" }}>{col.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Block 3 — How to present your rate */}
          <div className="px-6 py-8 sm:px-8" style={{ borderTop: "1px solid rgba(229,226,220,0.5)" }}>
            <h4 className="text-sm font-semibold" style={{ color: "#1D2025" }}>How to present your rate</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl p-5" style={{ background: "rgba(243,241,237,0.8)", border: "1px solid rgba(229,226,220,0.5)" }}>
                <p className="text-xs font-semibold" style={{ color: "#1D2025" }}>For project work</p>
                <p className="mt-2 text-xs italic leading-relaxed" style={{ color: "#5A5650" }}>
                  "Based on the scope, I'm quoting this as a fixed fee of £X — that covers delivery through to sign-off, so you have cost certainty."
                </p>
                <p className="mt-3 text-[10px]" style={{ color: "#9B9893" }}>Use when: scope is defined, client prefers predictability</p>
              </div>
              <div className="rounded-xl p-5" style={{ background: "rgba(243,241,237,0.8)", border: "1px solid rgba(229,226,220,0.5)" }}>
                <p className="text-xs font-semibold" style={{ color: "#1D2025" }}>For ongoing retainers</p>
                <p className="mt-2 text-xs italic leading-relaxed" style={{ color: "#5A5650" }}>
                  "For an ongoing arrangement, I work on a monthly retainer of £7,500 for 8 committed days — with additional days at £850."
                </p>
                <p className="mt-3 text-[10px]" style={{ color: "#9B9893" }}>Use when: client wants embedded support, not project delivery</p>
              </div>
            </div>
          </div>

          {/* Block 4 — Push back on price */}
          <div className="px-6 py-8 sm:px-8" style={{ borderTop: "1px solid rgba(229,226,220,0.5)" }}>
            <h4 className="text-sm font-semibold" style={{ color: "#1D2025" }}>When they push back on price</h4>
            <div className="mt-4 space-y-4">
              {[
                {
                  color: "#22C55E",
                  label: "Give freely",
                  sublabel: "these don't touch your rate",
                  items: "Payment terms (net 30 → net 45) · Invoice frequency · Notice period structure · Phased statement of work",
                },
                {
                  color: "#F59E0B",
                  label: "Negotiate carefully",
                  sublabel: "trade for something",
                  items: "Exclusivity clause · Longer initial term · Referral rights · Reduced scope in return for reduced total fee",
                },
                {
                  color: "#EF4444",
                  label: "Protect this",
                  sublabel: "do not concede",
                  items: "Your floor rate of £750/day · IP ownership (you retain all unless explicitly agreed otherwise) · Personal liability clauses",
                },
              ].map((row) => (
                <div key={row.label} className="flex gap-3 rounded-lg p-3" style={{ background: "rgba(243,241,237,0.6)" }}>
                  <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ background: row.color }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#1D2025" }}>
                      {row.label} <span className="font-normal" style={{ color: "#9B9893" }}>— {row.sublabel}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "#5A5650" }}>{row.items}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block 5 — Most important thing */}
          <div className="mx-6 sm:mx-8 my-2 rounded-xl px-6 py-6" style={{ background: "#1D2025" }}>
            <h4 className="text-sm font-semibold text-white">Quote higher than feels comfortable.</h4>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "#B0ADA8" }}>
              Your instinct — based on your read of this — is to hold rate and offer scope flexibility, which is correct. But most people quote too low in the first place, which means there's nothing to flex. Start at £900–£950. You can always move to £850. You cannot move from £800 to £900 once it's on the table.
            </p>
          </div>

          {/* Block 6 — When to revisit */}
          <div className="px-6 py-8 sm:px-8">
            <h4 className="text-sm font-semibold" style={{ color: "#1D2025" }}>When to revisit your rate</h4>
            <div className="mt-4 space-y-0">
              {[
                {
                  time: "Right now",
                  action: "Set your floor and your opening rate. Commit to them.",
                  detail: "Floor: £750. Opening quote: £900–£950. Do not invent a reason to go lower before you've even had the conversation.",
                },
                {
                  time: "After engagements 2–3",
                  action: "Review the rate based on what actually happened.",
                  detail: "Did clients accept without pushback? You're probably underpriced. Did every conversation involve negotiation? You're likely well-positioned.",
                },
                {
                  time: "Year 2",
                  action: "Set a new floor of £875 minimum for all new clients.",
                  detail: "Existing clients can be held at prior rate for continuity. New engagements should start from a higher base.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 py-3" style={{ borderLeft: "2px solid #2ECDB0", marginLeft: 6, paddingLeft: 16 }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#1D2025" }}>
                      {item.time} <span className="font-normal" style={{ color: "#5A5650" }}>— {item.action}</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#9B9893" }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block 7 — Caveat */}
          <div className="mx-6 sm:mx-8 mb-6 rounded-xl p-5" style={{ background: "rgba(217,168,60,0.06)", border: "1px solid rgba(217,168,60,0.15)" }}>
            <p className="text-xs font-semibold" style={{ color: "#B8860B" }}>These figures are a starting point, not a guarantee</p>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#5A5650" }}>
              Rates vary by client, engagement type, and timing. What matters is that you have a principled basis for your number — not that you pick the right one first time. The floor protects you; the process refines the rest.
            </p>
          </div>

          {/* Block 8 — Connects to */}
          <div className="px-6 pb-4 sm:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9B9893" }}>Connects to</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Managing your cash flow in year one", "What goes in a client contract", "Holding your rate under pressure"].map((t) => (
                <span key={t} className="rounded-full px-3 py-1 text-[10px] font-medium" style={{ background: "rgba(243,241,237,0.8)", border: "1px solid rgba(229,226,220,0.5)", color: "#5A5650" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Output footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-6 py-4 sm:px-8" style={{ borderColor: "rgba(229,226,220,0.5)" }}>
            <p className="text-[10px]" style={{ color: "#9B9893" }}>Saved permanently · You can return to this any time</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled>
                <Download className="h-3 w-3" /> Export as PDF
              </Button>
              <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground" disabled>
                Next module → <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Final CTA ───────────── */
function FinalCTA() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl py-12 px-6 sm:px-10 text-center bg-primary">
      <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
        This is what you get when you subscribe
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80">
        All 25 modules. Personalised to your background, your market, and where you are in your journey.
      </p>
      <div className="mt-8">
        <Button
          size="lg"
          className="rounded-md bg-white px-8 py-4 text-base font-medium text-primary hover:bg-white/90"
          onClick={() => navigate("/questionnaire")}
        >
          Get started — £19.99 →
        </Button>
      </div>
      <p className="mt-4 text-xs text-primary-foreground/60">
        3 guidance modules included with your report. Full library unlocked with subscription.
      </p>
    </div>
  );
}

/* ───────────── Page ───────────── */
export default function GuidanceLibraryPage() {
  return (
    <div className="min-h-screen text-foreground">
      <MintTopBar />
      <Navbar />

      <PanelLayout className="mt-20 px-6 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-[720px] flex flex-col gap-12">
          <ScrollReveal><HeroSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><HowItWorksSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><LibraryViewSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><ExampleOutputSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><FinalCTA /></ScrollReveal>
        </div>
      </PanelLayout>
    </div>
  );
}
