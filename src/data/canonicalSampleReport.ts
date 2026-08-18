/**
 * canonicalSampleReport.ts
 *
 * Canonical-shaped sample fixtures for dev-bypass mode on /plan and /teaser.
 * Persona: Sarah Okafor, Finance Business Partner, 11 years FS, FTSE 100 retail bank.
 * Archetype: Financial Intelligence Operator.
 *
 * These constants conform to the canonical types in `src/types/canonical.ts`.
 * They give Plan.tsx and Teaser.tsx (when isDevBypass()) something rich to
 * render against without going through real generation. They are NOT a parity
 * test fixture, `activation_plan.phases` is one fully-fleshed phase plus three
 * lighter phases to keep the file readable.
 *
 * NOTE: `src/data/sampleReportData.ts` is intentionally kept separate, that
 * file uses a legacy ad-hoc shape and is still consumed by the static
 * /sample-report iframe page.
 */

import type {
  SoloCoreReport,
  ActivationPlanOutput,
  MarketSnapshotOutput,
} from "@/types/canonical";

// ============================================================================
// SAMPLE_CORE_REPORT
// ============================================================================

export const SAMPLE_CORE_REPORT: SoloCoreReport = {
  archetype: {
    primary: "Financial Intelligence Operator",
    secondary: "Commercial Translator",
    confidence: 0.92,
    summary:
      "You sit in finance, but you operate like a commercial director. Your value is the translation layer between financial complexity and business decisions, the ability to walk numbers into a room of non-finance people and hold the story under challenge.",
    editorial_description:
      "Most Finance Business Partners translate the numbers, they produce the reports, maintain the models, keep month-end running. You do that, and then you do the thing that's actually hard: you defend the financial story in a board room and adjust the narrative on the fly. The informal advisory pattern (pricing pre-ExCo, business case challenge) confirms what your CV understates: judgement, not technique, is the asset.",
    capability_tags: [
      "Commercial modelling",
      "Investment case development",
      "Board-level communication",
      "Challenge-resilient analysis",
      "Pricing & commercial review",
      "Non-finance stakeholder management",
    ],
  },
  transferable_value: {
    what_they_can_sell:
      "Commercial finance partnership on a project or retained basis, investment case development, business case financial storytelling, board-level financial challenge and validation, and CFO-lite support for mid-market businesses preparing for critical financial decisions. The value is not the spreadsheet; it is taking the spreadsheet into a room and making it survive.",
    why_buyers_would_pay:
      "PE-backed and growth-stage mid-market businesses regularly face moments where they need a board-ready financial narrative but their internal finance team is accounting-focused, not commercially oriented. Before a board presentation, a capital raise, or an M&A transaction, they discover they need someone who can defend the financial story, not just build it. That gap credible commercial finance capability on-demand is what generates urgency and payment.",
    credibility_assets: [
      "FTSE 100 FBP background, automatic credibility signal to mid-market buyers who equate large-bank finance with rigour",
      "£38M digital transformation business case approved on first board presentation, proof of modelling capability and ability to withstand executive scrutiny",
      "Informal advisory pattern across pricing, channel and investment decisions, evidence of trusted commercial judgement, not just technical competence",
    ],
  },
  transferable_skills: [
    {
      skill_name: "Board-Level Financial Communication",
      strength: 92,
      evidence:
        "Presented the £38M digital transformation business case directly to board; defended sensitivities and commercial assumptions under executive challenge without prepared slides.",
      market_demand: "high",
    },
    {
      skill_name: "Commercial Investment Case Development",
      strength: 89,
      evidence:
        "Built investment cases for multiple corporate strategy initiatives, including scenario modelling, sensitivity analysis, and risk quantification, calibrated for non-finance executive audiences.",
      market_demand: "high",
    },
    {
      skill_name: "Financial Scenario Modelling & Sensitivity Analysis",
      strength: 88,
      evidence:
        "Multi-variate financial models with transparent assumption logic, stress-tested against changing business scenarios, a core requirement in the current FBP role.",
      market_demand: "high",
    },
    {
      skill_name: "Non-Finance Stakeholder Translation",
      strength: 85,
      evidence:
        "Regular practice explaining financial complexity to commercial leadership without jargon; recurring informal financial advisor to business area heads on commercial decisions.",
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
        "Experience identifying and quantifying financial risk in business cases, operational changes, and commercial decisions, translating qualitative risk into financial impact.",
      market_demand: "medium",
    },
  ],
  options: [
    {
      rank: 1,
      model_name: "Commercial Finance Consultancy",
      business_model_id: "commercial_finance_consultancy",
      primary_move_type: "direct",
      structural_warmth: false,
      composite_score: 0.89,
      tier: "front_runner",
      tie_note: null,
      evidence: [{ kind: "radar", title: "Board-ready business case support pulled forward by budget season", source_name: "Solo analysis", week_start: "2026-08-17", buyer: null, value_text: null, deadline: null, summary: "PE-backed finance teams are bringing in outside capability for investment cases and board packs where the internal team is stretched, usually as defined projects ahead of Q4 sign-off.", url: null }, { kind: "radar", title: "Contracts Finder: financial modelling support, regeneration programme", source_name: "Contracts Finder", week_start: "2026-08-17", buyer: "Local authority regeneration partnership", value_text: "£48,000", deadline: "2026-09-05", summary: null, url: null }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["fastest_revenue", "credibility_asset", "network_aligned"],
      source: "primary",
      positioning:
        "Commercial finance partnership for PE-backed and growth-stage businesses preparing for board-level investment decisions. You deliver business case development, financial storytelling, and executive challenge, the capability internal finance teams lack.",
      target_buyer:
        "CFO or CEO of a PE-backed business, £15M–£100M revenue, preparing for a capital decision, board presentation, or M&A event.",
      what_they_are_buying:
        "External commercial finance capability on a project basis, investment case development, business case validation, or CFO support for a specific decision moment.",
      pricing: {
        model: "project",
        range_low_gbp: 750,
        range_high_gbp: 900,
        cadence: "per day",
      },
      time_to_first_revenue: "3–5 months",
      difficulty_rating: "moderate",
      why_this_works_for_them:
        "Your FTSE 100 FBP background is an immediate credibility signal to mid-market buyers. The £38M business case is directly analogous to their board prep requirement. Informal advisory pattern demonstrates commercial judgement, not just technical finance.",
      caution_note: null,
    },
    {
      rank: 2,
      model_name: "Fractional CFO / Strategic Finance Director",
      business_model_id: "fractional_cfo",
      primary_move_type: "direct",
      structural_warmth: false,
      composite_score: 0.84,
      tier: "front_runner",
      tie_note: null,
      evidence: [{ kind: "radar", title: "Fractional finance leadership demand holds through the quarter", source_name: "Solo analysis", week_start: "2026-08-10", buyer: null, value_text: null, deadline: null, summary: "Owner-managed and PE-backed businesses in the £5m to £40m band continue to retain part-time finance directors rather than hire, with two to four days a month the standard shape.", url: null }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["higher_income", "retainer_model", "future_ready"],
      source: "primary",
      positioning:
        "Ongoing fractional senior finance leadership for growth-stage and mid-market businesses that need strategic financial oversight without a full-time hire, board pack preparation, financial reporting leadership, commercial oversight, growth-stage financial strategy.",
      target_buyer:
        "CEO or CFO of a PE-backed or VC-backed business, £20M–£150M revenue, needing part-time senior finance leadership (2–4 days per month).",
      what_they_are_buying:
        "Ongoing strategic finance capability delivered on retainer, board-ready financial reporting, commercial financial strategy, executive-level financial guidance.",
      pricing: {
        model: "retainer",
        range_low_gbp: 4000,
        range_high_gbp: 6000,
        cadence: "per month",
      },
      time_to_first_revenue: "8–14 months",
      difficulty_rating: "hard",
      why_this_works_for_them:
        "Natural evolution from Strand 1 once you've built a visible track record. Higher annual income (£48k–£72k) but requires buyers to believe you can run their entire finance function, harder to access without prior demonstrated success.",
      caution_note:
        "Fractional CFO roles are harder to win at entry stage than project-based consulting. Better positioned as a Year 2 target, once you've built track record via Option 1.",
    },
    {
      rank: 3,
      model_name: "Commercial Finance Training & Facilitation",
      business_model_id: "commercial_finance_training",
      primary_move_type: "visibility",
      structural_warmth: false,
      composite_score: 0.84,
      tier: "front_runner",
      tie_note: "Held level with the Fractional CFO route on fit; we lead with the CFO path because retained finance leadership converts your board record faster than training days.",
      evidence: [{ kind: "radar", title: "Board-ready business case support pulled forward by budget season", source_name: "Solo analysis", week_start: "2026-08-17", buyer: null, value_text: null, deadline: null, summary: "PE-backed finance teams are bringing in outside capability for investment cases and board packs where the internal team is stretched, usually as defined projects ahead of Q4 sign-off.", url: null }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["high_leverage", "content_opportunity", "scaling_potential"],
      source: "primary",
      positioning:
        "Commercial finance workshops for non-finance management teams and business leaders who need to read, challenge, and present financial information. Half-day intensives, leadership team workshops, board prep sessions.",
      target_buyer:
        "Chief Commercial Officer, COO, or Head of Business Development at mid-market businesses; training procurement for management development programmes.",
      what_they_are_buying:
        "Half-day or full-day workshop delivery on commercial finance topics, financial literacy, financial challenge skills, board presentation skills for non-finance leaders.",
      pricing: {
        model: "project",
        range_low_gbp: 2500,
        range_high_gbp: 4000,
        cadence: "per day",
      },
      time_to_first_revenue: "6–10 months",
      difficulty_rating: "moderate",
      why_this_works_for_them:
        "Day rate ceiling is higher than project consulting, but the model is time-bounded and not scalable without product development. Best as a complementary income stream once you have visible credibility from Option 1.",
      caution_note:
        "Training requires investment in curriculum design and positioning before buyers find you. Not recommended as a primary path from a standing start.",
    },
    {
      rank: 4,
      model_name: "Financial Due Diligence Consultant",
      business_model_id: "financial_due_diligence",
      primary_move_type: "direct",
      structural_warmth: false,
      composite_score: 0.74,
      tier: "credible",
      tie_note: null,
      evidence: [{ kind: "radar", title: "Diligence support tightening ahead of year-end deal window", source_name: "Solo analysis", week_start: "2026-08-10", buyer: null, value_text: null, deadline: null, summary: "Advisers are booking independent financial due diligence capacity for the autumn deal window; short, defined engagements with fast turnarounds.", url: null }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["transaction_focused", "peer_networks", "deal_flow"],
      source: "primary",
      positioning:
        "Buy-side and sell-side financial due diligence for PE firms, corporate development teams, and acquirers. Quality of earnings analysis, working capital normalisation, financial risk identification.",
      target_buyer:
        "PE partner or corporate development lead preparing for an acquisition or investment decision.",
      what_they_are_buying:
        "Financial due diligence work on a transaction fee basis, detailed financial analysis ahead of investment or acquisition decision.",
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
      business_model_id: "investor_relations_advisory",
      primary_move_type: "direct",
      structural_warmth: false,
      composite_score: 0.68,
      tier: "credible",
      tie_note: null,
      evidence: [{ kind: "coverage", text: "No live Radar signal matched this route in the last fortnight. The Radar refreshes every Monday; thin coverage is stated rather than papered over." }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["board_communication", "narrative_strength", "future_positioning"],
      source: "primary",
      positioning:
        "Preparing growth-stage and pre-IPO businesses for investor scrutiny, equity story development, investor deck creation, financial narrative for fundraising rounds.",
      target_buyer:
        "CFO or CEO of a VC-backed or pre-IPO company preparing a fundraising round or IPO process.",
      what_they_are_buying:
        "Investor relations and capital markets advisory, developing and validating the financial narrative for investors.",
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
      business_model_id: "finance_function_transformation",
      primary_move_type: "direct",
      structural_warmth: false,
      composite_score: 0.71,
      tier: "credible",
      tie_note: null,
      evidence: [{ kind: "radar", title: "Fractional finance leadership demand holds through the quarter", source_name: "Solo analysis", week_start: "2026-08-10", buyer: null, value_text: null, deadline: null, summary: "Owner-managed and PE-backed businesses in the £5m to £40m band continue to retain part-time finance directors rather than hire, with two to four days a month the standard shape.", url: null }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["operational_experience", "scale_ready", "long_engagements"],
      source: "primary",
      positioning:
        "Helping mid-market businesses redesign their finance function from backward-looking reporting to forward-looking commercial partnering. Process design, team structure, technology selection, implementation oversight.",
      target_buyer:
        "CFO of a £20M–£150M business undertaking finance function transformation or significant operational change.",
      what_they_are_buying:
        "Finance transformation consulting, design and implementation support for building a modern, commercially oriented finance function.",
      pricing: {
        model: "project",
        range_low_gbp: 700,
        range_high_gbp: 950,
        cadence: "per day",
      },
      time_to_first_revenue: "4–7 months",
      difficulty_rating: "moderate",
      why_this_works_for_them:
        "You've lived inside a well-structured FTSE 100 finance function, that direct experience is the product for mid-market businesses still running on spreadsheets and disconnected processes.",
      caution_note:
        "Big consultancies own the enterprise end. Mid-market is more accessible but requires clear positioning.",
    },
    {
      rank: 7,
      model_name: "Non-Executive Director (Finance)",
      business_model_id: "ned_finance",
      primary_move_type: "community",
      structural_warmth: false,
      composite_score: 0.58,
      tier: "stretch",
      tie_note: null,
      evidence: [{ kind: "coverage", text: "No live Radar signal matched this route in the last fortnight. The Radar refreshes every Monday; thin coverage is stated rather than papered over." }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["board_ready", "governance", "portfolio_addition"],
      source: "primary",
      positioning:
        "Board-level governance and financial oversight for scaling businesses, 1–2 days per month providing independent financial challenge, audit committee participation, strategic financial guidance.",
      target_buyer:
        "Chair or CEO of a scaling business or PE-backed SME needing independent board-level financial scrutiny.",
      what_they_are_buying:
        "Board seat and ongoing governance participation, independent financial challenge and oversight.",
      pricing: {
        model: "retainer",
        range_low_gbp: 500,
        range_high_gbp: 800,
        cadence: "per day",
      },
      time_to_first_revenue: "12–18 months",
      difficulty_rating: "hard",
      why_this_works_for_them:
        "NED roles require an established independent profile, boards hire people with visible track records.",
      caution_note:
        "Portfolio addition, not a primary income source. Realistic target: Year 2 once you have demonstrated track record.",
    },
    {
      rank: 8,
      model_name: "Expert Witness & Litigation Support (Financial)",
      business_model_id: "expert_witness_financial",
      primary_move_type: "platform",
      structural_warmth: true,
      composite_score: 0.54,
      tier: "stretch",
      tie_note: null,
      evidence: [{ kind: "coverage", text: "No live Radar signal matched this route in the last fortnight. The Radar refreshes every Monday; thin coverage is stated rather than papered over." }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["analytical_strength", "high_rate", "long_timeline"],
      source: "primary",
      positioning:
        "Independent financial expert opinion for commercial litigation, regulatory proceedings, and dispute resolution, financial loss quantification, forensic analysis of commercial decisions, expert reports.",
      target_buyer:
        "Commercial solicitor or in-house counsel requiring expert financial opinion for litigation or dispute resolution.",
      what_they_are_buying:
        "Expert witness services, independent financial analysis and expert report for court or regulatory proceedings.",
      pricing: {
        model: "day rate",
        range_low_gbp: 1200,
        range_high_gbp: 2000,
        cadence: "per day",
      },
      time_to_first_revenue: "12–24 months",
      difficulty_rating: "hard",
      why_this_works_for_them:
        "Highest day rates on this list, but barrier to entry is substantial, solicitors require published credentials and prior testimony.",
      caution_note:
        "Requires formal expert witness training and accreditation. Realistic long-term addition after 2–3 years of established practice.",
    },
    {
      rank: 9,
      model_name: "Financial Content & Thought Leadership",
      business_model_id: "financial_content",
      primary_move_type: "visibility",
      structural_warmth: false,
      composite_score: 0.66,
      tier: "credible",
      tie_note: null,
      evidence: [{ kind: "coverage", text: "No live Radar signal matched this route in the last fortnight. The Radar refreshes every Monday; thin coverage is stated rather than papered over." }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["visibility", "positioning", "low_barrier"],
      source: "primary",
      positioning:
        "Commercial finance content, articles, white papers, newsletter content for financial services firms, PE houses, and B2B platforms that need credible finance voices.",
      target_buyer:
        "Content team at a PE house, fintech platform, or B2B finance publication; or in-house marketing team building thought leadership.",
      what_they_are_buying:
        "Authored commercial finance content, articles, guest posts, or newsletter pieces that position their brand as commercially astute.",
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
        "Real value is positioning effect, being a visible voice in commercial finance opens doors that cold outreach cannot reach.",
    },
    {
      rank: 10,
      model_name: "SaaS / Fintech Product Advisory",
      business_model_id: "saas_fintech_advisory",
      primary_move_type: "community",
      structural_warmth: false,
      composite_score: 0.62,
      tier: "credible",
      tie_note: null,
      evidence: [{ kind: "coverage", text: "No live Radar signal matched this route in the last fortnight. The Radar refreshes every Monday; thin coverage is stated rather than papered over." }, { kind: "rate", text: "Calibrated bands for Financial Intelligence Operator: day rate £650-£1,050/day, retainer £6,000-£15,000/month (Solo knowledge bank, hand-reviewed)." }],
      fit_tags: ["domain_expert", "product_insight", "equity_opportunity"],
      source: "secondary",
      positioning:
        "Advising fintech startups and finance SaaS companies on product-market fit and user research, domain expertise on how senior finance teams actually work.",
      target_buyer:
        "Head of Product or founding team at a fintech or finance SaaS startup.",
      what_they_are_buying:
        "Product advisory and user research facilitation, domain expertise on how finance teams operate and think.",
      pricing: {
        model: "retainer",
        range_low_gbp: 600,
        range_high_gbp: 900,
        cadence: "per day",
      },
      time_to_first_revenue: "6–12 months",
      difficulty_rating: "moderate",
      why_this_works_for_them:
        "Practitioner perspective is genuinely valuable to product teams building for finance, they rarely have access to senior FBPs.",
      caution_note:
        "Fintech advisory requires a different network than your current one. Compensation often includes equity rather than pure cash.",
    },
  ],
  recommendation: {
    recommended_rank: 1,
    rationale:
      "Commercial Finance Consultancy is your strongest entry point because it directly translates your existing capability (business case development, board communication) to a buyer segment (PE-backed mid-market) that urgently needs exactly this work. Your FTSE 100 background is an automatic credibility signal that removes the biggest barrier early-stage consultants face: trust. Moving toward Fractional CFO in 18–24 months is the strategic play.",
    key_condition:
      "This recommendation rests on one condition: you must make the first outreach calls while still employed. The financial risk is low, but the psychological barrier is real.",
  },
  reality_check: {
    most_likely_failure_mode:
      "You will build the plan, update the LinkedIn, and then not send the first email. The psychological barrier between 'I have a plan' and 'I contacted someone' is where most professionals with your profile stop. This is not a plan failure, it's an activation failure.",
    second_failure_mode:
      "You will send the first email, get no immediate response, and assume the market doesn't want what you're selling. In practice, email response rates are low but follow-up rates are high. Most positive responses come from a second message, not the first.",
    what_they_will_find_hard:
      "You will find it uncomfortable to tell people what you're doing. Not as a pitch, as a conversation. Most professionals delay this indefinitely because it feels presumptuous. Your network wants to help if they can, and the only way they can is if they know you're thinking about this.",
    honest_income_outlook:
      "Year 1: £25k–£72k depending on execution. Mid-range (£48k) assumes 2–3 project engagements at £20k–£30k each over 12 months. This is 40% of your current salary; the plan gets you to salary replacement by Year 2.",
  },
  income_outlook: {
    primary_option_rank: 1,
    year_1: {
      low_gbp: 25000,
      mid_gbp: 48000,
      high_gbp: 72000,
      revenue_build:
        "Slow start (Months 1–3: activation and first conversations), acceleration (Months 4–7: early engagements close), stabilisation (Months 8–12: 2–3 engagements running in parallel).",
      revenue_sources:
        "2–3 project-based commercial finance engagements at £20k–£35k each, typically 4–8 weeks duration. One possible small retainer or advisory relationship by end of Year 1.",
      assumptions:
        "Assumes £750/day rate and active outreach starting within 30 days of planning. 60% close rate on qualified conversations. 40% of time allocated to independent work while managing current employment.",
    },
    year_2: {
      low_gbp: 55000,
      mid_gbp: 78000,
      high_gbp: 105000,
      revenue_build:
        "Year 1 track record creates inbound from your network; mixture of repeat project work and emerging retainer relationships. By Q2, case studies to reference. By Q4, decision point on full-time independence.",
      revenue_sources:
        "3–4 project engagements plus 1–2 partial retainers (1–2 days/month each) or a single Fractional CFO role (2–3 days/month). Mix of inbound referrals and active outreach.",
      assumptions:
        "Assumes £800/day rate (10% increase based on track record). 3 referrals from Year 1 engagements. Retainer negotiation by mid-Year 2.",
    },
    year_3: {
      low_gbp: 75000,
      mid_gbp: 98000,
      high_gbp: 135000,
      revenue_build:
        "Market position established; significant inbound from referrals and LinkedIn visibility. Decision point on full-time independence or continued portfolio approach. Possibility of second income strand running in parallel.",
      revenue_sources:
        "Mix of project work and retainer relationships. Possibly 2 x Fractional CFO roles at £4k–£6k/month each, or equivalent project portfolio. Possibility of training or content income.",
      assumptions:
        "Assumes £850/day rate. 50% of revenue from retainers, 50% from projects. Continued active management of network and positioning.",
    },
    sensitivity_factors:
      "Three variables most affect the projection: (1) Time to first conversation 90 days delay moves the whole projection back 3 months; (2) Close rate moving from 60% to 50% reduces Year 1 by £8k–£15k; (3) Pricing, £50/day difference per engagement scales to £8k–£12k annually.",
    income_floor_analysis:
      "Realistic worst case (slow start, conservative pricing, low close rate): £15k–£25k in Year 1, with slower Year 2 growth. Floor happens if you don't make outreach calls until Months 4–6.",
    income_notes:
      "The income projection assumes you want to run independent work alongside employment initially, then decide on full-time independence. Your current salary provides runway; use it.",
  },
  recommended_selection: {
    selected_ranks: [1, 2, 6],
    rationale:
      "Strand 1 is the fastest-revenue, lowest-credibility-gap path and your primary focus. Strand 2 (Fractional CFO) is the natural Year 2 evolution, keep warm in parallel. Strand 6 (Finance Function Transformation) draws on operational experience and produces stickier engagements; pursue as a parallel test, not a substitute for Strand 1.",
  },
  hook_insight: {
    headline:
      "Your most transferable skill isn't the Excel, it's that you can walk financial complexity into a room and hold the story under challenge.",
    paragraph:
      "Mid-market businesses have finance managers who build the numbers. They rarely have anyone who can defend them commercially in front of a board. That specific gap, a business case-ready commercial thinker who can stand in front of a PE investor's questions and not fold, is your market entry point. Your first clients are not the ones advertising for finance consultants. They're PE-backed businesses between £20M and £100M revenue who are preparing for a board-level investment decision and suddenly realise their internal finance team can build the model but can't take the room.",
    first_move: {
      action: "Reconnect with a former colleague now operating in a mid-market PE-backed business",
      target: "A senior finance or commercial peer you worked with for 1+ years, now at a PE-backed business £15M–£100M revenue",
      draft_subject: "Reconnect, and a question for you",
      draft_body: `Hi [Name],

Hope you're well, it's been a while. I've been keeping up with what [company] has been doing, looks like a strong period for you all.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role, commercial finance and business case work, the kind of thing I've been doing on the FBP side for the last few years but for businesses that don't have a strong commercial finance function internally.

I'd really value 20 minutes to pick your brain, not a pitch, genuinely just curiosity about how businesses like yours think about bringing in external finance support and whether there's a moment in the calendar when that's useful. Would you be up for a quick call in the next couple of weeks?

Best,
Sarah`,
      follow_up_prompt:
        "Did you send it? If not, what stopped you? That answer is useful information about where the real barrier is.",
    },
  },
  ai_impact: {
    part_1: {
      displacement_risk: "medium",
      risk_horizon: "3–5 years",
      content:
        "Standard FBP work variance analysis, month-end reporting, model maintenance, data aggregation is being automated rapidly. Large banks are deploying AI to handle these tasks at scale; the junior FBP population faces the most direct displacement risk. Your profile sits differently. Your value is in walking numbers into a room and holding the story under challenge from senior executives, work that requires real-time judgement, unexpected question handling, and narrative shifting on the fly. Precisely what AI cannot do reliably. The role is bifurcating: highly automated at the data layer, highly valued at the insight and influence layer.",
    },
    part_2: {
      content:
        "What you're selling as an independent, the ability to build a financial narrative, pressure-test it against executive challenge, and adjust on the fly, is precisely what AI cannot replace. AI tools can produce first-draft financial models and scenario summaries in hours instead of days. The smarter move is to use those tools to expand your capacity, not compete with them. You take on more engagements or higher-complexity work because the model-building is faster. The judgement, narrative, and ability to defend a financial story remain entirely in your hands. Board communication is an AI-hard problem.",
    },
    part_3: {
      steps: [
        {
          priority: 1,
          action: "Familiarise yourself with financial modelling AI (Causal.app or similar)",
          rationale:
            "Not to replace your skills, but to understand what is fast and what is hard so you know where your advantage sits.",
        },
        {
          priority: 2,
          action:
            "Start a simple content habit: one LinkedIn observation per month on commercial finance trends or board dynamics",
          rationale:
            "Creates a visible track record AI cannot easily replicate, your judgement, your voice, your specific perspective on financial decision-making.",
        },
        {
          priority: 3,
          action:
            "Identify 2–3 colleagues using AI tools for financial work; ask them what breaks",
          rationale:
            "Understanding where AI fails helps you position your value precisely, you handle the edge cases and judgement calls automation cannot reach.",
        },
        {
          priority: 4,
          action:
            "Invest in one certification or community (FPA, IMA thought leadership, or similar) that signals ongoing development",
          rationale:
            "AI commoditises routine capability. Continuous learning signals that your judgement stays ahead of automated analysis.",
        },
      ],
    },
  },
};

// ============================================================================
// SAMPLE_ACTIVATION_PLAN
// ============================================================================

export const SAMPLE_ACTIVATION_PLAN: ActivationPlanOutput = {
  portfolio_summary: {
    strand_count: 3,
    strands: [
      {
        strand_id: "strand_1",
        model_name: "Commercial Finance Consultancy",
        rank: 1,
        why_included:
          "Fastest path to first revenue. Your FTSE 100 FBP background directly translates to mid-market commercial finance buyer need. Direct extension of what you already do. Lowest credibility gap.",
        time_weight: 0.4,
      },
      {
        strand_id: "strand_2",
        model_name: "Fractional CFO / Strategic Finance Director",
        rank: 2,
        why_included:
          "Higher income ceiling and natural evolution from Strand 1 once you've built a visible track record. Retainer model delivers £48k–£72k annually. Better positioned as Year 2 target.",
        time_weight: 0.35,
      },
      {
        strand_id: "strand_3",
        model_name: "Finance Function Transformation Consultant",
        rank: 6,
        why_included:
          "Your experience inside a well-structured FTSE 100 finance function is the product for mid-market businesses still running on spreadsheets. Longer sales cycle but sticky 3–6 month engagements.",
        time_weight: 0.25,
      },
    ],
    strategy:
      "These three strands share a common buyer base (PE-backed and growth-stage mid-market) but test different value propositions and time-to-revenue patterns. Commercial Finance Consultancy is fastest revenue and lowest credibility gap, primary focus for Phase 1–3. Fractional CFO tests whether longer-term retainer relationships are accessible at your current stage. Finance Function Transformation draws on your operational experience.",
    effort_distribution:
      "Phase 2 time splits roughly 40% to Strand 1, 35% to Strand 2, 25% to Strand 3, weighted by composite score and time-to-revenue. By Portfolio Review 1 (Day 19), you'll have enough market signal to adjust. Expect to narrow to 1–2 strands by Day 30.",
  },
  first_move: {
    action: "Reconnect with a former colleague now operating in a mid-market PE-backed business",
    strand_id: "strand_1",
    move_type: "direct",
    window: "Within 24 hours",
    why_first:
      "This is the highest-leverage contact across your portfolio. Someone who knows your capabilities and is now in a position to either refer work or commission it. The instinct is to prepare more before approaching anyone. That's where people stall.",
    move: {
      type: "direct",
      format: "email_reconnect",
      subject: "Reconnect, and a question for you",
      draft: `Hi [Name],

Hope you're well, it's been a while. I've been keeping up with what [company] has been doing, looks like a strong period for you all.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role, commercial finance and business case work, the kind of thing I've been doing on the FBP side for the last few years but for businesses that don't have a strong commercial finance function internally.

I'd really value 20 minutes to pick your brain, not a pitch, genuinely just curiosity about how businesses like yours think about bringing in external finance support and whether there's a moment in the calendar when that's useful. Would you be up for a quick call in the next couple of weeks?

Best,
Sarah`,
      platform_name: null,
      platform_url: null,
      profile_setup_guide: null,
      inbound_timing: null,
      post_draft: null,
      communities: null,
      first_contribution_prompt: null,
      tone_note:
        "Warm reconnect, not a sales pitch. Goal is information gathering and relationship reactivation. No assumptions about budget or need.",
      personalisation_instructions:
        "Replace [Name] with contact's first name. Replace [company] with their current employer. Choose someone you worked closely with and respect.",
    },
    follow_up_prompt:
      "Did you send it? If not, what stopped you? That answer is useful information about where the real barrier is.",
  },
  activation_plan: {
    summary:
      "Three parallel paths, Commercial Finance Consultancy, Fractional CFO, and Finance Function Transformation, tested through a structured 30-day programme. Shared credibility-building work front-loaded in Phase 1. Phase 2 runs strand-specific outreach. By Day 19, enough evidence to begin narrowing. By Day 30, at least one strand with a real conversation or meeting booked.",
    pacing_note:
      "You're currently employed full-time, so this plan is designed for 1–1.5 hours on weekday evenings and 3–4 hours on weekend days.",
    network_note:
      "Your network is medium-strength, the plan includes 10–12 total outreach actions distributed across strands.",
    phases: [
      {
        phase: "Phase 1, Shared Foundations",
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
                strand_id: "strand_1",
                task_type: "outreach",
                move_type: "direct",
                description:
                  "Send the first reconnect email (the canonical first move). Do not edit further. Send within the hour.",
                outreach_subtype: "warm",
                apollo_query: null,
                move: {
                  type: "direct",
                  format: "email_reconnect",
                  subject: "Reconnect, and something I'd value your view on",
                  draft: `Hi [Name],

It's been a while, I've been following your move to [company] with real interest.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role. Commercial finance and business case work, primarily, the kind of FBP work I've been doing but for businesses that don't have a strong commercial finance function internally.

I'd find it genuinely useful to get your perspective on how that kind of work gets bought in the mid-market. Would you have 20 minutes for a catch-up call in the next couple of weeks?

Best,
Sarah`,
                  platform_name: null,
                  platform_url: null,
                  profile_setup_guide: null,
                  inbound_timing: null,
                  post_draft: null,
                  communities: null,
                  first_contribution_prompt: null,
                  tone_note: "Warm, direct, no hedge language. Assumes collegiality. Goal is 20 minutes.",
                  personalisation_instructions:
                    "Use first name only. [Name] = someone you worked closely with for 1+ years. [company] = their current employer.",
                },
                outreach_draft: null,
              },
              {
                task_id: "1_2",
                strand_id: "shared",
                task_type: "admin",
                move_type: null,
                description:
                  "Update LinkedIn headline to: 'Commercial Finance | Business Case Development | Independent Advisory for PE-backed & Growth Businesses.' This is passive visibility, costs 5 minutes.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
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
                move_type: null,
                description:
                  "Write your one-sentence positioning statement (not a LinkedIn bio, a sentence you can say out loud). Record yourself saying it twice. Practise until it feels natural, not rehearsed.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
              },
              {
                task_id: "2_2",
                strand_id: "shared",
                task_type: "foundation",
                move_type: null,
                description:
                  "Build your short-form work story using the £38M digital transformation business case. Three sentences: (1) the challenge, (2) what you did, (3) the outcome. This is your credibility signal for 6 months.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
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
                strand_id: "strand_1",
                task_type: "research",
                move_type: null,
                description:
                  "Identify 3 warm contacts for Strand 1 (Commercial Finance Consultancy). Criteria: worked with you 1+ years, now in finance or commercial leadership, likely at PE-backed or growth-stage business.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
              },
              {
                task_id: "3_2",
                strand_id: "strand_2",
                task_type: "research",
                move_type: null,
                description:
                  "Identify 2 warm contacts for Strand 2 (Fractional CFO). Criteria: likely to know about CFO hiring, senior finance leadership roles, or have CFO peer network.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
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
                move_type: "direct",
                description:
                  "Send personalised reconnect emails to 2 of your 3 Strand 1 contacts. Goal: get 2–3 meetings on calendar by end of Phase 1.",
                outreach_subtype: "warm",
                apollo_query: null,
                move: {
                  type: "direct",
                  format: "email_reconnect",
                  subject: "[Name], catching up",
                  draft: `Hi [Name],

A while since we worked together [on X project/in Y function], you've clearly gone on to interesting things at [company].

I'm thinking about doing some independent commercial finance work, financial case-building and board-level storytelling, but for mid-market and PE-backed businesses that don't have that capability in-house.

I'd value your perspective. Not a pitch, genuine curiosity. Would 20 minutes on a call work in the next couple of weeks?

Best,
Sarah`,
                  platform_name: null,
                  platform_url: null,
                  profile_setup_guide: null,
                  inbound_timing: null,
                  post_draft: null,
                  communities: null,
                  first_contribution_prompt: null,
                  tone_note: "Reference specific shared context. Personal, not pitch-y.",
                  personalisation_instructions:
                    "Use specific project or context you worked on together. Use their first name.",
                },
                outreach_draft: null,
              },
            ],
          },
          {
            day: "Day 7",
            label: "Weekend day",
            time_required: "120 mins",
            time_allocation: { shared: "120 mins" },
            tasks: [
              {
                task_id: "7_1",
                strand_id: "shared",
                task_type: "admin",
                move_type: null,
                description:
                  "Create a one-page 'positioning for me' document covering all three strands: what you offer, who buys it, typical engagement size, typical fee. Conversation tool, not a formal proposal.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
              },
            ],
          },
        ],
      },
      {
        phase: "Phase 2, Strand Activation & Conversation",
        days: "Days 8–18",
        goal: "Convert warm contacts into meetings; gather market intelligence from each strand; activate referral network",
        strand_focus: "all_strands",
        days_detail: [
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
                move_type: "direct",
                description:
                  "First exploratory meeting from Phase 1 outreach. Prepare 2–3 open questions: 'When you need someone to do financial analysis on a major business decision, how do you typically handle that?'",
                outreach_subtype: "warm",
                apollo_query: null,
                move: null,
                outreach_draft: null,
              },
            ],
          },
        ],
      },
      {
        phase: "Phase 3, Evidence & Narrowing",
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
                task_type: "admin",
                move_type: null,
                description:
                  "Portfolio Review 1. Which strand felt most natural? Which generated the strongest external response? Which was hardest? Decide what to pause or narrow.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
              },
            ],
          },
        ],
      },
      {
        phase: "Phase 4, Focus & Acceleration",
        days: "Days 24–30",
        goal: "Concentrate effort on strongest strand(s); book first client meeting or engagement; prepare for Day 31",
        strand_focus: "focus_strands",
        days_detail: [
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
                move_type: null,
                description:
                  "30-day checkpoint: count your evidence. How many conversations? How many referrals? How many warm leads for the next 30 days? Document the baseline.",
                outreach_subtype: null,
                apollo_query: null,
                move: null,
                outreach_draft: null,
              },
            ],
          },
        ],
      },
    ],
    success_metric:
      "By Day 30: at least one strand with a booked exploratory meeting and 2–3 warm conversations active across the portfolio.",
  },
  traction_signals: [
    {
      strand_id: "strand_1",
      model_name: "Commercial Finance Consultancy",
      signals: [
        {
          signal: "FTSE 100 FBP background, automatic credibility with mid-market buyers",
          weight: "very_strong",
        },
        {
          signal: "£38M digital transformation business case, proof of board-ready analysis",
          weight: "very_strong",
        },
        {
          signal: "Informal advisory pattern (pricing pre-ExCo), evidence of trusted commercial judgement",
          weight: "strong",
        },
        {
          signal: "PE-backed businesses in your network (former colleagues who've moved), existing warm path",
          weight: "moderate",
        },
        {
          signal: "Weakness: no visible independent track record yet, requires trust-building via conversations",
          weight: "moderate",
        },
      ],
    },
    {
      strand_id: "strand_2",
      model_name: "Fractional CFO / Strategic Finance Director",
      signals: [
        {
          signal: "Board communication capability, core Fractional CFO requirement",
          weight: "very_strong",
        },
        {
          signal: "Strategic financial mindset demonstrated through commercial advisory work",
          weight: "strong",
        },
        {
          signal: "Weakness: no demonstrated history of running entire finance function independently",
          weight: "strong",
        },
        {
          signal: "Weakness: longer sales cycle and higher buyer trust threshold than Strand 1",
          weight: "moderate",
        },
      ],
    },
    {
      strand_id: "strand_3",
      model_name: "Finance Function Transformation Consultant",
      signals: [
        {
          signal: "Direct experience inside a well-structured FTSE 100 finance function, the product",
          weight: "very_strong",
        },
        {
          signal: "Seen process design, team structure, technology fit at scale",
          weight: "strong",
        },
        {
          signal: "Weakness: big consultancies dominate the enterprise end of this market",
          weight: "moderate",
        },
      ],
    },
  ],
  portfolio_review_guide: {
    review_1: {
      trigger_day: 19,
      questions: [
        "Which strand has felt most natural to pursue?",
        "Which has generated the strongest external response (meetings, referrals, follow-ups)?",
        "Which has been hardest to make progress on?",
        "Based on evidence so far, should any strand be paused or narrowed for Days 20–30?",
      ],
    },
    review_2: {
      trigger_day: 26,
      questions: [
        "Which strand do you want to concentrate on for Days 31–60?",
        "Has any strand produced a breakthrough signal since Review 1?",
        "Are you ready to pause the remaining strands, or do any deserve light continued effort?",
      ],
    },
  },
  network_toolkit: {
    intro:
      "These templates are conversation tools, not pitches. Use them to open warm conversations with people who already know you. Personalise every send.",
    templates: [
      {
        type: "reconnect_email",
        strand_id: "strand_1",
        use_case: "Reconnect with a former colleague now in a mid-market PE-backed business",
        subject: "Reconnect, and something I'd value your view on",
        content: `Hi [Name],

It's been a while, I've been following your move to [company] with real interest.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role. Commercial finance and business case work, the kind of FBP work I've been doing but for businesses that don't have a strong commercial finance function internally.

I'd find it genuinely useful to get your perspective. Would you have 20 minutes for a catch-up call in the next couple of weeks?

Best,
Sarah`,
      },
      {
        type: "linkedin_dm",
        strand_id: "strand_2",
        use_case: "Second-degree connection via mutual contact, Fractional CFO landscape",
        subject: null,
        content: `[Name], [mutual contact] mentioned you've been thinking about fractional leadership. I'm exploring this angle myself and would value 20 minutes to pick your brain about what's real and what's hype. Happy to share what I'm seeing too.

Sarah`,
      },
      {
        type: "referral_ask_email",
        strand_id: "strand_1",
        use_case: "After a genuine exploratory conversation, ask for warm referral",
        subject: "Really useful call, and a question for you",
        content: `[Name],

Really useful conversation yesterday, genuinely appreciate the time and your perspective.

One thing I'm trying to do is expand the number of conversations I'm having with people in similar positions to you, CFOs and commercial directors in PE-backed or growth businesses dealing with the kind of decisions we discussed.

Is there anyone in your network you think I should speak to? Not asking you to vouch for me commercially, just a warm intro if you think it's a useful conversation for them too.

Sarah`,
      },
      {
        type: "verbal_positioning_statement",
        strand_id: "strand_1",
        use_case: "In-person networking or phone conversation, frame what you do without slides",
        subject: null,
        content: `I'm a Finance Business Partner by background, most of my career in large financial services, working with senior leadership on commercial decisions: investment cases, pricing, financial analysis ahead of board presentations.

I'm now doing that work independently for mid-market and PE-backed businesses that need that capability on a project basis, rather than a full-time hire.

The moment I'm most useful is when they're heading into a board or investor meeting with a financial story that isn't quite holding together.`,
      },
    ],
  },
};

// ============================================================================
// SAMPLE_MARKET_SNAPSHOTS
// ============================================================================

export const SAMPLE_MARKET_SNAPSHOTS: Record<
  string,
  {
    strand_id: string;
    model_name: string;
    location: string;
    sections: MarketSnapshotOutput["sections"];
  }
> = {
  strand_1: {
    strand_id: "strand_1",
    model_name: "Commercial Finance Consultancy",
    location: "London / South East",
    sections: {
      demand_signal:
        "Strong. PE-backed mid-market businesses consistently cite inability to build credible financial cases for board decisions as a live problem. Finance directors in this segment are typically from accounting backgrounds, strong on reporting, weaker on commercial narrative. The gap your FBP background can fill is real and recurring.",
      pricing_benchmark:
        "£750–£900 per day for project-based work at your level and background. London premium applies. Rates above £950/day are achievable once you have 2–3 visible engagements. Starting below £700/day misaligns expectations with PE-backed buyers who equate rate with quality.",
      competitor_landscape:
        "The broad 'finance consultant' market is competitive. The narrow 'commercial finance / business case / board-level financial storytelling for PE-backed businesses' segment is significantly less crowded. Your positioning should be this specific.",
      market_entry_insight:
        "First 3–4 engagements almost always come via personal referral from trusted contacts. Inbound from LinkedIn requires visible track record first. The plan prioritises network activation over inbound marketing for the first 90 days.",
      honest_assessment:
        "The market supports this. The risk is not demand, it's distribution. This market does not advertise for what you do. First-client acquisition depends entirely on willingness to have Phase 1 conversations.",
    },
  },
  strand_2: {
    strand_id: "strand_2",
    model_name: "Fractional CFO / Strategic Finance Director",
    location: "London / South East",
    sections: {
      demand_signal:
        "Moderate to growing. Growth-stage and PE-backed businesses increasingly ask 'do we need a full-time CFO or can we hire fractional?' The category is real but not yet standardised, buyer language is inconsistent.",
      pricing_benchmark:
        "£4,000–£6,000 per month for 2–3 days per week. Typical engagement duration 6–12 months. Higher total annual income (£48k–£72k) but lower close rate and longer sales cycle than Strand 1.",
      competitor_landscape:
        "Emerging but competitive. Established fractional CFO platforms own the enterprise segment. Independent advisors compete on relationship and fit, not scale.",
      market_entry_insight:
        "Fractional CFO works best once you have demonstrated project-based success. Position it as 'next step after successful commercial finance projects' rather than 'starting point.'",
      honest_assessment:
        "Real and growing category, but you're entering at a disadvantage without independent track record. Recommend pursuing as a Year 2 target. Use Strand 1 to build proof.",
    },
  },
  strand_3: {
    strand_id: "strand_3",
    model_name: "Finance Function Transformation Consultant",
    location: "London / South East",
    sections: {
      demand_signal:
        "Strong but crowded. Mid-market businesses know their finance functions are behind. Demand is real. Challenge is competition, big consultancies own enterprise; mid-market (£20M–£150M) is more accessible but still competitive.",
      pricing_benchmark:
        "£700–£950 per day, typical engagement 3–6 months. Project-based pricing (£25k–£50k per engagement) is common. Longer sales cycle than Strand 1 because scope is larger and change management is slower.",
      competitor_landscape:
        "Competitive. Big consultancies dominate enterprise; mid-market is more accessible but has strong regional players. Differentiation on relationship, not brand.",
      market_entry_insight:
        "Entry is easier than enterprise consultancies require, but you need a clear point of view on what 'good' looks like in mid-market finance transformation. Your FTSE 100 experience is the point of view.",
      honest_assessment:
        "Real and accessible market, but requires longer-cycle sales and change management expertise. Engagements are sticky (3–6 months), good for income stability but slower to close. Parallel strand to Strand 1, not primary entry.",
    },
  },
};
