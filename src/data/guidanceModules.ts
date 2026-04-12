export interface GuidanceQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface GuidanceModule {
  id: number;
  name: string;
  area: string;
  minutes: number;
  prereq: number | null;
  questions: GuidanceQuestion[];
}

export const MODULES: GuidanceModule[] = [
  { id: 1, name: "Business Structure", area: "Legal & Tax", minutes: 5, prereq: null, questions: [
    { id: "expected_income_year1", text: "What is your expected annual income in Year 1 from independent work?", options: ["Under £30,000", "£30,000–£50,000", "£50,000–£80,000", "Over £80,000", "Unsure  - too early to say"] },
    { id: "work_pattern", text: "Will most of your work be on fixed-term contracts for a single client, or spread across multiple clients?", options: ["Primarily one client at a time on fixed contracts", "Multiple clients, project or advisory basis", "Mix of both", "Not sure yet"] },
    { id: "client_ltd_requirement", text: "Do your target clients typically require you to operate as a limited company?", options: ["Yes, most require a Ltd", "No, sole trader is fine", "Unsure"] },
    { id: "admin_appetite", text: "How comfortable are you with annual admin  - filing accounts, corporation tax returns?", options: ["Fine with it  - I can handle complexity", "I prefer simplicity where possible", "Not sure what's involved yet"] },
    { id: "liability_concern", text: "Are you concerned about personal liability for the work you do?", options: ["Not really  - my work carries low personal risk", "Somewhat concerned", "Yes  - my work carries meaningful professional risk"] }
  ]},
  { id: 2, name: "Registration & Setup", area: "Legal & Tax", minutes: 5, prereq: 1, questions: [
    { id: "trading_started", text: "Have you already started doing any paid independent work?", options: ["No, not yet", "Yes, a small amount", "Yes, I've been doing this regularly"] },
    { id: "business_bank_account", text: "Do you already have a dedicated business bank account?", options: ["Yes", "No  - using personal account", "No  - haven't set one up yet"] }
  ]},
  { id: 3, name: "Tax Basics & Pensions", area: "Tax & Finance", minutes: 8, prereq: null, questions: [
    { id: "employment_overlap", text: "Are you still employed while building your independent income?", options: ["Yes  - full-time employed", "Yes  - part-time employed", "No  - fully independent now"] },
    { id: "self_assessment_registered", text: "Have you registered for Self Assessment with HMRC?", options: ["Yes", "No, not yet", "Not sure"] },
    { id: "pension_status", text: "Do you currently contribute to a pension?", options: ["Yes  - employer pension (still employed)", "Yes  - personal pension/SIPP", "No pension currently"] },
    { id: "expected_profit_year1", text: "What is your best estimate of taxable profit in Year 1?", options: ["Under £12,570 (personal allowance)", "£12,570–£30,000", "£30,000–£50,000", "Over £50,000", "Unsure"] }
  ]},
  { id: 4, name: "VAT", area: "Tax & Finance", minutes: 5, prereq: null, questions: [
    { id: "expected_turnover", text: "What do you expect your annual turnover (total fees) to be in Year 1?", options: ["Under £50,000", "£50,000–£90,000", "Over £90,000 (above VAT threshold)", "Unsure"] },
    { id: "client_vat_registered", text: "Are your target clients mainly VAT-registered businesses?", options: ["Yes  - mainly businesses that can reclaim VAT", "No  - mainly individuals or non-VAT entities", "Mix of both"] },
    { id: "significant_vatable_costs", text: "Do you have significant business costs that include VAT?", options: ["Yes  - meaningful input VAT costs", "No  - my costs are minimal", "Not sure"] }
  ]},
  { id: 5, name: "IR35", area: "Compliance", minutes: 8, prereq: null, questions: [
    { id: "typical_engagement_type", text: "How would you describe your typical working arrangement with clients?", options: ["Single client, set hours, working alongside their team", "Multiple clients, set your own hours, outcome-focused", "Mix  - depends on the engagement"] },
    { id: "substitution_clause", text: "Could you send a substitute to do the work if you were unavailable?", options: ["Yes  - I could reasonably substitute", "No  - the client would expect me personally", "Not sure"] },
    { id: "equipment_provided", text: "Will the client typically provide you with equipment (laptop, desk, etc.)?", options: ["Yes, client provides equipment", "No  - I use my own equipment", "Mix of both"] },
    { id: "public_sector", text: "Are any of your target clients in the public sector (NHS, government, universities)?", options: ["Yes  - public sector clients", "No  - private sector only", "Mix of both"] },
    { id: "large_corporate", text: "Are your target clients mainly large corporates (500+ employees)?", options: ["Yes  - mainly large corporates", "No  - mainly SMEs and mid-market", "Mix"] }
  ]},
  { id: 6, name: "Contracts & Data Protection", area: "Compliance", minutes: 8, prereq: null, questions: [
    { id: "contract_status", text: "When starting client work, do you currently have a written contract in place?", options: ["Yes  - I use a written contract", "Sometimes  - informally agreed", "No  - purely verbal or email agreements"] },
    { id: "personal_data", text: "Does your work involve processing personal data about individuals?", options: ["Yes  - regularly", "Sometimes", "No  - I work with business data only"] },
    { id: "ip_concern", text: "Does your work produce IP (reports, frameworks, methodologies) you'd want to retain rights to?", options: ["Yes  - I want to retain my methodologies", "The client owns the outputs  - fine", "Not sure what's standard"] },
    { id: "client_contracts", text: "Do your clients typically send their own contracts for you to sign?", options: ["Yes  - clients always send their own", "Sometimes  - it varies", "No  - I'm expected to provide the contract"] }
  ]},
  { id: 7, name: "Insurance", area: "Risk & Protection", minutes: 8, prereq: null, questions: [
    { id: "advice_risk", text: "Could a client suffer a financial loss as a direct result of advice or work you provide?", options: ["Yes  - clearly", "Possibly  - in some scenarios", "Unlikely  - my work is process/delivery focused"] },
    { id: "client_site", text: "Will you regularly meet clients in person or visit client sites?", options: ["Yes  - regularly in person", "Sometimes", "Mainly remote working"] },
    { id: "income_protection_runway", text: "If you were unable to work for 3+ months due to illness, how long could you cover living costs from savings?", options: ["Less than 1 month", "1–3 months", "3–6 months", "Over 6 months"] },
    { id: "dependants", text: "Do you have financial dependants who rely on your income?", options: ["Yes", "No"] },
    { id: "existing_personal_cover", text: "Do you currently have life insurance or income protection?", options: ["Yes  - life insurance", "Yes  - income protection", "Yes  - both", "No personal cover"] }
  ]},
  { id: 8, name: "Record Keeping & Finance", area: "Operations", minutes: 5, prereq: null, questions: [
    { id: "accounting_tool", text: "Are you currently using any accounting or invoicing software?", options: ["Yes  - FreeAgent", "Yes  - Xero or QuickBooks", "Spreadsheet only", "Nothing set up yet"] },
    { id: "expected_invoice_volume", text: "How many invoices do you expect to send per month on average?", options: ["1–3 per month", "4–10 per month", "Over 10 per month"] },
    { id: "receipt_tracking", text: "How do you currently track business expenses and receipts?", options: ["Digital tool or app", "Spreadsheet", "Physical receipts only", "Not tracking yet"] },
    { id: "accountant", text: "Are you working with an accountant?", options: ["Yes  - retained", "Yes  - ad-hoc only", "No  - handling myself", "Not decided yet"] }
  ]},
  { id: 9, name: "Professional Presence", area: "Profile & Positioning", minutes: 5, prereq: null, questions: [
    { id: "linkedin_status", text: "How up to date is your LinkedIn profile?", options: ["Up to date  - reflects current positioning", "Needs updating  - reflects old employed role", "Minimal profile", "No LinkedIn profile"] },
    { id: "domain_status", text: "Do you have a personal professional domain name registered?", options: ["Yes  - and I use it for email", "Yes  - but not using it for email", "No  - not yet"] },
    { id: "email_status", text: "What email address do you use for professional correspondence?", options: ["Professional domain email (name@mydomain.co.uk)", "Gmail or similar free email", "Work email (current employer)"] },
    { id: "website_status", text: "Do you have a professional website?", options: ["Yes  - live and up to date", "Partly built", "No  - not built yet", "Not sure I need one"] }
  ]}
];
