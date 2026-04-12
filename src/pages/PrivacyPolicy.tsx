import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const sections = [
  { num: "1", title: "Who We Are", content: (<p>Solo is the data controller for all personal data collected through the Service. For privacy questions, contact us at{" "}<a href="mailto:privacy@solopath.co.uk" className="text-primary hover:text-primary/80">privacy@solopath.co.uk</a>.</p>) },
  { num: "2", title: "What We Collect", content: (<ul className="list-disc list-inside space-y-2"><li><strong>Account data</strong>  - email address, password hash</li><li><strong>Profile data</strong>  - questionnaire answers, CV text if uploaded, archetype classification</li><li><strong>Usage data</strong>  - pages viewed, features used, check-in history</li><li><strong>Payment data</strong>  - processed by Stripe. We never see or store full card numbers</li></ul>) },
  { num: "3", title: "How We Use Your Data", content: (<ul className="list-disc list-inside space-y-2"><li>To generate your personalised Plan B report</li><li>To run your 30-day activation plan and daily check-ins</li><li>To process payments via Stripe</li><li>To send transactional emails (report ready, daily check-in prompts)</li><li>To improve Solo (anonymised, aggregated analytics only)</li></ul>) },
  { num: "4", title: "AI Processing", content: (<p>Your questionnaire answers and CV data are sent to OpenAI (GPT-4o) to generate your report, plan, and guidance modules. OpenAI does not use Solo user data for model training. Data is processed under Standard Contractual Clauses for US transfer.</p>) },
  { num: "5", title: "Third-Party Processors", content: (<ul className="list-disc list-inside space-y-2"><li><strong>Supabase</strong>  - database and authentication, EU-hosted</li><li><strong>Stripe</strong>  - payments, PCI DSS compliant</li><li><strong>OpenAI</strong>  - AI generation, US with SCCs</li><li><strong>Vercel</strong>  - hosting</li><li><strong>Resend</strong>  - transactional email</li></ul>) },
  { num: "6", title: "Data Retention", content: (<ul className="list-disc list-inside space-y-2"><li>Active account data kept while your account exists</li><li>Deleted accounts: data removed within 30 days</li><li>Payment records retained for 7 years (UK tax law)</li></ul>) },
  { num: "7", title: "Your Rights (UK GDPR)", content: (<div className="space-y-3"><p>You have the right to: access, rectification, erasure, restriction, portability, and objection.</p><p>Contact{" "}<a href="mailto:privacy@solopath.co.uk" className="text-primary hover:text-primary/80">privacy@solopath.co.uk</a>. We respond within 30 days.</p><p>You also have the right to complain to the ICO (Information Commissioner's Office).</p></div>) },
  { num: "8", title: "Cookies", content: (<p>Essential cookies only (authentication session). No advertising or tracking cookies. No third-party analytics cookies.</p>) },
  { num: "9", title: "Changes", content: (<p>We will notify registered users of material changes via email.</p>) },
];

export default function PrivacyPolicy() {
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

          <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl" style={{ letterSpacing: "-0.02em" }}>Privacy Policy</h1>
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
