import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const fade = {
  hidden: { opacity: 0, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const sections = [
  {
    heading: "It's not about catastrophe. It's about arithmetic.",
    paragraphs: [
      "Careers change for dozens of reasons. Restructures. New leadership. Sector contraction. Relocation. Burnout. A simple realisation that the next promotion isn't worth what it costs.",
      "Most professionals know this. What they haven't done is build anything outside the salaried structure that could generate income independently. Not because they can't — but because nothing in their career has ever required it.",
      "The result is a specific kind of exposure. A senior finance professional with 15 years of experience and deep commercial knowledge has enormous economic value — but almost none of it is portable. It's locked inside one employer relationship, one job title, one set of internal processes. If that relationship ends, they start from zero in a market that doesn't know them.",
      "That's the gap.",
    ],
  },
  {
    heading: "Who is most exposed",
    paragraphs: [
      "The optionality gap tends to be widest in structured professional roles: finance, legal, compliance, HR, operations, consulting, project management. These are people whose expertise is genuinely valuable — but whose careers have been built entirely within organisational structures.",
      "They've never had to find a client. Never had to price their own time. Never had to describe what they do in terms a buyer would understand. They've been evaluated by internal metrics, promoted through internal hierarchies, and paid through payroll.",
      "None of that prepares you for earning independently.",
      "The gap isn't about capability. It's about infrastructure. The skills are there. The route to market isn't.",
    ],
  },
  {
    heading: "Why it matters now",
    paragraphs: [
      "Three things are converging.",
      "First, career tenure is shortening. The average time in a senior role has compressed. More professionals will face involuntary transitions at some point — not as a worst case, but as a statistical likelihood.",
      "Second, the market for independent professional expertise is larger and more accessible than most people inside organisations realise. Fractional roles, advisory work, interim management, specialist consulting, productised services — these are real revenue paths, not gig economy workarounds. But they require a different set of knowledge: how to position an offer, how to price, how to reach buyers, how to convert experience into something someone will pay for outside an employment contract.",
      "Third, AI is changing the economics of professional work. Not overnight, and not uniformly — but the direction is clear. Roles that are primarily about processing, analysis, and structured decision-making are becoming easier to augment or replace. This doesn't mean mass unemployment. It means the premium shifts toward professionals who can operate independently, advise, and deliver outcomes — not just execute processes.",
      "The professionals who will navigate this best are the ones who have options before they need them.",
    ],
  },
  {
    heading: "What closing the gap actually looks like",
    paragraphs: [
      "Closing the optionality gap doesn't mean quitting your job. It doesn't mean starting a business tomorrow. It means answering a small number of specific questions:",
      "What is your professional archetype? Not your job title — your actual cluster of skills, experience, and commercial value as the market would see it.",
      "Which independent income paths are realistic for someone with your profile? Not all of them. Not the inspiring ones. The ones that match your background, your risk tolerance, your available time, and the market's willingness to pay.",
      "What would your first move be? If you decided to test one path — not commit to it, just test it — what would you do in the next 30 days?",
      "How long to first revenue? Some paths generate income in weeks. Some take months. Knowing which is which prevents false starts.",
      "Most professionals have never worked through these questions. Not because they're hard to answer, but because no one has structured the process for people like them.",
    ],
  },
  {
    heading: "The economics of optionality",
    paragraphs: [
      "There is a financial argument for closing this gap even if your career never changes.",
      "A professional who has identified two or three realistic independent income paths — and knows concretely how they'd pursue them — negotiates differently. They make career decisions from a position of knowledge rather than dependency. They can evaluate whether a role is worth staying in, rather than assuming it has to be because there's nothing else.",
      "Optionality doesn't require action. It requires preparation. And preparation, for most professionals, is far less work than they expect — once someone shows them where to look.",
    ],
  },
];

export default function WhySolo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      <PanelLayout className="mt-20 px-6 py-16 sm:px-10 lg:px-16">
        <article className="mx-auto max-w-[680px]">
          {/* H1 */}
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]"
            style={{ letterSpacing: "-0.02em", color: "hsl(var(--text-heading))" }}
            initial="hidden"
            animate="visible"
            variants={fade}
          >
            The Optionality Gap
          </motion.h1>

          {/* Intro */}
          <motion.div
            className="mt-10 space-y-5 text-[15px] leading-[1.8] sm:text-base"
            style={{ color: "hsl(var(--text-body))" }}
            initial="hidden"
            animate="visible"
            variants={fade}
          >
            <p>
              Most white-collar professionals look secure. Salaried role, pension
              contributions, a title that means something inside the building.
              From the outside, it reads as stability.
            </p>
            <p>But look at the structure underneath and something is missing.</p>
            <p>
              One income stream. One employer. One professional identity — defined
              entirely by an organisation they don't control. No tested route to
              earning independently. No offer they could take to market next month
              if they had to.
            </p>
            <p>
              This is the optionality gap: the distance between how secure a
              career looks and how few alternatives actually exist if it changes.
            </p>
          </motion.div>

          {/* Body sections */}
          {sections.map((section) => (
            <motion.section
              key={section.heading}
              className="mt-14"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fade}
            >
              <h2
                className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
                style={{ letterSpacing: "-0.02em", color: "hsl(var(--text-heading))" }}
              >
                {section.heading}
              </h2>
              <div
                className="mt-5 space-y-5 text-[15px] leading-[1.8] sm:text-base"
                style={{ color: "hsl(var(--text-body))" }}
              >
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </motion.section>
          ))}

          {/* CTA card */}
          <motion.div
            className="mt-16 rounded-[10px] border bg-surface-card p-8 sm:p-10"
            style={{ borderColor: "hsl(var(--border-default))" }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
          >
            <p
              className="text-[15px] leading-[1.8] sm:text-base"
              style={{ color: "hsl(var(--text-body))" }}
            >
              Solo takes your professional background and maps it against 95
              archetypes and 480 business models to find the independent income
              paths that are a realistic fit — scored by speed to revenue,
              credibility gap, income potential, and lifestyle compatibility. Not
              inspiration. Arithmetic.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <Button
                size="lg"
                className="rounded-md px-8 py-4 text-base font-medium"
                onClick={() => navigate("/auth")}
              >
                See your archetype — free
              </Button>
              <span
                className="text-sm"
                style={{ color: "hsl(var(--text-muted))" }}
              >
                Build your Plan B before you need one.
              </span>
            </div>
          </motion.div>
        </article>
      </PanelLayout>

      <Footer />
    </div>
  );
}
