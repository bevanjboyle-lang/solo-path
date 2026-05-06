/**
 * CV → questionnaire pre-fill (F52).
 *
 * The CV upload step (parse-cv) extracts a structured cv_extract object and
 * persists it to localStorage at `solo.cv_extract.{clientSessionId}`. The
 * questionnaire then asks the user the same things in different words. This
 * module bridges the two so users who uploaded a CV don't have to re-enter
 * facts the parser already pulled out.
 *
 * Conservative on purpose. We only pre-fill objective questions where the
 * CV has reliable, verbatim answers (current title, sector, employer,
 * type of work, seniority, years of experience). We do NOT pre-fill the
 * subjective text questions (Q6 proudest work, Q7 informal advisory, Q8
 * "what colleagues say you're best at", Q11 client knowledge, Q12
 * independent work) because those reflect the user's own framing and
 * deserve a fresh blank field. The parser cannot guess them.
 *
 * The user can still edit any pre-filled answer before submitting.
 */

import { getClientSessionId } from "@/lib/clientSession";

export interface CvPrefill {
  /** Map of question id -> answer value, ready to merge into Questionnaire's answers state. */
  answers: Record<number, string | string[]>;
  /** Pre-extracted first name (separate state in Questionnaire). */
  firstName: string;
}

const EMPTY: CvPrefill = { answers: {}, firstName: "" };

/**
 * Read the persisted cv_extract for the current client session and map it
 * to questionnaire answers. Returns an empty prefill if no CV was uploaded
 * or if anything goes wrong (storage disabled, JSON malformed, etc.) —
 * callers can always treat this as additive on top of an empty start.
 */
export function readCvPrefill(): CvPrefill {
  try {
    const csid = getClientSessionId();
    const raw = localStorage.getItem(`solo.cv_extract.${csid}`);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as { cv_extract?: Record<string, unknown> } | null;
    const cv = parsed?.cv_extract;
    if (!cv || typeof cv !== "object") return EMPTY;
    return mapCvToAnswers(cv);
  } catch {
    return EMPTY;
  }
}

/**
 * Map cv_extract fields to questionnaire answers. Exported so we can unit-test
 * the mapping logic in isolation from localStorage I/O.
 */
export function mapCvToAnswers(cv: Record<string, unknown>): CvPrefill {
  const answers: Record<number, string | string[]> = {};

  // Q1: current_job_title (text, verbatim)
  if (typeof cv.current_job_title === "string" && cv.current_job_title.trim()) {
    answers[1] = cv.current_job_title.trim();
  }

  // Q2: years_experience (integer → band string).
  // The parse-cv schema returns an integer; questionnaire wants one of five
  // bands. Rounding rule below mirrors what a reasonable user would tick.
  if (typeof cv.years_experience === "number") {
    const band = mapYearsToBand(cv.years_experience);
    if (band) answers[2] = band;
  }

  // Q3: sector_primary (parse-cv string → questionnaire dropdown).
  if (typeof cv.sector_primary === "string") {
    const sector = mapSector(cv.sector_primary);
    if (sector) answers[3] = sector;
  }

  // Q30 (employer) — verbatim, optional question.
  if (typeof cv.employer_org_type === "string" && cv.employer_org_type.trim()) {
    answers[30] = cv.employer_org_type.trim();
  }

  // Q4: type_of_work (lowercase string in parse-cv → title-case option in questionnaire).
  if (typeof cv.type_of_work === "string") {
    const work = mapTypeOfWork(cv.type_of_work);
    if (work) answers[4] = work;
  }

  // Q5: seniority_level (lowercase string → questionnaire single-select).
  if (typeof cv.seniority_level === "string") {
    const seniority = mapSeniority(cv.seniority_level);
    if (seniority) answers[5] = seniority;
  }

  const firstName =
    typeof cv.extracted_name === "string" ? cv.extracted_name.trim() : "";

  return { answers, firstName };
}

/** Years-of-experience integer → band label that exactly matches Q2's options. */
export function mapYearsToBand(years: number): string | null {
  if (!Number.isFinite(years) || years < 2) return null;
  if (years <= 4) return "2–4 years";
  if (years <= 7) return "5–7 years";
  if (years <= 12) return "8–12 years";
  if (years <= 18) return "13–18 years";
  return "19+ years";
}

/**
 * parse-cv's sector_primary uses the values listed in P0_SYSTEM, which are
 * close to Q3's dropdown but not identical. Map known values explicitly and
 * fall back to null (no pre-fill, user picks themselves) for anything we
 * don't recognise.
 */
const SECTOR_MAP: Record<string, string> = {
  "financial services": "Financial Services & Banking",
  "consulting & professional services": "Consulting & Professional Services",
  "technology": "Technology & Digital",
  "public sector & nhs": "Government & Public Sector",
  "industry & manufacturing": "Manufacturing & Engineering",
  "retail & consumer": "Retail & Consumer",
  "other": "Other",
};

export function mapSector(sector: string): string | null {
  return SECTOR_MAP[sector.toLowerCase().trim()] ?? null;
}

const TYPE_OF_WORK_MAP: Record<string, string> = {
  "analysis and reporting": "Analysis and reporting",
  "project delivery": "Project delivery",
  "governance and compliance": "Governance and compliance",
  "operations and process": "Operations and process",
  "consulting and advisory": "Consulting and advisory",
};

export function mapTypeOfWork(work: string): string | null {
  return TYPE_OF_WORK_MAP[work.toLowerCase().trim()] ?? null;
}

/**
 * parse-cv may emit "vp" which has no corresponding option in Q5 (Manager,
 * Senior Manager, Director, Head of, Partner, Other). For unmatched values
 * we return null rather than fall back to "Other" — the user should pick
 * themselves rather than have us silently guess.
 */
const SENIORITY_MAP: Record<string, string> = {
  "manager": "Manager",
  "senior manager": "Senior Manager",
  "director": "Director",
  "head of": "Head of",
  "partner": "Partner",
};

export function mapSeniority(level: string): string | null {
  return SENIORITY_MAP[level.toLowerCase().trim()] ?? null;
}
