import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  RadarChart, Radar, PolarGrid, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import SoloLogo from "@/components/SoloLogo";
import {
  Scale,
  Crosshair,
  Gem,
  Heart,
  Shield,
  Cpu,
  Zap,
  Target,
  Users,
  TrendingUp,
  Brain,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ui/ScrollReveal";
import GlassCard from "@/components/ui/GlassCard";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
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

const stats = [
  { value: "5–12 years", desc: "The experience range where professionals have the most transferable commercial value - but the least practice selling it." },
  { value: "£0", desc: "What most mid-career professionals have earned outside employment. The translation problem is almost universal." },
  { value: "8 minutes", desc: "How long it takes Solo to map your background to a realistic independent income path." },
];

export default function WhySolo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      {/* HERO */}
      <PanelLayout className="mt-20 px-6 py-16 sm:px-10">
        <section className="flex min-h-[50vh] flex-col items-center justify-center">
          <div className="mx-auto max-w-2xl text-center">
            <motion.span className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              The Solo Manifesto
            </motion.span>
            <motion.h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.02em" }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}>
              Professional independence used to be a niche choice. Increasingly, it is the attractive option.
            </motion.h1>
            <motion.p className="mx-auto mt-6 max-w-[580px] text-base leading-relaxed text-muted-foreground sm:text-lg" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
              This isn't a prediction. It's already happening. Solo exists to help capable, experienced professionals build a credible path that doesn't depend entirely on an employer.
            </motion.p>
          </div>
        </section>
      </PanelLayout>

      {/* THE SHIFT */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl mb-10" style={{ letterSpacing: "-0.02em" }}>
              Why having independent income options matters
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base">
              <p>Artificial intelligence is doing to cognitive work what mechanisation did to physical work over the last two centuries - not eliminating it wholesale, but restructuring it. The middle layers of professional organisations - the managers, analysts, coordinators, and process specialists who translate strategy into execution - are increasingly caught between automation at the task level and consolidation at the organisational level.</p>
              <p>This doesn't mean these roles disappear overnight. It means they become less predictable, less numerous, and less valuable as a proportion of what organisations need to pay for. The professionals in these roles are often highly capable. They are not, however, well-equipped to work outside the structures that have employed them. Most have never had to sell their services directly. Most couldn't tell you exactly what they'd charge, or who would pay them, or why.</p>
              <p>That gap - between genuine capability and commercial self-sufficiency - is the problem Solo is built to close.</p>
            </div>
          </ScrollReveal>
        </div>
      </PanelLayout>

      {/* THE SOLO THESIS */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <h2 className="font-display mb-14 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
              We believe the direction of travel is clear
            </h2>
          </ScrollReveal>
          <div className="grid gap-12 lg:grid-cols-2">
            <ScrollReveal delay={0.1}>
              <div className="text-sm leading-[1.8] text-muted-foreground sm:text-base">
                <p className="mb-6">The long arc of work points toward more individual agency. Not the gig economy - that model trades security for availability, which helps platforms more than workers. Something different: experienced professionals who work directly with clients, own their relationships, set their terms, and aren't dependent on a single employer for their livelihood.</p>
                <p>AI doesn't just threaten that path. It enables it. The research, drafting, analysis, and coordination work that used to require support staff or full-time employment can increasingly be done by one capable person with the right tools. The question isn't whether this transition is coming. It's whether you're prepared for it.</p>
              </div>
            </ScrollReveal>
            <div className="flex flex-col gap-4">
              {stats.map((s, i) => (
                <ScrollReveal key={s.value} delay={i * 0.1}>
                  <GlassCard className="p-5 transition-all hover:shadow-lg">
                    <span className="mb-1 block font-display text-2xl font-bold text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</span>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </GlassCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </PanelLayout>

      {/* OUR PRINCIPLES */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <h2 className="font-display mb-14 text-center text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
              How we think about this
            </h2>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.08}>
                <GlassCard className="p-6 transition-all hover:shadow-lg h-full">
                  <p.icon className="mb-4 h-8 w-8" style={{ color: "#2ECDB0" }} strokeWidth={1.5} />
                  <h3 className="mb-2 text-sm font-semibold">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </PanelLayout>

      {/* ── CHART 1: Career Change Intent ── */}
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

      {/* ── CHART 2: Skills That Transfer ── */}
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

      {/* ── CHART 3: Income Potential ── */}
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

      {/* CTA */}
      <PanelLayout className="overflow-hidden">
        <section className="bg-primary py-24 rounded-2xl">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <motion.h2 className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl" style={{ letterSpacing: "-0.02em" }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              If this resonates, the test takes 8 minutes.
            </motion.h2>
            <motion.p className="mt-4 text-base text-primary-foreground/70" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              You'll get a free preview immediately, and a full report - including your 30-day activation plan - for £19.99.
            </motion.p>
            <motion.div className="mt-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <Button size="lg" className="rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90" onClick={() => navigate("/auth")}>
                Take the test →
              </Button>
            </motion.div>
          </div>
        </section>
      </PanelLayout>

      <Footer />
    </div>
  );
}
