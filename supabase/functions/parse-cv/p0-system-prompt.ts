// parse-cv/p0-system-prompt.ts
//
// Canonical P0 system prompt and user message template.
// Source: prompts/prompt-0-cv-parser.md (the locked source of truth per ADR-019
// pattern). This .ts file is a build-extract of that content for runtime
// injection by parse-cv v29.

export const P0_SYSTEM_PROMPT = `You are a structured data extraction engine. Your only job is to read a CV and extract specific fields into a JSON object.

You do not evaluate the CV. You do not give career advice. You do not comment on the quality of the person's experience. You do not summarise or rewrite. You extract what is explicitly present and flag what is not.

Rules:
- Extract ONLY from what is written in the CV. Do not infer beyond what the text clearly supports.
- If a field cannot be reliably extracted, set it to null and add a note in parse_notes.
- Be specific in employer_org_type. Not "Financial Services" but "Big 4 risk advisory practice" or "FTSE100 retail bank" or "NHS acute trust". Match the level of specificity the CV allows.
- For career_highlights, use the person's own words or close paraphrasing where possible. Do not embellish.
- confidence_score should reflect how readable and complete the CV was, not how impressive it is.

Your output must be a single valid JSON object. No preamble, no explanation, no markdown fencing. Return only the JSON object and nothing else.`;

export const P0_USER_MESSAGE_TEMPLATE = `Extract structured data from the following CV text. Return a single JSON object matching the schema exactly.

CV TEXT:
---
{{CV_TEXT}}
---

SCHEMA:
{
  "extracted_name": "First name only (string). Extract from the name at the top of the CV. If not clearly a first name, use null.",
  "current_job_title": "Most recent or current job title as written in the CV (string). Use exact wording.",
  "years_experience": "Total professional experience as an integer (years). If the CV shows a career timeline, calculate from first professional role to present. Round to nearest whole year. If not determinable, use null.",
  "sector_primary": "Primary sector. Map to one of these values where possible: 'Financial Services' / 'Consulting & Professional Services' / 'Technology' / 'Public Sector & NHS' / 'Industry & Manufacturing' / 'Retail & Consumer' / 'Other'. Use 'Other' only if none of the above genuinely fit.",
  "employer_org_type": "Specific description of the current or most recent employer type. Be specific. Not just 'Financial Services' but 'Big 4 risk advisory practice' or 'FTSE100 retail bank' or 'NHS acute trust' or 'boutique M&A advisory firm' or 'mid-market PE-backed manufacturing business'. Use the same level of specificity the CV text supports. If the employer name is present, you may use it to inform this description.",
  "type_of_work": "Primary type of work based on roles and responsibilities described. Use one of: 'analysis and reporting' / 'project delivery' / 'governance and compliance' / 'operations and process' / 'consulting and advisory'. Choose the best fit; do not combine multiple.",
  "seniority_level": "Seniority level inferred from job titles and responsibilities. Use one of: 'manager' / 'senior manager' / 'director' / 'head of' / 'partner' / 'VP' / 'C-suite' / 'associate' / 'analyst'. Choose a single level that best describes their current position.",
  "career_highlights": [
    "Array of 3 to 5 notable projects, achievements, or career moments mentioned in the CV. Use the person's own language where possible. Each item is a single sentence. Focus on things that sound like professional achievements or significant responsibilities, not general job descriptions."
  ],
  "qualifications": [
    "Array of professional qualifications, certifications, and degrees mentioned anywhere in the CV. Include: ACA, ACCA, CIMA, CIPD, CFA, PMP, PRINCE2, MBA, degree subject and institution if stated, and any other named professional credentials."
  ],
  "sectors_worked_in": [
    "Array of all sectors the person has worked in across their career, inferred from employer names and role descriptions. Include the current sector and any prior sectors. Use the same sector labels as sector_primary where applicable."
  ],
  "skills_mentioned": [
    "Array of explicit skills, tools, methodologies, frameworks, or software mentioned anywhere in the CV. Include things like: Excel, Power BI, Tableau, SAP, Salesforce, LEAN, Six Sigma, Prince2, Agile, SQL, Python, specific regulatory frameworks (e.g. FCA, GDPR, SOX), and named consulting methodologies."
  ],
  "independent_experience": "Any mention of freelance, advisory, non-executive, consulting, or independent work outside the person's main employment history. Single string summary (e.g. 'Non-executive director at X charity, 2021-2023' or 'Independent consulting work for 2 SMEs in 2022'). Use null if no such experience is mentioned.",
  "confidence_score": "Integer 0 to 100 reflecting how reliably this CV was parsed. Use these bands: 85-100 = clear, well-structured CV with all key fields readable and unambiguous; 60-84 = mostly readable but one or more key fields were ambiguous, sparse, or missing; 30-59 = partial parse, CV was readable but significant fields (e.g. dates, job titles, sector) were unclear or absent; 0-29 = CV was not reliably parseable (e.g. image-based PDF, very short document, non-CV content, non-English language).",
  "parse_notes": "Any caveats about what could not be reliably extracted, unusual features of this CV, or flags the frontend should know about. Examples: 'Career dates not included, years_experience is estimated', 'Document appears to be a job description, not a CV', 'CV is in French, English extraction attempted with reduced confidence', 'Only one role listed, likely very early career or incomplete CV'. Use null if no caveats."
}`;

export function buildP0UserMessage(cvText: string): string {
  return P0_USER_MESSAGE_TEMPLATE.replace("{{CV_TEXT}}", cvText);
}
