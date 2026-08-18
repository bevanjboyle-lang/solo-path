/**
 * Client for the diagnostic-read edge function (Phase B, 2026-08-18).
 *
 * The free diagnostic sends the confirmed profile, a compact CV summary and
 * the three situational asks; the function classifies the person against
 * Solo's 95-archetype catalogue (nano), composes a personal read grounded in
 * that archetype's knowledge-bank entry (mini), and attaches one live signal
 * from the Radar for the archetype's domain.
 *
 * Design rule: this surface must never block or break the flow. Every failure
 * path resolves to null and the caller falls back to the deterministic read
 * from src/data/diagnosticRead.ts. The fetch is started when the last ask is
 * answered and raced against a timeout at reveal time, so the model call runs
 * while the person types their email.
 */

import { supabase } from "@/integrations/supabase/client";
import type { DiagnosticRead, DiagnosticProfile, DiagnosticAsks } from "@/data/diagnosticRead";

export interface DiagnosticServerArchetype {
  id: string;
  name: string;
  category: string;
}

export interface DiagnosticEvidenceSignal {
  title: string;
  source_name: string | null;
  value_text: string | null;
  deadline: string | null;
  week_start: string | null;
}

export interface DiagnosticServerRead {
  archetype: DiagnosticServerArchetype;
  read: DiagnosticRead;
  evidence_signal: DiagnosticEvidenceSignal | null;
}

/**
 * Build a compact plain-text CV summary from the parse-cv extract, so the
 * compose model has concrete material to quote (employer shape, named
 * achievements, qualifications). The raw CV never leaves parse-cv for
 * anonymous users; this summary is assembled client-side from the extract
 * already held in localStorage. Capped well inside the server's 6,000-char
 * slice.
 */
export function cvSummaryFromExtract(cv: Record<string, unknown>): string {
  const parts: string[] = [];
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

  const employer = str(cv.employer_org_type);
  if (employer) parts.push(`Current employer type: ${employer}.`);

  const highlights = arr(cv.career_highlights).slice(0, 5);
  if (highlights.length > 0) parts.push(`Career highlights: ${highlights.join(" ")}`);

  const quals = arr(cv.qualifications).slice(0, 6);
  if (quals.length > 0) parts.push(`Qualifications: ${quals.join(", ")}.`);

  const indep = str(cv.independent_experience);
  if (indep) parts.push(`Independent or advisory experience: ${indep}.`);

  const sectors = arr(cv.sectors_worked_in).slice(0, 5);
  if (sectors.length > 1) parts.push(`Sectors worked in: ${sectors.join(", ")}.`);

  const skills = arr(cv.skills_mentioned).slice(0, 10);
  if (skills.length > 0) parts.push(`Named skills and tools: ${skills.join(", ")}.`);

  return parts.join(" ").slice(0, 1600);
}

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Fire the diagnostic-read call. Resolves to a validated result or null;
 * never rejects. Call early (last ask answered), race at reveal.
 */
export async function fetchDiagnosticServerRead(args: {
  profile: DiagnosticProfile;
  asks: DiagnosticAsks;
  cvText: string;
}): Promise<DiagnosticServerRead | null> {
  try {
    const { profile, asks, cvText } = args;
    const { data, error } = await supabase.functions.invoke("diagnostic-read", {
      body: {
        profile: {
          title: profile.title,
          years: profile.years,
          sector: profile.sector,
          work_type: profile.workType,
          seniority: profile.seniority,
        },
        cv_text: cvText || undefined,
        situation: asks.situation,
        appetite: asks.appetite,
        evidence: { recency: asks.evidenceRecency, note: asks.evidenceNote || undefined },
      },
    });
    if (error) return null;
    const d = data as {
      ok?: boolean;
      archetype?: DiagnosticServerArchetype;
      read?: DiagnosticRead;
      evidence_signal?: DiagnosticEvidenceSignal | null;
    } | null;
    if (!d?.ok || !d.archetype || !d.read) return null;
    const r = d.read;
    if (!nonEmpty(r.identity) || !nonEmpty(r.signal) || !nonEmpty(r.direction) || !nonEmpty(r.blocker)) {
      return null;
    }
    const strengths = Array.isArray(r.strengths) ? r.strengths.filter(nonEmpty) : [];
    if (strengths.length === 0) return null;
    return {
      archetype: d.archetype,
      read: { ...r, strengths },
      evidence_signal: d.evidence_signal && nonEmpty(d.evidence_signal.title) ? d.evidence_signal : null,
    };
  } catch {
    return null;
  }
}

/** Race a pending server read against a deadline; null on timeout. */
export function raceWithTimeout<T>(promise: Promise<T | null>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}
