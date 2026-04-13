import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, LabelList, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis,
  RadarChart, Radar, PolarGrid, PolarRadiusAxis,
} from "recharts";
import {
  Scale, Crosshair, Gem, Heart, Shield, Cpu,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScrollReveal from "@/components/ui/ScrollReveal";
import GlassCard from "@/components/ui/GlassCard";
import WaitingRoomSection from "@/components/landing/WaitingRoomSection";
import ExpertSaysSection from "@/components/landing/ExpertSaysSection";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const principles = [
  { icon: Scale, title: "Realism over inspiration", desc: "A Plan B you can't actually execute isn't a Plan B. We privilege commercial realism over ideas that sound exciting but don't hold up." },
  { icon: Crosshair, title: "Specificity over breadth", desc: "Generic ideas help no one. Solo tells you who would pay you, for what, why they'd trust you, and how soon the money could realistically come." },
  { icon: Gem, title: "Your experience is the asset", desc: "We don't help you build something new from scratch. We help you translate what you've already spent years building into something independently valuable." },
  { icon: Heart, title: "The anxious professional deserves better tools", desc: "Most career and entrepreneurship content is aimed at people who already want to start something. Solo is for people who aren't sure, but want a credible answer." },
  { icon: Shield, title: "A Plan B shouldn't feel like giving up", desc: "Having a realistic fallback makes you more confident in your current role, not less. It's not about leaving. It's about not being trapped." },
  { icon: Cpu, title: "Better than asking ChatGPT", desc: "Generic AI gives generic answers. Solo's value is in the structure: the questions, the classification, the scoring, the commercial translation. That's the product." },
];

export default function WhySolo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      {/* ── 1. HERO ── */}
      <PanelLayout className="mt-20 px-6 py-16 sm:px-10">
        <section className="flex min-h-[50vh] flex-col items-center justify-center">
          <div className="mx-auto max-w-2xl text-center">
            <motion.span className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              Why Solo
            </motion.span>
            <motion.h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.02em" }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}>
              Why career optionality matters now
            </motion.h1>
            <motion.p className="mx-auto mt-6 max-w-[580px] text-base leading-relaxed text-muted-foreground sm:text-lg" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
              The professional landscape is shifting. Solo exists because most mid-career professionals have built a career but not an alternative.
            </motion.p>
          </div>
        </section>
      </PanelLayout>

      {/* ── 2. THE OPTIONALITY GAP (long-form essay) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <WaitingRoomSection />
        </ScrollReveal>
      </PanelLayout>

      {/* ── 3. DATA VISUALISATIONS (Macro Trend + AI Exposure) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <GlassCard noHover className="p-8">
              {/* Chart A: Rise of Independent Work */}
              <div className="mb-4 text-center">
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Macro Trend</span>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                  Independent work is accelerating
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Millions of people working independently in the UK, 2000–2025. The shift from employment to self-directed careers is accelerating.
                </p>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={[
                  { year: '2000', value: 3.2 }, { year: '2004', value: 3.4 },
                  { year: '2008', value: 3.8 }, { year: '2012', value: 4.1 },
                  { year: '2016', value: 4.8 }, { year: '2019', value: 5.0 },
                  { year: '2023', value: 4.3 }, { year: '2025', value: 4.6 },
                ]} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mintGradWhySolo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2ECDB0" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#2ECDB0" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{ fontSize: 13, fill: '#5A5650' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 13, fill: '#5A5650' }} axisLine={false} tickLine={false} domain={[2.5, 5.5]} tickFormatter={(v: number) => `${v}M`} />
                  <Tooltip contentStyle={{ background: '#FAF9F7', border: '1px solid #E5E2DC', borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value}M`, 'Workers']} />
                  <Area type="monotone" dataKey="value" stroke="#2ECDB0" strokeWidth={2.5} fill="url(#mintGradWhySolo)" dot={{ r: 3, fill: '#2ECDB0', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#2ECDB0' }} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Source: ONS Labour Force Survey, McKinsey Global Institute
              </p>

              <div className="my-8 h-px w-full bg-border" />

              {/* Chart B: AI Exposure by Sector */}
              <div className="mb-4 text-center">
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why Now</span>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                  AI is reshaping every white-collar sector
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Percentage of roles in each sector exposed to AI-driven automation. The higher the exposure, the greater the urgency to build independent options.
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={[
                  { sector: 'Finance', exposure: 54 },
                  { sector: 'Admin', exposure: 46 },
                  { sector: 'Legal', exposure: 44 },
                  { sector: 'HR', exposure: 42 },
                  { sector: 'Marketing', exposure: 37 },
                  { sector: 'Consulting', exposure: 35 },
                  { sector: 'Tech', exposure: 32 },
                ]} margin={{ top: 5, right: 50, left: 80, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 60]} tick={{ fontSize: 13, fill: '#5A5650' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="sector" tick={{ fontSize: 13, fill: '#5A5650', fontWeight: 500 }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip contentStyle={{ background: '#FAF9F7', border: '1px solid #E5E2DC', borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value}%`, '% of roles exposed']} />
                  <Bar dataKey="exposure" fill="#2ECDB0" radius={[0, 4, 4, 0]} barSize={24}>
                    <LabelList dataKey="exposure" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 13, fill: '#5A5650', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Source: World Economic Forum Future of Jobs Report 2025, Goldman Sachs Research
              </p>
            </GlassCard>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ── 4. THE SHIFT (publication cards) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <ExpertSaysSection />
        </ScrollReveal>
      </PanelLayout>

      {/* ── 5. MARKET OPPORTUNITY (sector cards) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-5xl">
            <div className="mb-16 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Market Opportunity</span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Where independent operators are growing fastest
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { badge: "STRONG DEMAND", badgeStyle: "bg-accent text-accent-foreground border-primary/30", title: "Financial Services", body: "Fractional CFOs, FP&A directors, and finance business partners are among the most sought-after independent hires, particularly in PE-backed and growth businesses." },
                { badge: "STRONG DEMAND", badgeStyle: "bg-accent text-accent-foreground border-primary/30", title: "Legal", body: "Experienced lawyers and compliance specialists are building highly profitable advisory and fractional in-house practices, often at day rates that exceed employment." },
                { badge: "HIGH GROWTH", badgeStyle: "bg-[#FDF8E8] text-[#D4940A] border-[#D4940A]/30", title: "Strategy and Consulting", body: "Former Big Four and strategy professionals are establishing independent advisory practices at rates significantly above their salaried packages." },
                { badge: "HIGH GROWTH", badgeStyle: "bg-[#FDF8E8] text-[#D4940A] border-[#D4940A]/30", title: "Marketing and Communications", body: "Fractional CMO and senior brand roles are multiplying as companies seek senior expertise without full-time headcount cost." },
                { badge: "GROWING", badgeStyle: "bg-surface-card text-muted-foreground border-border", title: "HR and People", body: "Fractional HR directors and L&D specialists are finding strong demand from mid-market businesses that need senior people expertise by the day." },
                { badge: "STRONG DEMAND", badgeStyle: "bg-accent text-accent-foreground border-primary/30", title: "Technology and Change", body: "Technical and programme leaders are increasingly in demand as fractional CTOs, digital transformation advisors, and delivery leads." },
              ].map((tile, i) => (
                <ScrollReveal key={tile.title} delay={i * 0.08}>
                  <div className="rounded-[10px] border border-border bg-surface-card p-5 transition-all hover:border-primary hover:shadow-card-hover h-full">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{tile.title}</h3>
                      <Badge variant="outline" className={`shrink-0 text-[10px] font-semibold rounded-md ${tile.badgeStyle}`}>{tile.badge}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{tile.body}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <p className="mt-8 text-center text-xs italic text-muted-foreground">
              Sources: Solo knowledge bank, 480 business models across 16 professional domains.
            </p>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ── 6. KEY STATISTICS (Career Change Intent) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Reality</span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Half of all professionals are already thinking about it
              </h2>
            </div>
            <GlassCard noHover className="flex flex-col items-center p-8">
              <div className="relative" style={{ width: 200, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ value: 49, fill: '#2ECDB0' }]}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#E5E2DC' }} dataKey="value" angleAxisId={0} cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-4xl font-bold text-foreground">49%</span>
                </div>
              </div>
              <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
                of professionals are actively considering a career change in the next 12 months
              </p>
            </GlassCard>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Source: Randstad Workmonitor 2025, PwC Workforce Hopes &amp; Fears Survey
            </p>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ── 7. INCOME POTENTIAL + SKILLS TRANSFER ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your Experience Translates</span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                The skills you have are the skills you need
              </h2>
            </div>
            <GlassCard noHover className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  { skill: 'Client Mgmt', employed: 65, independent: 90 },
                  { skill: 'Project Delivery', employed: 80, independent: 85 },
                  { skill: 'Stakeholder Comms', employed: 75, independent: 88 },
                  { skill: 'Financial Planning', employed: 40, independent: 82 },
                  { skill: 'Domain Expertise', employed: 85, independent: 90 },
                  { skill: 'Business Dev', employed: 30, independent: 95 },
                ]}>
                  <PolarGrid stroke="#E5E2DC" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#5A5650' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Employed" dataKey="employed" stroke="#9B9B9B" fill="#E5E2DC" fillOpacity={0.4} />
                  <Radar name="Independent" dataKey="independent" stroke="#2ECDB0" fill="#2ECDB0" fillOpacity={0.4} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        </ScrollReveal>
      </PanelLayout>

      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Economics</span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                What independent professionals actually earn
              </h2>
            </div>
            <GlassCard noHover className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { experience: '5-7 yrs', consulting: 55, freelance: 42, portfolio: 38 },
                  { experience: '8-10 yrs', consulting: 85, freelance: 62, portfolio: 55 },
                  { experience: '11-15 yrs', consulting: 120, freelance: 80, portfolio: 72 },
                  { experience: '15+ yrs', consulting: 160, freelance: 95, portfolio: 88 },
                ]} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="experience" tick={{ fontSize: 11, fill: '#5A5650' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5A5650' }} axisLine={false} tickLine={false} label={{ value: '£k annual income', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#7A7670', dx: -5 }} />
                  <Tooltip contentStyle={{ background: '#FAF9F7', border: '1px solid #E5E2DC', borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`£${value}k`, undefined]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="consulting" name="Consulting" fill="#2ECDB0" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="freelance" name="Freelance" fill="#25A896" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="portfolio" name="Portfolio" fill="#1D8477" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Source: Glassdoor UK independent contractor data, Indeed Salary Research 2024
            </p>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ── 8. SOLO'S PRINCIPLES ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="mb-14 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our Principles</span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                How we think about this
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.08}>
                <GlassCard className="p-6 transition-all hover:shadow-lg h-full">
                  <p.icon className="mb-4 h-8 w-8 text-primary" strokeWidth={1.5} />
                  <h3 className="mb-2 text-sm font-semibold">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </PanelLayout>

      {/* ── 9. CTA ── */}
      <PanelLayout className="overflow-hidden">
        <ScrollReveal>
          <section className="bg-primary py-24 rounded-2xl">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl" style={{ letterSpacing: "-0.02em" }}>
                See what Solo finds for your profile
              </h2>
              <p className="mt-4 text-base text-primary-foreground/70">
                8 minutes. £19.99. A report built from your actual experience.
              </p>
              <div className="mt-8">
                <Button size="lg" className="rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90" onClick={() => navigate("/questionnaire")}>
                  See what Solo finds for your profile →
                </Button>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </PanelLayout>

    </div>
  );
}
