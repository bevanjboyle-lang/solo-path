export type QuestionType = "single" | "multi" | "text" | "dropdown";

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options?: string[];
  maxSelect?: number;
  placeholder?: string;
}

export const questions: Question[] = [
  {
    id: 1,
    text: "What best describes your primary professional background?",
    type: "single",
    options: [
      "Risk, Audit or Compliance",
      "Finance or Commercial",
      "Strategy or Management Consulting",
      "Programme, Delivery or PMO",
      "Operations or Process Improvement",
    ],
  },
  {
    id: 2,
    text: "What is your current seniority level?",
    type: "single",
    options: [
      "Senior Manager",
      "Manager",
      "Director",
      "Partner / VP / C-Suite",
      "Other",
    ],
  },
  {
    id: 3,
    text: "How many years of professional experience do you have?",
    type: "single",
    options: ["5–7 years", "8–12 years", "13–20 years", "20+ years"],
  },
  {
    id: 4,
    text: "What type of organisation have you primarily worked in?",
    type: "single",
    options: [
      "Large corporate (1,000+ employees)",
      "Big Four / Top-tier professional services",
      "Mid-size firm (100–999 employees)",
      "Public sector or regulated industry",
      "Mix of the above",
    ],
  },
  {
    id: 5,
    text: "Which of these best describes work you have done?",
    type: "multi",
    maxSelect: 3,
    options: [
      "Managed compliance or regulatory risk",
      "Built or improved financial models and forecasts",
      "Led or governed transformation programmes",
      "Designed or improved business processes",
      "Advised boards or senior leadership",
      "Delivered consulting or advisory engagements",
      "Managed external audits or assurance reviews",
      "Built or led teams through change",
    ],
  },
  {
    id: 6,
    text: "Which industries do you have the most experience in?",
    type: "multi",
    maxSelect: 3,
    options: [
      "Financial services",
      "Professional services",
      "Retail or consumer",
      "Technology",
      "Healthcare or life sciences",
      "Energy or infrastructure",
      "Public sector",
      "Manufacturing or logistics",
      "Other",
    ],
  },
  {
    id: 7,
    text: "How would you describe your reputation and credibility in your field?",
    type: "single",
    options: [
      "Well-known and respected in my specialism",
      "Solid reputation within my organisation",
      "Respected but not widely known outside",
      "Still building my reputation",
      "Unsure",
    ],
  },
  {
    id: 8,
    text: "What is your main motivation for wanting a Plan B right now?",
    type: "single",
    options: [
      "I'm worried my role may be affected by AI or automation",
      "I want more control over my income and working life",
      "I'm thinking about a voluntary transition to independence",
      "I've already been made redundant or am in notice",
      "I'm exploring options before making a decision",
      "Other",
    ],
  },
  {
    id: 9,
    text: "How comfortable are you with business development and selling?",
    type: "single",
    options: [
      "Very comfortable — I've done it and enjoy it",
      "Somewhat comfortable — I've done some but it's not natural",
      "Not comfortable — I'd rather let my work speak for itself",
      "Very uncomfortable — the idea of selling myself feels difficult",
    ],
  },
  {
    id: 10,
    text: "What kind of solo business model sounds most appealing to you?",
    type: "single",
    options: [
      "Project-based advisory or consulting",
      "Ongoing retainer / fractional role",
      "Interim or contract work",
      "Training, workshops or group programmes",
      "A mix — I'm open",
    ],
  },
  {
    id: 11,
    text: "Who are the 2-3 most relevant types of client, organisation, or sector you have worked with most closely? What do you know about how they operate - what they struggle with, how they buy external help, or what matters to them?",
    type: "text",
    placeholder: "e.g. Mid-size retail brands struggling with digital transformation, buying help through procurement...",
  },
  {
    id: 12,
    text: "Have you ever done any paid or unpaid independent work outside your main employment - consulting, freelancing, advisory board roles, pro bono work, or any other independent contribution? If yes, describe it briefly.",
    type: "text",
    placeholder: "e.g. I advised a startup on compliance frameworks for 6 months on a freelance basis...",
  },
  {
    id: 13,
    text: "How would you describe your current professional network?",
    type: "single",
    options: [
      "Strong — 100+ relevant contacts, relationships are recent and warm",
      "Medium — 50–100 contacts, a mix of warm and cooler relationships",
      "Modest — under 50 relevant contacts, or relationships have gone cold",
      "Weak — I don't have a strong professional network right now",
    ],
  },
  {
    id: 14,
    text: "What is your current employment situation?",
    type: "single",
    options: [
      "Employed full-time and not actively looking to leave yet",
      "In notice period or recently left",
      "Unemployed and actively looking for a new path",
      "Part-time or on a career break",
      "Other",
    ],
  },
  {
    id: 15,
    text: "Where are you based?",
    type: "text",
    placeholder: "e.g. London, UK or Manchester, UK",
  },
];
