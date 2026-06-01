import { describe, expect, it } from "vitest";
import { mapCvToAnswers } from "@/lib/cvPrefill";

// WP7 — CV per-field confidence gate.
// HARD INVARIANT: a field scored < 70 never pre-fills a questionnaire answer.

const base = {
  current_job_title: "Finance Director",
  years_experience: 15,
  sector_primary: "financial services",
  employer_org_type: "PLC",
  type_of_work: "analysis and reporting",
  seniority_level: "director",
  extracted_name: "Bevan",
};

describe("mapCvToAnswers WP7 confidence gate", () => {
  it("pre-fills everything when no per_field_confidence is present (legacy extract)", () => {
    const { answers } = mapCvToAnswers({ ...base });
    expect(answers[1]).toBe("Finance Director");
    expect(answers[2]).toBe("13–18 years");
    expect(answers[3]).toBe("Financial Services & Banking");
    expect(answers[4]).toBe("Analysis and reporting");
    expect(answers[5]).toBe("Director");
    expect(answers[30]).toBe("PLC");
  });

  it("does NOT pre-fill a field scored below 70 (the hard invariant)", () => {
    const { answers } = mapCvToAnswers({
      ...base,
      per_field_confidence: {
        current_job_title: 95,
        years_experience: 40, // low → must not pre-fill
        sector_primary: 69, // just below floor → must not pre-fill
        employer_org_type: 20, // low → must not pre-fill
        type_of_work: 88,
        seniority_level: 75,
      },
    });
    expect(answers[1]).toBe("Finance Director"); // 95 → kept
    expect(answers[2]).toBeUndefined(); // 40 → gated out
    expect(answers[3]).toBeUndefined(); // 69 → gated out
    expect(answers[30]).toBeUndefined(); // 20 → gated out
    expect(answers[4]).toBe("Analysis and reporting"); // 88 → kept
    expect(answers[5]).toBe("Director"); // 75 → kept
  });

  it("records verbatim evidence for fields in the 70–89 band only", () => {
    const { answers, evidence } = mapCvToAnswers({
      ...base,
      per_field_confidence: {
        current_job_title: 99, // 90+ → no evidence card
        seniority_level: 80, // 70–89 → evidence card
      },
      parse_evidence: {
        current_job_title: "Finance Director, Acme PLC (2018–present)",
        seniority_level: "Director of Group Finance",
      },
    });
    expect(answers[1]).toBe("Finance Director");
    expect(evidence[1]).toBeUndefined(); // 99 → silent
    expect(answers[5]).toBe("Director");
    expect(evidence[5]).toBe("Director of Group Finance"); // 80 → evidence surfaced
  });

  it("exactly 70 pre-fills (floor is inclusive)", () => {
    const { answers } = mapCvToAnswers({
      ...base,
      per_field_confidence: { current_job_title: 70 },
    });
    expect(answers[1]).toBe("Finance Director");
  });
});
