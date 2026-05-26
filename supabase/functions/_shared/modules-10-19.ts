// _shared/modules-10-19.ts
// Modules 10-19 from canonical guidance_modules.json v2.0
// Generated 2026-05-15. Imported by modules-library-rich.ts.

import type { RichModule } from "./modules-rich-types.ts";

export const MODULES_10_19: Record<number, RichModule> = {
  10: {"id":10,"name":"Record Keeping & Bookkeeping","track":"C","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":1,"area":"Financial Management","trigger_phase":"Phase 2 onward","estimated_minutes":6,"output_type":"setup_guide_with_tools","description":"The habits, tools, and setup to have in place before your first invoice goes out.","what_you_get":"A recommended toolset, the minimum records you must keep, and a monthly close routine you can actually stick to.","questions":[{"id":"structure","text":"Which structure are you operating under?","type":"choice","options":["Sole trader","Limited company","Umbrella"],"pre_populate_from":"module_1_output.recommendation"},{"id":"transaction_volume","text":"How many transactions do you expect per month — invoices out and bills in — roughly?","type":"choice","options":["Under 20","20–50","Over 50"]},{"id":"bank_account_setup","text":"Do you already have a dedicated business bank account?","type":"choice","options":["Yes","No"],"pre_populate_from":"module_2_output.bank_account_status"},{"id":"vat_registered","text":"Are you registered for VAT or likely to be soon?","type":"choice","options":["Yes, registered","No, and unlikely","Possibly — approaching threshold"],"pre_populate_from":"module_5_output.vat_decision"}],"output_structure":{"bookkeeping_tool_recommendation":"Specific tool for their structure and volume (spreadsheet | FreeAgent | Xero | QuickBooks) with rationale","invoice_template_brief":"What must appear on invoices for their structure","deductible_expenses":"Most relevant deductions for their business model","record_keeping_checklist":"What to file, where, and for how long","bank_account_flag":"Flagged as Day 1 action if not yet set up"},
    module_addendum: {
      module_decision_frame: "User is operating under a chosen structure (Q1 pre-populated from Module 1), with expected monthly transaction volume (Q2), business bank account status (Q3 pre-populated from Module 2), and VAT status (Q4 pre-populated from Module 5). Produce a specific bookkeeping tool recommendation for their volume and structure, invoice template requirements, the records they must keep and for how long, and a monthly close routine. If bank account is not yet set up, flag it as Day 1 action because clean separation from personal accounts is the foundation everything else sits on.",
      module_specific_knowledge: `Bookkeeping tool choices for UK independents in 2026/27. Spreadsheet works only for very low volume (under 10 transactions per month) and a sole trader who is not VAT-registered. Once you cross either threshold, you need real software, partly for sanity, partly because Making Tax Digital (MTD) requires digital record keeping for VAT-registered businesses now and will be extended to sole traders earning above £50,000 from April 2026 (MTD for Income Tax Self Assessment).

FreeAgent: £19-£29/month standalone, free for life with a NatWest, RBS, Mettle, or Ulster Bank business account. Built specifically for UK sole traders, contractors, and small Ltd companies. Self Assessment filing integrated. Probably the best fit for sole traders and small Ltds with under 50 transactions/month.

Xero: £15-£59/month depending on tier. Stronger for limited companies, better for businesses with employees or subcontractors. Larger ecosystem of integrations. Default choice if your accountant prefers it (many UK independent-friendly accountants standardise on Xero).

QuickBooks: £14-£59/month. Similar feature set to Xero. Sometimes preferred by US-influenced businesses.

Sage: £12-£40/month. UK heritage; some independents and accountants prefer it; can feel more dated than Xero/QB.

Invoice requirements. A sole trader invoice must show: your name (or trading name) and address; an invoice number (sequential, no gaps); date; description of goods or services; client name and address; amount due; payment terms. A limited company invoice must additionally show: company name as registered at Companies House; company registration number; registered office address. A VAT-registered business invoice must additionally show: VAT registration number; rate of VAT applied to each item; total VAT charged.

Record retention. Sole trader: 5 years past the 31 January Self Assessment filing deadline for the relevant tax year. Limited company: 6 years from the end of the financial year. VAT records: 6 years. Records can be digital, HMRC accepts scanned receipts and digital invoice files. The records must be accessible and legible for the full retention period.

Monthly close routine. A 30-minute monthly habit prevents most year-end pain. Each month: reconcile bank to bookkeeping; categorise any uncategorised transactions; capture any receipts not yet recorded; review unpaid invoices and chase if overdue; reserve tax percentage on income received; back up data (cloud tools do this automatically). The discipline is the same whether you use FreeAgent, Xero, or a spreadsheet.

Receipt capture. Apps like Dext (£12-£30/month) and Hubdoc (included in Xero) auto-extract data from receipt photos. For low volume, a dedicated email folder and monthly batch upload is sufficient.`,
      curated_caveat_base: "Tool pricing changes periodically. Compare current pricing on each vendor's website before subscribing. MTD for Income Tax Self Assessment timing has shifted multiple times since first announcement; confirm the current applicability threshold at gov.uk/government/collections/making-tax-digital-for-income-tax. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Pick and set up a bookkeeping tool", target_day: 14, verification_question: "Have you chosen and set up a bookkeeping tool?" },
        { action_hint: "Create your invoice template with required fields", target_day: 7, verification_question: "Do you have an invoice template ready that includes all legally required fields?" },
        { action_hint: "Document your monthly close routine", target_day: 30, verification_question: "Have you documented and scheduled a monthly close routine?" },
      ],
      prerequisite_outputs: null,
    },
  },
  11: {"id":11,"name":"Invoicing & Cash Flow","track":"C","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":10,"area":"Financial Management","trigger_phase":"Phase 2 — first client approaching","estimated_minutes":7,"output_type":"invoicing_cashflow_plan","description":"How to invoice correctly, protect your cash position, and stop getting paid late — the operational realities most independents learn the hard way.","what_you_get":"Invoice template requirements, how to set payment terms that get respected, and the chasing sequence that works.","questions":[{"id":"commercial_model","text":"How will you primarily bill clients?","type":"choice","options":["Monthly retainer","Project milestones","Day rate / time-billed","Mix of the above"],"pre_populate_from":"plan.recommended_model_commercial_type"},{"id":"typical_client_size","text":"What size are your typical clients?","type":"choice","options":["Large organisations — procurement teams, 30-day payment policies","SME — finance director or owner pays","Mix"]},{"id":"cash_reserve","text":"How many months of personal living expenses do you currently have in cash reserve?","type":"choice","options":["Under 1 month","1–3 months","3–6 months","Over 6 months"]},{"id":"first_invoice_issued","text":"Have you issued your first invoice yet?","type":"choice","options":["Yes","No — imminent","No — still some weeks away"]}],"output_structure":{"invoicing_setup":"Invoice format, required fields, numbering system, and submission process for their client type","payment_terms_recommendation":"Specific payment terms for their commercial model — retainer vs. milestone vs. day rate — with rationale","late_payment_protection":"Specific clause language, statutory interest rights, and escalation process","cash_flow_management":"Rolling cash flow tracking approach, tax reserve discipline (specific % to set aside), buffer target","deposit_strategy":"Whether and when to take deposits — recommendation calibrated to their client type and engagement size","caveat":"Cash flow is the most common operational failure point for new independents. The discipline you build in the first 90 days tends to persist — good or bad."},
    module_addendum: {
      module_decision_frame: "User has a commercial model (Q1 pre-populated from plan, retainer / milestones / day rate / mix), client size profile (Q2), cash reserve runway (Q3), and first invoice status (Q4). Produce invoice format guidance, recommended payment terms specific to their commercial model, late payment protection clause language with statutory rights, cash flow tracking with a specific tax reserve percentage, and deposit strategy. The strong opinion: cash flow discipline built in the first 90 days persists for years; the discipline matters more than any tool.",
      module_specific_knowledge: `Payment term standards by client type in UK 2026/27. Large corporate clients (PLCs, large private companies): net 30 contractually, but expect 45-60 days actual payment. Some require invoice submission through a portal (Coupa, Ariba, SAP) which adds 5-10 days. Public sector: net 30 contractually per Public Contracts Regulations 2015. SMEs (FD or owner pays): net 30 standard, often paid in 7-14 days if the relationship is good. Individuals: pay on receipt expected.

Payment structures by commercial model. Monthly retainer: invoice on the 1st of the month for the month ahead (in advance) or at month-end for the month just delivered. In-advance is cleaner for cash flow. Project milestones: 30% on signature, 30% at mid-point milestone, 40% on completion is common for projects under £30k. Day rate: weekly or fortnightly invoicing keeps cash flowing during long engagements.

Late Payment of Commercial Debts (Interest) Act 1998. Statutory rights for B2B invoices: 8% over Bank of England base rate as interest on overdue invoices (current effective rate around 13%); plus a fixed late payment fee of £40 (debts under £1,000), £70 (£1,000-£9,999), or £100 (over £10,000) per overdue invoice; plus reasonable costs of recovery. Include a clause in your terms referencing these rights, makes enforcement straightforward and signals seriousness.

The chasing sequence that works. Day after due date: polite reminder email to the original recipient. Day +7: firmer email, copy in the original commissioning person if different, reference late payment terms. Day +14: phone call to AP if you have the contact, otherwise email escalating to finance department. Day +30: formal letter before action referencing the Late Payment Act and stating intent to charge interest and fees. Day +45: small claims court (online via gov.uk/make-court-claim-for-money) for amounts up to £10,000 is a £35-£455 fee depending on claim size and is straightforward to use.

Deposit strategy. New client relationships: take a deposit on engagements above £5,000. 30% on signature is reasonable; 50% is acceptable for individuals or sub-£3,000 work. Established client relationships: deposits typically waived after 2-3 successful engagements. Project-based work: milestone payments work better than deposit + completion.

Cash reserve discipline. For an independent consultant, the recommendation is 3-6 months of personal living expenses in cash reserve, separate from business cash. Tax reserve is on top of that. The combined position prevents the "good month, spend; bad month, panic" cycle that kills 18-month independents.

Tax reserve percentages by income band (sole trader). Under £15k profit: 0% (below personal allowance). £15-30k: 15%. £30-50k: 25%. £50-100k: 35%. Over £100k: 40%. Move the reserve into a separate savings account on the day each invoice payment lands. See Module 1's "Sole trader tax reserve" reference item for full detail.`,
      curated_caveat_base: "Late Payment of Commercial Debts (Interest) Act rates track the Bank of England base rate; the 8% premium is fixed but the base rate changes. Statutory fixed costs and small claims court fees occasionally update; verify at gov.uk before invoking. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Create your invoice template and terms of business", target_day: 7, verification_question: "Do you have an invoice template and terms-of-business document ready?" },
        { action_hint: "Set up a separate tax reserve account", target_day: 14, verification_question: "Have you set up a separate savings account for tax reserves?" },
        { action_hint: "Document your overdue-invoice chasing sequence", target_day: 14, verification_question: "Have you documented your invoice chasing sequence with day-by-day actions?" },
      ],
      prerequisite_outputs: null,
    },
  },
  12: {"id":12,"name":"Pricing Strategy & Rate Setting","track":"C","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Commercial","trigger_phase":"Days 1–14","estimated_minutes":8,"output_type":"pricing_recommendation","description":"What to charge, how to structure it, and why most independents start too low and stay there.","what_you_get":"A rate recommendation with rationale, how to present pricing to clients, and how to move rates up over time.","questions":[{"id":"current_rate_thinking","text":"Do you have a day rate or retainer figure in mind?","type":"choice","options":["Yes — I have a specific number","I have a rough range","I don't know where to start"]},{"id":"day_rate_estimate","text":"If you have a figure in mind, what is it? (Approximate — this stays private)","type":"text","optional":true,"placeholder":"e.g. £600/day or £4,000/month retainer"},{"id":"former_salary","text":"What was your approximate gross salary in your last employed role?","type":"choice","options":["Under £50,000","£50,000–£80,000","£80,000–£120,000","£120,000–£175,000","Over £175,000"]},{"id":"primary_commercial_model","text":"How will you primarily charge?","type":"choice","options":["Day rate","Monthly retainer","Project fee","Mixed — depends on the engagement"],"pre_populate_from":"plan.recommended_model_commercial_type"},{"id":"discount_pressure","text":"How do you expect to handle clients who push back on your rates?","type":"choice","options":["I'd hold the rate","I'd probably reduce it","I'm not sure — I haven't faced it yet"]}],"decision_logic":{"day_rate_baseline":"Divide gross salary by 220 (employed days), then multiply by 2-2.5 to account for non-billable time, no benefits, and market differential. This is the floor, not the ceiling.","market_calibration":"Financial services, legal, technology, and senior interim roles command premiums over baseline; training and L&D roles typically sit below","retainer_conversion":"Monthly retainer should reflect 10-12 guaranteed days of availability, not 20. Clients pay for access and priority, not just hours delivered","anchoring_principle":"Always quote higher than you think is right. You can negotiate down; you cannot negotiate up."},"output_structure":{"rate_recommendation":"Specific rate range — day rate and/or monthly retainer — calibrated to their salary history, sector, and commercial model","rate_rationale":"Why this range, with market context from their sector","rate_structure_guide":"How to present rates — what to quote first, how to structure retainer offers, how to handle day rate vs. project fee","negotiation_framework":"Where the floor is, what to concede vs. protect, how to handle pushback without caving","rate_review_timeline":"When to revisit — typically after first 2-3 engagements or 6 months trading","caveat":"Market rates vary significantly by sector, seniority, and client type. The figures here are calibrated to your profile but should be sense-checked against live market data in your sector."},
    module_addendum: {
      module_decision_frame: "User has current rate thinking (Q1, specific / rough / none), an optional specific figure (Q2), former salary band (Q3), primary commercial model (Q4 pre-populated from plan), and a stance on discount pressure (Q5). Produce a rate recommendation calibrated to their salary history + sector + commercial model, rationale, presentation guidance (anchoring, option structure), negotiation framework (where the floor is), and a review timeline. The strong opinion: most independents start too low and stay too low because they fear losing the first client; the right starting position is higher than feels comfortable, with discipline to hold it.",
      module_specific_knowledge: `Salary-to-rate baseline formula. Take the gross annual salary in the last employed role. Divide by 220 (the number of working days after holiday, sickness, public holidays, and training). That gives the per-day cost-to-employer equivalent at the employed rate. Multiply by 2.0 to 2.5 to convert to independent day rate. The 2.0-2.5 multiplier accounts for: unpaid holiday (5 weeks vs employed paid holiday), no employer pension contribution, no sick pay, no employer NI contribution, no career development funding, no employer insurance contributions, and the risk premium of irregular income.

Worked example: £80,000 employed salary → £364/day employed cost equivalent → £728-£910 independent day rate baseline. That is the FLOOR. Sector premiums add to it. Junior independents often work below baseline because they confuse "what I earned" with "what I am worth in the market"; market rate is determined by the commercial value to the client, not the seller's salary history.

Sector premiums above baseline (2026/27 UK indicative). Financial services advisory: 20-40% premium. Legal and regulatory: 20-40% premium. Public sector via consultancies: 15-30% (G-Cloud rates compress). Technology (architect, security, data): 15-30%. Senior interim management: 30-50%. Healthcare clinical: depends heavily on specialism. Training and L&D: typically at or below baseline.

Retainer math. A retainer is NOT 20 days a month at your day rate. It is access and priority for 8-12 days a month at a small per-day discount (10-20%) reflecting the guarantee of cash flow. A £700/day independent might charge £6,000-£8,000/month for an advisory retainer rather than £14,000/month for full-time-equivalent. Clients pay for access and priority, not just hours delivered.

Project fee. Day rate × estimated days + a 15-25% risk margin for scope uncertainty + project management overhead. Always present project fees as a fixed price not a day count; the client buys the deliverable. Internal estimate: use a buffer; quote with confidence.

Anchoring. Always quote higher than feels comfortable. You can negotiate down; you cannot negotiate up. The rate you say first becomes the anchor for the negotiation. If the client asks for your rate before you have qualified the engagement, deflect once ("I want to understand the work before I quote, can you tell me more about scope and timeline?") then quote at the top of your range.

Discount pressure. The right response to "is that your best rate?" is "the rate reflects the scope we have discussed; if scope changes, the rate changes". The wrong response is to drop the rate immediately. Discounts conceded without scope reduction signal that the original price was over-stated, damaging future negotiations with the same client. If you must reduce, reduce scope or terms (deposit waived, payment terms extended) rather than rate.

Rate review timeline. First rate review: after 2-3 engagements at the current rate or 6 months trading, whichever comes first. Review with new clients first (10-20% increase typical); existing clients with a 90-day notice. Annual review thereafter is the minimum; sector premium changes faster than that in technology and FS, so semi-annual works there.

Common rate mistakes. Pricing by the hour for advisory work (encourages efficient billing not effective work; caps perceived value at the hourly rate × visible hours). Quoting day rate in the first email to a new lead (anchors low without context). Reducing rate to "get the foot in the door" with a first client (sets a precedent that compounds). Not raising rates for existing clients ("they were generous when I started" becomes "they pay me 30% under market 3 years later"). Quoting a range without conviction ("£500-£800/day depending on the work" tells the client to expect £500).`,
      curated_caveat_base: "Day rate benchmarks vary significantly by sector, specialism, client type, and individual reputation. The figures above are indicative for typical UK independent consultants in 2026/27. Validate against live market data in your sector through peers and known recent engagements before fixing your rate. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Document your rate decision and the rationale", target_day: 7, verification_question: "Have you written down your day rate, retainer rate, and project pricing approach?" },
        { action_hint: "Publish your rate position on LinkedIn or your website", target_day: 14, verification_question: "Have you signalled your rate position publicly where prospective clients see it?" },
        { action_hint: "Set a rate review calendar reminder for month 6", target_day: 7, verification_question: "Have you scheduled a rate review for 6 months from now?" },
      ],
      prerequisite_outputs: null,
    },
  },
  13: {"id":13,"name":"Expenses & Allowable Deductions","track":"C","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":4,"area":"Financial Management","trigger_phase":"Days 14–30","estimated_minutes":6,"output_type":"expenses_reference_guide","description":"What you can legitimately claim, what you cannot, and how to handle the grey areas — a working reference calibrated to your business model.","what_you_get":"A categorised list of allowable expenses for your situation, the home office calculation, and the grey area guidance.","questions":[{"id":"structure","text":"What structure are you operating under?","type":"choice","options":["Sole trader","Limited company","Umbrella"],"pre_populate_from":"module_1_output.recommendation"},{"id":"work_location","text":"Where do you primarily work?","type":"choice","options":["Mostly from home","Mostly client premises","Mix of home and client premises","Mix of home and my own office/studio"]},{"id":"client_travel","text":"Does your work involve regular travel to client sites?","type":"choice","options":["Yes, regularly","Occasionally","Rarely — primarily remote"]},{"id":"professional_development","text":"Do you invest in professional development — courses, memberships, publications?","type":"choice","options":["Yes, regularly","Occasionally","Rarely"]}],"output_structure":{"allowable_expenses":"Categorised list of legitimate expenses for their structure and work pattern — with specific guidance on grey areas (home office, phone, meals)","home_office_guidance":"Specific calculation method for their situation — simplified flat rate vs. actual costs","disallowable_expenses":"Common mistakes — what independents try to claim that HMRC disallows","record_keeping_requirements":"What evidence is needed for each category and for how long","limited_company_extras":"Director-specific deductions only available through a Ltd (if applicable)","caveat":"Allowable expense rules are set by HMRC and can change at each Budget. Always verify current guidance at hmrc.gov.uk/expenses or with your accountant."},
    module_addendum: {
      module_decision_frame: "User has a structure (Q1 pre-populated from Module 1), primary work location (Q2, home / client premises / mix), client travel pattern (Q3), and professional development habits (Q4). Produce an allowable expense list categorised by their structure and work pattern, the home office calculation method most appropriate to their situation, common disallowable expenses to avoid, record-keeping requirements, and Ltd-specific extras where applicable. The strong opinion: most independents under-claim deductions in Year 1 because they do not know what is claimable; a few missed categories add up to material tax.",
      module_specific_knowledge: `Allowable expenses are costs incurred wholly and exclusively for the business. The wholly-and-exclusively test is strict: anything with a meaningful personal use element must be apportioned.

Office and admin. Stationery, postage, printing. Software subscriptions used for the business (Notion, Xero, Adobe). Phone and broadband: business proportion only (home broadband typically 30-50% business use for a home-based independent; mobile typically 70-100% business use for a working phone).

Travel. Travel to clients: train, taxi, parking, congestion charge, mileage at HMRC rates (45p/mile first 10,000 miles in the tax year, 25p above) for business journeys in your own car. NOT travel from home to a regular workplace (commute is disallowable even for the self-employed). NOT travel where the journey is mixed business/personal without clear apportionment.

Subsistence. Lunch at client meetings: NOT allowable unless overnight away from your usual base (in which case meals and accommodation are claimable). The "wholly and exclusively" test fails for normal eating during the working day. Overnight subsistence at a reasonable hotel cost claimable.

Equipment. Capital allowances. Annual Investment Allowance of £1,000,000 for 2026/27, most independent consultants can claim 100% of equipment cost in the year of purchase (laptop, monitor, peripherals, desk, ergonomic chair if used for business). Mixed-use equipment must be apportioned.

Professional development. Training relevant to existing business activity is allowable; training to qualify for a new line of work is NOT allowable (capital expenditure, not revenue). Books, journals, conferences if relevant. Professional body memberships: only those on HMRC's approved list (gov.uk/government/publications/professional-bodies-approved-for-tax-relief-list-3), includes ICAEW, ACCA, CIPD, BCS, CIMA, CFA, IIA, ICAS, ACAMS, and many more.

Insurance. Professional indemnity, public liability, employers liability, business equipment, cyber, business legal protection, all allowable.

Bank and accounting. Business bank account fees, accountancy fees, business bookkeeping software, allowable.

Marketing. Website hosting and domain, LinkedIn Premium, paid advertising, marketing materials, allowable.

Home office calculation. Two methods.

Simplified flat rate (HMRC simplified expenses): £10/month if 25-50 hours of business use per month, £18/month for 51-100 hours, £26/month for 101+ hours. Easy, but small relative to actual costs for someone using a dedicated room.

Proportional method (actual costs): identify utility costs (electricity, gas, council tax, mortgage interest or rent, water, building insurance, broadband if not separately claimed). Apportion by business use percentage: typically rooms used for business divided by total rooms in the house (excluding hallway, bathroom, kitchen), then further apportioned by time used for business. Example: 5-room house with 1 dedicated office, used 8 hours/day weekdays = 1/5 × (40 / 168) ≈ 4.8% of annual utilities. Often produces a higher claim than simplified, particularly for those with high household bills.

Disallowable expenses (common mistakes). Personal clothing including business attire (not allowable unless it's specific protective or branded uniform). Hairdressing, personal grooming. Personal phone use. Commute to a regular workplace. Childcare. Personal pension contributions for sole traders (these are claimed differently, relief at source via the pension, plus higher-rate top-up via Self Assessment, NOT a business expense).

Limited company extras. Mobile phone in company name (the phone and contract are paid by the company, no benefit-in-kind tax on the director). Employer pension contributions (deductible from Corporation Tax, no personal income tax). Health screening for directors (annual eye test for VDU users; medical check-ups under specific HMRC concessions). Christmas party / annual events up to £150/head/year (small benefits exemption). Trivial benefits up to £50 each (£300/year cap for directors).`,
      curated_caveat_base: "HMRC allowable expense rules and apportionment methods change at Budgets. Verify current guidance at gov.uk/expenses-if-youre-self-employed and gov.uk/expenses-and-benefits-a-to-z before claiming significant or unusual expenses. For grey areas particularly around home office or mixed-use equipment, a one-off accountant consultation (typically \u00a3150-\u00a3250) is usually worth it in Year 1. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Choose your home office calculation method", target_day: 30, verification_question: "Have you decided whether to use simplified flat rate or proportional actual costs for home office?" },
        { action_hint: "Set up a receipt capture habit", target_day: 7, verification_question: "Are you capturing receipts (digital or paper) for all business expenses?" },
        { action_hint: "List the 3 most relevant expense categories for your work", target_day: 14, verification_question: "Have you identified the three expense categories most relevant to your specific business?" },
      ],
      prerequisite_outputs: null,
    },
  },
  14: {"id":14,"name":"Pension & Long-term Financial Planning","track":"C","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":4,"area":"Financial Management","trigger_phase":"Days 14–30","estimated_minutes":8,"output_type":"pension_and_financial_plan","description":"The pension gap most independents ignore for too long, the tax-efficient structures available to you, and a practical planning framework.","what_you_get":"Your pension gap assessment, the tax efficiency of employer contributions through a limited company, and a monthly contribution target.","questions":[{"id":"structure","text":"Which structure are you operating under?","type":"choice","options":["Sole trader","Limited company","Umbrella"],"pre_populate_from":"module_1_output.recommendation"},{"id":"pension_status","text":"Do you currently have a pension (workplace or personal) you are contributing to?","type":"choice","options":["Yes, actively contributing","Yes but dormant / stopped","No pension at all"]},{"id":"age_bracket","text":"Which age bracket are you in?","type":"choice","options":["Under 35","35–44","45–54","55 or over"]},{"id":"employer_pension_lost","text":"Were you in an employer pension scheme you are now leaving?","type":"choice","options":["Yes — with employer contributions","Yes — minimal employer contribution","No"]},{"id":"target_retirement_age","text":"Do you have a target retirement age or financial independence date?","type":"choice","options":["Yes — specific target","Loose idea — late 50s or 60s","No plan yet"]}],"output_structure":{"pension_vehicle_recommendation":"Most efficient pension structure for their legal entity — SIPP (sole trader / Ltd), workplace pension (umbrella), employer pension contributions (Ltd) — with tax efficiency rationale","contribution_strategy":"How much to contribute, how often, and whether to use pension to reduce a tax liability for their income band","ltd_employer_contribution_brief":"For Ltd users only — how director employer contributions work and what the tax saving looks like at their profit level","pension_gap_estimate":"Rough estimate of the pension gap created by leaving employment — what they need to contribute to maintain trajectory","provider_shortlist":"2-3 specific pension providers for their situation — not generic, not sponsored","timeline_urgency":"Prioritisation: what to set up in the first 90 days vs. what can wait","caveat":"Pension planning involves decisions with long-term consequences. This module gives you a grounded starting point — confirm your strategy with an independent financial adviser before committing to significant contributions."},
    module_addendum: {
      module_decision_frame: "User has a structure (Q1 pre-populated from Module 1), current pension status (Q2, active / dormant / none), age bracket (Q3), employer pension lost on leaving employment (Q4), and a target retirement age (Q5). Produce the most efficient pension vehicle for their structure, a contribution strategy, the employer-contribution lever specifically for Ltd users, a pension gap estimate, a provider shortlist, and timeline urgency. The strong opinion for Ltd users: employer pension contributions are the single largest tax-efficient lever available to a higher-earning independent; ignoring them costs thousands per year.",
      module_specific_knowledge: `Pension vehicle by structure.

Sole trader: personal pension or SIPP (Self-Invested Personal Pension). Contributions get 20% basic-rate tax relief at source from the pension provider (you pay £80, £100 lands in the pension). Higher-rate taxpayers reclaim the additional 20% through Self Assessment. Additional-rate taxpayers reclaim a further 5%. Maximum tax-relievable contribution is the lower of £60,000 (the annual allowance) or 100% of relevant UK earnings.

Limited company director: BOTH a personal pension AND employer contributions from the company. Employer contributions are the major lever for independent Ltds. Employer contributions are deductible from Corporation Tax (saving 19-26.5% depending on profit level) and do not trigger personal Income Tax or NI on the director. Annual allowance £60,000 for 2026/27. A Ltd making £100,000 profit can contribute up to £60,000 as employer pension, saving roughly £15,000-£16,000 in Corporation Tax + dividend tax that would have been paid otherwise.

Umbrella employee: workplace pension via the umbrella company. Employer contribution typically 3% (auto-enrolment minimum) plus your contribution (5% minimum default; can opt to contribute more). Far less flexible than sole trader or Ltd routes.

Annual allowance details. £60,000 for 2026/27 (was £40k pre-2023/24). Tapered for high earners: above £260,000 of threshold income or £200,000 of adjusted income, the allowance reduces by £1 for every £2 over the threshold, down to a minimum of £10,000. Carry forward: unused annual allowance from the three previous tax years can be used in the current year, provided you were a member of a registered pension scheme in those years.

Lifetime allowance: abolished from April 2024. No lifetime cap on tax-relieved pension savings.

Provider shortlist (well-known UK platforms, not specific recommendations, choose based on fees, fund range, and service for your situation). Vanguard SIPP: low cost (0.15% platform fee capped at £375/year), Vanguard funds only, suits passive investors. Hargreaves Lansdown SIPP: higher cost (0.45% platform fee), broadest fund range, strong service. AJ Bell SIPP: mid-cost (0.25% platform fee capped at £10/month for shares), good fund range. Interactive Investor SIPP: flat-fee model (£12.99/month), better for larger balances. PensionBee: simple, lower cost, good for consolidating old pots. Nest, NOW: Pensions, The People's Pension: workplace pension providers used by umbrella companies.

Pension gap when leaving employment. Typical employee in a workplace pension with employer matching contributes ~8% of salary total (3% employer + 5% employee minimum auto-enrolment, often higher). A £60,000 salary employee contributing 8% loses £4,800/year of pension contribution when leaving employment unless replaced. For a Ltd director at the same income level, replacing through employer contributions costs about £4,800/year in pre-tax money (or about £3,600 net of the Corporation Tax saving).

Contribution strategy by age and income.

Under 35, lower income: build the habit; £100-£300/month into a SIPP; focus on equity-heavy funds; review annually.

35-44, moderate income: target 10-15% of gross income; if Ltd, use employer contributions; consider salary sacrifice if employed alongside the independent work.

45-54, established: this is the high-contribution decade; £500-£2,000/month typical; carry forward unused allowance from prior years if you have spare capacity.

55+: drawdown becomes available from 55 (rising to 57 from 2028). Tax-free lump sum (25% of pot up to £268,275 cap). Strategy shifts to balancing contributions vs drawdown.

Workplace pension transfers. Old workplace pension pots can be transferred into a SIPP for consolidation. Check exit fees on the existing scheme. Defined Benefit (final salary) schemes should almost never be transferred out, the transfer value rarely matches the long-term value of the guaranteed income, and the FCA requires regulated advice (which is expensive) for transfers above £30,000.`,
      curated_caveat_base: "Pension regulation, annual allowance, and tapering thresholds change at Budgets. Pension transfer decisions and high-value contribution strategies are regulated advice areas, for contributions above ~\u00a320,000 per year, or any transfer from a Defined Benefit scheme, consult an FCA-regulated Independent Financial Adviser (IFA). The framework above is structured guidance, not financial advice. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Review your current pension status and document it", target_day: 14, verification_question: "Have you reviewed and documented your current pension position?" },
        { action_hint: "If Ltd, set up the employer pension scheme alongside payroll", target_day: 30, verification_question: "If you are a Ltd director, is the employer pension scheme set up alongside payroll?" },
        { action_hint: "Make your first contribution at the recommended level", target_day: 60, verification_question: "Have you made your first contribution at the recommended monthly level?" },
      ],
      prerequisite_outputs: null,
    },
  },
  15: {"id":15,"name":"Pipeline & Opportunity Management","track":"D","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Commercial Execution","trigger_phase":"Phase 2 — first outreach","estimated_minutes":7,"output_type":"pipeline_setup_guide","description":"How to track your pipeline, prioritise your time, and avoid the feast-and-famine cycle — the most common operational failure for new independents.","what_you_get":"A simple pipeline system you'll actually use, how to qualify opportunities early, and the re-engagement cadence for warm leads.","questions":[{"id":"outreach_started","text":"Have you started reaching out to potential clients or contacts?","type":"choice","options":["Yes — several conversations underway","Yes — one or two early conversations","Not yet"]},{"id":"active_opportunities","text":"How many live opportunities or conversations do you currently have?","type":"choice","options":["0","1–3","4–8","More than 8"]},{"id":"crm_tool","text":"Are you currently using anything to track your opportunities?","type":"choice","options":["Yes — a proper CRM tool","Yes — a spreadsheet","Notes or memory","Nothing yet"]},{"id":"current_business_risk","text":"Do you have any current or imminent income — or are you starting from zero?","type":"choice","options":["Starting from zero — need first client soon","First income in sight — need to build pipeline behind it","Already earning — want to grow and protect the pipeline"]}],"output_structure":{"pipeline_tool_recommendation":"Specific tool recommendation for their volume and preference — simple spreadsheet template structure | Notion | HubSpot free | other — with rationale","pipeline_stages":"The 4-5 stage framework for their business model (not a generic CRM template — calibrated to their commercial type)","weekly_rhythm":"Specific weekly pipeline review habit — what to check, what to act on, how long it should take","feast_famine_protection":"The rule that prevents it: never stop outreach during delivery. Minimum viable pipeline activity during active client work.","prioritisation_framework":"How to rank opportunities when time is limited — deal size, close probability, relationship strength","caveat":"Pipeline management is a discipline, not a tool. The tool matters less than the habit. Set a recurring calendar slot this week."},
    module_addendum: {
      module_decision_frame: "User has outreach status (Q1, several conversations / one or two / not yet), active opportunity count (Q2, 0 to 8+), CRM tooling (Q3, proper CRM / spreadsheet / notes / nothing), and current business risk (Q4, starting from zero / first income in sight / already earning). Produce a tool recommendation calibrated to volume and preference, a 4-5 stage pipeline framework for their commercial type, a weekly pipeline rhythm, the rule that prevents feast-and-famine, and a prioritisation framework. The strong opinion: pipeline management is a discipline not a tool; the habit of weekly review prevents the most common operational failure for new independents (focus on delivery for current client, lose the pipeline behind it, panic when they finish).",
      module_specific_knowledge: `Pipeline tool recommendations for independent consultants by volume.

Under 5 active opportunities: a spreadsheet is sufficient. Notion, Google Sheets, or Airtable. Columns: lead name, organisation, source, current stage, next action, next action date, deal value estimate, close probability, notes.

5-15 active opportunities: a structured tool helps. HubSpot Free (covers contact management, deal pipeline, email integration; truly free for low volume). Pipedrive (£12-£50/user/month; clean pipeline-first UI). Streak (£15-£59/user/month; runs inside Gmail). Notion with a database (free if you already use Notion).

15+ active opportunities: full CRM warranted. HubSpot Starter (£15-£20/month). Pipedrive Advanced (£30-£60/month). Folk (£14-£30/month; well-designed for solo and small team).

Pipeline stages for independent consultants (calibrate to your commercial type, not generic). A 4-5 stage framework works for most independents:

Stage 1: Lead identified (named person, named organisation, plausibly relevant work, not yet contacted).

Stage 2: Initial conversation (had a call or meeting, established mutual interest, gathering context).

Stage 3: Proposal in flight (scope discussed, proposal sent or in progress, awaiting decision).

Stage 4: Won / Lost / Postponed (closed). Won converts to active client; Lost goes to nurture; Postponed gets a 90-day re-engagement reminder.

Optional Stage 0: Cold prospect (in your target list, not yet identified by name). Useful for systematic outreach.

Weekly pipeline review rhythm. 15-30 minutes, same time each week (Monday morning works for most). Review every opportunity in stages 1-3. For each: what was the last action, what is the next action, when. Move stale opportunities forward or kill them. Update close probability. Note any actions to take this week.

Feast and famine protection. The discipline: never stop outreach during active client delivery. Minimum viable pipeline activity during active client work: 2-3 new conversations per week, 5 LinkedIn engagements, one re-engagement of a past contact. This is roughly 90 minutes per week. The cost of dropping it during a busy delivery period is 6-12 weeks of recovery when the engagement ends.

Coverage ratio. To close one engagement, plan for 3-5 active opportunities. To replace a £30k engagement when it ends, you need 3-5 conversations of similar size already in pipeline. This is why minimum viable pipeline activity during delivery matters.

Prioritisation framework when time is limited. Rank opportunities by: deal value (revenue potential), close probability (how warm), relationship strength (existing relationship vs cold), strategic fit (does it move you toward where you want to be). Spend time on high-value high-probability first, then high-value low-probability, then everything else. Kill opportunities that are stale (no movement in 30+ days) or never had real signal.

Lead sources for independent consultants ranked by typical conversion. Existing network (former colleagues, past clients, friends-of-network): highest conversion. Referrals from existing clients: high conversion. Speaking and writing (LinkedIn posts, articles, conference talks): moderate conversion, long lead time. Cold outreach: low conversion per attempt, but works at volume. Inbound from website: lowest for new independents (your domain authority is low).`,
      curated_caveat_base: "Pipeline tool pricing changes periodically; verify current pricing on each vendor's website. CRM choice matters less than the weekly review habit; tools that you do not check are worse than spreadsheets you do check. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Choose and set up a pipeline tool", target_day: 7, verification_question: "Have you chosen and set up your pipeline tracking tool?" },
        { action_hint: "Schedule a recurring weekly pipeline review", target_day: 14, verification_question: "Do you have a weekly pipeline review on your calendar?" },
        { action_hint: "Document 5 specific outreach actions for this week", target_day: 7, verification_question: "Have you identified 5 specific outreach actions for this week?" },
      ],
      prerequisite_outputs: null,
    },
  },
  16: {"id":16,"name":"Proposal & Scoping Framework","track":"D","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":7,"area":"Commercial Execution","trigger_phase":"Phase 2 — first opportunity","estimated_minutes":8,"output_type":"proposal_framework","description":"How to write proposals that win without over-committing — and how to scope engagements that protect your time and profitability.","what_you_get":"A proposal structure that wins, how to scope defensively, and when to charge for a scoping engagement.","questions":[{"id":"commercial_model","text":"How will you primarily charge for work?","type":"choice","options":["Project fee (defined scope)","Day rate (time-billed)","Monthly retainer","Mix — depends on the client"],"pre_populate_from":"plan.recommended_model_commercial_type"},{"id":"proposal_experience","text":"Have you written proposals as an independent before?","type":"choice","options":["Yes, regularly","A few times","No — this will be new"]},{"id":"typical_decision_maker","text":"Who will typically receive and approve your proposals?","type":"choice","options":["A CEO or owner — one decision maker","A senior director — one or two people","A committee or formal procurement process","Mix"]},{"id":"typical_proposal_value","text":"What is the likely value of a typical proposal?","type":"choice","options":["Under £5,000","£5,000–£15,000","£15,000–£50,000","Over £50,000"]}],"output_structure":{"proposal_structure":"A specific proposal template structure for their commercial model — section headings, recommended length, what to include and exclude","scoping_discipline":"How to define scope rigorously — what to specify, what to leave out, and where scope creep enters. The three most common scope leakage points for their work type.","pricing_presentation":"How to present fees in a proposal — anchoring, option structure if relevant, what not to itemise","decision_maker_calibration":"How to adapt proposal length, language, and emphasis for their typical decision maker","follow_up_framework":"What to do after submitting — timing, approach, what a no means vs. silence","red_flags_in_briefs":"3-4 warning signs in client briefs that signal a difficult engagement — calibrated to their work type","caveat":"A strong proposal won't fix a poorly qualified opportunity. Qualify before you invest significant time in scoping."},
    module_addendum: {
      module_decision_frame: "User has a commercial model (Q1 pre-populated from plan, project fee / day rate / retainer / mix), proposal experience (Q2, regular / occasional / new), typical decision maker (Q3, single owner / senior director / committee or procurement / mix), and typical proposal value (Q4). Produce a proposal structure calibrated to their commercial model, scoping discipline with the three most common scope leakage points for their work type, pricing presentation (anchoring, options structure), decision-maker calibration (how to adapt for their typical decision maker), follow-up framework (what to do after submitting and how to read silence vs no), and red flags in client briefs. The strong opinion: a great proposal cannot fix a poorly qualified opportunity. Qualify first, propose second.",
      module_specific_knowledge: `Proposal structure. Typical structure for a UK consulting proposal:

Header: title, date, client, proposer, validity period (typically 30 days).

Executive summary: 100-200 words. The problem you understand them to have, the approach you propose, the headline outcome, the price.

Context and problem: restate the client's problem in your words, demonstrating you have understood. 1-2 paragraphs.

Approach: what you will do, in clear phases or work-streams. Avoid jargon. 2-4 paragraphs.

Scope and deliverables: a bulleted list of specific deliverables with clear definitions. This is the contract-critical section, everything not listed is OUT of scope.

Timeline: realistic dates per phase. Always build buffer (10-20% beyond your honest estimate).

Pricing: the headline price, payment terms, what is included, what is excluded (travel, expenses, third-party costs, late-stage changes).

Next steps: how to accept the proposal, who to contact, deadline for acceptance.

Optional appendix: case studies, biography, references, terms and conditions.

Typical length: 2-4 pages for engagements under £20,000. 4-8 pages for £20-50k. 8-15 pages for £50k+. Avoid the temptation to pad, clients prefer brevity.

Scoping discipline. The three most common scope leakage points:

(1) Vague deliverables. "A strategy document" leaks because the client thinks 50 pages with workshops; you think a 10-page memo. Specify length, format, number of revision rounds, distribution scope, depth of supporting analysis.

(2) Implicit attendance and meetings. Define the number of meetings, the duration, the attendees on your side, the preparation required. Out-of-scope meetings become "while you're at it" requests that compound.

(3) Implicit revision rounds. Specify the number of revision rounds explicitly. "Two rounds of revisions" prevents endless tinkering. After the agreed rounds, additional revisions are change requests at your standard day rate.

Pricing presentation. Anchoring: lead with the higher of any range you would consider. Options structure: when offering choice, structure as Good / Better / Best (three options) with the middle option being your preferred sale. Avoid menu pricing (itemised line-by-line) which encourages clients to pick out individual items.

Decision-maker calibration. Single owner: short proposals (2-3 pages), direct language, emphasise outcome and confidence. Senior director: medium proposals (4-6 pages), include some methodology and rationale, anticipate their reporting needs (the director will brief upward). Committee or procurement: longer proposals (6-12 pages), structure to procurement template if provided, include differentiation against alternatives, include compliance and governance sections. Mix: ask your contact who else will see the proposal and what they care about.

Follow-up framework. After submitting: send a confirmation email noting next steps and the validity period. Day +5 if no acknowledgement: light follow-up referencing a relevant insight or new development. Day +10: direct follow-up asking for status. Day +20: final follow-up offering to discuss any concerns. Day +30: close the proposal as expired; the client knows where to find you.

Reading silence. Silence after a proposal is more often "no" than "yes that we have not got round to confirming". Continue working pipeline as if this one is lost. The fastest way to disqualify an opportunity is to send the proposal and observe the response time and quality.

Red flags in client briefs. Brief contains multiple decision makers but no named approver. Scope was different in the email than in the call. Phrase "best and final" appears early in the process (signals procurement competition, often a stalking horse for an internal hire or favoured supplier). Brief asks for free initial analysis as part of selection ("send your top 3 ideas as part of the pitch"). Timeline is unreasonably short ("need to start next week" for a complex engagement). Budget is undisclosed and the client refuses to share a range.`,
      curated_caveat_base: "Proposal conversion rates vary significantly by sector, opportunity quality, and individual relationship. Track your hit rate (proposals won / proposals sent) and the time invested per proposal; the goal is to spend more time on opportunities likely to close and less on the rest. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Draft your standard proposal template", target_day: 14, verification_question: "Have you drafted a reusable proposal template for your most common engagement type?" },
        { action_hint: "Document your scope-leakage protections", target_day: 14, verification_question: "Have you documented the three scope-leakage protections for your work?" },
        { action_hint: "Send your first proposal using the template", target_day: 30, verification_question: "Have you sent at least one proposal using your new template?" },
      ],
      prerequisite_outputs: null,
    },
  },
  17: {"id":17,"name":"Client Onboarding & Delivery Framework","track":"D","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Commercial Execution","trigger_phase":"Phase 3 — first client won","estimated_minutes":7,"output_type":"onboarding_delivery_plan","description":"How to start an engagement well, set the right expectations, and build delivery habits that protect your reputation and generate referrals.","what_you_get":"A kickoff meeting structure, the expectations to set on Day 1, and the delivery rhythm that keeps clients confident.","questions":[{"id":"first_client_won","text":"Have you won your first client engagement?","type":"choice","options":["Yes — starting soon","Not yet — preparing in advance","Yes — already underway"]},{"id":"engagement_type","text":"What type of engagement are you about to start or preparing for?","type":"choice","options":["Ongoing retainer / advisory","Fixed-scope project","Interim / day-rate placement","Training or facilitation"]},{"id":"deliverables_agreed","text":"Are deliverables and success criteria clearly agreed with the client?","type":"choice","options":["Yes, clearly documented","Roughly agreed — some ambiguity","Not yet — needs clarification before I start"]},{"id":"access_dependencies","text":"Do you need access to client systems, data, or people to do the work?","type":"choice","options":["Yes, significant dependencies","Some, manageable","Minimal — mostly independent work"]}],"output_structure":{"kickoff_checklist":"Sequenced onboarding actions — contract confirmed, invoice schedule agreed, access and dependencies resolved, internal contacts identified, success criteria documented","client_communication_rhythm":"Recommended communication cadence for their engagement type — who, what format, how often","progress_reporting":"What to report, when, and how — calibrated to their client type (exec, ops, procurement)","quality_control":"How to build review and quality checkpoints into delivery — specific to their work type","scope_management_in_delivery":"How to handle out-of-scope requests during an engagement — the conversation to have and the process to follow","referral_moment":"When and how to ask for a referral or case study — timing, framing, what to ask for","caveat":"The first 2 weeks of an engagement set the tone for everything that follows. Over-communicate in the first week."},
    module_addendum: {
      module_decision_frame: "User has first-client status (Q1, won / preparing / underway), engagement type (Q2, retainer / project / interim / training), clarity of agreed deliverables (Q3), and access dependencies (Q4, significant / some / minimal). Produce a kickoff checklist sequenced for their engagement, a client communication rhythm calibrated to engagement type, progress reporting format, quality control approach, scope-management-in-delivery process, and the right moment to ask for a referral. The strong opinion: the first two weeks of an engagement set the tone for everything that follows. Over-communicate in week one.",
      module_specific_knowledge: `Kickoff checklist (sequenced for most engagements).

Before Day 1: contract signed; first invoice payment received OR schedule confirmed; access requirements identified and requested; key stakeholders mapped with named owner on client side.

Day 1: kickoff meeting with the named client contact. Agenda: confirm scope and success criteria; confirm communication preferences and cadence; confirm decision-making process (who signs off what); identify dependencies and risks; confirm timeline; agree initial deliverable and date.

Week 1: send a written summary of the kickoff (decisions, owners, dates). Make initial dependencies happen (system access, document gathering, introductions). Set up the working channels (shared folder, communication channels). Identify any early warning signs.

Communication rhythm by engagement type.

Retainer (advisory): monthly written summary report (1-2 pages, what was discussed, what was decided, what comes next); bi-weekly check-in call (30 min); ad-hoc availability via email / Slack.

Project (defined scope, defined timeline): weekly written status update (RAG status, what completed last week, what planned this week, blockers); weekly project meeting (30-45 min); daily availability during sprints or critical phases.

Interim (day-rate placement): daily presence; weekly status to the placing executive; monthly written summary if the engagement spans more than a month.

Training and facilitation: pre-event design conversations; post-event written summary with attendee feedback; recommendation for next steps.

Progress reporting format. RAG status (Red / Amber / Green) per workstream. Brief narrative for each: what got done, what is planned, what is blocked. Specific to engagement type and client preference, some clients want bullet points, others want prose, ask in kickoff.

Quality control. Before delivering anything significant: read it through one more time after a sleep. Have a quality checklist for your work type (e.g. for a written report: spelling and grammar pass, facts checked, recommendations tied to evidence, format consistent, sign-off block correct). Send drafts before final whenever the engagement allows.

Scope management in delivery. When the client asks for something out of scope: do not silently agree. The conversation: "happy to help with that, but it sits outside the scope of our current engagement, which is X. Two options: I can pick it up as a change to the current engagement at the usual day rate, or we can add it as a follow-up engagement. Which works for you?" Never give silent free work; it sets a precedent that compounds across the engagement.

Change request process. Any change in writing (email is fine). Priced before work begins on the change. Signed off by the same person who signed the original engagement. Tracked in a simple log so both parties know what was agreed when.

The referral moment. After the first measurable success or at engagement close. "We're going well. If you know anyone else in [adjacent space] who might benefit from similar work, I'd appreciate an introduction." Specific ask. Specific space. Not a generic "anyone you know".

Case studies. Ask for permission to write up the engagement as a case study before the engagement is done (when it is going well). Offer the client final sign-off on what gets published. Use a clear template: situation, work done, outcome, named client (if permitted). Case studies compound; one strong written-up engagement generates 2-5 follow-on conversations over the next year.`,
      curated_caveat_base: "Client preferences for communication, reporting, and meeting cadence vary widely. The framework above is a default starting point, adjust to your specific client in the kickoff conversation. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Draft your kickoff meeting agenda", target_day: 7, verification_question: "Have you drafted a kickoff meeting agenda you can reuse?" },
        { action_hint: "Send your first weekly or monthly status report", target_day: 14, verification_question: "Have you sent your first written status report on the engagement?" },
        { action_hint: "Document a quality checklist for your work type", target_day: 30, verification_question: "Have you written down a quality checklist you run through before delivering work?" },
      ],
      prerequisite_outputs: null,
    },
  },
  18: {"id":18,"name":"Managing Client Relationships","track":"D","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":17,"area":"Commercial Execution","trigger_phase":"Phase 3 — active client work","estimated_minutes":7,"output_type":"relationship_management_guide","description":"How to maintain client relationships that generate repeat work and referrals — without becoming dependent on a single client.","what_you_get":"A relationship maintenance cadence, the right check-in frequency, and how to ask for referrals without it feeling awkward.","questions":[{"id":"client_concentration","text":"Is one client likely to represent the majority of your income in the next 6 months?","type":"choice","options":["Yes — one dominant client","Two or three clients sharing income roughly","Genuinely spread across multiple clients"]},{"id":"relationship_quality","text":"How would you characterise your current client relationship quality?","type":"choice","options":["Strong — trusted advisor status","Functional — good working relationship","Early — still establishing trust","Strained — some tension"]},{"id":"repeat_work_potential","text":"How likely is your current or most recent client to give you follow-on work?","type":"choice","options":["Very likely — ongoing relationship","Possible — depends on outcomes","Unlikely — one-off engagement","Unknown"]},{"id":"referral_network","text":"Have any of your clients referred you to other organisations or contacts?","type":"choice","options":["Yes — referrals have come in","Not yet but relationship seems strong","No — and it feels unlikely"]}],"output_structure":{"trusted_advisor_positioning":"How to move from 'supplier' to 'trusted advisor' in your specific client context — specific behaviours and communication patterns","dependency_risk_management":"If one client represents over 50% of income — the risk profile and practical steps to build independence","relationship_maintenance_rhythm":"How to stay visible between engagements — specific actions, frequency, what not to do","expanding_within_accounts":"How to identify and pursue adjacent opportunities within existing client organisations","referral_strategy":"How to build a referral-generating relationship — when to ask, how to ask, what to offer in return","difficult_conversations":"How to handle delivery issues, client dissatisfaction, or out-of-scope pressure — specific framing and process","caveat":"Client concentration above 60% of income is a commercial risk. Managing this is as important as managing the work quality."},
    module_addendum: {
      module_decision_frame: "User has client concentration risk (Q1, one dominant / two-or-three / spread), relationship quality (Q2, trusted / functional / early / strained), repeat work potential (Q3), and referral history (Q4, yes / not yet / unlikely). Produce trusted-advisor positioning specific to their context, dependency-risk management if concentration is high, a relationship-maintenance rhythm, account-expansion strategy, referral mechanics that work, and how to handle difficult conversations. The strong opinion: client concentration above 60% is a commercial risk that needs active management; the time to diversify is when one client looks safest.",
      module_specific_knowledge: `Trusted-advisor positioning. The signs you have moved from supplier to trusted advisor: the client copies you into broader conversations beyond your immediate scope; the client asks your opinion on adjacent decisions; the client brings you into sensitive issues before they become public; the client introduces you to other senior people in their organisation. Behaviours that get you there: bring proactive observations from your work (not just the deliverables you were asked for); flag risks they have not asked about; remember and reference things from earlier conversations; bring a perspective shaped by your other clients without breaching confidentiality.

Behaviours that prevent you getting there: only respond to what you were explicitly asked; bring transactional energy to every interaction (always quoting next engagement); discuss other clients in identifiable ways (signals you would do the same about this client); chase invoices via the same channel as the work conversations (separate the commercial from the work).

Client concentration risk. Thresholds (rough):

Under 30%: low risk. Diversified portfolio.

30-50%: moderate. Manageable but actively work to maintain other relationships.

50-70%: high. Single major client departure would force a significant rebuild. Actively diversify.

Above 70%: extreme. Effectively a contractor with one client. Risks: client cuts budgets; sponsor leaves; IR35 reclassification.

Diversification practice: minimum viable pipeline activity even when the dominant client is engaged (see Module 15); deliberate quarterly outreach to past clients and warm contacts; one small engagement per year with a new client even if the dominant one fills your time.

Relationship maintenance rhythm. Past clients and warm contacts: 4-6 weeks between touch-points. The touch-point can be a relevant article or insight you came across, a question about something they mentioned, a congratulations on something visible (promotion, deal, publication). Not a sales pitch. Active key clients: depends on engagement type; for retainer or recurring client a monthly check-in beyond engagement work is useful.

Tools for relationship maintenance: CRM with reminders, a Notion table with last-touch dates, a recurring calendar reminder. The tool matters less than the cadence.

Expanding within accounts. Within a client organisation, the work tends to expand in one of three directions: (1) deeper in the same function (more strategic work for the same team); (2) broader across functions (introduction to adjacent teams who could use similar help); (3) higher in seniority (briefing more senior people on the work). Be deliberate about which direction makes sense for your practice and the client. Ask explicitly during the engagement: "is there anyone else in the organisation who might benefit from a similar conversation?"

Referral mechanics that work. Specific ask, not generic. Not "if you know anyone..." but "I'm looking to do more work with [specific type of organisation] on [specific challenge]; is there anyone in your network who comes to mind?". Give a clear offer: "if you make an introduction, I'll have a 30-minute conversation with them at no charge to assess whether there's a fit". Make it easy: provide a short intro email they can paste, with your bio and a specific ask.

Timing of referral requests. After a measurable win, at the natural close of an engagement, or in the context of a positive 1:1 conversation about the work. Not at the start of an engagement, not when the client is under pressure on something else.

Difficult conversations. When something is going wrong: front-load. Raise the issue at the first sign rather than after it has compounded. Separate facts from interpretation. ("I delivered the draft on Monday; the feedback we discussed in our Friday call suggested significant changes; I want to understand whether the brief shifted or whether the original brief was misinterpreted.") Propose a path forward. ("I can rework along the lines we discussed by next Friday; that's an additional 3 days of effort. I want to confirm we're on the same page about scope before I commit.")

Handling client dissatisfaction. Listen first, fully. Do not defend. Acknowledge what is true. Distinguish what you can fix from what you cannot. Propose a remedy. Confirm in writing.

Client departures and graceful exits. If a client relationship is winding down (engagement complete, no follow-up, declining engagement quality): close it cleanly. Send a final summary of what was delivered, what is left as recommendation for them to pursue, your availability for future work. Do not leave it ambiguous.`,
      curated_caveat_base: "Client relationships are long-form and individual; the patterns above are tendencies, not rules. The most important discipline is consistency: small actions repeated reliably beat large gestures done occasionally. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "List your clients and current revenue concentration", target_day: 14, verification_question: "Have you written down your current client list with revenue share per client?" },
        { action_hint: "Set a relationship touch-point cadence in your calendar", target_day: 30, verification_question: "Do you have a recurring calendar reminder for past-client touch-points?" },
        { action_hint: "Make one specific referral request", target_day: 60, verification_question: "Have you made one specific referral request to an existing or past client?" },
      ],
      prerequisite_outputs: null,
    },
  },
  19: {"id":19,"name":"Growing & Scaling Your Practice","track":"D","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Commercial Execution","trigger_phase":"Phase 3 — 30–90 days in","estimated_minutes":10,"output_type":"growth_strategy","description":"The transition from 'landing clients' to 'building a practice' — how to systematise, raise rates, and create leverage without losing what made you valuable.","what_you_get":"The growth levers available at your current stage, how to move from time-for-money to leverage, and what to systematise first.","questions":[{"id":"current_trading_status","text":"Where are you in your independent journey?","type":"choice","options":["Pre-revenue — building toward first client","First client won — still testing the model","2–4 clients — early traction","Established — 6+ months trading, recurring revenue"]},{"id":"income_target","text":"What is your income target for the next 12 months?","type":"choice","options":["Replace my salary — same or similar income","Exceed my salary by 20–40%","More than double my previous salary","Unsure — still establishing the baseline"]},{"id":"capacity_constraint","text":"Are you or do you expect to become capacity-constrained — more demand than your time can fulfil?","type":"choice","options":["Not yet — still building demand","Approaching it — filling up fast","Yes — turning away work or at risk of it"]},{"id":"leverage_interest","text":"Are you interested in creating leverage beyond your own time — subcontracting, productising, training, or digital products?","type":"choice","options":["Yes, actively interested","Open to it but not a priority yet","No — prefer to stay as a solo practitioner"]},{"id":"rate_last_increase","text":"Have you increased your rates since going independent?","type":"choice","options":["Not yet","Yes — once","Yes — multiple times"]}],"output_structure":{"growth_stage_assessment":"Clear statement of where they are and what that means for what to focus on — not the same advice for a Day 1 vs. Day 90 user","rate_increase_strategy":"Whether and when to raise rates — specific recommendation, how much, how to communicate it to existing clients","capacity_strategy":"If approaching capacity — the options: raise rates, subcontract, productise, or stay solo and choose — with trade-offs for their profile","systemisation_priorities":"What to systematise now to protect quality as volume grows — specific to their work type","leverage_options":"Realistic leverage paths for their archetype — subcontracting, associates, training programmes, frameworks, productised services","12_month_priorities":"The 3 most important things to focus on in the next 12 months given their current stage and trajectory","caveat":"Growth for growth's sake is a trap. The question is not 'how do I get bigger' but 'how do I build a practice I want to run in 3 years'. These are different questions with different answers."},
    module_addendum: {
      module_decision_frame: "User has trading status (Q1, pre-revenue / first client / 2-4 clients / established), income target (Q2, replace salary / +20-40% / more than double / unsure), capacity constraint (Q3, not yet / approaching / yes), leverage interest (Q4, actively interested / open / no), and rate increase history (Q5). Produce stage assessment, rate-increase strategy, capacity strategy (raise rates / subcontract / productise / stay solo), systemisation priorities, leverage options realistic for their archetype, and the three most important things to focus on in the next 12 months. The strong opinion: growth choices are values choices not just commercial choices. The question is not 'how do I get bigger' but 'how do I build a practice I want to run in 3 years'.",
      module_specific_knowledge: `Growth stages and what each requires.

Pre-revenue (still building toward first client): focus on outreach, pipeline, and positioning. Growth at this stage means landing the first paying client. Premature focus on systemisation or leverage is a distraction.

First client won (still testing the model): focus on delivery quality and learning what your engagements actually look like in practice. Document what worked. Note what cost more time than expected. This stage typically lasts 3-6 months.

2-4 active clients: focus on commercial repeatability, pricing, proposal templates, kickoff process. This is when systemisation starts to pay off because you are doing the same things multiple times.

Established (6+ months, recurring revenue): focus on either rate increases, capacity strategy, or both. Leverage decisions become meaningful at this stage.

Rate increase strategy. Timing: after first 2-3 engagements at the current rate, or 6 months trading, whichever comes first. Frequency thereafter: at least annually, more often if you're in a fast-moving specialism.

Mechanics with new clients: increase the rate by 15-25% on the next proposal. No need to flag the change; it is the rate. Mechanics with existing clients: 90-day written notice. "From [date 3 months out], my day rate will be [new rate]. This reflects [reasoning, market movement, expanded scope of work, specialist focus]." Most existing clients accept. Some negotiate. Some leave. A 15-20% rate increase with 20% client churn is net positive on revenue and selects for clients who value your work.

What if a client refuses the increase. Decide before the conversation whether you would walk away. If the client matters enough to keep at the current rate, hold the rate this year but increase scope, extend payment terms in your favour, or get something in return. If the client does not matter enough, accept the departure. Do not say yes to the old rate without getting something for it.

Capacity strategy. When demand exceeds your time, you have four options:

(1) Raise rates. Demand exceeds supply, price moves to equilibrate. This is the simplest move and usually the first.

(2) Subcontract. Engage other independents to deliver some work under your direction. You keep margin and oversight. Common for established consultants who have moved from doer to advisor.

(3) Productise. Turn a service into a defined product (templates, courses, group programmes). Lower per-engagement revenue but higher leverage.

(4) Stay solo and choose. Decline opportunities below your threshold. Build slack for the work you want.

These are choices about the kind of practice you want, not just commercial choices. A solo advisory practice with 20 days/year of high-margin engagements is a different life from a 5-person consulting firm with 200 days/year of subcontracted delivery.

Systemisation priorities. The order of operations: (1) sales process, repeatable pipeline, proposal, contract; (2) onboarding, kickoff template, first-week checklist; (3) delivery, quality checklist by engagement type, regular reporting template; (4) invoicing and cash flow, automated invoice schedule, payment chase sequence; (5) finance, monthly close routine, quarterly review. Systemise the steps you do most often first.

Leverage options for typical independent archetypes. Strategic advisory: associate model (other senior consultants as associates on your platform), thought leadership (books, podcasts, paid speaking). Project delivery: subcontracted execution model, productised packages with defined deliverables. Interim management: scaling to multiple concurrent interim placements via your network, board portfolio. Training and facilitation: train-the-trainer programmes, licensed content. Specialist advisory (e.g. compliance, FCA): retained-advisor model with multiple FS clients on monthly fee.

What to systematise NOT to outsource. Your relationships, your reputation, your insight from delivery. These should not be delegated even if you scale, because they are what clients are buying. Most successful independent consultants who scale do so by leveraging delivery (subcontract, productise) while keeping client relationships and intellectual leadership themselves.

12-month focus by stage. Pre-revenue or first-client: get to 3 paying clients. 2-4 clients: get to consistent £X/month of revenue (target appropriate to your rate). Established: choose growth direction, depth (raise rates, fewer better clients) vs breadth (more clients via systemisation or leverage) vs leverage (move from doer to platform).`,
      curated_caveat_base: "Practice growth is a values choice as much as a commercial one. The frameworks above are choices, not prescriptions. There is no objectively right growth path; the right path is the one that builds a practice you want to be running in 3 years. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Document your current growth stage assessment", target_day: 7, verification_question: "Have you written down where you are in the growth-stage framework?" },
        { action_hint: "Decide on the next rate review and put it in the calendar", target_day: 30, verification_question: "Have you decided when you will review rates next and set a calendar reminder?" },
        { action_hint: "Identify your three priorities for the next 12 months", target_day: 30, verification_question: "Have you identified the three things you will focus on over the next 12 months?" },
      ],
      prerequisite_outputs: null,
    },
  },
};
