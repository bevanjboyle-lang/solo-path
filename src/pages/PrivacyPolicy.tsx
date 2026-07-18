import LegalPage, { LegalSection } from "@/components/LegalPage";

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who We Are",
    content: (
      <p>
        Solo is the data controller for all personal data collected through the Service. For privacy
        questions, contact us at{" "}
        <a href="mailto:privacy@solo-plan.com" className="text-primary hover:text-primary/80">
          privacy@solo-plan.com
        </a>
        .
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "What We Collect",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Account data</strong>, email address, password hash</li>
        <li><strong>Profile data</strong>, questionnaire answers, CV text if uploaded, archetype classification</li>
        <li><strong>Diagnostic data</strong>, the six answers you give in the free diagnostic and, if you choose to enter it, the email address used to send your read and add you to The Signal</li>
        <li><strong>Usage data</strong>, pages viewed, features used, check-in history</li>
        <li><strong>Payment data</strong>, processed by Stripe. We never see or store full card numbers</li>
      </ul>
    ),
  },
  {
    id: "how-we-use",
    title: "How We Use Your Data",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li>To generate your personalised Plan B report</li>
        <li>To run your 30-day activation plan and daily check-ins</li>
        <li>To process payments via Stripe</li>
        <li>To send transactional emails (report ready, daily check-in prompts)</li>
        <li>To improve Solo (anonymised, aggregated analytics only)</li>
      </ul>
    ),
  },
  {
    id: "ai-processing",
    title: "AI Processing",
    content: (
      <p>
        Your questionnaire answers and CV data are sent to our AI provider to generate your report,
        plan, and guidance modules. Your data is not used for model training. Data is processed under
        Standard Contractual Clauses for international transfer.
      </p>
    ),
  },
  {
    id: "third-party",
    title: "Third-Party Processors",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Database and authentication</strong>, EU-hosted</li>
        <li><strong>Stripe</strong>, payments, PCI DSS compliant</li>
        <li><strong>AI provider</strong>, generation, with SCCs</li>
        <li><strong>Hosting</strong>, application hosting</li>
        <li><strong>Resend</strong>, transactional email</li>
        <li><strong>Beehiiv</strong>, newsletter delivery for The Signal (email address, subscription source, and your diagnostic read if you request a copy)</li>
        <li><strong>PostHog</strong>, EU-hosted product analytics</li>
      </ul>
    ),
  },
  {
    id: "data-retention",
    title: "Data Retention",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li>Active account data kept while your account exists</li>
        <li>Deleted accounts: data removed within 30 days</li>
        <li>Payment records retained for 7 years (UK tax law)</li>
      </ul>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights (UK GDPR)",
    content: (
      <div className="space-y-3">
        <p>
          You have the right to: access, rectification, erasure, restriction, portability, and
          objection.
        </p>
        <p>
          Contact{" "}
          <a href="mailto:privacy@solo-plan.com" className="text-primary hover:text-primary/80">
            privacy@solo-plan.com
          </a>
          . We respond within 30 days.
        </p>
        <p>You also have the right to complain to the ICO (Information Commissioner's Office).</p>
      </div>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        Essential cookies (authentication session) plus first-party analytics via PostHog, hosted in
        the EU and used only to understand how the product is used. No advertising cookies.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    content: <p>We will notify registered users of material changes via email.</p>,
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy policy"
      eyebrow="Privacy"
      subhead="How Solo handles the information you give us when you take the test, pay for a report, and use the product."
      lastUpdated="July 2026"
      sections={sections}
      isTBC
    />
  );
}
