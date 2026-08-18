// Phase B verification shots: CV-first diagnostic flow.
// Usage: node scripts/ui-audit-fonts.mjs && npx vite preview --port 4173 &
//        node scripts/phase-b-shots.mjs
import { chromium } from "playwright";

const OUT = "/home/claude/ui-audit/phase-b";
const CSID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const CV_EXTRACT = {
  cv_extract: {
    extracted_name: "Alex",
    current_job_title: "Senior Procurement Manager",
    years_experience: 14,
    sector_primary: "utilities",
    employer_org_type: "FTSE 250 energy supplier",
    type_of_work: "operations and process",
    seniority_level: "senior manager",
    career_highlights: [
      "Led category strategy for £120m of indirect spend.",
      "Built a supplier risk scoring model adopted group-wide.",
      "Procurement lead on a national smart metering rollout.",
    ],
    qualifications: ["CIPS"],
    per_field_confidence: {
      current_job_title: 95,
      years_experience: 88,
      sector_primary: 40,
      type_of_work: 82,
      seniority_level: 92,
    },
    parse_evidence: {
      years_experience: "2012 to present across three energy businesses",
      type_of_work: "Category strategy, supplier management and process ownership",
    },
  },
  cv_confidence_score: 84,
  ts: "2026-08-18T09:00:00.000Z",
};

const FULL_ANSWERS = {
  1: "Senior Procurement Manager",
  2: "13–18 years",
  3: "Manufacturing & Engineering",
  4: "Operations and process",
  5: "Senior Manager",
};

const FULL_ASKS = {
  situation: "Plateaued - the role still pays but has stopped going anywhere",
  appetite: "Advise - sell my judgement to organisations that need it",
  evidenceRecency: "This month",
  evidenceNote: "Finance director asked me to sanity-check a supplier exit plan",
};

const SERVER_READ = {
  archetype: {
    id: "ARCH_PROCUREMENT",
    name: "Strategic Procurement Director / Chief Procurement Officer",
    category: "Procurement & Supply Chain",
  },
  read: {
    identity: "a commercially fluent procurement adviser",
    signal:
      "You sit in a useful middle ground: senior enough to have led category strategy for £120m indirect spend, and close enough to the work to be asked to sanity-check a supplier exit plan this month. The strongest signal is advisory pull from finance and operations directors, plus a risk model that was adopted group-wide. That reads as portable judgement, not just internal process.",
    strengths: [
      "You have already translated procurement thinking into tools others used, via the group-wide supplier risk scoring model.",
      "You can win senior buy-in across functions, shown by strong stakeholder record with finance and operations directors and major grid contractor negotiations.",
    ],
    direction:
      "This points towards advisory work around procurement, supplier risk, category strategy and transformation support for mid-sized and larger organisations. The fit is strongest where commercial judgement, stakeholder alignment and market pattern recognition matter more than day-to-day buying admin.",
    blocker:
      "The weak spot is still execution detail: the archetype tends to be stronger on strategy and buy-in than on hands-on operational follow-through, which matters if the work becomes heavily process-led.",
  },
  evidence_signal: {
    title: "Sourcing and supplier risk work is being pulled forward",
    source_name: "Solo analysis",
    value_text: null,
    deadline: null,
    week_start: "2026-08-17",
  },
};

function seed(extra) {
  return (state) => {
    try {
      localStorage.setItem("solo_client_session_id", state.csid);
      if (state.cvExtract) {
        localStorage.setItem(`solo.cv_extract.${state.csid}`, JSON.stringify(state.cvExtract));
      }
      if (state.stored) {
        localStorage.setItem(`solo.diagnostic.${state.csid}`, JSON.stringify(state.stored));
      }
    } catch {}
  };
}

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });

async function shot(name, { viewport, mobile, state, path = "/diagnostic", scrollTo, actions }) {
  const c = await b.newContext({
    viewport,
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (state) await c.addInitScript(seed(), state);
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:4173${path}`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1600);
  if (actions) await actions(p);
  if (scrollTo === "bottom") {
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(400);
  } else if (typeof scrollTo === "number") {
    await p.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await p.waitForTimeout(400);
  }
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await c.close();
  console.log("shot:", name);
}

const D = { width: 1440, height: 900 };
const M = { width: 390, height: 844 };

// 1. CV opening move, fresh visitor
await shot("01-cv-stage-desktop", { viewport: D, state: { csid: CSID } });
await shot("02-cv-stage-mobile", { viewport: M, mobile: true, state: { csid: CSID } });

// 3. Confirm card: parsed CV, sector missing (auto-open), evidence quotes
await shot("03-confirm-desktop", {
  viewport: D,
  state: {
    csid: CSID,
    cvExtract: CV_EXTRACT,
    stored: { v: 2, path: "cv", answers: {}, asks: {}, variant: null, source: null, serverRead: null, emailCaptured: false, ts: "2026-08-18T09:00:00.000Z" },
  },
});
await shot("04-confirm-mobile", {
  viewport: M,
  mobile: true,
  state: {
    csid: CSID,
    cvExtract: CV_EXTRACT,
    stored: { v: 2, path: "cv", answers: {}, asks: {}, variant: null, source: null, serverRead: null, emailCaptured: false, ts: "2026-08-18T09:00:00.000Z" },
  },
});

// 5. Situation ask
await shot("05-ask-situation-desktop", {
  viewport: D,
  state: {
    csid: CSID,
    cvExtract: CV_EXTRACT,
    stored: { v: 2, path: "cv", answers: FULL_ANSWERS, asks: {}, variant: null, source: null, serverRead: null, emailCaptured: false, ts: "2026-08-18T09:00:00.000Z" },
  },
});

// 6. Evidence ask with chips + note
await shot("06-ask-evidence-desktop", {
  viewport: D,
  state: {
    csid: CSID,
    cvExtract: CV_EXTRACT,
    stored: { v: 2, path: "cv", answers: FULL_ANSWERS, asks: FULL_ASKS, variant: null, source: null, serverRead: null, emailCaptured: false, ts: "2026-08-18T09:00:00.000Z" },
  },
});

// 7. Capture screen (click Finish on evidence step)
await shot("07-capture-desktop", {
  viewport: D,
  state: {
    csid: CSID,
    cvExtract: CV_EXTRACT,
    stored: { v: 2, path: "cv", answers: FULL_ANSWERS, asks: FULL_ASKS, variant: null, source: null, serverRead: null, emailCaptured: false, ts: "2026-08-18T09:00:00.000Z" },
  },
  actions: async (p) => {
    try {
      await p.getByRole("button", { name: "Finish" }).click({ timeout: 3000 });
      await p.waitForTimeout(800);
    } catch {}
  },
});

// 8. Server read, desktop top + scrolled, then mobile
const READ_STORED = {
  v: 2,
  path: "cv",
  answers: FULL_ANSWERS,
  asks: FULL_ASKS,
  variant: "full",
  source: "server",
  serverRead: SERVER_READ,
  emailCaptured: true,
  ts: "2026-08-18T09:00:00.000Z",
};
await shot("08-read-server-desktop-top", { viewport: D, state: { csid: CSID, cvExtract: CV_EXTRACT, stored: READ_STORED } });
await shot("09-read-server-desktop-scrolled", { viewport: D, state: { csid: CSID, cvExtract: CV_EXTRACT, stored: READ_STORED }, scrollTo: 700 });
await shot("10-read-server-mobile", { viewport: M, mobile: true, state: { csid: CSID, cvExtract: CV_EXTRACT, stored: READ_STORED } });
await shot("11-read-server-mobile-signal", { viewport: M, mobile: true, state: { csid: CSID, cvExtract: CV_EXTRACT, stored: READ_STORED }, scrollTo: "bottom" });

// 12. Typed path, question 1
await shot("12-typed-q1-desktop", {
  viewport: D,
  state: {
    csid: CSID,
    stored: { v: 2, path: "typed", answers: {}, asks: {}, variant: null, source: null, serverRead: null, emailCaptured: false, ts: "2026-08-18T09:00:00.000Z" },
  },
});

await b.close();
console.log("phase-b shots done");
