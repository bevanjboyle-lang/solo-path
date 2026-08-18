export interface GuidanceQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface GuidanceModule {
  id: number;
  name: string;
  area: string;
  minutes: number;
  prereq: number | null;
  questions: GuidanceQuestion[];
  description?: string;
  track?: string;
}

export interface GuidanceTrack {
  id: string;
  name: string;
  description: string;
  badge: string;
  badgeType: "included" | "subscription";
  moduleIds: number[];
}

export const TRACKS: GuidanceTrack[] = [
  {
    id: "A",
    name: "Foundation & Setup",
    description: "The three modules every user gets with their Plan B Report.",
    badge: "Included with report",
    badgeType: "included",
    moduleIds: [1, 2, 3],
  },
  {
    id: "B",
    name: "Compliance & Risk",
    description: "Navigate the regulatory and compliance essentials.",
    badge: "Subscription",
    badgeType: "subscription",
    moduleIds: [4, 5, 6, 7, 8, 9],
  },
  {
    id: "C",
    name: "Finance & Operations",
    description: "Build your financial infrastructure.",
    badge: "Subscription",
    badgeType: "subscription",
    moduleIds: [10, 11, 12, 13, 14],
  },
  {
    id: "D",
    name: "Commercial Execution",
    description: "Win clients and grow your practice.",
    badge: "Subscription",
    badgeType: "subscription",
    moduleIds: [15, 16, 17, 18, 19],
  },
  {
    id: "E",
    name: "Sector-Specific",
    description: "Tailored guidance for your specific sector. Only modules matching your profile are shown.",
    badge: "Subscription",
    badgeType: "subscription",
    moduleIds: [20, 21, 22, 23, 24, 25],
  },
  {
    id: "F",
    name: "Rejection & Resilience",
    description: "The moments where most people quit: silence, rejection, the week-three doubt, the family conversation. Direct, specific, no platitudes.",
    badge: "Subscription",
    badgeType: "subscription",
    moduleIds: [26, 27, 28, 29, 30, 31, 32],
  },
];

export const MODULES: GuidanceModule[] = [
  // Track A — Foundation & Setup
  {
    id: 1, name: "Business Structure", area: "Legal & Tax", minutes: 5, prereq: null, track: "A",
    description: "Choose the right legal structure for your independent practice",
    questions: [
      { id: "expected_income_year1", text: "What is your expected annual income in Year 1 from independent work?", options: ["Under £30,000", "£30,000–£50,000", "£50,000–£80,000", "Over £80,000", "Unsure - too early to say"] },
      { id: "work_pattern", text: "Will most of your work be on fixed-term contracts for a single client, or spread across multiple clients?", options: ["Primarily one client at a time on fixed contracts", "Multiple clients, project or advisory basis", "Mix of both", "Not sure yet"] },
      { id: "client_ltd_requirement", text: "Do your target clients typically require you to operate as a limited company?", options: ["Yes, most require a Ltd", "No, sole trader is fine", "Unsure"] },
      { id: "admin_appetite", text: "How comfortable are you with annual admin - filing accounts, corporation tax returns?", options: ["Fine with it - I can handle complexity", "I prefer simplicity where possible", "Not sure what's involved yet"] },
      { id: "liability_concern", text: "Are you concerned about personal liability for the work you do?", options: ["Not really - my work carries low personal risk", "Somewhat concerned", "Yes - my work carries meaningful professional risk"] },
    ],
  },
  {
    id: 2, name: "Registration & Setup", area: "Legal & Tax", minutes: 5, prereq: 1, track: "A",
    description: "Step-by-step checklist to get registered and operational",
    questions: [
      { id: "trading_started", text: "Have you already started doing any paid independent work?", options: ["No, not yet", "Yes, a small amount", "Yes, I've been doing this regularly"] },
      { id: "business_bank_account", text: "Do you already have a dedicated business bank account?", options: ["Yes", "No - using personal account", "No - haven't set one up yet"] },
    ],
  },
  {
    id: 3, name: "Professional Presence", area: "Profile & Positioning", minutes: 5, prereq: null, track: "A",
    description: "Build your professional presence and positioning",
    questions: [
      { id: "linkedin_status", text: "How up to date is your LinkedIn profile?", options: ["Up to date - reflects current positioning", "Needs updating - reflects old employed role", "Minimal profile", "No LinkedIn profile"] },
      { id: "domain_status", text: "Do you have a personal professional domain name registered?", options: ["Yes - and I use it for email", "Yes - but not using it for email", "No - not yet"] },
      { id: "email_status", text: "What email address do you use for professional correspondence?", options: ["Professional domain email (name@mydomain.co.uk)", "Gmail or similar free email", "Work email (current employer)"] },
      { id: "website_status", text: "Do you have a professional website?", options: ["Yes - live and up to date", "Partly built", "No - not built yet", "Not sure I need one"] },
    ],
  },

  // Track B — Compliance & Risk
  {
    id: 4, name: "Tax Basics & Self Assessment", area: "Tax & Finance", minutes: 8, prereq: 1, track: "B",
    description: "Understand your tax obligations as an independent",
    questions: [
      { id: "employment_overlap", text: "Are you still employed while building your independent income?", options: ["Yes - full-time employed", "Yes - part-time employed", "No - fully independent now"] },
      { id: "self_assessment_registered", text: "Have you registered for Self Assessment with HMRC?", options: ["Yes", "No, not yet", "Not sure"] },
      { id: "pension_status", text: "Do you currently contribute to a pension?", options: ["Yes - employer pension (still employed)", "Yes - personal pension/SIPP", "No pension currently"] },
      { id: "expected_profit_year1", text: "What is your best estimate of taxable profit in Year 1?", options: ["Under £12,570 (personal allowance)", "£12,570–£30,000", "£30,000–£50,000", "Over £50,000", "Unsure"] },
    ],
  },
  {
    id: 5, name: "VAT", area: "Tax & Finance", minutes: 5, prereq: 1, track: "B",
    description: "Decide whether and when to register for VAT",
    questions: [
      { id: "expected_turnover", text: "What do you expect your annual turnover (total fees) to be in Year 1?", options: ["Under £50,000", "£50,000–£90,000", "Over £90,000 (above VAT threshold)", "Unsure"] },
      { id: "client_vat_registered", text: "Are your target clients mainly VAT-registered businesses?", options: ["Yes - mainly businesses that can reclaim VAT", "No - mainly individuals or non-VAT entities", "Mix of both"] },
      { id: "significant_vatable_costs", text: "Do you have significant business costs that include VAT?", options: ["Yes - meaningful input VAT costs", "No - my costs are minimal", "Not sure"] },
    ],
  },
  {
    id: 6, name: "IR35 Risk & Protection", area: "Compliance", minutes: 8, prereq: 1, track: "B",
    description: "Assess your IR35 risk and build protection",
    questions: [
      { id: "typical_engagement_type", text: "How would you describe your typical working arrangement with clients?", options: ["Single client, set hours, working alongside their team", "Multiple clients, set your own hours, outcome-focused", "Mix - depends on the engagement"] },
      { id: "substitution_clause", text: "Could you send a substitute to do the work if you were unavailable?", options: ["Yes - I could reasonably substitute", "No - the client would expect me personally", "Not sure"] },
      { id: "equipment_provided", text: "Will the client typically provide you with equipment (laptop, desk, etc.)?", options: ["Yes, client provides equipment", "No - I use my own equipment", "Mix of both"] },
      { id: "public_sector", text: "Are any of your target clients in the public sector (NHS, government, universities)?", options: ["Yes - public sector clients", "No - private sector only", "Mix of both"] },
      { id: "large_corporate", text: "Are your target clients mainly large corporates (500+ employees)?", options: ["Yes - mainly large corporates", "No - mainly SMEs and mid-market", "Mix"] },
    ],
  },
  {
    id: 7, name: "Contracts & Statements of Work", area: "Compliance", minutes: 8, prereq: null, track: "B",
    description: "Get your contract and SoW framework right",
    questions: [
      { id: "contract_status", text: "When starting client work, do you currently have a written contract in place?", options: ["Yes - I use a written contract", "Sometimes - informally agreed", "No - purely verbal or email agreements"] },
      { id: "personal_data", text: "Does your work involve processing personal data about individuals?", options: ["Yes - regularly", "Sometimes", "No - I work with business data only"] },
      { id: "ip_concern", text: "Does your work produce IP (reports, frameworks, methodologies) you'd want to retain rights to?", options: ["Yes - I want to retain my methodologies", "The client owns the outputs - fine", "Not sure what's standard"] },
      { id: "client_contracts", text: "Do your clients typically send their own contracts for you to sign?", options: ["Yes - clients always send their own", "Sometimes - it varies", "No - I'm expected to provide the contract"] },
    ],
  },
  {
    id: 8, name: "Data Protection & GDPR", area: "Compliance", minutes: 6, prereq: null, track: "B",
    description: "Set up compliant data handling for your practice",
    questions: [
      { id: "handles_personal_data", text: "Does your work involve handling personal data (names, emails, financial records)?", options: ["Yes - regularly", "Occasionally", "No - only business/aggregated data"] },
      { id: "data_storage", text: "Where do you store client-related documents and data?", options: ["Cloud storage (Google Drive, OneDrive, etc.)", "Local device only", "Client's own systems", "Not sure yet"] },
      { id: "privacy_policy", text: "Do you have a privacy policy for your practice?", options: ["Yes", "No - haven't created one", "Not sure if I need one"] },
    ],
  },
  {
    id: 9, name: "Insurance", area: "Risk & Protection", minutes: 8, prereq: null, track: "B",
    description: "Understand what insurance you actually need",
    questions: [
      { id: "advice_risk", text: "Could a client suffer a financial loss as a direct result of advice or work you provide?", options: ["Yes - clearly", "Possibly - in some scenarios", "Unlikely - my work is process/delivery focused"] },
      { id: "client_site", text: "Will you regularly meet clients in person or visit client sites?", options: ["Yes - regularly in person", "Sometimes", "Mainly remote working"] },
      { id: "income_protection_runway", text: "If you were unable to work for 3+ months due to illness, how long could you cover living costs from savings?", options: ["Less than 1 month", "1–3 months", "3–6 months", "Over 6 months"] },
      { id: "dependants", text: "Do you have financial dependants who rely on your income?", options: ["Yes", "No"] },
      { id: "existing_personal_cover", text: "Do you currently have life insurance or income protection?", options: ["Yes - life insurance", "Yes - income protection", "Yes - both", "No personal cover"] },
    ],
  },

  // Track C — Finance & Operations
  {
    id: 10, name: "Record Keeping & Bookkeeping", area: "Operations", minutes: 5, prereq: 1, track: "C",
    description: "Set up efficient bookkeeping from day one",
    questions: [
      { id: "accounting_tool", text: "Are you currently using any accounting or invoicing software?", options: ["Yes - FreeAgent", "Yes - Xero or QuickBooks", "Spreadsheet only", "Nothing set up yet"] },
      { id: "expected_invoice_volume", text: "How many invoices do you expect to send per month on average?", options: ["1–3 per month", "4–10 per month", "Over 10 per month"] },
      { id: "receipt_tracking", text: "How do you currently track business expenses and receipts?", options: ["Digital tool or app", "Spreadsheet", "Physical receipts only", "Not tracking yet"] },
      { id: "accountant", text: "Are you working with an accountant?", options: ["Yes - retained", "Yes - ad-hoc only", "No - handling myself", "Not decided yet"] },
    ],
  },
  {
    id: 11, name: "Invoicing & Cash Flow", area: "Operations", minutes: 6, prereq: 10, track: "C",
    description: "Create your invoicing process and manage cash flow",
    questions: [
      { id: "invoice_terms", text: "What payment terms do you plan to set for clients?", options: ["7 days", "14 days", "30 days", "Not sure yet"] },
      { id: "late_payment_experience", text: "Have you experienced late payments from clients?", options: ["Yes - it's a problem", "Occasionally", "Not yet - just starting"] },
      { id: "cash_reserve", text: "Do you have a cash reserve to cover months when income is low?", options: ["Yes - 3+ months", "Yes - 1–2 months", "No reserve yet"] },
    ],
  },
  {
    id: 12, name: "Pricing Strategy & Rate Setting", area: "Operations", minutes: 7, prereq: null, track: "C",
    description: "Set your rates with confidence",
    questions: [
      { id: "pricing_model", text: "How do you plan to charge clients?", options: ["Day rate", "Project/fixed fee", "Retainer", "Mix of approaches", "Not decided"] },
      { id: "rate_confidence", text: "How confident are you that your current rate is right?", options: ["Very confident", "Somewhat confident", "Not confident - guessing", "Haven't set a rate yet"] },
      { id: "market_benchmarking", text: "Have you benchmarked your rates against market comparisons?", options: ["Yes - thoroughly", "Loosely", "No"] },
    ],
  },
  {
    id: 13, name: "Expenses & Allowable Deductions", area: "Tax & Finance", minutes: 5, prereq: 4, track: "C",
    description: "Know what you can claim and how",
    questions: [
      { id: "home_office", text: "Do you work from home?", options: ["Yes - dedicated room", "Yes - shared space", "No - office/co-working", "Mix"] },
      { id: "vehicle_use", text: "Do you use a personal vehicle for business travel?", options: ["Yes - regularly", "Occasionally", "No"] },
      { id: "expense_confidence", text: "How confident are you about what you can and can't claim?", options: ["Very confident", "Somewhat", "Not confident at all"] },
    ],
  },
  {
    id: 14, name: "Pension & Long-term Financial Planning", area: "Tax & Finance", minutes: 7, prereq: 4, track: "C",
    description: "Plan your pension and long-term finances",
    questions: [
      { id: "pension_current", text: "Do you currently have a pension?", options: ["Yes - workplace pension (still employed)", "Yes - personal/SIPP", "No pension", "Multiple pensions from previous roles"] },
      { id: "retirement_timeline", text: "When do you plan to retire?", options: ["Within 10 years", "10–20 years", "20+ years", "Haven't thought about it"] },
      { id: "financial_adviser", text: "Do you work with a financial adviser?", options: ["Yes", "No - but considering it", "No"] },
    ],
  },

  // Track D — Commercial Execution
  {
    id: 15, name: "Pipeline & Opportunity Management", area: "Profile & Positioning", minutes: 6, prereq: null, track: "D",
    description: "Build and manage your client pipeline",
    questions: [
      { id: "pipeline_tool", text: "Do you currently track leads and opportunities?", options: ["Yes - CRM tool", "Yes - spreadsheet", "No system yet"] },
      { id: "lead_sources", text: "Where do most of your leads come from?", options: ["Network/referrals", "LinkedIn", "Recruiters/agencies", "Haven't started yet"] },
      { id: "pipeline_volume", text: "How many active opportunities are you typically pursuing?", options: ["1–2", "3–5", "5+", "None yet"] },
    ],
  },
  {
    id: 16, name: "Proposal & Scoping Framework", area: "Profile & Positioning", minutes: 7, prereq: 7, track: "D",
    description: "Write proposals that win work",
    questions: [
      { id: "proposal_process", text: "Do you currently have a proposal template or process?", options: ["Yes - polished template", "Yes - basic document", "No - I wing it each time", "Haven't needed one yet"] },
      { id: "scoping_confidence", text: "How confident are you in scoping work accurately?", options: ["Very - I rarely under/over-scope", "Somewhat", "Not confident - I've been burned"] },
      { id: "proposal_win_rate", text: "What's your rough proposal win rate?", options: ["Over 50%", "25–50%", "Under 25%", "Too early to tell"] },
    ],
  },
  {
    id: 17, name: "Client Onboarding & Delivery Framework", area: "Operations", minutes: 6, prereq: null, track: "D",
    description: "Onboard clients smoothly and deliver well",
    questions: [
      { id: "onboarding_process", text: "Do you have a structured client onboarding process?", options: ["Yes - documented", "Informal but consistent", "No - ad hoc", "Haven't onboarded a client yet"] },
      { id: "delivery_tracking", text: "How do you track project delivery and milestones?", options: ["Project management tool", "Shared document/spreadsheet", "Email-based", "No formal tracking"] },
      { id: "feedback_loop", text: "Do you collect client feedback during or after engagements?", options: ["Yes - systematically", "Sometimes", "No"] },
    ],
  },
  {
    id: 18, name: "Managing Client Relationships", area: "Operations", minutes: 6, prereq: 17, track: "D",
    description: "Maintain and grow client relationships",
    questions: [
      { id: "repeat_business", text: "What percentage of your work comes from repeat clients?", options: ["Most of it", "Some", "None yet - all new clients"] },
      { id: "relationship_maintenance", text: "How do you stay in touch with past clients?", options: ["Regular check-ins", "Occasional messages", "Only when there's new work", "No system"] },
      { id: "upsell_comfort", text: "How comfortable are you proposing additional work to existing clients?", options: ["Very comfortable", "Somewhat", "Not comfortable"] },
    ],
  },
  {
    id: 19, name: "Growing & Scaling Your Practice", area: "Profile & Positioning", minutes: 8, prereq: null, track: "D",
    description: "Plan your growth beyond the first client",
    questions: [
      { id: "growth_ambition", text: "What's your growth ambition for the next 2 years?", options: ["Stay solo - maximise day rate", "Build a small team/associates model", "Build a consulting firm", "Not sure yet"] },
      { id: "capacity_management", text: "How do you manage capacity when demand exceeds your time?", options: ["Turn work away", "Subcontract/associate model", "Work longer hours", "Haven't faced this yet"] },
      { id: "revenue_diversification", text: "Do you have income beyond client work (courses, products, etc.)?", options: ["Yes", "Planning to", "No - purely client work"] },
    ],
  },

  // Track E — Sector-Specific
  {
    id: 20, name: "Financial Services Independence", area: "Sector", minutes: 8, prereq: null, track: "E",
    description: "Sector-specific guidance for financial services professionals",
    questions: [
      { id: "fs_subsector", text: "Which area of financial services are you coming from?", options: ["Banking", "Insurance", "Asset Management", "FinTech", "Regulatory/Compliance"] },
      { id: "fs_regulation", text: "Does your independent work require FCA authorisation or similar?", options: ["Yes", "No", "Not sure"] },
      { id: "fs_client_type", text: "Who are your target clients?", options: ["Banks & insurers", "FinTechs & scale-ups", "PE/VC portfolio companies", "Mix"] },
    ],
  },
  {
    id: 21, name: "Public Sector & Government Consulting", area: "Sector", minutes: 8, prereq: null, track: "E",
    description: "Navigate frameworks, procurement, and public sector clients",
    questions: [
      { id: "ps_framework_experience", text: "Have you worked on government frameworks before?", options: ["Yes - as a supplier", "Yes - as a client-side civil servant", "No experience with frameworks"] },
      { id: "ps_security_clearance", text: "Do you hold active security clearance?", options: ["Yes - SC or above", "Yes - BPSS/CTC", "No", "Expired"] },
      { id: "ps_ir35_awareness", text: "Are you aware that most public sector engagements are inside IR35?", options: ["Yes - I understand the implications", "Vaguely", "No - tell me more"] },
    ],
  },
  {
    id: 22, name: "Technology & Digital Consulting", area: "Sector", minutes: 8, prereq: null, track: "E",
    description: "Build a tech consulting practice with the right positioning",
    questions: [
      { id: "tech_specialisation", text: "What's your primary technology focus?", options: ["Software/Product Development", "Data & AI", "Cloud & Infrastructure", "Cybersecurity", "Digital Transformation"] },
      { id: "tech_delivery_model", text: "How do you typically deliver?", options: ["Hands-on building", "Advisory/architecture", "Programme/delivery management", "Mix"] },
      { id: "tech_market", text: "Who are your target clients?", options: ["Startups/scale-ups", "Enterprise", "Public sector", "Mix"] },
    ],
  },
  {
    id: 23, name: "Healthcare & Life Sciences", area: "Sector", minutes: 8, prereq: null, track: "E",
    description: "Sector-specific guidance for healthcare and life sciences professionals",
    questions: [
      { id: "hls_area", text: "Which area of healthcare/life sciences?", options: ["Pharmaceuticals", "Medical Devices", "NHS/Healthcare Provider", "Biotech", "Health Tech"] },
      { id: "hls_regulation", text: "Does your work involve regulated activities?", options: ["Yes - heavily regulated", "Some regulatory overlap", "No"] },
      { id: "hls_client_type", text: "Who are your target clients?", options: ["Pharma companies", "NHS trusts", "Health tech startups", "CROs/CDMOs", "Mix"] },
    ],
  },
  {
    id: 24, name: "Professional Services & Legal", area: "Sector", minutes: 8, prereq: null, track: "E",
    description: "Transition from partnership track to independent consulting",
    questions: [
      { id: "ps_background", text: "Which professional services firm type are you from?", options: ["Big Four", "Mid-tier accountancy/audit", "Law firm", "Management consultancy", "Other professional services"] },
      { id: "ps_noncompete", text: "Do you have non-compete or gardening leave restrictions?", options: ["Yes - currently restricted", "Recently expired", "No restrictions"] },
      { id: "ps_network", text: "How strong is your professional network for winning independent work?", options: ["Strong - I have warm leads", "Moderate", "Weak - need to build"] },
    ],
  },
  {
    id: 25, name: "Creative & Marketing Independence", area: "Sector", minutes: 8, prereq: null, track: "E",
    description: "Build a sustainable independent creative or marketing practice",
    questions: [
      { id: "cm_discipline", text: "What's your primary discipline?", options: ["Brand/Strategy", "Content/Copywriting", "Design/Creative Direction", "Performance Marketing", "PR/Communications"] },
      { id: "cm_portfolio", text: "Do you have a portfolio of independent work?", options: ["Yes - strong portfolio", "Some pieces", "No - only agency/in-house work"] },
      { id: "cm_pricing", text: "How do you primarily charge?", options: ["Day rate", "Project fee", "Retainer", "Mix", "Not decided"] },
    ],
  },
  // ── Track F: Rejection & Resilience (Move 7 sync, 2026-08-18) ──
  // Server truth (supabase/functions/_shared/modules-26-32.ts) has carried
  // these seven modules since May; the client catalogue never synced, so
  // the Library rendered 25 while every pricing surface said 32 and the
  // server could already generate all 32. Metadata extracted verbatim from
  // the server library; the server file remains canonical for 26-32.
  {
    id: 26, name: "Handling silence after sending", area: "Resilience", minutes: 4, prereq: null, track: "F",
    description: "The most common moment people quit. What silence usually means, and the specific next move when a sent message doesn't come back.",
    questions: [
      { id: "sent_recency", text: "How many days has it been since you sent the message you're thinking about?", options: ["1-3 days", "4-7 days", "8-14 days", "Over two weeks"] },
      { id: "sent_relationship", text: "Was this a cold contact, a warm reconnect, or a referral introduction?", options: ["Cold (no prior contact)", "Warm reconnect (someone I used to know)", "Referral introduction (someone introduced us)", "Existing contact I had not spoken to in a while"] },
      { id: "usual_response_time", text: "In your experience, how quickly do people in your network normally reply to non-urgent professional messages?", options: ["Within 24 hours typically", "Within a few days", "A week is normal", "Highly variable, often longer"] },
    ],
  },
  {
    id: 27, name: "Handling explicit rejection", area: "Resilience", minutes: 4, prereq: null, track: "F",
    description: "When someone says no directly. How to separate the no from the relationship, what to do in the next 48 hours, and the move most people miss.",
    questions: [
      { id: "rejection_type", text: "What kind of no was it?", options: ["A clear no with no reason", "A soft no (\"not right now\", \"maybe later\")", "A no with a specific reason", "A redirect (\"not me, try X\")"] },
      { id: "relationship_status", text: "Do you want this relationship to continue beyond this engagement?", options: ["Yes, it's a long-term contact worth preserving", "Yes, but it was transactional", "No, this was a one-off", "Unsure"] },
      { id: "emotional_weight", text: "How much is this one weighing on you right now?", options: ["Lightly, it stings but it's fine", "Moderately, it's on my mind", "Significantly, it's affecting the rest of my week"] },
    ],
  },
  {
    id: 28, name: "Handling the imposter spike after a small win", area: "Resilience", minutes: 4, prereq: null, track: "F",
    description: "The strange thing that happens after the first reply, the first paid hour, the first introduction landing. Why the imposter voice gets louder right when things start working, and the specific move to make next.",
    questions: [
      { id: "win_type", text: "What was the small win?", options: ["First reply to outreach", "First paid work or first invoice", "First meaningful introduction landing", "First explicit expression of interest", "Something else"] },
      { id: "imposter_voice", text: "In one line, what is the imposter voice currently saying? (Optional, leave blank if you'd rather not articulate it.)", options: [] },
    ],
  },
  {
    id: 29, name: "Handling the doubt at week three", area: "Resilience", minutes: 4, prereq: null, track: "F",
    description: "The structural moment when momentum dips. What week three usually is, why most people misread it as failure, and the specific re-engagement move that gets the trajectory back.",
    questions: [
      { id: "current_state", text: "Where are you in the dip?", options: ["Just hit it, things suddenly feel hard", "Mid-week, in the middle of it", "Coming out, but not sure if I'm back yet"] },
      { id: "dominant_friction", text: "What is your current dominant friction? (Optional)", options: [] },
    ],
  },
  {
    id: 30, name: "Handling the \"should I just take a job\" moment", area: "Resilience", minutes: 5, prereq: null, track: "F",
    description: "When the safe option starts to look attractive again. What's actually happening, what's worth pausing the plan for vs. not, and the specific decision framework before you act.",
    questions: [
      { id: "trigger", text: "What surfaced this thought today?", options: ["A slow week with no replies", "A specific job opportunity that landed", "Financial pressure", "A family conversation", "General doubt without a specific trigger"] },
      { id: "financial_runway", text: "How much runway do you have at your current burn rate?", options: ["Less than 3 months", "3-6 months", "6-12 months", "Over 12 months", "I don't track this precisely"] },
      { id: "opportunity_specifics", text: "Is there a specific job on the table right now?", options: ["Yes, a concrete offer", "Yes, an early conversation", "No, this is hypothetical"] },
    ],
  },
  {
    id: 31, name: "Handling comparison anxiety when a peer announces something good", area: "Resilience", minutes: 4, prereq: null, track: "F",
    description: "The specific psychological move when someone in your network posts a win that lands harder than you expected. Why it happens, what the spike tells you, and the response that actually helps your work.",
    questions: [
      { id: "peer_proximity", text: "Was this peer in a path close to yours, or a different one entirely?", options: ["Very close (similar archetype, similar stage)", "Somewhat adjacent (similar industry, different path)", "Different path entirely (a friend or former colleague in a different field)"] },
      { id: "announcement_type", text: "What did they announce?", options: ["A new job or promotion", "A client win or new engagement", "A book, podcast, or public visibility", "A company milestone (sale, raise, exit)", "General visibility (a popular post, a press mention)"] },
      { id: "response_so_far", text: "What have you done in the hour since seeing it? (Optional)", options: [] },
    ],
  },
  {
    id: 32, name: "Handling the partner or family conversation", area: "Resilience", minutes: 5, prereq: null, track: "F",
    description: "The conversation that often determines whether your plan survives the next 90 days. What to share, what not to share, and the specific structure that works for both sides.",
    questions: [
      { id: "conversation_status", text: "Have you had this conversation in any meaningful form yet?", options: ["No, I've been avoiding it", "Partial, I've mentioned things but not had a real conversation", "Yes, recently, and it did not go well", "Yes, recently, and it went okay but feels unresolved"] },
      { id: "their_concern", text: "What is their primary concern?", options: ["Income and financial security", "Your wellbeing and stress", "Specific timing (e.g. a family event coming up)", "General risk and the unknown", "I'm not sure what their primary concern is"] },
      { id: "relationship_dynamic", text: "How do the two of you typically have hard conversations?", options: ["Head-on, we both prefer directness", "Over time, in small pieces", "With structure (we plan and schedule them)", "With some avoidance, they tend to drift"] },
    ],
  },
];
