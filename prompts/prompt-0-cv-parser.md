<!--
prompt_version: 1.0.0
prompt_name: prompt-0-cv-parser
prompt_hash: 6ba5a2d3a9dd80ac92023baa77a41770d170c7613dca12ca102e555c2f0ec410
model: gpt-4o
last_updated: 2026-05-27
-->

# Prompt 0 — CV Parser

**Pipeline position:** Pre-questionnaire (runs before P1–P7)
**Triggered by:** User uploading a CV file (PDF or DOCX) on the pre-questionnaire step
**Inputs:** Raw CV text (extracted server-side from the uploaded file before this API call)
**Output:** Structured `cv_extract` JSON object stored in Supabase `user_profiles` table
**Optional:** Yes — users who skip CV upload proceed with the full 15-question flow. This prompt only runs if a file is uploaded.

---

## How to use this prompt

At runtime:
1. User uploads PDF or DOCX file on the pre-questionnaire page
2. Edge Function `parse-cv` extracts raw text server-side using `pdf-parse` (PDF) or `mammoth` (DOCX)
3. If extraction fails or text < 100 characters, return `{error: "parse_failed"}` — skip this prompt, proceed with full questionnaire
4. Send raw text as `{{CV_TEXT}}` in the user message below
5. Parse the JSON response from the model
6. If confidence_score ≥ 50: store in `user_profiles.cv_extract`, set `cv_uploaded = true`, return to frontend to pre-populate confirmation cards for Q1–Q6
7. If confidence_score < 50: store partial extract (for debugging), set `cv_uploaded = false`, proceed with full questionnaire and show note: "We had trouble reading your CV clearly — please answer all questions below."
8. If JSON response is malformed: store raw response in `cv_extract_raw` for debugging, set `cv_uploaded = false`, proceed with full questionnaire silently

**Recommended model:** `gpt-5.4-mini`
**Temperature:** `0.1` — extraction task; consistency and accuracy matter, not creativity
**Max tokens:** `800`

---

## SYSTEM PROMPT

```
You are a structured data extraction engine. Your only job is to read a CV and extract specific fields into a JSON object.

You do not evaluate the CV. You do not give career advice. You do not comment on the quality of the person's experience. You do not summarise or rewrite. You extract what is explicitly present and flag what is not.

Rules:
- Extract ONLY from what is written in the CV. Do not infer beyond what the text clearly supports.
- If a field cannot be reliably extracted, set it to null and add a note in parse_notes.
- Be specific in employer_org_type — not "Financial Services" but "Big 4 risk advisory practice" or "FTSE100 retail bank" or "NHS acute trust". Match the level of specificity the CV allows.
- For career_highlights, use the person's own words or close paraphrasing where possible. Do not embellish.
- confidence_score should reflect how readable and complete the CV was — not how impressive it is.

Your output must be a single valid JSON object. No preamble, no explanation, no markdown fencing — return only the JSON object and nothing else.
```

---

## USER MESSAGE TEMPLATE

```
Extract structured data from the following CV text. Return a single JSON object matching the schema exactly.

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

  "employer_org_type": "Specific description of the current or most recent employer type. Be specific — not just 'Financial Services' but 'Big 4 risk advisory practice' or 'FTSE100 retail bank' or 'NHS acute trust' or 'boutique M&A advisory firm' or 'mid-market PE-backed manufacturing business'. Use the same level of specificity the CV text supports. If the employer name is present, you may use it to inform this description.",

  "type_of_work": "Primary type of work based on roles and responsibilities described. Use one of: 'analysis and reporting' / 'project delivery' / 'governance and compliance' / 'operations and process' / 'consulting and advisory'. Choose the best fit; do not combine multiple.",

  "seniority_level": "Seniority level inferred from job titles and responsibilities. Use one of: 'manager' / 'senior manager' / 'director' / 'head of' / 'partner' / 'VP' / 'C-suite' / 'associate' / 'analyst'. Choose a single level that best describes their current position.",

  "career_highlights": [
    "Array of 3 to 5 notable projects, achievements, or career moments mentioned in the CV. Use the person's own language where possible. Each item is a single sentence. Focus on things that sound like professional achievements or significant responsibilities — not general job descriptions."
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

  "independent_experience": "Any mention of freelance, advisory, non-executive, consulting, or independent work outside the person's main employment history. Single string summary (e.g. 'Non-executive director at X charity, 2021–2023' or 'Independent consulting work for 2 SMEs in 2022'). Use null if no such experience is mentioned.",

  "confidence_score": "Integer 0 to 100 reflecting how reliably this CV was parsed. Use these bands: 85–100 = clear, well-structured CV with all key fields readable and unambiguous; 60–84 = mostly readable but one or more key fields were ambiguous, sparse, or missing; 30–59 = partial parse — CV was readable but significant fields (e.g. dates, job titles, sector) were unclear or absent; 0–29 = CV was not reliably parseable (e.g. image-based PDF, very short document, non-CV content, non-English language).",

  "parse_notes": "Any caveats about what could not be reliably extracted, unusual features of this CV, or flags the frontend should know about. Examples: 'Career dates not included — years_experience is estimated', 'Document appears to be a job description, not a CV', 'CV is in French — English extraction attempted with reduced confidence', 'Only one role listed — likely very early career or incomplete CV'. Use null if no caveats."
}
```

---

## EXAMPLE TEST INPUT

Use this to verify the prompt before connecting the frontend:

**Input CV text (abbreviated):**
```
Sarah Mitchell
Senior Manager, Risk & Compliance | sarah.mitchell@email.com | London

EXPERIENCE

EY LLP, London — Senior Manager, Risk Advisory                    2019–present
Leading risk and regulatory engagements for financial services clients. Key projects include FCA SMCR implementation for a mid-size investment manager, ICAAP review for a challenger bank, and a regulatory remediation programme following a Dear CEO letter. Promoted from Manager in 2021.

Deloitte LLP, London — Manager, Financial Risk                    2015–2019
Delivered model validation and stress testing engagements for Tier 1 banks. Managed teams of 3–5 and held client relationship responsibility for 2 accounts.

KPMG LLP, London — Associate, Risk Consulting                    2013–2015
Started career in risk consulting. Supported senior managers on regulatory change projects across banking and insurance clients.

QUALIFICATIONS
ACA (Institute of Chartered Accountants in England and Wales) — qualified 2016
BA Economics, University of Bristol — 2:1, 2013

SKILLS
Excel, PowerPoint, Power BI, FCA regulatory framework, SMCR, ICAAP, Basel III, client relationship management, project management
```

**Expected output:**
```json
{
  "extracted_name": "Sarah",
  "current_job_title": "Senior Manager, Risk Advisory",
  "years_experience": 11,
  "sector_primary": "Financial Services",
  "employer_org_type": "Big 4 risk advisory practice",
  "type_of_work": "governance and compliance",
  "seniority_level": "senior manager",
  "career_highlights": [
    "Led FCA SMCR implementation for a mid-size investment manager at EY",
    "Delivered ICAAP review for a challenger bank",
    "Led regulatory remediation programme following a Dear CEO letter",
    "Managed model validation and stress testing engagements for Tier 1 banks at Deloitte",
    "Promoted from Manager to Senior Manager at EY in 2021"
  ],
  "qualifications": ["ACA (ICAEW)", "BA Economics, University of Bristol (2:1)"],
  "sectors_worked_in": ["Financial Services"],
  "skills_mentioned": ["Excel", "PowerPoint", "Power BI", "FCA regulatory framework", "SMCR", "ICAAP", "Basel III", "client relationship management", "project management"],
  "independent_experience": null,
  "confidence_score": 92,
  "parse_notes": null
}
```

---

## QUESTIONNAIRE PRE-POPULATION LOGIC

When `confidence_score ≥ 50`, the frontend uses `cv_extract` to pre-populate these questionnaire fields as confirmation cards:

| cv_extract field | Pre-populates | Shown as |
|---|---|---|
| `current_job_title` | Q1 | Confirmation card |
| `years_experience` | Q2 | Confirmation card |
| `sector_primary` | Q3a | Pre-selected dropdown |
| `employer_org_type` | Q3b | Pre-filled text input |
| `type_of_work` | Q4 | Confirmation card |
| `seniority_level` | Q5 | Confirmation card |

**Q6–Q15 are always asked as normal questions** — a CV cannot answer them (Q6 needs the user's voice for their war story; Q9/Q10 are situational/attitudinal; Q11 requires market knowledge, not just employment history; Q13/Q14/Q15 may differ from CV information).

`cv_extract.independent_experience` is used to pre-seed Q12 (shown as a starting point in the text field, editable) when non-null.

The confirmation card UI shows: the extracted value, a "Looks right ✓" button, and an "Edit this" button. Confirmed values are used as-is. Edited values replace the extracted value and are flagged as `user_confirmed: true`.
