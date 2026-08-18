import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { questions } from "@/data/questions";
import {
  APPETITE_OPTIONS,
  DiagnosticAsks,
  DiagnosticProfile,
  DiagnosticRead,
  EVIDENCE_RECENCY_OPTIONS,
  SITUATION_OPTIONS,
  assembleGenericReadFromProfile,
  assembleReadFromAsks,
  optionTitle,
  readSnapshotText,
} from "@/data/diagnosticRead";
import {
  DiagnosticServerRead,
  cvSummaryFromExtract,
  fetchDiagnosticServerRead,
  raceWithTimeout,
} from "@/lib/diagnosticServerRead";
import { getClientSessionId } from "@/lib/clientSession";
import { readCvPrefill } from "@/lib/cvPrefill";
import { trackFunnelEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import ProgressHeader from "@/components/ProgressHeader";
import SoloLogo from "@/components/SoloLogo";
import CVUploadZone from "@/components/CVUploadZone";

/*
 * /diagnostic v2 — the free diagnostic, CV-first (Phase B, 2026-08-18;
 * blueprint Move 3 at admin/first-principles-product-blueprint-2026-08-18.md).
 *
 * The CV drop is the opening move: parse-cv extracts the profile, a
 * confirmation card replaces five typed questions, and the person answers
 * only the three things no CV can say (situation, appetite, evidence of
 * external pull). No CV to hand → the five typed steps remain. The retired
 * Q10 confidence question is gone.
 *
 * The read: for email-captured visitors the diagnostic-read edge function
 * classifies them against the 95-archetype catalogue and composes a read
 * grounded in the knowledge bank, with one live Radar signal attached. The
 * call starts when the last ask is answered and is raced against a timeout
 * at reveal, so it runs while they type their email. Any failure falls back
 * to the deterministic read from src/data/diagnosticRead.ts; this surface
 * never hard-fails. The no-email variant stays deterministic and shorter.
 *
 * Carry-forward: profile answers merge into solo.qdraft.{csid} (ids 1–5, 30),
 * and the asks seed Q7 (informal advisory), Q9 (urgency) and Q10 (confidence)
 * so the questionnaire starts warm.
 *
 * Events: diagnostic_started, diagnostic_cv_uploaded, diagnostic_cv_confirmed,
 * diagnostic_completed, diagnostic_email_captured, diagnostic_read_viewed,
 * diagnostic_to_questionnaire (track-event v2 allowlist).
 */

const PROFILE_IDS = [1, 2, 3, 4, 5] as const;

const PROFILE_ROWS: { id: number; label: string }[] = [
  { id: 1, label: "Title" },
  { id: 2, label: "Experience" },
  { id: 3, label: "Sector" },
  { id: 4, label: "Type of work" },
  { id: 5, label: "Seniority" },
];

const CV_STEP_LABELS = ["CV", "Confirm", "Context", "Appetite", "Evidence", "Read"];
const TYPED_STEP_LABELS = [
  "Title",
  "Years",
  "Sector",
  "Work",
  "Level",
  "Context",
  "Appetite",
  "Evidence",
  "Read",
];

type Stage = "cv" | "confirm" | "questions" | "asks" | "capture" | "read";
type Path = "cv" | "typed";
type ReadSource = "server" | "deterministic";

interface StoredDiagnostic {
  v: 2;
  path: Path | null;
  answers: Record<number, string>;
  asks: Partial<DiagnosticAsks>;
  variant: "full" | "generic" | null;
  source: ReadSource | null;
  serverRead: DiagnosticServerRead | null;
  emailCaptured: boolean;
  ts: string;
}

function diagnosticKey(): string {
  return `solo.diagnostic.${getClientSessionId()}`;
}

function loadStored(): StoredDiagnostic | null {
  try {
    const raw = localStorage.getItem(diagnosticKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDiagnostic;
    if (!parsed || typeof parsed !== "object" || parsed.v !== 2 || !parsed.answers) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(next: StoredDiagnostic): void {
  try {
    localStorage.setItem(diagnosticKey(), JSON.stringify(next));
  } catch {
    /* best-effort */
  }
}

function readRawExtract(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(`solo.cv_extract.${getClientSessionId()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cv_extract?: Record<string, unknown> } | null;
    return parsed?.cv_extract && typeof parsed.cv_extract === "object" ? parsed.cv_extract : null;
  } catch {
    return null;
  }
}

function toProfile(answers: Record<number, string>): DiagnosticProfile {
  return {
    title: answers[1] ?? "",
    years: answers[2] ?? "8–12 years",
    sector: answers[3] ?? "Other",
    workType: answers[4] ?? "Consulting and advisory",
    seniority: answers[5] ?? "Other",
  };
}

function profileComplete(answers: Record<number, string>): boolean {
  return PROFILE_IDS.every((id) => typeof answers[id] === "string" && answers[id].trim().length > 0);
}

function asksComplete(asks: Partial<DiagnosticAsks>): asks is DiagnosticAsks {
  return (
    typeof asks.situation === "string" &&
    asks.situation.length > 0 &&
    typeof asks.appetite === "string" &&
    asks.appetite.length > 0 &&
    typeof asks.evidenceRecency === "string" &&
    asks.evidenceRecency.length > 0
  );
}

const Q9_BY_SITUATION: Record<string, string> = {
  "Already decided": "High - I need a realistic path within the next 3 months",
  "Restructuring noise": "Medium - I'd like something in place within 6–12 months",
  "Plateaued": "Medium - I'd like something in place within 6–12 months",
  "Just measuring": "Low - this is long-term planning, no immediate pressure",
};

/**
 * Merge the diagnostic into the questionnaire draft so /questionnaire
 * restores it via its existing loadDraftAnswers path. Profile ids verbatim;
 * the asks seed Q7 (informal advisory, only when there is real signal),
 * Q9 (urgency from situation) and Q10 (confidence: High when the decision
 * is made, the median Medium otherwise). Everything stays editable there.
 */
function writeQuestionnaireDraft(answers: Record<number, string>, asks: Partial<DiagnosticAsks>): void {
  try {
    const key = `solo.qdraft.${getClientSessionId()}`;
    let existing: Record<string, unknown> = {};
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") existing = parsed as Record<string, unknown>;
      } catch {
        /* corrupt draft: overwrite */
      }
    }
    for (const id of PROFILE_IDS) {
      const v = answers[id];
      if (typeof v === "string" && v.trim()) existing[String(id)] = v;
    }
    const employer = readCvPrefill().answers[30];
    if (typeof employer === "string" && employer.trim() && !existing["30"]) existing["30"] = employer;

    const recency = asks.evidenceRecency ?? "";
    if (recency && recency !== "Honestly, can't recall" && !existing["7"]) {
      const when = recency.toLowerCase();
      existing["7"] = asks.evidenceNote?.trim()
        ? `Yes. Most recently (${when}): ${asks.evidenceNote.trim()}`
        : `Yes. Most recently ${when}, someone outside my reporting line came to me for my take.`;
    }
    const situationTitle = asks.situation ? optionTitle(asks.situation) : "";
    if (situationTitle && !existing["9"] && Q9_BY_SITUATION[situationTitle]) {
      existing["9"] = Q9_BY_SITUATION[situationTitle];
    }
    if (situationTitle && !existing["10"]) {
      existing["10"] =
        situationTitle === "Already decided"
          ? "High - I feel ready, I just need direction"
          : "Medium - I can see it working but have real doubts";
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    /* best-effort */
  }
}

/* ── Small presentational pieces (register: FT/Economist, hairlines, mint) ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-[#15735F] mr-3 tabular-nums">01</span>
      {children}
    </div>
  );
}

function StepEyebrow({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
      <span className="text-foreground">{label}</span>
      {meta && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground tabular-nums">{meta}</span>
        </>
      )}
    </div>
  );
}

/** Single-select option stack, same visual grammar as the questionnaire. */
function OptionStack({
  options,
  value,
  onSelect,
  compact,
}: {
  options: readonly string[];
  value?: string;
  onSelect: (v: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const selected = value === opt;
        const dashIdx = opt.indexOf(" - ");
        const title = dashIdx >= 0 ? opt.slice(0, dashIdx) : opt;
        const desc = dashIdx >= 0 ? opt.slice(dashIdx + 3) : null;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`relative text-left flex items-start gap-5 border transition-colors group ${
              compact ? "px-4 py-3" : "px-5 py-4 sm:px-6 sm:py-5"
            } ${
              selected
                ? "border-primary bg-gradient-to-r from-primary/[0.06] to-transparent"
                : "border-border bg-white hover:border-foreground/30"
            }`}
          >
            <span
              className={`text-[11px] font-semibold tabular-nums tracking-[0.1em] pt-0.5 shrink-0 ${
                selected ? "text-[#15735F]" : "text-muted-foreground/60 group-hover:text-muted-foreground"
              }`}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0">
              <span className={`block font-medium text-foreground leading-snug ${compact ? "text-[14px]" : "text-[15px]"}`}>
                {title}
              </span>
              {desc && !compact && (
                <span className="mt-0.5 block text-[13px] text-muted-foreground leading-snug">{desc}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RuleHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground border-t border-border pt-5">
      {children}
    </h3>
  );
}

function ChipRow({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`px-4 py-2.5 text-[13.5px] font-medium border transition-colors ${
              selected
                ? "border-primary text-[#15735F] bg-gradient-to-r from-primary/[0.07] to-transparent"
                : "border-border bg-white text-foreground hover:border-foreground/30"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── The three asks (Phase B copy; full option strings travel to the server) ── */

interface AskDef {
  key: "situation" | "appetite" | "evidence";
  eyebrow: string;
  text: string;
  aside: string;
}

const ASKS: AskDef[] = [
  {
    key: "situation",
    eyebrow: "Context",
    text: "What's behind this, today?",
    aside: "No CV can answer these three. They shape the read more than any job title does.",
  },
  {
    key: "appetite",
    eyebrow: "Appetite",
    text: "If income were covered for a year, which would you choose to do?",
    aside: "Ignore feasibility for a moment. This is about the shape of work you would pick, and it steers which routes the read weighs.",
  },
  {
    key: "evidence",
    eyebrow: "Evidence",
    text: "When did someone outside your reporting line last come to you for your take?",
    aside: "Not a task handed down. Someone choosing to ask you. It is the earliest evidence that your judgement already has a market.",
  },
];

export default function Diagnostic() {
  const navigate = useNavigate();
  const stored = useMemo(loadStored, []);
  const initialPrefill = useMemo(() => readCvPrefill(), []);

  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    if (stored?.answers && Object.keys(stored.answers).length > 0) return stored.answers;
    const fromCv: Record<number, string> = {};
    for (const id of PROFILE_IDS) {
      const v = initialPrefill.answers[id];
      if (typeof v === "string") fromCv[id] = v;
    }
    return fromCv;
  });
  const [asks, setAsks] = useState<Partial<DiagnosticAsks>>(() => stored?.asks ?? {});
  const [path, setPath] = useState<Path | null>(() => stored?.path ?? null);
  const [stage, setStage] = useState<Stage>(() => {
    if (stored?.variant) return "read";
    if (!stored?.path) return "cv";
    if (!profileComplete(stored.answers)) return stored.path === "cv" ? "confirm" : "questions";
    if (!asksComplete(stored.asks ?? {})) return "asks";
    return "asks";
  });
  const [variant, setVariant] = useState<"full" | "generic" | null>(stored?.variant ?? null);
  const [source, setSource] = useState<ReadSource | null>(stored?.source ?? null);
  const [serverRead, setServerRead] = useState<DiagnosticServerRead | null>(stored?.serverRead ?? null);
  const [emailCaptured, setEmailCaptured] = useState<boolean>(stored?.emailCaptured ?? false);

  const [qStep, setQStep] = useState(() => {
    for (let i = 0; i < PROFILE_IDS.length; i++) {
      const v = (stored?.answers ?? {})[PROFILE_IDS[i]];
      if (!(typeof v === "string" && v.trim())) return i;
    }
    return 0;
  });
  const [askStep, setAskStep] = useState(() => {
    const a = stored?.asks ?? {};
    if (!a.situation) return 0;
    if (!a.appetite) return 1;
    return 2;
  });

  const [email, setEmail] = useState("");
  const [captureStatus, setCaptureStatus] = useState<"idle" | "loading" | "error">("idle");
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  const [parseState, setParseState] = useState<"idle" | "parsing" | "failed">("idle");
  const [cvEvidence, setCvEvidence] = useState<Record<number, string>>(initialPrefill.evidence);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [cvConfidence, setCvConfidence] = useState<number | null>(null);

  const startedFired = useRef(false);
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPromise = useRef<Promise<DiagnosticServerRead | null> | null>(null);

  const hasEarlierExtract = useMemo(
    () => stage === "cv" && readRawExtract() !== null && Object.keys(initialPrefill.answers).length > 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (startedFired.current) return;
    startedFired.current = true;
    if (!stored?.variant) trackFunnelEvent("diagnostic_started");
  }, [stored]);

  useEffect(() => {
    if (stage !== "read" || !variant) return;
    trackFunnelEvent("diagnostic_read_viewed", { variant, source: source ?? "deterministic" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, variant]);

  useEffect(() => {
    return () => {
      if (parseTimer.current) clearTimeout(parseTimer.current);
    };
  }, []);

  // Entering the confirm card: open the first missing row for editing.
  useEffect(() => {
    if (stage !== "confirm") return;
    const missing = PROFILE_IDS.find((id) => !(answers[id] ?? "").trim());
    setEditingRow(missing ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const profile = toProfile(answers);

  function persist(patch: Partial<StoredDiagnostic>): void {
    saveStored({
      v: 2,
      path,
      answers,
      asks,
      variant,
      source,
      serverRead,
      emailCaptured,
      ts: new Date().toISOString(),
      ...patch,
    });
  }

  /* ── CV stage handlers ── */

  function handleUploadStarted(): void {
    if (parseTimer.current) clearTimeout(parseTimer.current);
    setParseState("parsing");
    parseTimer.current = setTimeout(() => {
      setParseState((s) => (s === "parsing" ? "failed" : s));
    }, 30000);
  }

  function handleExtractComplete(
    extract: Record<string, unknown>,
    confidenceScore?: number,
    uploaded?: boolean
  ): void {
    if (parseTimer.current) clearTimeout(parseTimer.current);
    try {
      localStorage.setItem(
        `solo.cv_extract.${getClientSessionId()}`,
        JSON.stringify({
          cv_extract: extract,
          cv_confidence_score: confidenceScore,
          cv_uploaded: uploaded,
          ts: new Date().toISOString(),
        })
      );
    } catch {
      /* best-effort */
    }
    const prefill = readCvPrefill();
    setCvEvidence(prefill.evidence);
    setCvConfidence(typeof confidenceScore === "number" ? confidenceScore : null);
    const nextAnswers = { ...answers };
    for (const id of PROFILE_IDS) {
      const v = prefill.answers[id];
      if (typeof v === "string" && v.trim()) nextAnswers[id] = v;
    }
    setAnswers(nextAnswers);
    setParseState("idle");
    setPath("cv");
    setStage("confirm");
    persist({ path: "cv", answers: nextAnswers });
    trackFunnelEvent("diagnostic_cv_uploaded", {
      ...(typeof confidenceScore === "number" ? { confidence: confidenceScore } : {}),
    });
  }

  function useEarlierExtract(): void {
    setPath("cv");
    setStage("confirm");
    persist({ path: "cv" });
  }

  function chooseTyped(): void {
    setPath("typed");
    setStage("questions");
    setQStep(() => {
      for (let i = 0; i < PROFILE_IDS.length; i++) {
        if (!(answers[PROFILE_IDS[i]] ?? "").trim()) return i;
      }
      return 0;
    });
    persist({ path: "typed" });
  }

  /* ── Confirm card handlers ── */

  function setRowValue(id: number, v: string): void {
    setAnswers((prev) => {
      const next = { ...prev, [id]: v };
      saveStored({
        v: 2,
        path,
        answers: next,
        asks,
        variant,
        source,
        serverRead,
        emailCaptured,
        ts: new Date().toISOString(),
      });
      return next;
    });
    if (id !== 1) {
      // Selects close on choice and hand focus to the next missing row.
      setEditingRow((current) => {
        const after = { ...answers, [id]: v };
        const missing = PROFILE_IDS.find((pid) => pid !== id && !(after[pid] ?? "").trim());
        return missing ?? (current === id ? null : current);
      });
    }
  }

  function confirmProfile(): void {
    if (!profileComplete(answers)) return;
    trackFunnelEvent("diagnostic_cv_confirmed", {
      sector: profile.sector,
      seniority: profile.seniority,
      work_type: profile.workType,
    });
    setStage("asks");
    setAskStep(0);
  }

  /* ── Typed questions handlers ── */

  const currentQuestionId = PROFILE_IDS[Math.min(qStep, PROFILE_IDS.length - 1)];
  const currentQuestion = questions.find((q) => q.id === currentQuestionId);
  const currentValue = answers[currentQuestionId] ?? "";
  const qStepValid = typeof currentValue === "string" && currentValue.trim().length > 0;

  function setTypedAnswer(v: string): void {
    setAnswers((prev) => {
      const next = { ...prev, [currentQuestionId]: v };
      saveStored({
        v: 2,
        path,
        answers: next,
        asks,
        variant,
        source,
        serverRead,
        emailCaptured,
        ts: new Date().toISOString(),
      });
      return next;
    });
  }

  function typedForward(): void {
    if (!qStepValid) return;
    if (qStep < PROFILE_IDS.length - 1) {
      setQStep(qStep + 1);
      return;
    }
    setStage("asks");
    setAskStep(0);
  }

  /* ── Asks handlers ── */

  const currentAsk = ASKS[Math.min(askStep, ASKS.length - 1)];
  const askValue =
    currentAsk.key === "situation"
      ? asks.situation
      : currentAsk.key === "appetite"
        ? asks.appetite
        : asks.evidenceRecency;
  const askValid = typeof askValue === "string" && askValue.length > 0;

  function setAskValue(patch: Partial<DiagnosticAsks>): void {
    setAsks((prev) => {
      const next = { ...prev, ...patch };
      saveStored({
        v: 2,
        path,
        answers,
        asks: next,
        variant,
        source,
        serverRead,
        emailCaptured,
        ts: new Date().toISOString(),
      });
      return next;
    });
  }

  function startServerRead(finalAsks: DiagnosticAsks): void {
    if (serverPromise.current) return;
    const extract = readRawExtract();
    serverPromise.current = fetchDiagnosticServerRead({
      profile,
      asks: finalAsks,
      cvText: extract ? cvSummaryFromExtract(extract) : "",
    }).catch(() => null);
  }

  function asksForward(): void {
    if (!askValid) return;
    if (askStep < ASKS.length - 1) {
      setAskStep(askStep + 1);
      return;
    }
    if (!asksComplete(asks)) return;
    trackFunnelEvent("diagnostic_completed", {
      path: path ?? "typed",
      sector: profile.sector,
      seniority: profile.seniority,
      work_type: profile.workType,
      situation: optionTitle(asks.situation),
      appetite: optionTitle(asks.appetite),
      evidence_recency: asks.evidenceRecency,
    });
    startServerRead(asks);
    setStage("capture");
  }

  /* ── Capture and reveal ── */

  function revealRead(nextVariant: "full" | "generic", nextSource: ReadSource, sr: DiagnosticServerRead | null, captured: boolean): void {
    setVariant(nextVariant);
    setSource(nextSource);
    setServerRead(sr);
    setEmailCaptured(captured);
    setStage("read");
    persist({ variant: nextVariant, source: nextSource, serverRead: sr, emailCaptured: captured });
  }

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (captureStatus === "loading" || !asksComplete(asks)) return;
    setCaptureStatus("loading");
    setCaptureMessage(null);
    try {
      const deterministicRead = assembleReadFromAsks(profile, asks);
      const { data, error } = await supabase.functions.invoke("subscribe-signal", {
        body: {
          email,
          source: "diagnostic",
          diagnostic: {
            snapshot: readSnapshotText(deterministicRead, { ...profile, confidence: "" }),
            sector: profile.sector,
            seniority: profile.seniority,
            work_type: profile.workType,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!(data as { ok?: boolean })?.ok) {
        setCaptureStatus("error");
        setCaptureMessage(
          (data as { response_text?: string })?.response_text ?? "Please enter a valid email."
        );
        return;
      }
      trackFunnelEvent("diagnostic_email_captured", {
        sector: profile.sector,
        seniority: profile.seniority,
      });
      const sr = serverPromise.current ? await raceWithTimeout(serverPromise.current, 6500) : null;
      setCaptureStatus("idle");
      if (sr) revealRead("full", "server", sr, true);
      else revealRead("full", "deterministic", null, true);
    } catch {
      setCaptureStatus("error");
      setCaptureMessage("Something went wrong sending your read. Your answers are safe; try again.");
    }
  }

  function handleSkipCapture(): void {
    revealRead("generic", "deterministic", null, false);
  }

  function handleContinueToQuestionnaire(): void {
    writeQuestionnaireDraft(answers, asks);
    trackFunnelEvent("diagnostic_to_questionnaire", { variant: variant ?? "unknown" });
    navigate("/questionnaire");
  }

  /* ── Back ── */

  function goBack(): void {
    if (stage === "cv" || stage === "read") {
      navigate("/");
      return;
    }
    if (stage === "confirm") {
      setStage("cv");
      return;
    }
    if (stage === "questions") {
      if (qStep === 0) setStage("cv");
      else setQStep(qStep - 1);
      return;
    }
    if (stage === "asks") {
      if (askStep > 0) {
        setAskStep(askStep - 1);
        return;
      }
      if (path === "cv") setStage("confirm");
      else {
        setStage("questions");
        setQStep(PROFILE_IDS.length - 1);
      }
      return;
    }
    if (stage === "capture") {
      setStage("asks");
      setAskStep(ASKS.length - 1);
    }
  }

  /* ── Progress ── */

  const stepLabels = path === "typed" ? TYPED_STEP_LABELS : CV_STEP_LABELS;
  const progressStep = (() => {
    if (path === "typed") {
      if (stage === "questions") return qStep + 1;
      if (stage === "asks") return PROFILE_IDS.length + askStep + 1;
      return stepLabels.length;
    }
    if (stage === "cv") return 1;
    if (stage === "confirm") return 2;
    if (stage === "asks") return askStep + 3;
    return stepLabels.length;
  })();

  const read: DiagnosticRead | null =
    stage === "read" && variant
      ? variant === "full"
        ? source === "server" && serverRead
          ? serverRead.read
          : asksComplete(asks)
            ? assembleReadFromAsks(profile, asks)
            : assembleGenericReadFromProfile(profile)
        : assembleGenericReadFromProfile(profile)
      : null;

  const signal = source === "server" ? serverRead?.evidence_signal ?? null : null;

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar minimal />

      <main>
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="pt-8 sm:pt-10 flex items-center justify-between gap-6">
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            <div className="pt-6">
              <SectionLabel>Diagnostic</SectionLabel>
            </div>

            {stage !== "read" && (
              <div className="pt-4">
                <ProgressHeader
                  currentStep={progressStep}
                  totalSteps={stepLabels.length}
                  labels={stepLabels}
                  timeEstimate="≈ 2 min"
                />
              </div>
            )}

            {/* ─── CV drop: the opening move ─── */}
            {stage === "cv" && (
              <div className="pt-8 pb-16 space-y-10">
                <div className="space-y-4">
                  <StepEyebrow label="Start with your CV" meta="01 / 06" />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 items-start">
                    <h1 className="lg:col-span-8 text-[28px] sm:text-[32px] lg:text-[36px] font-semibold tracking-tight leading-[1.2] text-foreground">
                      Drop in your CV. It answers better than a form does.
                    </h1>
                    <p className="lg:col-span-4 lg:pt-2 text-[14.5px] text-muted-foreground leading-relaxed lg:text-right">
                      We read your title, sector and seniority from it, ask the three questions no
                      CV can answer, then build your free read from the combination.
                    </p>
                  </div>
                </div>

                <div className="max-w-3xl space-y-4">
                  <CVUploadZone
                    clientSessionId={getClientSessionId()}
                    onUploadComplete={() => handleUploadStarted()}
                    onUploadClear={() => {
                      if (parseTimer.current) clearTimeout(parseTimer.current);
                      setParseState("idle");
                    }}
                    onExtractComplete={handleExtractComplete}
                  />
                  {parseState === "parsing" && (
                    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Reading it now. A few seconds.
                    </div>
                  )}
                  {parseState === "failed" && (
                    <p className="text-[13px] text-muted-foreground">
                      We couldn't read enough from that file. Try another format, or answer five
                      short questions instead below.
                    </p>
                  )}
                  <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
                    [ Read once to build your read. Deletable afterwards. Never shared, never used
                    for anything else. ]
                  </p>
                </div>

                <div className="border-t border-border pt-5 max-w-3xl space-y-3">
                  {hasEarlierExtract && (
                    <div>
                      <button
                        type="button"
                        onClick={useEarlierExtract}
                        className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                      >
                        Use the CV you uploaded earlier →
                      </button>
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={chooseTyped}
                      className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                    >
                      No CV to hand? Five short questions instead →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Confirm card (CV path) ─── */}
            {stage === "confirm" && (
              <div className="pt-8 pb-16 space-y-10">
                <div className="space-y-4">
                  <StepEyebrow label="Check the read-out" meta="02 / 06" />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 items-start">
                    <h1 className="lg:col-span-8 text-[28px] sm:text-[32px] lg:text-[36px] font-semibold tracking-tight leading-[1.2] text-foreground">
                      Here's what your CV says. Correct anything that's off.
                    </h1>
                    <p className="lg:col-span-4 lg:pt-2 text-[14.5px] text-muted-foreground leading-relaxed lg:text-right">
                      {typeof cvConfidence === "number" && cvConfidence >= 85
                        ? "A clean parse. Most people change nothing here."
                        : "Anything we couldn't read with confidence is open below for you to set."}
                    </p>
                  </div>
                </div>

                <div className="max-w-3xl bg-white border border-border">
                  {PROFILE_ROWS.map((row, i) => {
                    const value = (answers[row.id] ?? "").trim();
                    const q = questions.find((qq) => qq.id === row.id);
                    const editing = editingRow === row.id;
                    const quote = cvEvidence[row.id];
                    return (
                      <div key={row.id} className={`px-5 py-4 sm:px-6 ${i > 0 ? "border-t border-border" : ""}`}>
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {row.label}
                            </div>
                            {value ? (
                              <div className="mt-1 text-[15px] font-medium text-foreground leading-snug">{value}</div>
                            ) : (
                              <div className="mt-1 text-[14px] text-muted-foreground leading-snug">
                                Not found in your CV. Set it below.
                              </div>
                            )}
                            {quote && !editing && (
                              <div className="mt-1.5 text-[12px] text-muted-foreground/80 leading-relaxed">
                                From your CV: “{quote}”
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingRow(editing ? null : row.id)}
                            className="shrink-0 text-[12px] font-semibold text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                          >
                            {editing ? "Close" : value ? "Edit" : "Add"}
                          </button>
                        </div>
                        {editing && (
                          <div className="mt-4">
                            {row.id === 1 ? (
                              <div className="bg-[#F3F0EA] border border-border">
                                <input
                                  type="text"
                                  autoFocus
                                  value={answers[1] ?? ""}
                                  onChange={(e) => setRowValue(1, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingRow(null);
                                  }}
                                  placeholder={q?.placeholder}
                                  className="w-full bg-transparent px-5 py-3.5 text-[14.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                                />
                              </div>
                            ) : (
                              <OptionStack
                                compact
                                options={q?.options ?? []}
                                value={value || undefined}
                                onSelect={(v) => setRowValue(row.id, v)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border pt-8 max-w-3xl flex items-center justify-between gap-6">
                  <button
                    onClick={confirmProfile}
                    disabled={!profileComplete(answers)}
                    className="cta-block transition-colors text-center"
                  >
                    That's me, continue
                  </button>
                  <span className="text-[12px] text-muted-foreground/80">Three questions left</span>
                </div>
              </div>
            )}

            {/* ─── Typed profile questions (no-CV path) ─── */}
            {stage === "questions" && currentQuestion && (
              <div className="pt-8 pb-16 space-y-10">
                <div className="space-y-4">
                  <StepEyebrow
                    label={`Question ${String(qStep + 1).padStart(2, "0")}`}
                    meta={`${String(qStep + 1).padStart(2, "0")} / ${String(TYPED_STEP_LABELS.length).padStart(2, "0")}`}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 items-start">
                    <h1 className="lg:col-span-8 text-[28px] sm:text-[32px] lg:text-[36px] font-semibold tracking-tight leading-[1.2] text-foreground">
                      {currentQuestion.text}
                    </h1>
                    <p className="lg:col-span-4 lg:pt-2 text-[14.5px] text-muted-foreground leading-relaxed lg:text-right">
                      {qStep === 0
                        ? "Five about the work, three about you, then your free read. No email needed to start."
                        : null}
                    </p>
                  </div>
                </div>

                <div>
                  {currentQuestion.type === "text" ? (
                    <div className="bg-[#F3F0EA] border border-border">
                      <input
                        type="text"
                        autoFocus
                        value={currentValue}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") typedForward();
                        }}
                        placeholder={currentQuestion.placeholder}
                        className="w-full bg-transparent px-6 py-5 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                      />
                    </div>
                  ) : currentQuestion.options ? (
                    <OptionStack
                      options={currentQuestion.options}
                      value={currentValue || undefined}
                      onSelect={(v) => setTypedAnswer(v)}
                    />
                  ) : null}
                </div>

                <div className="border-t border-border pt-8 flex items-center justify-between gap-6">
                  <button
                    onClick={typedForward}
                    disabled={!qStepValid}
                    className="cta-block transition-colors text-center"
                  >
                    Continue
                  </button>
                  <span className="text-[12px] text-muted-foreground/80">
                    {PROFILE_IDS.length - qStep - 1 === 0
                      ? "Three about you next"
                      : `${PROFILE_IDS.length - qStep - 1} more about the work`}
                  </span>
                </div>
              </div>
            )}

            {/* ─── The three asks ─── */}
            {stage === "asks" && (
              <div className="pt-8 pb-16 space-y-10">
                <div className="space-y-4">
                  <StepEyebrow
                    label={currentAsk.eyebrow}
                    meta={
                      path === "typed"
                        ? `${String(PROFILE_IDS.length + askStep + 1).padStart(2, "0")} / ${String(TYPED_STEP_LABELS.length).padStart(2, "0")}`
                        : `${String(askStep + 3).padStart(2, "0")} / 06`
                    }
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 items-start">
                    <h1 className="lg:col-span-8 text-[28px] sm:text-[32px] lg:text-[36px] font-semibold tracking-tight leading-[1.2] text-foreground">
                      {currentAsk.text}
                    </h1>
                    <p className="lg:col-span-4 lg:pt-2 text-[14.5px] text-muted-foreground leading-relaxed lg:text-right">
                      {currentAsk.aside}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentAsk.key === "situation" && (
                    <OptionStack
                      options={SITUATION_OPTIONS}
                      value={asks.situation}
                      onSelect={(v) => setAskValue({ situation: v })}
                    />
                  )}
                  {currentAsk.key === "appetite" && (
                    <OptionStack
                      options={APPETITE_OPTIONS}
                      value={asks.appetite}
                      onSelect={(v) => setAskValue({ appetite: v })}
                    />
                  )}
                  {currentAsk.key === "evidence" && (
                    <div className="space-y-5">
                      <ChipRow
                        options={EVIDENCE_RECENCY_OPTIONS}
                        value={asks.evidenceRecency}
                        onSelect={(v) => setAskValue({ evidenceRecency: v })}
                      />
                      {asks.evidenceRecency && asks.evidenceRecency !== "Honestly, can't recall" && (
                        <div className="max-w-2xl bg-[#F3F0EA] border border-border">
                          <input
                            type="text"
                            value={asks.evidenceNote ?? ""}
                            onChange={(e) => setAskValue({ evidenceNote: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") asksForward();
                            }}
                            placeholder="What did they want your take on? One line, optional."
                            className="w-full bg-transparent px-5 py-4 text-[14.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-8 flex items-center justify-between gap-6">
                  <button
                    onClick={asksForward}
                    disabled={!askValid}
                    className="cta-block transition-colors text-center"
                  >
                    {askStep === ASKS.length - 1 ? "Finish" : "Continue"}
                  </button>
                  <span className="text-[12px] text-muted-foreground/80">
                    {ASKS.length - askStep - 1 === 0 ? "Last question" : `${ASKS.length - askStep - 1} to go`}
                  </span>
                </div>
              </div>
            )}

            {/* ─── Email capture ─── */}
            {stage === "capture" && (
              <div className="pt-8 pb-16 space-y-10 max-w-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-foreground">Your read is being built</span>
                  </div>
                  <h1 className="title-h1">Where should we send it?</h1>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Enter your email to see your read here and get a copy in your inbox. You'll also
                    join The Signal, our Monday briefing on where independent work is heading.
                    Unsubscribe anytime.
                  </p>
                </div>

                <form onSubmit={handleCapture} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@work.com"
                      className="flex-1 bg-[#F3F0EA] border border-border px-6 py-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={captureStatus === "loading"}
                      className="cta-block disabled:opacity-60"
                    >
                      {captureStatus === "loading" ? "One moment…" : "Show my read"}
                    </button>
                  </div>
                  {captureStatus === "error" && captureMessage && (
                    <p className="text-[12.5px] text-red-600">{captureMessage}</p>
                  )}
                  <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Matching you against Solo's catalogue of 95 independent profiles…
                  </div>
                  <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
                    [ No spam. One-click unsubscribe. Your answers stay on this device until you
                    choose otherwise. ]
                  </p>
                </form>

                <div className="border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={handleSkipCapture}
                    className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                  >
                    Show a shorter version without my email →
                  </button>
                </div>
              </div>
            )}

            {/* ─── The read ─── */}
            {stage === "read" && read && (
              <div className="pt-8 pb-16 space-y-10">
                <div className="space-y-4 max-w-3xl">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-foreground">Your optionality read</span>
                    {emailCaptured && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground">Copy sent to your inbox</span>
                      </>
                    )}
                  </div>
                  <h1 className="title-h1">
                    You read as <span className="text-[#15735F]">{read.identity}</span>.
                  </h1>
                  {source === "server" && serverRead && (
                    <p className="text-[13px] text-muted-foreground">
                      Matched against Solo's catalogue of 95 independent profiles ·{" "}
                      {serverRead.archetype.category} family
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-3">
                      <RuleHead>The signal</RuleHead>
                      <p className="text-[15.5px] text-foreground leading-relaxed">{read.signal}</p>
                    </div>

                    {read.strengths.length > 0 && (
                      <div className="space-y-3">
                        <RuleHead>What travels</RuleHead>
                        <ul className="space-y-4 pt-1">
                          {read.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-4">
                              <span className="text-[#15735F] text-[11px] font-semibold tabular-nums tracking-[0.1em] pt-1 shrink-0">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="text-[14.5px] text-foreground leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      <RuleHead>Where it points</RuleHead>
                      <p className="text-[15.5px] text-foreground leading-relaxed">{read.direction}</p>
                    </div>

                    {read.blocker && (
                      <div className="bg-[#1A1915] px-6 py-6 sm:px-8 sm:py-7">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FAF9F7]/60 mb-3">
                          The honest line
                        </div>
                        <p className="text-[#FAF9F7] text-[15.5px] leading-relaxed">{read.blocker}</p>
                      </div>
                    )}
                  </div>

                  <aside className="lg:col-span-4 space-y-6">
                    {signal && (
                      <div className="bg-white border border-border px-5 py-5 space-y-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          One live signal <span className="text-muted-foreground/40">·</span>{" "}
                          <span className="text-[#15735F]">this week</span>
                        </div>
                        <p className="text-[14.5px] font-medium text-foreground leading-snug">{signal.title}</p>
                        <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                          {[signal.source_name, signal.value_text, signal.deadline ? `closes ${signal.deadline}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="text-[12px] text-muted-foreground/80 leading-relaxed border-t border-border pt-2.5">
                          The full read attaches live demand like this to every route it names.
                        </p>
                      </div>
                    )}
                    <div className="border-t border-border pt-5 space-y-4">
                      <h4 className="rule-head">What the full read adds</h4>
                      <ul className="space-y-3 text-[13.5px] text-muted-foreground leading-relaxed">
                        <li>The named routes for your profile, scored for fit</li>
                        <li>The insight most people in your position miss</li>
                        <li>A first move you could take inside 24 hours</li>
                        <li>A 30-day plan built from your actual answers</li>
                      </ul>
                      <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
                        Your answers carry forward, so the questionnaire starts where this left off.
                        About 15 minutes, mostly questions only you can answer.
                      </p>
                    </div>
                  </aside>
                </div>

                <div className="border-t border-border pt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <button onClick={handleContinueToQuestionnaire} className="cta-block">
                      See your full read →
                    </button>
                    {!emailCaptured && (
                      <button
                        type="button"
                        onClick={() => {
                          setStage("capture");
                          setVariant(null);
                        }}
                        className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors self-start sm:self-auto"
                      >
                        Get the full version by email instead →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Footer ─── */}
            <div className="border-t border-border py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <SoloLogo width={64} height={18} />
                  <span className="text-muted-foreground/40">·</span>
                  <span>The diagnostic is free</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>Full report £19.99, one-time</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy
                  </a>
                  <span className="text-muted-foreground/40">·</span>
                  <a href="/terms" className="hover:text-foreground transition-colors">
                    Terms
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
