// sampleReportData.ts
// Complete sample report data for the /sample-report page.
// Persona: Sarah Okafor, Finance Business Partner, 11 years experience, FTSE 100 retail bank
// Archetype: Financial Intelligence Operator
// Portfolio: Commercial Finance Consultancy (rank 1), Fractional CFO (rank 2), Finance Function Transformation (rank 6)

// ============================================================================
// 1. SAMPLE_PERSONA
// ============================================================================
export const SAMPLE_PERSONA = {
  name: "Sarah Okafor",
  role: "Finance Business Partner",
  subtitle: "Senior commercial finance professional, 11 years' experience, financial services. Based in London.",
  sector: "Financial Services — FTSE 100 retail bank",
  seniority: "Senior Manager",
  income_urgency: "Medium — planning ahead",
  independence_confidence: "Low-medium",
};

// ============================================================================
// 2. SAMPLE_ARCHETYPE (P1 — keep existing rich version)
// ============================================================================
export const SAMPLE_ARCHETYPE = {
  title: "Financial Intelligence Operator",
  description: [
    "You sit in finance, but you operate like a commercial director. The distinction matters. Most Finance Business Partners translate the numbers — they produce the reports, maintain the models, keep the month-end running. You do that, and then you do the thing that's actually hard: you walk those numbers into a room full of non-finance people and hold the story together under challenge.",
    "Your value is not accounting. It's the translation layer between financial complexity and business decisions. The evidence is in how you described your Q6 achievement: you weren't proud of building the model. You were proud that it survived the board challenge — that you could explain the sensitivities without a slide deck and get the programme approved. That's a different skill set, and it's the one that's commercially scarce.",
    "The informal advisory work you described confirms this. When the Head of Retail asks you to look at pricing proposals before they go to ExCo, that's not because you're the most technically capable person in the building. It's because they trust that you'll tell them when the numbers look right but the story is wrong. That judgment is what you're selling.",
  ],
  tags: [
    "Commercial modelling",
    "Investment case development",
    "Board-level communication",
    "Challenge-resilient analysis",
    "Pricing & commercial review",
    "Non-finance stakeholder management",
  ],
};

// ============================================================================
// 3. SAMPLE_TRANSFERABLE_VALUE (P1 — NEW)
// ============================================================================
export const SAMPLE_TRANSFERABLE_VALUE = {
  what_they_can_sell:
    "You can credibly offer commercial finance partnership on a project or retained basis — investment case development, business case financial storytelling, board-level financial challenge and validation, and CFO-lite support for mid-market businesses preparing for critical financial decisions. Your value is not in building the spreadsheet; it's in taking the spreadsheet into a room and making it survive.",
  why_buyers_would_pay:
    "PE-backed and growth-stage mid-market businesses regularly face moments where they need a board-ready financial narrative but their internal finance team is accounting-focused, not commercially oriented. Before a board presentation, a capital raise, or an M&A transaction, they discover they need someone who can defend the financial story, not just build it. That gap — credible commercial finance capability on-demand — is what generates urgency and payment.",
  credibility_assets: [
    "FTSE 100 FBP background — automatic credibility signal to mid-market buyers who equate large-bank finance with rigour and methodology",
    "£38M digital transformation business case approved on first board presentation — proof of both modelling capability and ability to withstand executive scrutiny",
    "Informal advisory pattern across multiple business areas (pricing, channel decisions, investment cases) — evidence of trusted commercial judgment, not just technical competence",
  ],
};

// ============================================================================
// 4. SAMPLE_TRANSFERABLE_SKILLS (P1 — NEW)
// ============================================================================
export interface TransferableSkill {
  skill_name: string;
  strength: number;
  evidence: string;
  market_demand: "high" | "medium" | "low";
}

export const SAMPLE_TRANSFERABLE_SKILLS: TransferableSkill[] = [
  {
    skill_name: "Board-Level Financial Communication",
    strength: 92,
    evidence:
      "Presented the £38M digital transformation business case directly to board; successfully defended financial sensitivities and commercial assumptions under executive challenge without prepared slides.",
    market_demand: "high",
  },
  {
    skill_name: "Commercial Investment Case Development",
    strength: 89,
    evidence:
      "Built investment cases for multiple corporate strategy initiatives, including scenario modelling, sensitivity analysis, and risk quantification — all calibrated for non-finance executive audiences.",
    market_demand: "high",
  },
  {
    skill_name: "Financial Scenario Modelling & Sensitivity Analysis",
    strength: 88,
    evidence:
      "Developed multi-variate financial models with transparent assumption logic and stress-tested them against changing business scenarios — a core requirement in your current FBP role.",
    market_demand: "high",
  },
  {
    skill_name: "Non-Finance Stakeholder Translation",
    strength: 85,
    evidence:
      "Regular practice explaining financial complexity to commercial leadership without jargon; evidence in your recurring role as informal financial advisor to business area heads on commercial decisions.",
    market_demand: "medium",
  },
  {
    skill_name: "Pricing & Commercial Review",
    strength: 84,
    evidence:
      "Formal responsibility for commercial financial review of pricing proposals and commercial decisions pre-ExCo; trusted to challenge business area teams on commercial assumptions.",
    market_demand: "high",
  },
  {
    skill_name: "Financial Risk Identification & Quantification",
    strength: 82,
    evidence:
      "Experience identifying and quantifying financial risk in business cases, operational changes, and commercial decisions — translating qualitative risk into financial impact.",
    market_demand: "medium",
  },
];

// ============================================================================
// 5. SAMPLE_HOOK_INSIGHT (P2 — fix structure)
// ============================================================================
export const SAMPLE_HOOK_INSIGHT = {
  headline:
    "Your most transferable skill isn't the Excel — it's that you can walk financial complexity into a room and hold the story under challenge.",
  insight:
    "Mid-market businesses have finance managers who build the numbers. They rarely have anyone who can defend them commercially in front of a board. That specific gap — a business case-ready commercial thinker who can stand in front of a PE investor's questions and not fold — is your market entry point, and it doesn't require you to have an established independent track record to access it. What this means practically: your first clients are not the ones advertising for finance consultants. They're PE-backed businesses between £20M and £100M revenue who are preparing for a board-level investment decision and suddenly realise their internal finance team can build the model but can't take the room.",
};

// ============================================================================
// 6. SAMPLE_OPTIONS (P1 + P2)
// ============================================================================
export interface SampleOption {
  rank: number;
  model_name: string;
  composite_score: number;
  fit_tags: string[];
  source: "primary" | "secondary";
  positioning: string;
  target_buyer: string;
  what_they_are_buying: string;
  pricing: {
    model: "retainer" | "project" | "day rate" | "productised";
    range_low_gbp: number;
    range_high_gbp: number;
    cadence: "per month" | "per project" | "per day";
  };
  time_to_first_revenue: string;
  difficulty_rating: "easy" | "moderate" | "hard";
  why_this_works_for_them: string;
  recommended?: boolean;
  caution_note?: string;
}

export const SAMPLE_OPTIONS: SampleOption[] = [
  {
    rank: 1,
    model_name: "Commercial Finance Consultancy",
    composite_score: 89,
    fit_tags: ["fastest_revenue", "credibility_asset", "network_aligned"],
    source: "primary",
    positioning:
      "Commercial finance partnership for PE-backed and growth-stage businesses preparing for board-level investment decisions. You deliver business case development, financial storytelling, and executive challenge — the capability internal finance teams lack.",
    target_buyer:
      "CFO or CEO of a PE-backed business, £15M–£100M revenue, preparing for a capital-related decision, board presentation, or M&A event.",
    what_they_are_buying:
      "External commercial finance capability on a project basis — investment case development, business case validation, or CFO support for a specific decision moment. They're buying the ability to take a financial story into a boardroom and have it survive challenge.",
    pricing: {
      model: "project",
      range_low_gbp: 750,
      range_high_gbp: 900,
      cadence: "per day",
    },
    time_to_first_revenue: "3–5 months",
    difficulty_rating: "moderate",
    why_this_works_for_them:
      "Your FTSE 100 FBP background is an immediate credibility signal to mid-market buyers. You've done the exact work they need — the £38M digital transformation business case is directly analogous to their board prep requirement. Your informal advisory pattern demonstrates commercial judgment, not just technical finance.",
    recommended: true,
  },
  {
    rank: 2,
    model_name: "Fractional CFO / Strategic Finance Director",
    composite_score: 81,
    fit_tags: ["higher_income", "retainer_model", "future_ready"],
    source: "primary",
    positioning:
      "Ongoing fractional senior finance leadership for growth-stage and mid-market businesses that need strategic financial oversight without a full-time hire. You provide board pack preparation, financial reporting leadership, commercial oversight, and growth-stage financial strategy.",
    target_buyer:
      "CEO or CFO of a PE-backed or VC-backed business, £20M–£150M revenue, needing part-time senior finance leadership (2–4 days per month).",
    what_they_are_buying:
      "Ongoing strategic finance capability delivered on a retainer basis — board-ready financial reporting, commercial financial strategy, and executive-level financial guidance.",
    pricing: {
      model: "retainer",
      range_low_gbp: 4000,
      range_high_gbp: 6000,
      cadence: "per month",
    },
    time_to_first_revenue: "8–14 months",
    difficulty_rating: "hard",
    why_this_works_for_them:
      "This is a natural evolution from Strand 1 once you've built a visible track record via project engagements. The retainer model delivers significantly higher annual income (£48k–£72k annually) but requires buyers to believe you can run their entire finance function, which is harder to access without prior demonstrated success.",
    caution_note:
      "Fractional CFO roles are harder to win at entry stage than project-based consulting. Better positioned as a Year 2 target, once you've built track record via Option 1.",
  },
  {
    rank: 3,
    model_name: "Commercial Finance Training & Facilitation",
    composite_score: 75,
    fit_tags: ["high_leverage", "content_opportunity", "scaling_potential"],
    source: "primary",
    positioning:
      "Commercial finance workshops for non-finance management teams and business leaders who need to build capability in reading, challenging, and presenting financial information. Half-day intensives, leadership team workshops, board prep sessions.",
    target_buyer:
      "Chief Commercial Officer, COO, or Head of Business Development at mid-market businesses; training procurement for management development programmes.",
    what_they_are_buying:
      "Half-day or full-day workshop delivery on commercial finance topics — building financial literacy, financial challenge skills, board presentation skills for non-finance leaders.",
    pricing: {
      model: "project",
      range_low_gbp: 2500,
      range_high_gbp: 4000,
      cadence: "per day",
    },
    time_to_first_revenue: "6–10 months",
    difficulty_rating: "moderate",
    why_this_works_for_them:
      "The day rate ceiling is higher than project consulting, but the model is time-bounded and not scalable without product development. Works best as a complementary income stream once you have visible credibility from Option 1.",
    caution_note:
      "Training requires investment in curriculum design and positioning before buyers find you. Not recommended as a primary path from standing start.",
  },
  {
    rank: 4,
    model_name: "Financial Due Diligence Consultant",
    composite_score: 72,
    fit_tags: ["transaction_focused", "peer_networks", "deal_flow"],
    source: "primary",
    positioning:
      "Buy-side and sell-side financial due diligence for PE firms, corporate development teams, and acquirers. Quality of earnings analysis, working capital normalisation, financial risk identification.",
    target_buyer:
      "PE partner or corporate development lead preparing for an acquisition or investment decision.",
    what_they_are_buying:
      "Financial due diligence work on a transaction fee basis — detailed financial analysis ahead of investment or acquisition decision.",
    pricing: {
      model: "project",
      range_low_gbp: 800,
      range_high_gbp: 1100,
      cadence: "per day",
    },
    time_to_first_revenue: "5–8 months",
    difficulty_rating: "hard",
    why_this_works_for_them:
      "Your commercial modelling background translates well, but dedicated FDD requires transaction-specific methodology you'd need to build.",
    caution_note:
      "PE firms typically use Big 4 or specialist FDD shops. Breaking in as an independent requires a strong referral or a niche angle.",
  },
  {
    rank: 5,
    model_name: "Investor Relations & Capital Markets Advisory",
    composite_score: 68,
    fit_tags: ["board_communication", "narrative_strength", "future_positioning"],
    source: "primary",
    positioning:
      "Preparing growth-stage and pre-IPO businesses for investor scrutiny — equity story development, investor deck creation, financial narrative for fundraising rounds.",
    target_buyer:
      "CFO or CEO of a VC-backed or pre-IPO company preparing a fundraising round or IPO process.",
    what_they_are_buying:
      "Investor relations and capital markets advisory — developing and validating the financial narrative for investors.",
    pricing: {
      model: "project",
      range_low_gbp: 900,
      range_high_gbp: 1200,
      cadence: "per day",
    },
    time_to_first_revenue: "8–14 months",
    difficulty_rating: "hard",
    why_this_works_for_them:
      "Your board communication skills are directly relevant, but investor relations is a distinct discipline with its own conventions.",
    caution_note:
      "IR buyers expect sector-specific capital markets experience. Better positioned as an evolution from Option 1 after 12–18 months of visible independent work.",
  },
  {
    rank: 6,
    model_name: "Finance Function Transformation Consultant",
    composite_score: 79,
    fit_tags: ["operational_experience", "scale_ready", "long_engagements"],
    source: "primary",
    positioning:
      "Helping mid-market businesses redesign their finance function from backward-looking reporting to forward-looking commercial partnering. Process design, team structure, technology selection, implementation oversight.",
    target_buyer:
      "CFO of a £20M–£150M business undertaking finance function transformation or significant operational change.",
    what_they_are_buying:
      "Finance transformation consulting — design and implementation support for building a modern, commercially oriented finance function.",
    pricing: {
      model: "project",
      range_low_gbp: 700,
      range_high_gbp: 950,
      cadence: "per day",
    },
    time_to_first_revenue: "4–7 months",
    difficulty_rating: "moderate",
    why_this_works_for_them:
      "You've lived inside a well-structured FTSE 100 finance function — that direct experience is the product for mid-market businesses still running on spreadsheets and disconnected processes.",
    caution_note:
      "The market is competitive — big consultancies own the enterprise end, leaving the mid-market segment more accessible but requiring clear positioning.",
  },
  {
    rank: 7,
    model_name: "Non-Executive Director (Finance)",
    composite_score: 64,
    fit_tags: ["board_ready", "governance", "portfolio_addition"],
    source: "primary",
    positioning:
      "Board-level governance and financial oversight for scaling businesses — 1–2 days per month providing independent financial challenge, audit committee participation, and strategic financial guidance.",
    target_buyer:
      "Chair or CEO of a scaling business or PE-backed SME needing independent board-level financial scrutiny.",
    what_they_are_buying:
      "Board seat and ongoing governance participation — independent financial challenge and oversight.",
    pricing: {
      model: "retainer",
      range_low_gbp: 500,
      range_high_gbp: 800,
      cadence: "per day",
    },
    time_to_first_revenue: "12–18 months",
    difficulty_rating: "hard",
    why_this_works_for_them:
      "NED roles require an established independent profile — boards hire people with visible track records.",
    caution_note:
      "This is a portfolio addition, not a primary income source. Realistic target: Year 2 once you have demonstrated track record.",
  },
  {
    rank: 8,
    model_name: "Expert Witness & Litigation Support (Financial)",
    composite_score: 61,
    fit_tags: ["analytical_strength", "high_rate", "long_timeline"],
    source: "primary",
    positioning:
      "Providing independent financial expert opinion for commercial litigation, regulatory proceedings, and dispute resolution — financial loss quantification, forensic analysis of commercial decisions, expert reports for court proceedings.",
    target_buyer:
      "Commercial solicitor or in-house counsel requiring expert financial opinion for litigation or dispute resolution.",
    what_they_are_buying:
      "Expert witness services — independent financial analysis and expert report for court or regulatory proceedings.",
    pricing: {
      model: "day rate",
      range_low_gbp: 1200,
      range_high_gbp: 2000,
      cadence: "per day",
    },
    time_to_first_revenue: "12–24 months",
    difficulty_rating: "hard",
    why_this_works_for_them:
      "The day rates are highest on this list, but barrier to entry is substantial — solicitors require published credentials and prior testimony.",
    caution_note:
      "You'd need formal expert witness training and accreditation. Realistic long-term addition after 2–3 years of established practice.",
  },
  {
    rank: 9,
    model_name: "Financial Content & Thought Leadership",
    composite_score: 74,
    fit_tags: ["visibility", "positioning", "low_barrier"],
    source: "primary",
    positioning:
      "Writing and producing commercial finance content — articles, white papers, newsletter content for financial services firms, PE houses, and B2B platforms that need credible finance voices.",
    target_buyer:
      "Content team at PE house, fintech platform, or B2B finance publication; or in-house marketing team building thought leadership.",
    what_they_are_buying:
      "Authored commercial finance content — articles, guest posts, or newsletter pieces that position their brand as commercially astute.",
    pricing: {
      model: "productised",
      range_low_gbp: 300,
      range_high_gbp: 600,
      cadence: "per article",
    },
    time_to_first_revenue: "3–6 months",
    difficulty_rating: "easy",
    why_this_works_for_them:
      "Low barrier to entry and fast to first revenue, but rates are below your capability ceiling. Best as a visibility-building activity feeding into Options 1–3.",
    caution_note:
      "The real value is positioning effect — being a visible voice in commercial finance opens doors that cold outreach cannot reach.",
  },
  {
    rank: 10,
    model_name: "SaaS / Fintech Product Advisory",
    composite_score: 70,
    fit_tags: ["domain_expert", "product_insight", "equity_opportunity"],
    source: "secondary",
    positioning:
      "Advising fintech startups and finance SaaS companies on product-market fit and user research — acting as a domain expert who understands how senior finance teams actually work.",
    target_buyer:
      "Head of Product or founding team at fintech or finance SaaS startup.",
    what_they_are_buying:
      "Product advisory and user research facilitation — domain expertise on how finance teams operate and think.",
    pricing: {
      model: "retainer",
      range_low_gbp: 600,
      range_high_gbp: 900,
      cadence: "per day",
    },
    time_to_first_revenue: "6–12 months",
    difficulty_rating: "moderate",
    why_this_works_for_them:
      "Your practitioner perspective is genuinely valuable to product teams building for finance — they rarely have access to senior FBPs.",
    caution_note:
      "Fintech advisory requires a different network than your current one. Compensation often includes equity rather than pure cash.",
  },
];

// ============================================================================
// 7. SAMPLE_RECOMMENDATION (P1)
// ============================================================================
export const SAMPLE_RECOMMENDATION = {
  recommended_rank: 1,
  rationale:
    "Commercial Finance Consultancy is your strongest entry point because it directly translates your existing capability (business case development, board communication) to a buyer segment (PE-backed mid-market) that urgently needs exactly this work. Your FTSE 100 background is an automatic credibility signal that removes the biggest barrier early-stage consultants face: trust. The work is not new to you; you're repackaging existing expertise for a different market. Moving toward Fractional CFO in 18–24 months is the strategic play — it builds your track record on Strand 1 engagements, then repositions you toward higher-income retainer roles where the proof of capability already exists.",
  key_condition:
    "This recommendation rests on one condition: you must make the first outreach calls while still employed. The financial risk is low, but the psychological barrier is real.",
};

// ============================================================================
// 8. SAMPLE_REALITY_CHECK
// ============================================================================
export const SAMPLE_REALITY_CHECK = {
  most_likely_failure_mode:
    "You will build the plan, update the LinkedIn, and then not send the first email. The psychological barrier between 'I have a plan' and 'I contacted someone' is where most professionals with your profile stop. This is not a plan failure — it's an activation failure. The reality is that your first conversation will teach you more about your market position than any amount of preparation.",
  second_failure_mode:
    "You will send the first email, get no immediate response, and assume the market doesn't want what you're selling. In practice, email response rates are low, but follow-up rates are high. Most positive responses come from a second message, not the first. Persistence, not rejection, is what stops people.",
  what_they_will_find_hard:
    "You will find it uncomfortable to tell people what you're doing. Not as a pitch — as a conversation. Most professionals delay this indefinitely because it feels presumptuous. The reality is that your network wants to help if they can, and the only way they can is if they know you're thinking about this.",
  honest_income_outlook:
    "Year 1: £25k–£72k depending on execution. Mid-range (£48k) assumes 2–3 project engagements at £20k–£30k each over 12 months. This is 40% of your current salary; the plan gets you to salary replacement by Year 2. The variability is real — it depends entirely on your willingness to make the first outreach calls and follow through on conversations.",
};

// ============================================================================
// 9. SAMPLE_INCOME_OUTLOOK (P1 — NEW)
// ============================================================================
export interface YearProjection {
  low_gbp: number;
  mid_gbp: number;
  high_gbp: number;
  revenue_build: string;
  revenue_sources: string;
  assumptions: string;
}

export const SAMPLE_INCOME_OUTLOOK = {
  primary_option_rank: 1,
  current_salary_gbp: 85000,
  salary_replacement_analysis:
    "Salary replacement happens in Year 2 under the mid-case scenario. By the end of Year 2, you're running 2–3 concurrent retainers and/or project work totalling £78k–£105k annually. This assumes consistent execution in Year 1 and successful conversion of early conversations into repeat business or retainer relationships.",
  year_1: {
    low_gbp: 25000,
    mid_gbp: 48000,
    high_gbp: 72000,
    revenue_build:
      "Slow start (Month 1–3: activation and first conversations), acceleration Phase 2 (Month 4–7: early engagements close), stabilisation Phase 3 (Month 8–12: 2–3 engagements running in parallel). The low case assumes you start late or conservatively. The high case assumes aggressive pricing and project overlap.",
    revenue_sources:
      "2–3 project-based commercial finance engagements at £20k–£35k each, typically 4–8 weeks duration. One possible small retainer or advisory relationship by end of Year 1.",
    assumptions:
      "Assumes £750/day rate and active outreach starting within 30 days of planning. Assumes 60% close rate on qualified conversations. Assumes 40% of time allocated to independent work while managing current employment.",
  } as YearProjection,
  year_2: {
    low_gbp: 55000,
    mid_gbp: 78000,
    high_gbp: 105000,
    revenue_build:
      "Year 1 track record creates inbound from your network; move toward mixture of repeat project work and emerging retainer relationships. By Q2, you have case studies to reference. By Q4, you're making decisions about full-time independence or ongoing part-time consulting.",
    revenue_sources:
      "3–4 project engagements plus 1–2 partial retainers (1–2 days/month each) or a single Fractional CFO role (2–3 days/month). Mix of inbound referrals and active outreach.",
    assumptions:
      "Assumes £800/day rate (10% increase based on track record). Assumes 3 referrals from Year 1 engagements. Assumes retainer negotiation by mid-Year 2.",
  } as YearProjection,
  year_3: {
    low_gbp: 75000,
    mid_gbp: 98000,
    high_gbp: 135000,
    revenue_build:
      "Market position established; significant inbound from referrals and LinkedIn visibility. Decision point on full-time independence or continued portfolio approach. Possibility of second income strand (Options 3 or 6) running in parallel.",
    revenue_sources:
      "Mix of project work and retainer relationships. Possibly 2 x Fractional CFO roles at £4k–£6k/month each, or equivalent project portfolio. Possibility of training or content income if visibility strategies executed.",
    assumptions:
      "Assumes £850/day rate. Assumes 50% of revenue from retainers, 50% from projects. Assumes continued active management of network and positioning.",
  } as YearProjection,
  sensitivity_factors:
    "Three variables most affect the projection: (1) Time to first conversation — 90 days delay moves the whole projection back 3 months; (2) Close rate — moving from 60% to 50% reduces Year 1 by £8k–£15k; (3) Pricing — £50/day difference per engagement scales to £8k–£12k annually. Network warmth also affects timeline — strong referrals compress the sales cycle by 30–40%.",
  income_floor_analysis:
    "Realistic worst case (slow start, conservative pricing, low close rate): £15k–£25k in Year 1, with slower Year 2 growth. Floor happens if you don't make outreach calls until Month 4–6, or if first 2–3 conversations don't convert.",
  income_notes:
    "The income projection assumes you want to run independent work alongside employment initially, then decide on full-time independence. If you commit to full-time from Day 1, the timeline compresses but the risk increases. The bigger risk is psychological (activation) not financial. Your current salary provides runway; use it.",
};

// ============================================================================
// 10. SAMPLE_AI_IMPACT (P7)
// ============================================================================
export const SAMPLE_AI_IMPACT = {
  section_title: "AI & Your Future: Current Role and Plan B",
  part_1: {
    heading: "How AI is Affecting Your Current Role",
    displacement_risk: "medium" as const,
    risk_horizon: "3–5 years",
    content:
      "Standard FBP work — variance analysis, month-end reporting, model maintenance, data aggregation — is being automated rapidly. Large banks are deploying AI to handle these tasks at scale; the junior FBP population faces the most direct displacement risk. Your profile sits differently. Your value is not in building the standard report; it's in walking the numbers into a room and holding the story under challenge from senior executives who are trying to poke holes in the narrative. That's work that requires real-time judgment, unexpected question handling, and the ability to shift narrative on the fly — precisely what AI cannot do reliably. The role is bifurcating: highly automated at the data layer, highly valued at the insight and influence layer. You're in the second bucket.",
  },
  part_2: {
    heading: "AI Resilience of Your Plan B: Commercial Finance Consultancy",
    displacement_risk: "low" as const,
    content:
      "What you're selling as an independent — the ability to build a financial narrative, pressure-test it against executive challenge, and adjust on the fly — is precisely what AI cannot replace. AI tools can produce first-draft financial models and scenario summaries in hours instead of days. The smarter move is to use those tools to expand your capacity, not compete with them. You take on more engagements or higher-complexity work because the model-building part is faster. But the value you charge for — judgment, narrative, the ability to stand in a room and defend a financial story — remains entirely in your hands. Board communication is an AI-hard problem.",
  },
  part_3: {
    heading: "Your Adaptation Path: What to Do in the Next 90 Days",
    steps: [
      {
        priority: 1,
        action: "Familiarize yourself with financial modelling AI (Causal.app or similar)",
        rationale:
          "Not to replace your skills, but to understand what is fast and what is hard so you know where your advantage sits.",
      },
      {
        priority: 2,
        action:
          "Start a simple content habit: one LinkedIn observation per month on commercial finance trends or board dynamics",
        rationale:
          "This creates a visible track record that AI cannot easily replicate — your judgment, your voice, your specific perspective on financial decision-making.",
      },
      {
        priority: 3,
        action:
          "Identify 2–3 clients or colleagues who use AI tools for financial work; ask them what breaks",
        rationale:
          "Understanding where AI models fail helps you position your value more precisely — you're not competing with automation, you're handling the edge cases and judgment calls automation cannot reach.",
      },
      {
        priority: 4,
        action:
          "Invest in one certification or community (FPA, IMA thought leadership track, or similar) that signals ongoing development in commercial finance",
        rationale:
          "AI commoditizes routine capability. Continuous learning and community signals that your judgment stays ahead of automated analysis.",
      },
    ],
  },
};

// ============================================================================
// 11. SAMPLE_FIRST_MOVE (P3v2)
// ============================================================================
export const SAMPLE_FIRST_MOVE = {
  action:
    "Reconnect with a former colleague now operating in a mid-market PE-backed business",
  strand_id: "strand_1",
  window: "Within 24 hours",
  why_first:
    "This is the highest-leverage contact across your portfolio. Someone who knows your capabilities and is now in a position to either refer work or commission it. The instinct is to prepare more — update LinkedIn, build positioning — before approaching anyone. That's where people stall. Your first conversation teaches you more than any preparation.",
  outreach_draft: {
    format: "email_reconnect" as const,
    subject: "Reconnect — and a question for you",
    body: `Hi [Name],

Hope you're well — it's been a while. I've been keeping up with what [company] has been doing, looks like a strong period for you all.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role — commercial finance and business case work, the kind of thing I've been doing on the FBP side for the last few years but for businesses that don't have a strong commercial finance function internally.

I'd really value 20 minutes to pick your brain — not a pitch, genuinely just curiosity about how businesses like yours think about bringing in external finance support and whether there's a moment in the calendar when that's useful. Would you be up for a quick call in the next couple of weeks?

Best,
Sarah`,
    tone_note:
      "Warm reconnect, not a sales pitch. The goal is information gathering and relationship re-activation. No assumptions about their budget or need.",
    personalisation_instructions:
      "Replace [Name] with contact's first name. Replace [company] with their current employer. Choose someone you worked closely with and respect.",
  },
  follow_up_prompt:
    "Did you send it? If not, what stopped you? That answer is useful information about where the real barrier is.",
};

// ============================================================================
// 12. SAMPLE_PLAN (P3v2 — COMPLETE REBUILD)
// ============================================================================
export interface PlanTask {
  task_id: string;
  strand_id: "shared" | "strand_1" | "strand_2" | "strand_3";
  task_type: "foundation" | "outreach" | "content" | "research" | "admin" | "review";
  description: string;
  outreach_draft?: {
    format: "email_reconnect" | "email_cold" | "email_referral_ask" | "linkedin_dm" | "verbal";
    subject?: string;
    body: string;
    tone_note: string;
    personalisation_instructions: string;
  };
}

export interface PlanDay {
  day: string;
  label: string;
  time_required: string;
  time_allocation: Record<string, string>;
  tasks: PlanTask[];
}

export interface PlanPhase {
  phase: string;
  days: string;
  goal: string;
  strand_focus: "shared" | "all_strands" | "narrowing" | "focus_strands";
  days_detail: PlanDay[];
}

export const SAMPLE_PLAN = {
  summary:
    "This plan tests three parallel paths — Commercial Finance Consultancy, Fractional CFO, and Finance Function Transformation — through a structured 30-day programme. Shared credibility-building work is front-loaded in Phase 1. Phase 2 runs strand-specific outreach to test real market response. By Day 19, you'll have enough evidence to begin narrowing. By Day 30, you should have at least one strand with a real conversation or meeting booked.",
  pacing_note:
    "You're currently employed full-time, so this plan is designed for 1–1.5 hours on weekday evenings and 3–4 hours on weekend days.",
  network_note:
    "Your network is medium-strength — the plan includes 10–12 total outreach actions distributed across strands.",
  phases: [
    {
      phase: "Phase 1 — Shared Foundations",
      days: "Days 1–7",
      goal: "Build credibility narrative, activate first wave of warm contacts, establish visible positioning",
      strand_focus: "shared",
      days_detail: [
        {
          day: "Day 1",
          label: "Weekday evening",
          time_required: "90 mins",
          time_allocation: { shared: "90 mins" },
          tasks: [
            {
              task_id: "1_1",
              strand_id: "shared",
              task_type: "outreach",
              description:
                "Send the first reconnect email (Reconnect with former colleague in PE-backed business). Do not edit further. Send within the hour.",
              outreach_draft: {
                format: "email_reconnect",
                subject: "Reconnect — and something I'd value your view on",
                body: `Hi [Name],

It's been a while — I've been following your move to [company] with real interest. It looks like you've landed in an interesting spot.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role. Commercial finance and business case work, primarily — the kind of FBP work I've been doing but for businesses that don't have a strong commercial finance function internally.

I'd find it genuinely useful to get your perspective on how that kind of work gets bought in the mid-market, and whether there are moments in the calendar where businesses like yours actively look for that capability. Would you have 20 minutes for a catch-up call in the next couple of weeks?

No pitch — genuine curiosity from someone whose judgment I've always valued.

Best,
Sarah`,
                tone_note:
                  "Warm, direct, no hedge language. Assumes collegiality. Goal is 20 minutes.",
                personalisation_instructions:
                  "Use first name only. [Name] = someone you worked closely with for 1+ years. [company] = their current employer, ideally PE-backed or growth-stage.",
              },
            },
            {
              task_id: "1_2",
              strand_id: "shared",
              task_type: "admin",
              description:
                "Update LinkedIn headline from current job title to independent positioning. Headline: 'Commercial Finance | Business Case Development | Independent Advisory for PE-backed & Growth Businesses.' This is passive visibility — costs 5 minutes.",
            },
          ],
        },
        {
          day: "Day 2",
          label: "Weekday evening",
          time_required: "75 mins",
          time_allocation: { shared: "75 mins" },
          tasks: [
            {
              task_id: "2_1",
              strand_id: "shared",
              task_type: "foundation",
              description:
                "Write your one-sentence positioning statement (not a LinkedIn bio — a sentence you can say out loud). Target: 'I work with mid-market and PE-backed businesses on commercial finance — business cases, investment decisions, board-level financial analysis.' Record yourself saying it twice. Practice until it feels natural, not rehearsed.",
            },
            {
              task_id: "2_2",
              strand_id: "shared",
              task_type: "foundation",
              description:
                "Build your short-form work story using the £38M digital transformation business case. Three sentences: (1) the challenge, (2) what you did, (3) the outcome. Write it down. Example: 'A FTSE 100 business needed board approval for a £38M programme. I built the financial case, ran the scenario modelling, and presented the sensitivities directly to the board. It was approved on the first pass.' This is your credibility signal for 6 months.",
            },
          ],
        },
        {
          day: "Day 3",
          label: "Weekday evening",
          time_required: "60 mins",
          time_allocation: { shared: "60 mins" },
          tasks: [
            {
              task_id: "3_1",
              strand_id: "shared",
              task_type: "research",
              description:
                "Identify 3 warm contacts for Strand 1 (Commercial Finance Consultancy). Criteria: (1) worked with you 1+ years, (2) now in finance or commercial leadership, (3) likely at PE-backed or growth-stage business. Record their names, current role, company. Write one sentence on the specific context you worked together.",
            },
            {
              task_id: "3_2",
              strand_id: "shared",
              task_type: "research",
              description:
                "Identify 2 warm contacts for Strand 2 (Fractional CFO). Criteria: likely to know about CFO hiring, senior finance leadership roles, or have CFO peer network. Record names, context.",
            },
            {
              task_id: "3_3",
              strand_id: "shared",
              task_type: "research",
              description:
                "Identify 2 warm contacts for Strand 3 (Finance Function Transformation). Criteria: people who work in shared services, finance operations, business transformation. Record names, context.",
            },
          ],
        },
        {
          day: "Day 5",
          label: "Weekend day",
          time_required: "180 mins",
          time_allocation: { strand_1: "90 mins", strand_2: "45 mins", strand_3: "45 mins" },
          tasks: [
            {
              task_id: "5_1",
              strand_id: "strand_1",
              task_type: "outreach",
              description:
                "Send personalised reconnect emails to 2 of your 3 Strand 1 contacts (Strand 1: Commercial Finance Consultancy). Adapt the Day 1 template slightly for each — reference specific work context. Goal: get 2–3 meetings on calendar by end of Phase 1.",
              outreach_draft: {
                format: "email_reconnect",
                subject: "[Name] — catching up",
                body: `Hi [Name],

A while since we worked together [on X project/in Y function] — you've clearly gone on to interesting things at [company], and I've followed your progress with interest.

I'm thinking about doing some independent commercial finance work — the kind of financial case-building and board-level storytelling that we did on [specific project], but for mid-market and PE-backed businesses that don't have that capability in-house.

I'd value your perspective. Not a pitch — genuine curiosity about whether businesses like [company] ever bring in external finance support for specific moments, and what that looks like for you. Would 20 minutes on a call work in the next couple of weeks?

Best,
Sarah`,
                tone_note: "Reference specific shared context. Personal, not pitch-y.",
                personalisation_instructions:
                  "Use specific project or context you worked on together. Use their first name.",
              },
            },
            {
              task_id: "5_2",
              strand_id: "strand_2",
              task_type: "research",
              description:
                "Research Fractional CFO landscape for 30 mins: Google 'fractional CFO London,' review 3–4 providers, note: pricing language, who they target, positioning. Jot down 2–3 phrases or angles you have not yet considered.",
            },
            {
              task_id: "5_3",
              strand_id: "strand_3",
              task_type: "research",
              description:
                "Research Finance Function Transformation landscape for 30 mins: Google 'finance transformation consultant London,' note positioning, buyer language, typical engagement size. What gap do you see that you could fill?",
            },
          ],
        },
        {
          day: "Day 7",
          label: "Weekend day",
          time_required: "120 mins",
          time_allocation: { strand_1: "50 mins", strand_2: "40 mins", strand_3: "30 mins" },
          tasks: [
            {
              task_id: "7_1",
              strand_id: "shared",
              task_type: "admin",
              description:
                "Create a simple one-page 'positioning for me' document covering: Strand 1 (Commercial Finance Consultancy), Strand 2 (Fractional CFO), Strand 3 (Finance Function Transformation). For each: what you offer, who buys it, typical engagement size, typical fee. Not a formal proposal — a conversation tool you can reference in calls. Keep to one page.",
            },
            {
              task_id: "7_2",
              strand_id: "strand_1",
              task_type: "admin",
              description:
                "Track outreach: create a simple spreadsheet with contact name, date contacted, topic (strand), response received (Y/N), next step. Update after each email sent. This is your accountability mechanism for the next 30 days.",
            },
          ],
        },
      ],
    },
    {
      phase: "Phase 2 — Strand Activation & Conversation",
      days: "Days 8–18",
      goal: "Convert warm contacts into meetings; gather market intelligence from each strand; activate referral network",
      strand_focus: "all_strands",
      days_detail: [
        {
          day: "Day 8",
          label: "Weekday evening",
          time_required: "90 mins",
          time_allocation: { strand_1: "50 mins", strand_2: "25 mins", strand_3: "15 mins" },
          tasks: [
            {
              task_id: "8_1",
              strand_id: "strand_1",
              task_type: "outreach",
              description:
                "Send reconnect email to your third Strand 1 contact. Make it warm and specific to your shared history.",
            },
            {
              task_id: "8_2",
              strand_id: "strand_2",
              task_type: "outreach",
              description:
                "Send reconnect email to one of your Strand 2 contacts (Fractional CFO). Frame the conversation around their perspective on how mid-market businesses think about fractional finance leadership.",
              outreach_draft: {
                format: "email_reconnect",
                subject: "Reconnect + your thoughts on fractional finance leadership?",
                body: `Hi [Name],

It's been a while — I've been watching your progress at [company] with interest. You've clearly built something strong there.

I'm exploring independent work in commercial finance. One angle I'm curious about is fractional CFO / senior finance leadership for growth-stage and mid-market businesses. I know from our time together that you think deeply about finance leadership and organisational design.

Two things I'd value from you: (1) your sense of whether fractional CFO is a real category for mid-market businesses, or if it's mostly talk, and (2) whether you'd ever bring in someone fractional for specific moments or challenges. 20 minutes would give me genuine insight that I can't get any other way.

Happy to do the same for you if there's ever something I can help think through.

Best,
Sarah`,
                tone_note:
                  "Reference their expertise. Position as information-seeking, not pitching.",
                personalisation_instructions:
                  "Choose someone with CFO peer network or experience in finance leadership.",
              },
            },
            {
              task_id: "8_3",
              strand_id: "strand_3",
              task_type: "admin",
              description:
                "Begin monitoring 2–3 LinkedIn finance function transformation leaders. Look at their recent posts, see what they're talking about, identify angles you could add unique perspective to.",
            },
          ],
        },
        {
          day: "Day 10",
          label: "Weekday evening",
          time_required: "75 mins",
          time_allocation: { strand_1: "40 mins", strand_2: "20 mins", strand_3: "15 mins" },
          tasks: [
            {
              task_id: "10_1",
              strand_id: "strand_1",
              task_type: "outreach",
              description:
                "Follow up on Day 1 first contact (the lead reconnect) if you have not heard back. Short follow-up email: 'Just following up on my note — no pressure, but would love to catch up if you have 20 minutes in the next couple of weeks. Let me know what works.' Keep to one sentence.",
            },
            {
              task_id: "10_2",
              strand_id: "shared",
              task_type: "content",
              description:
                "Draft a short LinkedIn observation based on your war story or current work (200–250 words). Suggested angle: 'What makes a strong investment business case survive board scrutiny — and what makes it fall apart.' No hashtag stacking, no motivational language. Specific and commercial.",
            },
            {
              task_id: "10_3",
              strand_id: "strand_2",
              task_type: "research",
              description:
                "Identify 3 example Fractional CFO engagements from web search or LinkedIn. What do they claim as typical scope? Typical duration? Typical fee range? Note these — they inform your positioning.",
            },
          ],
        },
        {
          day: "Day 12",
          label: "Weekend day",
          time_required: "200 mins",
          time_allocation: { strand_1: "90 mins", strand_2: "60 mins", strand_3: "50 mins" },
          tasks: [
            {
              task_id: "12_1",
              strand_id: "strand_1",
              task_type: "outreach",
              description:
                "Ideally, you are now in a meeting or conversation with one of your Day 3 / Day 5 Strand 1 contacts. Prepare for that conversation: know what you want to learn, practice the positioning statement, prepare 2–3 open questions: 'When you need someone to do financial analysis on a major business decision, how do you typically handle that?' 'What kind of external help have you brought in before?' 'Is there a moment in the calendar when PE-backed businesses actively look for that capability?'",
            },
            {
              task_id: "12_2",
              strand_id: "strand_2",
              task_type: "outreach",
              description:
                "Send LinkedIn DM to one Strand 2 contact (Fractional CFO angle) — someone in your network but possibly second-degree. Use referral if available. Template: '[Name] — [mutual contact] suggested I reach out. I'm exploring fractional CFO work for growth-stage and mid-market businesses. Would love 20 mins to pick your brain on whether this is a real category in your experience. Sarah'",
              outreach_draft: {
                format: "linkedin_dm",
                body: `[Name] — [mutual contact] mentioned you've been thinking about fractional leadership. I'm exploring this angle myself and would value 20 minutes to pick your brain about what's real and what's hype. Happy to share what I'm seeing too.

Sarah`,
                tone_note:
                  "Reference mutual contact in first sentence. Keep to first-person, genuine curiosity.",
                personalisation_instructions:
                  "Use mutual contact's name clearly. If no mutual contact, remove that phrase and use: '[Name] — I'm exploring fractional finance leadership and saw your background. Would love a conversation about what's real in this space.'",
              },
            },
            {
              task_id: "12_3",
              strand_id: "strand_3",
              task_type: "outreach",
              description:
                "Send reconnect email to one Strand 3 contact (Finance Function Transformation). Frame around their experience: 'How do mid-market businesses think about transforming their finance function? What does that moment look like?'",
            },
            {
              task_id: "12_4",
              strand_id: "shared",
              task_type: "admin",
              description:
                "Publish the LinkedIn observation from Day 10. Keep it short, specific, no call to action. Let it sit.",
            },
          ],
        },
        {
          day: "Day 15",
          label: "Weekend day",
          time_required: "180 mins",
          time_allocation: { strand_1: "80 mins", strand_2: "50 mins", strand_3: "50 mins" },
          tasks: [
            {
              task_id: "15_1",
              strand_id: "strand_1",
              task_type: "outreach",
              description:
                "By now, you should have had at least one exploratory conversation from Strand 1. Your key learning: did the conversation feel natural or forced? Did the buyer language match your positioning? What question surprised them or seemed most valuable? Note this — it shapes your Day 20+ messaging.",
            },
            {
              task_id: "15_2",
              strand_id: "strand_1",
              task_type: "outreach",
              description:
                "In at least one Strand 1 conversation, ask for a referral: 'Is there anyone else in your network you think would find this conversation useful? Not asking you to vouch for me commercially — just a warm intro if you think it's a useful conversation for them too.'",
              outreach_draft: {
                format: "email_referral_ask",
                body: `[Name],

Really useful conversation yesterday — genuinely appreciate the time and your perspective.

One thing I'm trying to do is expand the number of conversations I'm having with people in similar positions to you — CFOs and commercial directors in PE-backed or growth businesses who are dealing with the kind of decisions we discussed.

Is there anyone in your network you think I should speak to? Not asking you to vouch for me commercially — just a warm intro if you think it's a useful conversation for them too. I'd obviously return the favour if there's ever something I can help you think through.

Sarah`,
                tone_note:
                  "Use only after a genuine conversation. Quality of referral depends on quality of relationship.",
                personalisation_instructions:
                  "Personalize with contact name and reference something specific from your conversation.",
              },
            },
            {
              task_id: "15_3",
              strand_id: "strand_2",
              task_type: "research",
              description:
                "Map Strand 2 buyers: who is likely to need a Fractional CFO? Growth-stage business 1–5 years post-Series A? PE-backed business £20M–£150M revenue? Create a one-sentence buyer profile for Strand 2. How does it differ from Strand 1? (Likely: Strand 2 is older, more mature, longer sales cycle.)",
            },
            {
              task_id: "15_4",
              strand_id: "strand_3",
              task_type: "research",
              description:
                "Same exercise for Strand 3: Who needs Finance Function Transformation? Likely: £20M–£100M business, finance function still run on spreadsheets or disconnected tools, CFO undergoing change. Create one-sentence buyer profile.",
            },
          ],
        },
        {
          day: "Day 18",
          label: "Weekday evening",
          time_required: "90 mins",
          time_allocation: { strand_1: "40 mins", strand_2: "30 mins", strand_3: "20 mins" },
          tasks: [
            {
              task_id: "18_1",
              strand_id: "strand_1",
              task_type: "admin",
              description:
                "Prepare a simple scope-of-work template for Strand 1 engagement. One page covering: what you deliver, how you work, typical engagement structure (4–8 weeks), indicative fee range (£20k–£35k, depending on scope). Not a formal proposal — a conversation tool. Have this ready to send within 24 hours if a contact asks 'what does working with you look like?'",
            },
            {
              task_id: "18_2",
              strand_id: "strand_2",
              task_type: "admin",
              description:
                "Same for Strand 2: simple scope-of-work for Fractional CFO. What does a typical engagement look like? 2–4 days/month, typical duration 6–12 months, fee range £4k–£6k/month.",
            },
            {
              task_id: "18_3",
              strand_id: "strand_3",
              task_type: "admin",
              description:
                "Same for Strand 3: scope-of-work for Finance Function Transformation. Typical engagement: 3–6 months, 2–3 days/week during active phase, fee range £25k–£50k depending on scope.",
            },
          ],
        },
      ],
    },
    {
      phase: "Phase 3 — Evidence & Narrowing",
      days: "Days 19–23",
      goal: "Assess strand viability based on market response; make go/narrow/pause decisions; keep momentum on strongest strand",
      strand_focus: "narrowing",
      days_detail: [
        {
          day: "Day 19",
          label: "Weekend day",
          time_required: "120 mins",
          time_allocation: { shared: "120 mins" },
          tasks: [
            {
              task_id: "19_1",
              strand_id: "shared",
              task_type: "review",
              description:
                "Portfolio Review 1. Answer these questions for each strand: (1) Which felt most natural to pursue? (2) Which generated the strongest external response (meetings, referrals, follow-ups)? (3) Which was hardest to make progress on? (4) Based on evidence, which should be paused or narrowed? Record answers — they inform the next 7 days. Expect to put 1–2 strands on light effort, concentrate on the strongest one.",
            },
          ],
        },
        {
          day: "Day 21",
          label: "Weekday evening",
          time_required: "60 mins",
          time_allocation: { shared: "60 mins" },
          tasks: [
            {
              task_id: "21_1",
              strand_id: "shared",
              task_type: "outreach",
              description:
                "Based on Portfolio Review 1 findings, adjust your activity. If Strand 1 (Commercial Finance Consultancy) is strongest: increase outreach, follow up on warm leads, prioritize meetings. If Strand 2 or 3: keep them active but lighter; focus energy on the strongest strand.",
            },
            {
              task_id: "21_2",
              strand_id: "shared",
              task_type: "admin",
              description:
                "Update your outreach tracking spreadsheet. Cumulative contact: how many people have you reached out to? How many responses? Response rate? Conversion to meeting rate? (This is your real data.)",
            },
          ],
        },
        {
          day: "Day 23",
          label: "Weekday evening",
          time_required: "75 mins",
          time_allocation: { shared: "75 mins" },
          tasks: [
            {
              task_id: "23_1",
              strand_id: "shared",
              task_type: "outreach",
              description:
                "Push on the strongest strand: 2–3 new outreach actions (emails or LinkedIn DMs) to fresh contacts identified in Phase 2. Goal: at least one exploratory meeting booked on the strongest strand for Days 24–30.",
            },
            {
              task_id: "23_2",
              strand_id: "shared",
              task_type: "content",
              description:
                "Optional: publish second LinkedIn observation (if first one landed well). Different angle — maybe something learned from your Phase 2 conversations that would be useful to your network.",
            },
          ],
        },
      ],
    },
    {
      phase: "Phase 4 — Focus & Acceleration",
      days: "Days 24–30",
      goal: "Concentrate effort on strongest strand(s); book first client meeting or engagement; prepare for Day 31 conversation",
      strand_focus: "focus_strands",
      days_detail: [
        {
          day: "Day 25",
          label: "Weekend day",
          time_required: "150 mins",
          time_allocation: { shared: "150 mins" },
          tasks: [
            {
              task_id: "25_1",
              strand_id: "shared",
              task_type: "outreach",
              description:
                "Concentrated outreach day for your strongest strand. Identify 2–3 additional warm contacts you haven't yet approached. Send reconnect emails or LinkedIn DMs. Goal: add 2 more conversations to the pipeline by end of Phase 4.",
            },
            {
              task_id: "25_2",
              strand_id: "shared",
              task_type: "admin",
              description:
                "Prepare a simple project proposal template for your strongest strand. One page: project overview, deliverables, timeline, investment. Keep it flexible — you'll customize it per client. This is your response tool when someone says 'send me something in writing.'",
            },
          ],
        },
        {
          day: "Day 26",
          label: "Weekday evening",
          time_required: "90 mins",
          time_allocation: { shared: "90 mins" },
          tasks: [
            {
              task_id: "26_1",
              strand_id: "shared",
              task_type: "review",
              description:
                "Portfolio Review 2 (Final). Questions: (1) Do you want to concentrate on one strand for the next 60 days, or continue 2–3? (2) Has any strand produced a breakthrough signal since Review 1? (3) Are you ready to pause the remaining strands, or do any deserve light continued effort? This decision shapes your August activity.",
            },
          ],
        },
        {
          day: "Day 28",
          label: "Weekday evening",
          time_required: "75 mins",
          time_allocation: { shared: "75 mins" },
          tasks: [
            {
              task_id: "28_1",
              strand_id: "shared",
              task_type: "outreach",
              description:
                "Follow up on all active conversations from Phase 2–3. One message per person: checking in, suggesting next conversation, or moving toward a proposal conversation if they've expressed interest. Expect 30–50% response rates on follow-ups.",
            },
            {
              task_id: "28_2",
              strand_id: "shared",
              task_type: "admin",
              description:
                "Finalize your positioning language for your strongest strand. Write it out: 'I do X (specific service) for Y buyers (specific customer) who Z (specific problem/moment). I charge £A–£B per engagement, typical duration C–D weeks.' This is your elevator pitch and pricing clarity.",
            },
          ],
        },
        {
          day: "Day 30",
          label: "Weekend day",
          time_required: "120 mins",
          time_allocation: { shared: "120 mins" },
          tasks: [
            {
              task_id: "30_1",
              strand_id: "shared",
              task_type: "admin",
              description:
                "30-day checkpoint: count your evidence. How many conversations? How many referrals? How many warm leads for the next 30 days? How many people now know you're thinking about independent work? Document it. This is the baseline for the next phase.",
            },
            {
              task_id: "30_2",
              strand_id: "shared",
              task_type: "admin",
              description:
                "Plan for Days 31–60: based on your strongest strand and evidence from Phase 1–4, identify next 10 people to contact. Create your 'second wave' contact list. You should have at least 1 active opportunity or 2–3 warm conversations warm by end of Days 31–60.",
            },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// 13. SAMPLE_TRACTION_SIGNALS (P3v2 — NEW)
// ============================================================================
export interface TractionSignal {
  signal: string;
  weight: "negative" | "neutral" | "moderate" | "strong" | "very_strong";
}

export interface StrandTractionSignals {
  strand_id: string;
  model_name: string;
  signals: TractionSignal[];
}

export const SAMPLE_TRACTION_SIGNALS: StrandTractionSignals[] = [
  {
    strand_id: "strand_1",
    model_name: "Commercial Finance Consultancy",
    signals: [
      {
        signal: "FTSE 100 FBP background — automatic credibility with mid-market buyers",
        weight: "very_strong",
      },
      {
        signal:
          "£38M digital transformation business case — proof of board-ready analysis and presentation capability",
        weight: "very_strong",
      },
      {
        signal:
          "Informal advisory pattern (pricing proposals pre-ExCo) — evidence of trusted commercial judgment",
        weight: "strong",
      },
      {
        signal:
          "11 years financial services experience — demonstrates sustainability and depth",
        weight: "strong",
      },
      {
        signal:
          "PE-backed businesses in your network (former colleagues who've moved) — existing warm contact path",
        weight: "moderate",
      },
      {
        signal:
          "Commercial modelling capability validated through 11 years of practice",
        weight: "strong",
      },
      {
        signal:
          "Weakness: no visible independent track record yet — requires trust-building via conversations",
        weight: "moderate",
      },
    ],
  },
  {
    strand_id: "strand_2",
    model_name: "Fractional CFO / Strategic Finance Director",
    signals: [
      {
        signal:
          "Strategic financial mindset demonstrated through commercial advisory work",
        weight: "strong",
      },
      {
        signal:
          "Large finance function experience — you've seen how well-run teams operate",
        weight: "moderate",
      },
      {
        signal:
          "Board communication capability — core Fractional CFO requirement",
        weight: "very_strong",
      },
      {
        signal:
          "Weakness: no demonstrated history of running entire finance function independently",
        weight: "strong",
      },
      {
        signal:
          "Weakness: Fractional CFO requires longer sales cycle and higher buyer trust threshold than Strand 1",
        weight: "moderate",
      },
      {
        signal:
          "Strength: natural evolution from Strand 1 once you have project engagements on record",
        weight: "moderate",
      },
    ],
  },
  {
    strand_id: "strand_3",
    model_name: "Finance Function Transformation Consultant",
    signals: [
      {
        signal:
          "Direct experience inside a well-structured FTSE 100 finance function — the product",
        weight: "very_strong",
      },
      {
        signal:
          "Seen process design, team structure, technology fit, and implementation challenges at scale",
        weight: "strong",
      },
      {
        signal:
          "Demonstrated ability to communicate financial concepts to non-finance audiences — important for change leadership",
        weight: "strong",
      },
      {
        signal:
          "Weakness: big consultancies dominate enterprise end; you're targeting £15M–£80M market where competition is moderate",
        weight: "moderate",
      },
      {
        signal:
          "Strength: mid-market businesses lack access to strategic finance function design expertise",
        weight: "moderate",
      },
      {
        signal:
          "Weakness: engagements typically 3–6 months, slower to close than Strand 1",
        weight: "neutral",
      },
    ],
  },
];

// ============================================================================
// 14. SAMPLE_PORTFOLIO_REVIEW
// ============================================================================
export const SAMPLE_PORTFOLIO_REVIEW = {
  review_1: {
    trigger_day: 19,
    questions: [
      "Which strand has felt most natural to pursue? (Check your outreach spreadsheet — where did time flow most easily?)",
      "Which has generated the strongest external response? (Count meetings, referrals, follow-ups per strand.)",
      "Which has been hardest to make progress on? (Where did you hesitate or delay?)",
      "Based on evidence so far, should any strand be paused or narrowed for Days 20–30?",
    ],
  },
  review_2: {
    trigger_day: 26,
    questions: [
      "Which strand do you want to concentrate on for Days 31–60? (Pick one or two, not three.)",
      "Has any strand produced a breakthrough signal — a real client opportunity or strong referral pattern — since Review 1?",
      "Are you ready to pause the remaining strands, or do any deserve light continued effort (one contact every 1–2 weeks)?",
    ],
  },
};

// ============================================================================
// 15. SAMPLE_NETWORK_TOOLKIT
// ============================================================================
export interface NetworkTemplate {
  type:
    | "reconnect_email"
    | "linkedin_dm"
    | "referral_ask_email"
    | "verbal_positioning_statement";
  strand_id: "shared" | "strand_1" | "strand_2" | "strand_3";
  use_case: string;
  subject?: string;
  body: string;
}

export const SAMPLE_NETWORK_TOOLKIT: NetworkTemplate[] = [
  {
    type: "reconnect_email",
    strand_id: "strand_1",
    use_case:
      "Reconnect with a former colleague now in mid-market business (Commercial Finance Consultancy — Strand 1)",
    subject: "Reconnect — and something I'd value your view on",
    body: `Hi [Name],

It's been a while — I've been following your move to [company] with real interest.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role. Commercial finance and business case work — the kind of FBP work I've been doing but for businesses that don't have a strong commercial finance function internally.

I'd find it genuinely useful to get your perspective on how that kind of work gets bought in the mid-market, and whether there are moments when businesses like yours actively look for that capability. Would you have 20 minutes for a catch-up call in the next couple of weeks?

Best,
Sarah`,
  },
  {
    type: "linkedin_dm",
    strand_id: "shared",
    use_case:
      "Second-degree connection via mutual contact — information gathering on general finance advisory landscape",
    subject: "",
    body: `[Name] — [mutual contact] mentioned you've been thinking about [X topic]. I'm exploring some similar ground on the commercial finance / business case side and would value 20 minutes to pick your brain about what's real in that space. Happy to share what I'm seeing too.

Sarah`,
  },
  {
    type: "referral_ask_email",
    strand_id: "strand_2",
    use_case:
      "After a genuine exploratory conversation — ask for warm referral to similar contacts",
    subject: "Really useful call — and a question for you",
    body: `[Name],

Really useful conversation yesterday — genuinely appreciate the time and your perspective on how fractional finance leadership gets thought about in your world.

One thing I'm trying to do is expand the number of conversations I'm having with people in similar positions to you — CFOs and commercial directors in growth or PE-backed businesses who are thinking about finance leadership.

Is there anyone in your network you think I should speak to? Not asking you to vouch for me commercially — just a warm intro if you think it's a useful conversation for them too. I'd obviously return the favour if there's ever something I can help you think through.

Sarah`,
  },
  {
    type: "verbal_positioning_statement",
    strand_id: "shared",
    use_case:
      "In-person networking or phone conversation — how to frame what you do without slides",
    subject: "",
    body: `I'm a Finance Business Partner by background — most of my career has been in large financial services, working with senior leadership on commercial decisions: investment cases, pricing decisions, financial analysis ahead of board presentations. I'm now doing that work independently for mid-market and PE-backed businesses that need that capability on a project basis, rather than a full-time hire.

The moment I'm most useful is when they're heading into a board or investor meeting with a financial story that isn't quite holding together, or they need someone who can build a credible case for a strategic decision.`,
  },
];

// ============================================================================
// 16. SAMPLE_MARKET_SNAPSHOTS (P4 — per strand)
// ============================================================================
export interface MarketSnapshot {
  strand_id: string;
  model_name: string;
  location: string;
  sections: {
    demand_signal: string;
    pricing_benchmark: string;
    competitor_landscape: string;
    market_entry_insight: string;
    honest_assessment: string;
  };
}

export const SAMPLE_MARKET_SNAPSHOTS: MarketSnapshot[] = [
  {
    strand_id: "strand_1",
    model_name: "Commercial Finance Consultancy",
    location: "London / South East",
    sections: {
      demand_signal:
        "Strong. PE-backed mid-market businesses consistently cite inability to build credible financial cases for board decisions as a live problem. Finance directors in this segment are typically from accounting backgrounds — strong on reporting, weaker on commercial narrative. The gap your FBP background can fill is real and recurring.",
      pricing_benchmark:
        "£750–£900 per day for project-based work at your level and background. London premium applies. Rates above £950/day are achievable once you have 2–3 visible engagements. Starting below £700/day misaligns expectations with PE-backed buyers who equate rate with quality.",
      competitor_landscape:
        "The broad 'finance consultant' market is competitive. The narrow 'commercial finance / business case / board-level financial storytelling for PE-backed businesses' segment is significantly less crowded. Your positioning should be this specific — it is not a limitation, it is a signal.",
      market_entry_insight:
        "In this segment, first 3–4 engagements almost always come via personal referral from trusted contacts. Inbound from LinkedIn requires visible track record first. The plan prioritises network activation over inbound marketing for the first 90 days.",
      honest_assessment:
        "The market supports this. The risk is not demand — it's distribution. This market does not advertise for what you do. You will not find it on job boards. First-client acquisition depends entirely on willingness to have Phase 1 conversations.",
    },
  },
  {
    strand_id: "strand_2",
    model_name: "Fractional CFO / Strategic Finance Director",
    location: "London / South East",
    sections: {
      demand_signal:
        "Moderate to growing. Growth-stage and PE-backed businesses increasingly ask 'do we need a full-time CFO or can we hire fractional?' The category is real but not yet standardized — buyer language is inconsistent. This is both opportunity (less competition from established fractional CFO shops) and challenge (harder to position).",
      pricing_benchmark:
        "£4,000–£6,000 per month for 2–3 days per week. Typical engagement duration 6–12 months. Higher total annual income (£48k–£72k) but lower close rate and longer sales cycle than Strand 1.",
      competitor_landscape:
        "Emerging but competitive. Established fractional CFO platforms (Lantum, Equip, etc.) own the enterprise segment. Independent advisors and smaller boutiques compete on relationship and fit, not scale. Differentiation is relationship + specific expertise, not brand.",
      market_entry_insight:
        "Fractional CFO works best once you have demonstrated project-based success. Buyers want evidence that you've built something, not just concepts. Position it as 'next step after successful commercial finance projects' rather than 'starting point.'",
      honest_assessment:
        "The category is real and growing, but you're entering at a disadvantage without independent track record. Recommend pursuing as a Year 2 target, not a starting point. Use Strand 1 to build proof.",
    },
  },
  {
    strand_id: "strand_3",
    model_name: "Finance Function Transformation Consultant",
    location: "London / South East",
    sections: {
      demand_signal:
        "Strong but crowded. Mid-market businesses know their finance functions are behind. The demand is real. The challenge is competition — big consultancies own the enterprise segment, leaving mid-market (£20M–£150M revenue) somewhat more accessible but still competitive.",
      pricing_benchmark:
        "£700–£950 per day, typical engagement 3–6 months. Project-based pricing model (£25k–£50k per engagement) is common. Longer sales cycle than Strand 1 because scope is larger and change management is slower.",
      competitor_landscape:
        "Competitive. Big consultancies (Deloitte, Accenture, etc.) dominate enterprise; mid-market is more accessible but has strong regional players. Differentiation on relationship, not brand, is key.",
      market_entry_insight:
        "Entry is easier than enterprise consultancies require, but you need a clear point of view on what 'good' looks like in mid-market finance transformation. Your FTSE 100 experience is the point of view. Use it.",
      honest_assessment:
        "Market is real and accessible, but requires longer-cycle sales and change management expertise. Engagements are sticky (3–6 months) which is good for income stability but slower to close. Recommend as parallel strand to Strand 1, not primary entry point.",
    },
  },
];

// ============================================================================
// 17. SAMPLE_PORTFOLIO_SUMMARY (P3v2 — NEW)
// ============================================================================
export const SAMPLE_PORTFOLIO_SUMMARY = {
  strand_count: 3,
  strands: [
    {
      strand_id: "strand_1",
      model_name: "Commercial Finance Consultancy",
      rank: 1,
      why_included:
        "Fastest path to first revenue. Your FTSE 100 FBP background directly translates to mid-market commercial finance buyer need. Work is a direct extension of what you already do. Lowest credibility gap.",
      time_weight: 0.4,
    },
    {
      strand_id: "strand_2",
      model_name: "Fractional CFO / Strategic Finance Director",
      rank: 2,
      why_included:
        "Higher income ceiling and natural evolution from Strand 1 once you've built a visible track record. Retainer model delivers £48k–£72k annually. Better positioned as Year 2 target, not entry point.",
      time_weight: 0.35,
    },
    {
      strand_id: "strand_3",
      model_name: "Finance Function Transformation Consultant",
      rank: 6,
      why_included:
        "Your experience inside a well-structured FTSE 100 finance function is the product for mid-market businesses still running on spreadsheets. Longer sales cycle but sticky 3–6 month engagements. Recommend as parallel strand to Strand 1, not primary path.",
      time_weight: 0.25,
    },
  ],
  strategy:
    "These three strands share a common buyer base (PE-backed and growth-stage mid-market businesses) but test different value propositions and time-to-revenue patterns. Commercial Finance Consultancy is fastest revenue and lowest credibility gap — your primary focus for Phase 1–3. Fractional CFO tests whether longer-term retainer relationships are accessible at your current stage; keep it warm in parallel but expect Year 2 traction. Finance Function Transformation draws on your operational experience; engagements are longer and stickier but harder to close. Pursuing all three in parallel lets you discover which resonates most with market response before committing exclusively.",
  effort_distribution:
    "Phase 2 time splits roughly 40% to Strand 1, 35% to Strand 2, 25% to Strand 3 — weighted by composite score and time-to-revenue. By Portfolio Review 1 (Day 19), you'll have enough market signal to adjust these allocations based on real evidence: response rates, meeting difficulty, buyer enthusiasm. Expect to narrow to 1–2 strands by Day 30 based on what your network is telling you.",
};
