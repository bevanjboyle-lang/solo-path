// sampleReportData.ts
// Complete sample report data for the /sample-report page.
// Source: admin/sample-report-fbp.html (the full Sarah Okafor report).
// This file is imported by the SampleReport page and rendered using
// the same components that display a real user's report.

export const SAMPLE_PERSONA = {
  name: "Sarah Okafor",
  role: "Finance Business Partner",
  subtitle: "Senior commercial finance professional, 11 years' experience, financial services. Based in London.",
  sector: "Financial Services — FTSE 100 retail bank",
  seniority: "Senior Manager",
  income_urgency: "Medium — planning ahead",
  independence_confidence: "Low-medium",
};

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

export const SAMPLE_HOOK_INSIGHT = {
  headline:
    "Your most transferable skill isn't the Excel — it's that you can walk financial complexity into a room and hold the story under challenge.",
  body: "Mid-market businesses have finance managers who build the numbers. They rarely have anyone who can defend them commercially in front of a board. That specific gap — a business case-ready commercial thinker who can stand in front of a PE investor's questions and not fold — is your market entry point, and it doesn't require you to have an established independent track record to access it.",
  implication:
    "What this means practically: your first clients are not the ones advertising for finance consultants. They're PE-backed businesses between £20M and £100M revenue who are preparing for a board-level investment decision and suddenly realise their internal finance team can build the model but can't take the room. That specific moment — board prep, capital allocation, M&A business case — is where your phone rings. The rest of this plan is about making sure your phone is in the right people's contact lists before that moment arrives.",
};

export interface SampleOption {
  rank: number;
  title: string;
  recommended?: boolean;
  metrics: {
    day_rate: string;
    first_revenue: string;
    first_revenue_rating: "good" | "medium" | "hard";
    credibility_gap: string;
    credibility_gap_rating: "good" | "medium" | "hard";
    sales_complexity: string;
    sales_complexity_rating: "good" | "medium" | "hard";
  };
  what_selling: string[];
  assessment_title: string;
  assessment_points: string[];
}

export const SAMPLE_OPTIONS: SampleOption[] = [
  {
    rank: 1,
    title: "Commercial Finance Consultancy",
    recommended: true,
    metrics: {
      day_rate: "£750–£900",
      first_revenue: "3–5 months",
      first_revenue_rating: "good",
      credibility_gap: "Low",
      credibility_gap_rating: "good",
      sales_complexity: "Medium",
      sales_complexity_rating: "medium",
    },
    what_selling: [
      "Commercial finance partnership on a project or retainer basis — for businesses that lack a sophisticated commercial finance function but need one for a specific purpose. Investment case development, commercial modelling, board-level financial storytelling, CFO support ahead of a capital event.",
      "The buyer is the CFO or CEO of a business between £15M and £100M revenue. PE-backed businesses are the highest-probability segment: they face board scrutiny on financial decisions that their internal team isn't equipped to handle.",
    ],
    assessment_title: "Why this works for your profile",
    assessment_points: [
      "Your FTSE 100 FBP background is an automatic credibility signal to mid-market buyers who equate it with rigour",
      "You've done the exact work they need — the £38M digital transformation business case you described is directly analogous to what a PE-backed business would pay for",
      "The informal advisory pattern you described (pricing proposals pre-ExCo) demonstrates commercial judgment, not just technical finance",
      "Your financial services network includes people who now operate in mid-market businesses — your first clients are already in your contacts",
    ],
  },
  {
    rank: 2,
    title: "Fractional CFO / Strategic Finance Director",
    metrics: {
      day_rate: "£950–£1,200",
      first_revenue: "8–14 months",
      first_revenue_rating: "medium",
      credibility_gap: "Medium",
      credibility_gap_rating: "medium",
      sales_complexity: "High",
      sales_complexity_rating: "hard",
    },
    what_selling: [
      "Ongoing fractional senior finance leadership — 2–4 days per month — for businesses that are too large for a bookkeeper but too small for a full-time CFO. Covers financial reporting, board pack preparation, commercial oversight, and growth-stage financial strategy.",
    ],
    assessment_title: "What makes this harder for you right now",
    assessment_points: [
      'The title "Fractional CFO" requires buyers to believe you can run the entire finance function, not just one part of it',
      "Your FBP background is strong evidence for commercial judgment, less so for end-to-end financial leadership",
      "Better as a destination in 18–24 months, once you've built a track record via Option 1 engagements",
      "The higher rate is real, but the sales cycle is longer and buyer trust requirements are higher",
    ],
  },
  {
    rank: 3,
    title: "Commercial Finance Training & Facilitation",
    metrics: {
      day_rate: "£2,500–£4,000",
      first_revenue: "6–10 months",
      first_revenue_rating: "medium",
      credibility_gap: "Medium",
      credibility_gap_rating: "medium",
      sales_complexity: "Medium",
      sales_complexity_rating: "medium",
    },
    what_selling: [
      "Commercial finance workshops for management teams that are poor at reading, challenging, or presenting financial information. Audience: non-finance executives, commercial directors, operations leaders. Formats: half-day intensives, leadership team workshops, pre-board preparation sessions.",
    ],
    assessment_title: "Assessment",
    assessment_points: [
      "The day rate ceiling is higher, but you're trading time for money in a fundamentally different model — not scalable without a product",
      "Requires investment in a curriculum and positioning platform (LinkedIn presence, speaking, IP) before buyers find you",
      "Best as a complementary income stream to Option 1 — not as a primary path from standing start",
    ],
  },
];

export const SAMPLE_RECOMMENDATION = {
  headline:
    "Start with Commercial Finance Consultancy. Move toward Fractional CFO in 18–24 months.",
  paragraphs: [
    "Option 1 gives you the fastest credible path to first income from your current profile. The work is a direct translation of what you already do — you're not learning a new discipline, you're repackaging existing capability for a different type of buyer. Your FTSE 100 FBP background is a credibility asset in mid-market commercial finance, not a limitation.",
    "The strategic play is to build 3–4 project engagements with PE-backed or growth-stage businesses over the next 18 months, then reposition toward fractional CFO roles — where the ongoing retainer model delivers significantly higher income for less active sales effort. Option 1 builds the track record that makes Option 2 accessible.",
    "Option 3 should be introduced as a complementary offering once you have a professional platform — not pursued as a primary path before you have visible credibility and a network that can recommend you.",
  ],
  condition:
    "This recommendation rests on one critical condition: you are willing to make the first outreach calls while still employed. The financial risk is low — you have income — but the psychological barrier is real. The 30-day plan is designed specifically around that constraint.",
};

export const SAMPLE_REALITY_CHECK = [
  {
    label: "Biggest risk",
    type: "caution" as const,
    text: 'You will plan this in detail and then not send the first email. The psychological barrier between "I have a plan" and "I contacted someone" is where most professionals with your profile stop. This plan is engineered specifically to reduce that gap — but you have to make the call.',
  },
  {
    label: "Biggest advantage",
    type: "positive" as const,
    text: "Your FTSE 100 background is a shortcut past the credibility scrutiny that stops most early-stage independents. A mid-market CFO who has worked in large financial services will instinctively trust your rigour before you've said much. That trust is earned by where you've worked, not what you charge.",
  },
  {
    label: "Pricing reality",
    type: "caution" as const,
    text: "£750–£900/day is achievable for project work in London with PE-backed clients. The common mistake is undercharging in the first engagement because of uncertainty. Start at £750/day. Do not go below it for a genuine commercial client — it signals misalignment, not accessibility.",
  },
  {
    label: "Income timeline",
    type: "neutral" as const,
    text: "Assume 3–5 months from first contact to first paid engagement if you execute consistently. Slower if you wait for inbound interest. The difference is roughly: active outreach = Month 3–4, passive waiting = Month 8–12 (if ever). This plan assumes active outreach.",
  },
  {
    label: "What you'll need to do that feels uncomfortable",
    type: "neutral" as const,
    text: 'Tell people what you\'re doing. Not as a pitch — as a conversation. "I\'m thinking about taking on some independent work alongside my current role" is enough to start most relevant conversations. Most professionals delay this indefinitely. The 30-day plan builds this in from Day 1.',
  },
  {
    label: "Competitive position",
    type: "positive" as const,
    text: 'The London market for commercial finance consultants at your level is competitive at the generic level and uncrowded at the specific level. Most competitors pitch broad "finance transformation" or "FP&A advisory." Your PE-backed / business case / board-prep positioning is a narrower claim — and that narrowness is an advantage, not a constraint.',
  },
];

export const SAMPLE_FIRST_MOVE = {
  action:
    "Reconnect with a former colleague now operating in a mid-market PE-backed business",
  detail:
    "You've described working closely with PE-backed businesses through your bank's corporate relationships. Among your 200+ connections, there are almost certainly 2–3 former contacts who have moved from corporate financial services roles into senior finance or commercial positions at mid-market firms. This is the highest-probability first conversation for someone at your level — not a cold approach, not a pitch, just a reconnect with someone who knows your capabilities and is now in a position to either refer work or commission it.",
  why_first:
    "The instinct is to prepare more — update the LinkedIn, build a positioning document, research the market — before approaching anyone. Solo's data says this is where most people stall permanently. The truth is that your first conversation will teach you more about your market position than any amount of preparation, and a warm reconnect with a trusted contact is almost zero-risk. Nobody has ever lost a professional relationship by sending a thoughtful reconnect message.",
  draft_subject: "Reconnect — and a question for you",
  draft_body: `Hi [Name],

Hope you're well — it's been a while. I've been keeping up with what [company] has been doing, looks like a strong period for you all.

I'm at a point where I'm thinking seriously about doing some independent work alongside my current role — commercial finance and business case work, the kind of thing I've been doing on the FBP side for the last few years but for businesses that don't have a strong commercial finance function internally.

I'd really value 20 minutes to pick your brain — not a pitch, genuinely just curiosity about how businesses like yours think about bringing in external finance support and whether there's a moment in the calendar when that's useful. Would you be up for a quick call in the next couple of weeks?

Best,
Sarah`,
  follow_up:
    'Solo will follow up with you in 24 hours: "Did you send it? If not, what stopped you?" — that answer is useful information about where the real barrier is.',
};

export interface PlanTask {
  number: number;
  title: string;
  detail: string;
  tag: string;
  tag_type: "outreach" | "foundational" | "visibility" | "prep";
  outreach_draft?: string;
}

export interface PlanPhase {
  phase: number;
  title: string;
  days: string;
  tasks: PlanTask[];
}

export const SAMPLE_PLAN: PlanPhase[] = [
  {
    phase: 1,
    title: "Foundations & first contacts",
    days: "Days 1–8",
    tasks: [
      {
        number: 1,
        title: "Send the first reconnect message (above)",
        detail:
          "The contact you identified — a former colleague now in a PE-backed business. Do this today. The rest of Phase 1 follows from the responses you get.",
        tag: "Outreach",
        tag_type: "outreach",
      },
      {
        number: 2,
        title: "Write your one-sentence positioning statement",
        detail:
          'Not a LinkedIn bio. A sentence you can say out loud when someone asks what you\'re doing: "I\'m working with mid-market and PE-backed businesses on commercial finance — business cases, investment decisions, board-level financial analysis." Practise saying it without qualifications.',
        tag: "Foundational",
        tag_type: "foundational",
      },
      {
        number: 3,
        title: "Update LinkedIn headline to reflect independent positioning",
        detail:
          'Change from job-title language to buyer-facing language. Suggested: "Commercial Finance | Business Case Development | Independent Finance Advisory for PE-backed & Growth Businesses." This is passive visibility — it costs 10 minutes and starts working immediately.',
        tag: "Visibility",
        tag_type: "visibility",
      },
      {
        number: 4,
        title: "Identify 3 more warm contacts for the same reconnect",
        detail:
          "Using your connection list, identify 3 additional people in senior commercial or finance roles at mid-market businesses — former colleagues, former corporate banking relationships, or known contacts who have moved from large firms to smaller ones. Draft personalised versions of the reconnect message for each.",
        tag: "Preparation",
        tag_type: "prep",
        outreach_draft:
          '"[Name] — hope things are well. I\'ve been following your move to [company], looks like an interesting business. I\'m at a point where I\'m thinking about doing some independent commercial finance work — business cases, investment decisions, board prep. Would love to catch up briefly and pick your brain about how businesses in your space think about external finance support. 20 minutes on a call? Sarah"',
      },
      {
        number: 5,
        title: "Build your short-form work story",
        detail:
          'Based on the £38M digital transformation business case: a 3-sentence narrative that describes the challenge, what you did, and the outcome — in commercial terms. "A FTSE 100 business needed board approval for a £38M programme. I built the financial case, ran the scenario modelling, and presented the sensitivities directly to the board. It was approved on the first pass." This is your primary credibility signal for the first 6 months.',
        tag: "Foundational",
        tag_type: "foundational",
      },
    ],
  },
  {
    phase: 2,
    title: "Building presence & follow-through",
    days: "Days 9–19",
    tasks: [
      {
        number: 6,
        title: "Follow up on any non-responses from Phase 1 outreach",
        detail:
          'One short follow-up is appropriate and professional. "Just following up on my note — happy to keep it to 15 minutes if that\'s easier." The majority of positive responses come from follow-ups, not first messages.',
        tag: "Outreach",
        tag_type: "outreach",
      },
      {
        number: 7,
        title: "Publish one piece of professional content on LinkedIn",
        detail:
          'Not thought leadership. A specific, short observation from your current or recent work — something that would be genuinely useful to a CFO or commercial director. Suggested angle: "What a strong investment business case actually looks like in a board room — and what makes it fall apart under challenge." 200–300 words. No hashtag stacking.',
        tag: "Visibility",
        tag_type: "visibility",
      },
      {
        number: 8,
        title:
          "Have at least one exploratory conversation from Phase 1 outreach",
        detail:
          'This conversation has one job: to understand how this type of business currently handles the commercial finance work you do. Ask: "When you need someone to do the financial analysis for a major internal decision, how do you typically handle that?" and listen. Don\'t pitch. You\'ll learn more from this conversation than from 10 hours of market research.',
        tag: "Outreach",
        tag_type: "outreach",
      },
    ],
  },
  {
    phase: 3,
    title: "Converting conversations to engagements",
    days: "Days 20–30",
    tasks: [
      {
        number: 9,
        title:
          "Prepare a simple scope-of-work template for a first engagement",
        detail:
          'A one-page document covering: what you deliver, how you work, a typical engagement structure, and indicative investment. Not a formal proposal — a conversation tool. Having this ready means you can respond within 24 hours when a contact asks "what does working with you look like?"',
        tag: "Preparation",
        tag_type: "prep",
      },
      {
        number: 10,
        title:
          "Expand outreach to 3 new contacts identified via existing conversations",
        detail:
          'Ask in every Phase 2 conversation: "Is there anyone else in your network you think would find this kind of conversation useful?" A warm referral from a trusted contact converts at 3–5x the rate of a cold approach. Use the referral ask template from your Network Toolkit.',
        tag: "Outreach",
        tag_type: "outreach",
      },
    ],
  },
];

export interface NetworkTemplate {
  title: string;
  type: "Email" | "LinkedIn" | "Spoken";
  body: string[];
  note: string;
}

export const SAMPLE_NETWORK_TOOLKIT: NetworkTemplate[] = [
  {
    title: "Referral ask — from a trusted contact",
    type: "Email",
    body: [
      "Hi [Name],",
      "Really useful conversation — thank you for the time. One thing I'm trying to do at this stage is expand the number of conversations I'm having with people in similar positions to you — CFOs and commercial directors in PE-backed or growth businesses who are dealing with the kind of decisions we discussed.",
      "Is there anyone in your network you think I should speak to? Not asking you to vouch for me commercially — just a warm intro if you think it's a useful conversation for them too. I'd obviously return the favour if there's ever something I can help you think through.",
    ],
    note: "Use this only after a genuine conversation — not as a cold opener. The quality of the referral depends entirely on the quality of the relationship.",
  },
  {
    title: "Verbal positioning statement — for in-person",
    type: "Spoken",
    body: [
      '"I\'m a Finance Business Partner by background — most of my career has been in large financial services businesses, working with senior leadership on commercial decisions: investment cases, pricing decisions, financial analysis ahead of board presentations. I\'m now doing that work independently for mid-market businesses that need that capability on a project basis, rather than a full-time hire."',
      'If they say "what kind of businesses?" — "Mostly PE-backed, in the £20M–£100M revenue range. The moment I\'m most useful is when they\'re heading into a board or investor meeting with a financial story that isn\'t quite holding together yet."',
    ],
    note: 'Practise this until it sounds natural, not rehearsed. The specificity signals expertise. "Mid-market PE-backed" is more credible than "various businesses."',
  },
  {
    title: "LinkedIn DM — second-degree connection via mutual contact",
    type: "LinkedIn",
    body: [
      '"[Name] — [mutual contact] suggested I reach out. I\'m doing independent commercial finance work — business cases, investment decisions, board-level financial analysis — primarily with PE-backed businesses. [Mutual contact] mentioned you\'re doing interesting things at [company] and thought it might be a useful conversation. Happy to keep it short — 15 minutes on a call if you have time in the next few weeks? Sarah"',
    ],
    note: "The reference to the mutual contact goes in the first sentence, not as a footnote. It's the entire reason for the message.",
  },
  {
    title: "Reconnect email — former colleague, financial services background",
    type: "Email",
    body: [
      "Subject: Reconnect — and something I'd value your view on",
      '"Hi [Name], it\'s been a while — I\'ve been following your move to [company/role] with interest. I\'m at a point where I\'m thinking about doing some independent commercial finance work — business cases, investment decisions, the kind of FBP work I\'ve been doing but for businesses that don\'t have a strong commercial finance function. I\'d find it really useful to get your perspective on how that kind of work gets bought and who buys it. Would you have 20 minutes for a catch-up call in the next couple of weeks?"',
    ],
    note: "This is appropriate for anyone you've had a genuinely collegial relationship with. Not for people you've only briefly met.",
  },
];

export interface MarketItem {
  label: string;
  signal?: { text: string; level: "strong" | "moderate" | "weak" };
  headline?: string;
  text: string;
}

export const SAMPLE_MARKET_SNAPSHOT: MarketItem[] = [
  {
    label: "Demand signal",
    signal: { text: "Strong", level: "strong" },
    text: "London PE-backed mid-market businesses consistently cite inability to build credible financial cases for board decisions as a live problem. Finance directors in this segment are typically from accounting backgrounds — strong on reporting, weaker on commercial narrative. The gap Solo has identified is real and recurring.",
  },
  {
    label: "Pricing benchmark",
    headline: "£700–£950/day",
    text: "For project-based commercial finance work at senior manager level from a FTSE 100 background. London premium applies. Day rate above £950 is achievable once you have 2–3 visible engagements behind you. Starting below £700 is inadvisable — it misaligns expectations with PE buyers who equate rate with quality.",
  },
  {
    label: "Competitive landscape",
    signal: { text: "Moderate competition", level: "moderate" },
    text: 'The broad "finance consultant" market is competitive. The narrow "commercial finance / business case / board-level financial storytelling for PE-backed businesses" segment is significantly less crowded. Your positioning should be this specific — it is not a limitation, it is a signal.',
  },
  {
    label: "How buyers find you",
    headline: "Network, then LinkedIn",
    text: "In this market segment, the first 3–4 engagements almost always come through personal referrals from former colleagues or trusted contacts. Inbound from LinkedIn requires a visible track record first. The plan prioritises network activation over inbound marketing for the first 90 days.",
  },
  {
    label: "Market entry insight",
    text: 'The PE-backed segment buys external finance support before specific events: a board presentation, a capital raise, an M&A transaction, a refinancing. Your outreach should be calibrated to these moments — not "do you need a finance consultant" but "I work with businesses in the run-up to board-level financial decisions."',
  },
  {
    label: "Honest assessment",
    signal: { text: "Good odds, active required", level: "moderate" },
    text: "The market supports this at your level. The risk is not demand — it's distribution. This market does not advertise for what you do. You will not find it on job boards or procurement portals. First-client acquisition depends entirely on your willingness to have the conversations in Phase 1.",
  },
];

export const SAMPLE_AI_IMPACT = {
  current_role: {
    risk_level: 3, // out of 5
    headline: "Moderate — 3–5 year horizon",
    text: "Standard FBP reporting, variance analysis, and model maintenance are being automated in the large-bank context. The role is bifurcating: highly automated at the data layer, highly valued at the insight and influence layer. Your profile sits firmly in the second bucket. The risk is to the junior FBP population, not to you specifically.",
  },
  plan_b: {
    risk_level: 2, // out of 5 (lower = more resilient)
    headline: "High — board communication is AI-hard",
    text: "What you're selling — the ability to hold a financial story together in a room under challenge from a board or PE investor — is precisely what AI cannot replace. The model can build the numbers. It cannot answer the challenging question that was not anticipated in the slides. Your value is in the room.",
  },
  adaptation: {
    headline: "Use AI to expand capacity, not compete with it",
    text: "AI tools can produce first-draft financial models, scenario summaries, and presentation materials in a fraction of the time. The adaptation play is to use these tools to take on more engagements or higher-complexity work, rather than treating them as a threat. Your intellectual value comes at the stage AI cannot reach.",
    tools: [
      "Financial Modelling AI (Causal)",
      "Deck generation (Gamma)",
      "Research synthesis (Perplexity Pro)",
      "Meeting prep (Otter.ai)",
    ],
  },
};
