import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const sections = [
  { num: "1", title: "Introduction", content: <p>These terms govern your use of Solo. By using Solo you agree to these terms.</p> },
  { num: "2", title: "The Service", content: <p>Solo is an AI-powered career planning tool that generates personalised Plan B reports, activation plans, and guidance modules based on information you provide.</p> },
  { num: "3", title: "Eligibility", content: <p>Solo is designed for UK-based professionals aged 18+. You must provide accurate information.</p> },
  { num: "4", title: "Free Preview", content: <p>The free preview (archetype, hook insight, option headlines) requires no payment or account. No obligation.</p> },
  { num: "5", title: "Paid Report (£19.99)", content: <p>One-time payment via Stripe. Includes full report, 30-day activation plan, adaptive tracker, and 3 guidance modules (Track A). Non-refundable once generated, as content is personalised and cannot be resold. 14-day cooling-off period applies if you have not yet generated your report.</p> },
  { num: "6", title: "Subscription (£19/month or £149/year)", content: <p>Optional, available after initial 30-day plan. Includes ongoing tracker, full guidance library (25 modules), and Ask Solo. Cancel any time. Access continues to end of billing period.</p> },
  { num: "7", title: "AI Disclaimer", content: <p>Solo uses AI to generate personalised content. Outputs are guidance, not professional advice. Solo does not replace qualified legal, tax, financial, or business advice. You are responsible for decisions made based on Solo outputs.</p> },
  { num: "8", title: "Your Content", content: <p>You retain ownership of information you provide. You grant Solo a licence to process it for the purpose of delivering the service.</p> },
  { num: "9", title: "Acceptable Use", content: <p>Do not use Solo to generate content for resale, attempt to reverse-engineer the AI, or submit false information.</p> },
  { num: "10", title: "Intellectual Property", content: <p>The Solo platform, brand, prompts, knowledge bank, and generated report structures are the intellectual property of Solo.</p> },
  { num: "11", title: "Limitation of Liability", content: <p>Solo's total liability is limited to the amount you have paid. Solo is not liable for business decisions made based on its outputs.</p> },
  { num: "12", title: "Changes to Terms", content: <p>Material changes notified via email to registered users. Continued use constitutes acceptance.</p> },
  { num: "13", title: "Governing Law", content: <p>These terms are governed by English law. Disputes subject to the jurisdiction of the courts of England and Wales.</p> },
  { num: "14", title: "Contact", content: <p><a href="mailto:questions@solopath.co.uk" className="text-primary hover:text-primary/80">questions@solopath.co.uk</a></p> },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      <PanelLayout className="mt-20 px-6 py-16 sm:px-10">
        <main className="mx-auto max-w-[800px]">
          <div className="mb-8 rounded-md border px-5 py-3" style={{ borderColor: "#D4940A40", backgroundColor: "#FDF8E8" }}>
            <p className="text-sm font-medium" style={{ color: "#D4940A" }}>
              <span className="mr-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#D4940A30", color: "#D4940A" }}>Draft</span>
              This document is provided for transparency. Final version pending legal review.
            </p>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl" style={{ letterSpacing: "-0.02em" }}>Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>

          <div className="mt-12 space-y-10">
            {sections.map((s) => (
              <section key={s.num}>
                <h2 className="mb-3 font-display text-lg font-semibold">
                  <span className="text-primary">{s.num}.</span> {s.title}
                </h2>
                <div className="text-sm leading-[1.8] text-muted-foreground">{s.content}</div>
              </section>
            ))}
          </div>
        </main>
      </PanelLayout>

      <Footer />
    </div>
  );
}
