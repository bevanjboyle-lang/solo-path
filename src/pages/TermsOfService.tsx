import LegalPage, { LegalSection } from "@/components/LegalPage";

const sections: LegalSection[] = [
  { id: "introduction", title: "Introduction", content: <p>These terms govern your use of Solo. By using Solo you agree to these terms.</p> },
  { id: "the-service", title: "The Service", content: <p>Solo is an AI-powered career planning tool that generates personalised Plan B reports, activation plans, and guidance modules based on information you provide.</p> },
  { id: "eligibility", title: "Eligibility", content: <p>Solo is designed for UK-based professionals aged 18+. You must provide accurate information.</p> },
  { id: "free-preview", title: "Free Preview", content: <p>The free preview (archetype, hook insight, option headlines) requires no payment or account. No obligation.</p> },
  { id: "paid-report", title: "Paid Report (£19.99)", content: <p>One-time payment via Stripe. Includes full report, 30-day activation plan, adaptive tracker, and 3 guidance modules (Track A). Non-refundable once generated, as content is personalised and cannot be resold. 14-day cooling-off period applies if you have not yet generated your report.</p> },
  { id: "subscription", title: "Subscription (£19/month or £149/year)", content: <p>Optional, available after initial 30-day plan. Includes ongoing tracker, full guidance library (25 modules), and Ask Solo. Cancel any time. Access continues to end of billing period.</p> },
  { id: "ai-disclaimer", title: "AI Disclaimer", content: <p>Solo uses AI to generate personalised content. Outputs are guidance, not professional advice. Solo does not replace qualified legal, tax, financial, or business advice. You are responsible for decisions made based on Solo outputs.</p> },
  { id: "your-content", title: "Your Content", content: <p>You retain ownership of information you provide. You grant Solo a licence to process it for the purpose of delivering the service.</p> },
  { id: "acceptable-use", title: "Acceptable Use", content: <p>Do not use Solo to generate content for resale, attempt to reverse-engineer the AI, or submit false information.</p> },
  { id: "ip", title: "Intellectual Property", content: <p>The Solo platform, brand, prompts, knowledge bank, and generated report structures are the intellectual property of Solo.</p> },
  { id: "liability", title: "Limitation of Liability", content: <p>Solo's total liability is limited to the amount you have paid. Solo is not liable for business decisions made based on its outputs.</p> },
  { id: "changes", title: "Changes to Terms", content: <p>Material changes notified via email to registered users. Continued use constitutes acceptance.</p> },
  { id: "governing-law", title: "Governing Law", content: <p>These terms are governed by English law. Disputes subject to the jurisdiction of the courts of England and Wales.</p> },
  { id: "contact", title: "Contact", content: <p><a href="mailto:questions@solo-plan.com" className="text-primary hover:text-primary/80">questions@solo-plan.com</a></p> },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of service"
      eyebrow="Terms"
      subhead="The rules of the deal when you take the test, pay for a report, or run a subscription. Plain language; no surprises."
      lastUpdated="April 2026"
      sections={sections}
      isTBC
    />
  );
}
