export type QuestionType = "single" | "multi" | "text" | "dropdown";

export interface Question {
  id: number;
  text: string;
  subtext?: string;
  type: QuestionType;
  options?: string[];
  maxSelect?: number;
  placeholder?: string;
}

export const questions: Question[] = [
  {
    id: 1,
    text: "What is your current or most recent job title?",
    type: "text",
    placeholder: "e.g. Senior Manager, Risk Advisory",
  },
  {
    id: 2,
    text: "How many years of professional experience do you have in total?",
    type: "single",
    options: ["2–4 years", "5–7 years", "8–12 years", "13–18 years", "19+ years"],
  },
  {
    id: 3,
    text: "What is your primary sector?",
    type: "dropdown",
    options: [
      "Financial Services",
      "Consulting & Professional Services",
      "Technology",
      "Public Sector & NHS",
      "Industry & Manufacturing",
      "Retail & Consumer",
      "Other",
    ],
  },
  {
    id: 30,
    text: "Who do you work for?",
    subtext: "If you'd prefer not to name your employer, describe the type of organisation — for example: 'Big 4 risk advisory practice', 'FTSE100 retail bank', 'NHS acute trust', 'mid-market PE-backed manufacturing business', 'boutique M&A advisory firm'.",
    type: "text",
    placeholder: "e.g. Big 4 risk advisory practice",
  },
  {
    id: 4,
    text: "What best describes the type of work you do?",
    type: "single",
    options: [
      "Analysis and reporting",
      "Project delivery",
      "Governance and compliance",
      "Operations and process",
      "Consulting and advisory",
    ],
  },
  {
    id: 5,
    text: "What is your current seniority level?",
    type: "single",
    options: ["Manager", "Senior Manager", "Director", "Head of", "Partner", "Other"],
  },
  {
    id: 6,
    text: "Think of a specific piece of work in the last 2–3 years where you delivered something you're genuinely proud of.",
    subtext: "Describe it briefly: the situation, what you did, and the outcome.",
    type: "text",
    placeholder: "e.g. Led a regulatory remediation programme across 4 business lines, reducing risk exposure by 40% and preventing a £2M fine.",
  },
  {
    id: 7,
    text: "Have you ever found yourself advising colleagues, clients, or others informally on a professional topic — outside your official remit, just because they trusted your judgement?",
    subtext: "What was it, and how often does this happen?",
    type: "text",
    placeholder: "e.g. People regularly ask me to review their business cases before they go to the board, even though that's not my role.",
  },
  {
    id: 8,
    text: "What would your colleagues say you are best at?",
    type: "text",
    placeholder: "e.g. Cutting through complexity and explaining things clearly to senior stakeholders.",
  },
  {
    id: 9,
    text: "How urgent is it for you to have an independent income path in place?",
    type: "single",
    options: [
      "Low — this is long-term planning, no immediate pressure",
      "Medium — I'd like something in place within 6–12 months",
      "High — I need a realistic path within the next 3 months",
    ],
  },
  {
    id: 10,
    text: "How confident do you feel about the idea of working independently?",
    type: "single",
    options: [
      "Low — it feels unfamiliar and uncomfortable",
      "Medium — I can see it working but have real doubts",
      "High — I feel ready, I just need direction",
    ],
  },
  {
    id: 11,
    text: "Who are the 2–3 most relevant types of client, organisation, or sector you have worked with most closely?",
    subtext: "What do you know about how they operate — what they struggle with, how they buy external help, or what matters to them?",
    type: "text",
    placeholder: "e.g. NHS trusts going through CQC inspections — they tend to buy in bursts of urgency, through frameworks or warm referrals, and they respond to credibility over pitch decks.",
  },
  {
    id: 12,
    text: "Have you ever done any paid or unpaid independent work outside your main employment?",
    subtext: "Consulting, freelancing, advisory board roles, pro bono work, or any other independent contribution. If yes, describe it briefly.",
    type: "text",
    placeholder: "e.g. Done some pro bono work advising a charity on governance. No paid consulting yet.",
  },
  {
    id: 13,
    text: "How would you describe your professional network?",
    type: "single",
    options: [
      "Small — fewer than 50 relevant contacts I could actually reach out to",
      "Medium — 50–200 people I know reasonably well",
      "Large — 200+ contacts across multiple organisations and sectors",
    ],
  },
  {
    id: 14,
    text: "What is your current employment status?",
    type: "single",
    options: [
      "Employed full-time",
      "Employed part-time",
      "Currently between roles",
      "On a career break",
      "Already doing some independent work",
    ],
  },
  {
    id: 15,
    text: "Where are you based?",
    type: "text",
    placeholder: "e.g. Manchester, UK",
  },
];
