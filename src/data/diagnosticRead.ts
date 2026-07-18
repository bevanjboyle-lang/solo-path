/**
 * Free diagnostic — deterministic read assembler (C1.1, Option A).
 *
 * Design: admin/free-diagnostic-design.md (v 2026-06-01). The diagnostic asks
 * six structured questions (Q1, Q2, Q3, Q4, Q5, Q10 from src/data/questions.ts,
 * same ids and option values so answers carry forward into the questionnaire
 * draft) and assembles a partial "optionality read" from pre-written,
 * archetype-keyed copy. No LLM call on this surface: free traffic costs
 * nothing to serve and every sentence has been reviewed by a human.
 *
 * Shown in the free read (bible §7d discipline, design §6):
 *   identity, optionality signal, 2–3 transferable strengths, a directional
 *   statement that named routes exist, one honest blocker line.
 * Reserved for the full flow: the 10 named options, the hook insight, the
 *   first move, the 30-day plan.
 *
 * Copy rules (planning/anti-ai-voice-spec.md + tone of voice): no em dashes,
 * no "not X but Y" constructions, no adjective triplets, none of the Tier B1
 * vocabulary, UK English, concrete nouns, varied sentence rhythm.
 */

/** Question ids in src/data/questions.ts that the diagnostic asks. */
export const DIAGNOSTIC_QUESTION_IDS = {
  title: 1,
  years: 2,
  sector: 3,
  workType: 4,
  seniority: 5,
  confidence: 10,
} as const;

export interface DiagnosticAnswers {
  /** Q1 free text. */
  title: string;
  /** Q2 band, e.g. "8–12 years". */
  years: string;
  /** Q3 dropdown value, e.g. "Financial Services & Banking". */
  sector: string;
  /** Q4 single-select value, e.g. "Analysis and reporting". */
  workType: string;
  /** Q5 single-select value, e.g. "Senior Manager". */
  seniority: string;
  /** Q10 single-select value (full option string). */
  confidence: string;
}

export interface DiagnosticRead {
  /** Archetype-lite identity, lowercase-leading noun phrase ("the …"). */
  identity: string;
  /** How portable their value currently is. */
  signal: string;
  /** Three transferable strengths (two from work type, one from sector). */
  strengths: string[];
  /** Named-routes-exist statement pointing at the full read. */
  direction: string;
  /** One honest line on what holds this profile back + confidence close. */
  blocker: string;
}

/* ── Work types (Q4 values) ─────────────────────────────────────────────── */

const WT = {
  analysis: "Analysis and reporting",
  delivery: "Project delivery",
  governance: "Governance and compliance",
  operations: "Operations and process",
  advisory: "Consulting and advisory",
} as const;

type WorkTypeKey = keyof typeof WT;

function workTypeKey(value: string): WorkTypeKey {
  const found = (Object.keys(WT) as WorkTypeKey[]).find((k) => WT[k] === value);
  return found ?? "advisory";
}

/* ── Sectors (Q3 values) ────────────────────────────────────────────────── */

const SECTORS = [
  "Financial Services & Banking",
  "Consulting & Professional Services",
  "Technology & Digital",
  "Healthcare & Life Sciences",
  "Legal & Compliance",
  "Government & Public Sector",
  "Manufacturing & Engineering",
  "Retail & Consumer",
  "Other",
] as const;

type Sector = (typeof SECTORS)[number];

function sectorOrOther(value: string): Sector {
  return (SECTORS as readonly string[]).includes(value) ? (value as Sector) : "Other";
}

/** Short, prose-friendly sector phrases used inside sentences. */
const SECTOR_PHRASE: Record<Sector, string> = {
  "Financial Services & Banking": "financial services",
  "Consulting & Professional Services": "professional services",
  "Technology & Digital": "tech businesses",
  "Healthcare & Life Sciences": "healthcare and life sciences",
  "Legal & Compliance": "legal and regulated work",
  "Government & Public Sector": "the public sector",
  "Manufacturing & Engineering": "manufacturing and engineering",
  "Retail & Consumer": "retail and consumer businesses",
  "Other": "your sector",
};

/* ── Identity matrix: work type × sector ────────────────────────────────── */

const IDENTITY: Record<WorkTypeKey, Record<Sector, string>> = {
  analysis: {
    "Financial Services & Banking": "the analyst whose numbers hold up in a bank",
    "Consulting & Professional Services": "the analyst client teams build their case on",
    "Technology & Digital": "the analyst who makes data mean something commercially",
    "Healthcare & Life Sciences": "the evidence specialist in a clinical world",
    "Legal & Compliance": "the analyst who works at proof standard",
    "Government & Public Sector": "the analyst whose work survives public scrutiny",
    "Manufacturing & Engineering": "the analyst who can explain a physical business",
    "Retail & Consumer": "the analyst tuned to margin and demand",
    "Other": "the analyst who turns complexity into a usable answer",
  },
  delivery: {
    "Financial Services & Banking": "the delivery lead banks trust with regulated change",
    "Consulting & Professional Services": "the delivery lead who lands client work on the day it was promised",
    "Technology & Digital": "the delivery lead who ships technical change without drama",
    "Healthcare & Life Sciences": "the delivery lead who moves change through a clinical environment",
    "Legal & Compliance": "the delivery lead who gets regulated change signed off and shipped",
    "Government & Public Sector": "the delivery lead who lands programmes inside public machinery",
    "Manufacturing & Engineering": "the delivery lead who changes how things get made",
    "Retail & Consumer": "the delivery lead built for trading pace",
    "Other": "the delivery lead who gets change over the line",
  },
  governance: {
    "Financial Services & Banking": "the person who keeps a bank defensible",
    "Consulting & Professional Services": "the standards spine of a client business",
    "Technology & Digital": "the governance mind inside a move-fast business",
    "Healthcare & Life Sciences": "the safe pair of hands in a clinical world",
    "Legal & Compliance": "the compliance professional who works at proof standard",
    "Government & Public Sector": "the assurance mind public bodies lean on",
    "Manufacturing & Engineering": "the governance lead where safety is commercial",
    "Retail & Consumer": "the control mind inside a fast consumer business",
    "Other": "the person organisations trust to keep them defensible",
  },
  operations: {
    "Financial Services & Banking": "the operator who makes a bank actually run",
    "Consulting & Professional Services": "the operator behind the client promise",
    "Technology & Digital": "the operator who scales the machine",
    "Healthcare & Life Sciences": "the operator in a world where flow is patient care",
    "Legal & Compliance": "the operator who makes regulated work run to time",
    "Government & Public Sector": "the operator who makes public services deliver",
    "Manufacturing & Engineering": "the operator fluent in plant, process and supply",
    "Retail & Consumer": "the operator tuned to volume and margin",
    "Other": "the operator who fixes how work actually happens",
  },
  advisory: {
    "Financial Services & Banking": "the adviser banks bring their awkward problems to",
    "Consulting & Professional Services": "the adviser other advisers rate",
    "Technology & Digital": "the adviser who bridges technical and commercial",
    "Healthcare & Life Sciences": "the adviser fluent in clinical and commercial at once",
    "Legal & Compliance": "the adviser who works where rules meet risk",
    "Government & Public Sector": "the adviser who understands how the state buys",
    "Manufacturing & Engineering": "the adviser who talks operations and P&L in the same meeting",
    "Retail & Consumer": "the adviser tuned to consumer economics",
    "Other": "the adviser people check with before they decide",
  },
};

/* ── Optionality signal: work-type base + seniority overlay + years line ── */

const SIGNAL_BASE: Record<WorkTypeKey, (sectorPhrase: string) => string> = {
  analysis: (s) =>
    `Analytical work travels better than most careers. The modelling, the reporting cycles and the decision packs you produce inside ${s} are the same work smaller organisations buy by the day, because they need the output and cannot justify the headcount.`,
  delivery: (s) =>
    `Delivery experience converts directly. Organisations of every size have change they cannot land, and what they buy from outside is certainty: someone who has run the plan, held the suppliers and got a difficult programme over the line in ${s}.`,
  governance: (s) =>
    `Governance experience is scarcer on the open market than it feels from the inside. Every organisation above a certain size in ${s} carries obligations it must be able to evidence, and most below that size employ nobody who has actually run the controls.`,
  operations: (s) =>
    `Operational knowledge gets bought when things stop running: backlogs, error rates, handoffs that leak time and margin. You have spent years inside ${s} watching exactly where work breaks, and that diagnostic eye is the sellable asset.`,
  advisory: (s) =>
    `Advisory work is the shortest bridge from employment to independence, because the work itself barely changes. You already frame problems, make recommendations and defend them inside ${s}; the change is who sends the invoice.`,
};

const SENIORITY_OVERLAY: Record<string, string> = {
  Manager:
    "At manager level the capability is provable; what tends to be thin is the client-facing record, and that gap closes faster than most people expect once the first piece of work exists.",
  "Senior Manager":
    "Senior manager is the strongest band in the independent market: senior enough to be credible in the room, close enough to the work to do it yourself.",
  Director:
    "At director level buyers stop purchasing your hands and start purchasing your judgement, which changes what you can charge for.",
  "Head of":
    "Running a function means you have seen the whole machine, and whole-machine perspective is precisely what smaller organisations go to the market to borrow.",
  Partner:
    "At partner level the question is rarely credibility. It is which parts of your practice you would actually enjoy running for your own account.",
  Other:
    "Titles matter less out here than people fear. What buyers check is whether you have done the specific thing they need done.",
};

function yearsLine(years: string): string {
  if (years === "2–4 years") {
    return "Going independent this early is rarer, which cuts both ways: a shorter track record to sell, and far less professional identity to unwind.";
  }
  if (years === "5–7 years" || years === "8–12 years") {
    return "Your experience band sits where most UK day-rate work is actually bought.";
  }
  return "Depth like yours is the product. The risk is packaging it as general experience when the market pays for the specific thing you know.";
}

/* ── Strengths ──────────────────────────────────────────────────────────── */

const STRENGTHS_WORK: Record<WorkTypeKey, [string, string]> = {
  analysis: [
    "You turn ambiguous questions into structured, defensible answers, which is the shape of most paid analytical briefs.",
    "Your work survives being challenged. Buyers of analysis are paying to be safe when someone pushes back.",
  ],
  delivery: [
    "You make plans survive contact with reality, and that is what change budgets actually purchase.",
    "You can hold suppliers, stakeholders and dates in one head, a capability most small organisations have never had in-house.",
  ],
  governance: [
    "You can read a rulebook and turn it into something an organisation can actually run.",
    "You know what an auditor or regulator will ask before they ask it, and clients pay for that foresight by the day.",
  ],
  operations: [
    "You see where work leaks time and margin before anyone else in the room does.",
    "You can fix a process without breaking the people who run it, which is rarer than fixing the process.",
  ],
  advisory: [
    "You can walk into an unfamiliar situation and locate the real problem quickly.",
    "You make recommendations people act on, which is the entire test of paid advice.",
  ],
};

const STRENGTH_SECTOR: Record<Sector, string> = {
  "Financial Services & Banking":
    "You are fluent in a regulated, risk-priced environment, and smaller financial businesses cannot hire that fluency cheaply.",
  "Consulting & Professional Services":
    "You have watched professional work being sold from the inside, so the commercial mechanics of independence will feel familiar sooner than you expect.",
  "Technology & Digital":
    "You can speak technical and commercial in the same sentence, and that translation layer is one of the most reliably paid positions in the market.",
  "Healthcare & Life Sciences":
    "You understand a world where evidence and safety shape every decision, and outside advisers without that grounding get found out quickly.",
  "Legal & Compliance":
    "You work to proof standard, and clients with legal or regulatory exposure pay a premium for people who cannot be caught out.",
  "Government & Public Sector":
    "You know how public bodies decide, procure and account for money, which is a real barrier to entry for outsiders.",
  "Manufacturing & Engineering":
    "You understand physical operations and the true cost of downtime, knowledge that cannot be faked from a spreadsheet.",
  "Retail & Consumer":
    "You are tuned to margin and to how customers actually behave, which is the knowledge consumer businesses buy in when trading tightens.",
  "Other":
    "You carry sector knowledge a generalist would have to learn at the client's expense, and buyers can tell the difference.",
};

/* ── Direction: named routes exist ──────────────────────────────────────── */

const SENIORITY_RATE_PHRASE: Record<string, string> = {
  Manager: "solid mid-career",
  "Senior Manager": "senior",
  Director: "director-level",
  "Head of": "head-of-function",
  Partner: "partner-level",
  Other: "your level of",
};

const DIRECTION: Record<WorkTypeKey, (rate: string) => string> = {
  analysis: (r) =>
    `Named, priced routes exist for this profile. Independent analytical work is bought across the UK at ${r} rates, usually by organisations too small to keep the capability on payroll. The full read maps the specific routes against your answers and scores each one for fit.`,
  delivery: (r) =>
    `People with your profile run priced, repeatable independent practices in the UK right now, mostly around change their clients cannot staff. The full read names those routes at ${r} rates, scores the fit and shows where you would start.`,
  governance: (r) =>
    `A specific set of independent routes is built on governance experience, from fractional ownership of a compliance function to review work priced by the engagement, at ${r} rates. The full read names the ones that fit your answers and scores them.`,
  operations: (r) =>
    `Independent operators sell exactly this in the UK today, usually to organisations that can feel the leak but cannot diagnose it, at ${r} rates. The full read names the specific routes for your profile and scores the fit.`,
  advisory: (r) =>
    `The independent market for advisory work in your area is real and priced at ${r} rates, and the constraint is rarely demand. The full read names the routes that fit your answers, scores them and points at the first move.`,
};

/* ── Blocker + confidence close ─────────────────────────────────────────── */

const BLOCKER: Record<WorkTypeKey, string> = {
  analysis:
    "What tends to hold analysts back is pricing: selling hours instead of answers, and waiting to feel ready before letting anyone know they exist.",
  delivery:
    "What tends to hold delivery people back is underpricing certainty. The instinct is to quote for effort when the client is buying the outcome.",
  governance:
    "What tends to hold governance people back is waiting for permission. There is no sign-off process for backing yourself, and profiles like yours notice its absence.",
  operations:
    "What tends to hold operators back is invisibility. Inside an organisation the work speaks for itself; outside, someone has to say plainly what changed and what it was worth.",
  advisory:
    "What tends to hold advisers back is shape. The skill exists, but there is no named offer, no rate and no first client until someone writes them down.",
};

function confidenceClose(confidence: string): string {
  const level = confidence.toLowerCase().startsWith("low")
    ? "low"
    : confidence.toLowerCase().startsWith("high")
      ? "high"
      : "medium";
  if (level === "low") {
    return "You rated your confidence about independence as low. That is the median answer among people who later do it; the gap usually closes with specifics rather than reassurance.";
  }
  if (level === "high") {
    return "You rated your confidence as high, so direction is the missing piece. A named route with a first move converts readiness into motion.";
  }
  return "You rated your confidence as medium, which at this stage is well calibrated. The doubts are usually about specifics: what you would sell, to whom, and at what rate.";
}

/* ── Assemblers ─────────────────────────────────────────────────────────── */

export function assembleRead(a: DiagnosticAnswers): DiagnosticRead {
  const wt = workTypeKey(a.workType);
  const sector = sectorOrOther(a.sector);
  const sectorPhrase = SECTOR_PHRASE[sector];
  const overlay = SENIORITY_OVERLAY[a.seniority] ?? SENIORITY_OVERLAY.Other;
  const rate = SENIORITY_RATE_PHRASE[a.seniority] ?? SENIORITY_RATE_PHRASE.Other;

  return {
    identity: IDENTITY[wt][sector],
    signal: `${SIGNAL_BASE[wt](sectorPhrase)} ${overlay} ${yearsLine(a.years)}`,
    strengths: [...STRENGTHS_WORK[wt], STRENGTH_SECTOR[sector]],
    direction: DIRECTION[wt](rate),
    blocker: `${BLOCKER[wt]} ${confidenceClose(a.confidence)}`,
  };
}

/**
 * Minimal read for people who decline the email (design §5: soft prompt,
 * never a hard wall). Identity plus one signal line plus the funnel CTA.
 */
export function assembleGenericRead(a: DiagnosticAnswers): DiagnosticRead {
  const full = assembleRead(a);
  return {
    identity: full.identity,
    signal: SIGNAL_BASE[workTypeKey(a.workType)](SECTOR_PHRASE[sectorOrOther(a.sector)]),
    strengths: [],
    direction:
      "The full read names the independent routes that fit your profile and scores each one. Your six answers carry forward, so it starts where this left off.",
    blocker: "",
  };
}

/**
 * Plain-text snapshot for the nurture email merge field (Beehiiv custom
 * field, design §9 / nurture build note 3). Kept under 1,800 characters;
 * email 1 falls back to a link if the field is absent.
 */
export function readSnapshotText(read: DiagnosticRead, a: DiagnosticAnswers): string {
  const lines = [
    `YOUR READ: You read as ${read.identity}.`,
    "",
    `THE SIGNAL: ${read.signal}`,
    "",
    "WHAT TRAVELS:",
    ...read.strengths.map((s, i) => `${i + 1}. ${s}`),
    "",
    `WHERE IT POINTS: ${read.direction}`,
    "",
    `THE HONEST LINE: ${read.blocker}`,
    "",
    `(Answers: ${a.title || "role not given"} · ${a.years} · ${a.sector} · ${a.workType} · ${a.seniority})`,
  ];
  const text = lines.join("\n");
  return text.length > 1800 ? `${text.slice(0, 1797)}…` : text;
}
