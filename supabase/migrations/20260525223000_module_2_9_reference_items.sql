-- Module 2-9 reference items (Track A Setup + Track B Compliance)

INSERT INTO public.module_reference_items
  (content_type, title, one_line_description, inline_content, external_url, applicable_module_ids, verified_date, verified_by)
VALUES

  (
    'link',
    'Companies House: incorporate a new company',
    'Official UK gov.uk page to incorporate a private limited company online. £50 fee, typically completes within 24 hours.',
    $ref$# Companies House incorporation

This is the gov.uk page to incorporate a private limited company in the UK. £50 online fee (£71 for paper). Most incorporations complete within 24 hours.

Information you need ready: proposed company name (check availability first via Companies House search); registered office address (your home address is allowed but becomes public; alternatives: virtual office providers from £50/year, accountant's office, business premises); director details (name, DOB, address, occupation, nationality); shareholder details and share structure (most solo-director companies issue 1 or 100 ordinary £1 shares to the sole shareholder); SIC code (Standard Industrial Classification code describing your business activity; full list at gov.uk).

After incorporation: HMRC sends an activation letter to the registered office within 14 days containing the Corporation Tax UTR. Open the business bank account in parallel (banks vary on speed). Set up PAYE before paying yourself salary.$ref$,
    'https://www.gov.uk/limited-company-formation',
    ARRAY[2],
    '2026-05-25',
    'solo-team'
  ),

  (
    'link',
    'ICO: register as a data controller',
    'Official Information Commissioner''s Office registration page. £40-£60/year for most independent consultants. 10-minute online process.',
    $ref$# ICO registration

The Information Commissioner's Office is the UK's independent data protection regulator. Registration is a legal requirement under the Data Protection (Charges and Information) Regulations 2018 for any organisation processing personal data in the course of business.

Fees for 2026/27: tier 1 (micro, sub-£632k turnover / under 10 staff) £40; tier 2 (SME, sub-£36m turnover / under 250 staff) £60; tier 3 (large organisations) £2,900. Most independent consultants fall in tier 1.

The registration process takes about 10 minutes online. You'll need: organisation name and address; description of the personal data you process and why; security measures you have in place. Renewal is annual.

Non-registration when required is itself an offence and the ICO can prosecute. If your work involves no personal data at all (purely anonymised data, public information, business-to-business strategic advisory with no individual records), you may be exempt, the registration tool helps you self-assess.$ref$,
    'https://ico.org.uk/for-organisations/data-protection-fee/self-assessment/',
    ARRAY[2, 8],
    '2026-05-25',
    'solo-team'
  ),

  (
    'comparison',
    'UK business bank account: neobanks vs traditional',
    'Comparison of common UK business bank account options for independent consultants, with onboarding speed, monthly fees, and feature trade-offs.',
    $ref$# UK business bank account comparison (2026/27)

For an independent consultant or single-director Ltd, the practical choices fall into two groups.

## Neobanks (fast onboarding, app-first)

**Starling Business**, free for sole traders; £7/month for Ltd accounts; same-day account opening typical; good integration with Xero, FreeAgent, QuickBooks; built-in invoicing; physical and virtual cards. Recommended for most independent sole traders and small Ltds.

**Tide**, free tier with limited transactions, paid tiers £9.99-£49.99/month; quick onboarding (1-3 days typical for Ltd); built-in invoicing and bookkeeping nudges; FreeAgent integration; cashback on some categories.

**Monzo Business**, £5/month Ltd accounts; quick onboarding; clean UI; growing integrations. Better-known consumer brand; expanding business features.

**Revolut Business**, free tier with limited features, paid tiers £19-£79/month; fast onboarding; particularly strong for multi-currency or international clients; weaker on UK-specific integrations.

**Mettle (NatWest)**, free; sole trader and Ltd; includes FreeAgent free for life; same-day account opening typical; backed by NatWest infrastructure.

## Traditional banks (slower onboarding, branch access)

**HSBC Kinetic**, £6.50/month after free 12 months; 2-4 weeks onboarding; better for established businesses or international wires.

**Barclays Business**, £8.50/month after free 12 months; 2-4 weeks onboarding; good if you already bank with Barclays personally.

**Lloyds Business**, £6.50-£7.50/month after free 18 months; 2-4 weeks onboarding.

**NatWest Business**, £8/month after free 18 months; 2-4 weeks onboarding; comes with Mettle access.

## Recommendation pattern

For most independent consultants in 2026/27: open a Mettle account if you bank with NatWest personally (free + FreeAgent free); otherwise Starling Business (free for sole trader, £7/month for Ltd); add a traditional bank if you specifically need branch access, international wires above neobank limits, or your clients pay via BACS to organisations that require traditional bank credentials.

Open the account in parallel with the structure registration so the bank account is live by the time you issue your first invoice. For Ltds, you cannot legally commingle personal and business funds, so this is not optional.$ref$,
    NULL,
    ARRAY[2, 10, 11],
    '2026-05-25',
    'solo-team'
  ),

  (
    'template',
    'LinkedIn rewrite framework for independents',
    'Specific framework for rewriting your LinkedIn headline, about section, and services for independent work. Five-question template.',
    $ref$# LinkedIn rewrite framework

The LinkedIn rewrite is the single biggest credibility upgrade in your first 90 days. Most clients who eventually engage you will check your LinkedIn at some point in the qualification process. The current profile probably reads as "employee at previous company"; the work is to make it read as "independent specialist".

## Five questions to answer before rewriting

1. **What specifically do you do?** Not "consulting" or "advisory", what specific work, for what specific outcome. "Fractional compliance advisor to UK FS firms, pre-trade risk reviews and SMCR readiness" is specific. "Strategy consultant" is not.

2. **Who do you do it for?** The industry, organisation type, role. "FS firms regulated by the FCA" is specific. "Businesses" is not.

3. **What's the outcome you deliver?** Concrete and observable. "Pre-trade risk reviews and SMCR readiness" is observable. "Business transformation" is not.

4. **What is your distinctive angle?** What makes you different from the alternative the client would consider. Sector depth? Speed? Seniority? Existing relationship? Pick one.

5. **What is the next conversation you want?** What action you want a prospect to take from your profile. Book a call? Read your writing? Refer someone?

## Headline (220 chars)

Pattern: "[What you do] for [who] | [distinctive angle or specialism]"

Examples:
- "Fractional compliance advisor to UK FS firms | pre-trade risk reviews and SMCR readiness"
- "Senior product strategist for fintech scale-ups | 0-to-1 and growth-stage commercial product work"
- "Independent HR director for high-growth SMEs | first 200-person scale-ups, founder-led businesses"

Avoid: generic titles ("Consultant", "Advisor"), buzzwords ("Strategic Visionary"), brackets and emoji clutter.

## About section (first 3 lines visible above the fold)

The first 3 lines are what most viewers read. Lead with the specific problem you solve.

Pattern:
- Line 1: The problem (specific, recognisable to your buyer)
- Line 2: How you address it (your work, your distinctive angle)
- Line 3: Who you've worked with or what context you bring

Then below the fold: longer narrative, methodology, case examples, contact.

## Services section

Add 2-4 named services. Specific service names beat generic categories. "FCA pre-application readiness review" beats "Regulatory consulting".

## Featured section

Pin one or two: a relevant article you've written, a case study, a substantial post that performed well, a video introducing your work. The Featured section is the highest-trust real estate on your profile.

## Settings to check

Open to Providing Services: turn on with your specific service categories. Profile photo: recent, professional, eye-level, smiling, avatar quality matters more than people assume. Background image: subtle and on-brand; avoid stock photos. Custom URL: claim linkedin.com/in/yourname if available.

## What to do in week one of independent work

Spend 90 minutes one evening rewriting the headline and the about section. Don't try to perfect it. Ship version 1; iterate version 2 in two weeks based on what prospects ask you about.$ref$,
    NULL,
    ARRAY[3],
    '2026-05-25',
    'solo-team'
  ),

  (
    'checklist',
    'What to deprioritise in your first 90 days',
    'Explicit list of common time-sinks that don''t move conversion in the first 90 days for an independent consultant. The discipline is what you don''t do.',
    $ref$# What to deprioritise in your first 90 days

The trap in early independent work is filling time with activity that feels productive but doesn't move conversion. The first 90 days should be focused tightly on: (1) updating professional presence (LinkedIn, domain, email); (2) doing outreach to your existing network; (3) delivering work for any client you've already won. Most other things can wait.

## Defer to month 6+

**Full brand identity work with a designer.** A logo, brand colours, type system, brand guidelines. This is a £2k-£10k investment that doesn't move first-client conversion. Use a placeholder identity (your name in a clean type, one accent colour) until you know what your practice actually looks like.

**Multi-page corporate website.** A 5-page website with About, Services, Case Studies, Blog, Contact. Most first clients come from existing network and won't browse the site. If a website is genuinely needed for a specific procurement, build a single-page site in 4 hours via Carrd or similar (£19/year). Multi-page later when you have actual case studies to populate it.

**Business cards.** Almost never useful in modern B2B. The few contexts where they help (in-person networking events) can be served by a digital card via Apple Wallet or Linq.

**Corporate stationery, letterheads, complimentary slips.** Print materials for a service business that operates digitally. No value.

**Productisation work.** Defining and packaging a productised offering. Until you've delivered the same work 5+ times for different clients, productisation is theoretical. Ship the work; productise based on what was actually repeatable.

**Email newsletter (with subscribers).** Building a newsletter audience is a 12-24 month investment. Possibly worth doing if visibility is a key part of your strategy, but not in the first 90 days when the priority is direct outreach to your existing network.

**Podcast.** A podcast is a substantial production commitment with slow audience growth. Most independents who start one in month 1 abandon it by month 4.

**Comprehensive marketing strategy document.** A 20-page marketing strategy with personas, channels, content calendar, KPIs. This is consultant-style work for your own business that delays the actual outreach. Replace with: one paragraph naming who you're targeting and what you'll do this week.

**Choosing tools beyond what you need today.** Implementing a CRM, project management system, time tracking, knowledge base. Most independent consultants don't need any of these in the first 90 days. A spreadsheet and a calendar work.

## What to do instead in the first 90 days

LinkedIn rewrite (1 evening). Domain and professional email (3 hours). 20-50 outreach messages to existing network (spread over weeks). One client engagement delivered well. One piece of written work (blog post, LinkedIn article, sector publication) if visibility is part of your strategy.

The discipline that compounds: shipping mediocre versions of the right things beats shipping perfect versions of the wrong things.$ref$,
    NULL,
    ARRAY[3, 15],
    '2026-05-25',
    'solo-team'
  ),

  (
    'comparison',
    'UK 2026/27 Income Tax + National Insurance reference',
    'Quick reference for UK Income Tax bands, Class 4 NI rates, dividend tax rates, and Corporation Tax rates applicable in tax year 2026/27.',
    $ref$# UK 2026/27 tax reference

Tax year runs 6 April 2026 to 5 April 2027. Rates below apply to England, Wales, and Northern Ireland. Scottish rates differ for Income Tax on non-savings income; Scottish residents check gov.uk/scottish-income-tax separately.

## Income Tax (England, Wales, NI)

| Band | Rate | Threshold |
|---|---|---|
| Personal Allowance | 0% | £0 - £12,570 |
| Basic rate | 20% | £12,571 - £50,270 |
| Higher rate | 40% | £50,271 - £125,140 |
| Additional rate | 45% | Above £125,140 |

Personal Allowance taper: above £100,000 of income, the Personal Allowance reduces by £1 for every £2 of income over £100,000. Fully tapered to zero at £125,140 of income. Effective marginal rate in the £100k-£125,140 band is approximately 60%.

## Class 4 National Insurance (sole traders)

| Band | Rate | Threshold |
|---|---|---|
| No NI | 0% | Profits below £12,570 |
| Main rate | 6% | £12,570 - £50,270 |
| Upper rate | 2% | Profits above £50,270 |

Class 2 NI: abolished from 2024-25 for sole traders above the Small Profits Threshold of £6,725. Those below the threshold can pay voluntarily for state pension qualifying years (£3.45/week typical).

## National Insurance (limited company directors)

Employer NI: 13.8% on director salary above Secondary Threshold (£9,100 typical for 2026/27).

Employee NI: 8% on director salary above Primary Threshold (£12,570).

Dividends are NI-free.

## Dividend tax

Dividend Allowance: £500 tax-free for 2026/27.

| Band | Rate |
|---|---|
| Basic rate (within basic Income Tax band) | 8.75% |
| Higher rate | 33.75% |
| Additional rate | 39.35% |

Dividends count towards your Income Tax bands. A £40,000 dividend on top of a £12,570 salary fills the basic rate band; the next dividend pound is taxed at higher rate.

## Corporation Tax

| Profit level | Effective rate |
|---|---|
| Small profits rate (under £50,000) | 19% |
| Marginal relief band (£50,000 - £250,000) | 26.5% effective |
| Main rate (over £250,000) | 25% |

Marginal relief mechanism: tax at 25% on all profits, less a deduction calculated as (Upper Limit - Profits) × 3/200. For most independent Ltds operating in the £50k-£250k band, the effective marginal rate is 26.5%, meaning each additional £1 of profit costs 26.5p in Corporation Tax.

## Annual allowances and limits

Annual Investment Allowance (capital allowances): £1,000,000.

Pension Annual Allowance: £60,000 (tapered for high earners above £260,000 threshold income).

VAT registration threshold: £90,000 of rolling 12-month taxable turnover.

ISA allowance: £20,000 per tax year.

Capital Gains Annual Exempt Amount: £3,000 for 2026/27.

## Key dates (Self Assessment, sole trader)

- 6 April: tax year starts
- 5 April: tax year ends
- 5 October (following): Self Assessment registration deadline if newly self-employed
- 31 October: paper Self Assessment deadline (rarely used)
- 31 January: online Self Assessment filing AND payment deadline AND first Payment on Account deadline
- 31 July: second Payment on Account deadline$ref$,
    NULL,
    ARRAY[4, 13, 14],
    '2026-05-25',
    'solo-team'
  ),

  (
    'checklist',
    'The Payment on Account trap: what catches first-year filers',
    'Explainer of how the Self Assessment payment-on-account system creates a 150% cash demand in the first January after the first tax year of self-employment.',
    $ref$# The Payment on Account trap

The largest avoidable cash-flow shock for a first-year self-employed person in the UK is the first January Self Assessment bill, which is typically about 150% of what the year's tax actually was. Almost every first-year self-employed person is surprised by this. The explainer below makes the mechanism clear so it doesn't surprise you.

## How Payments on Account work

When you file Self Assessment for a tax year (let's call it Year 1), HMRC charges you:

(a) The balancing payment for Year 1. This is the actual tax owed for Year 1, less anything you've already paid in advance.

(b) The first Payment on Account for Year 2. This is 50% of Year 1's actual tax bill, charged in advance as an estimate of what you'll owe for Year 2.

Both of these are due on 31 January following the end of Year 1.

Then on 31 July (six months later) HMRC charges:

(c) The second Payment on Account for Year 2. The other 50%.

When you eventually file Year 2's Self Assessment, the actual Year 2 tax is netted against the two Payments on Account already made; you pay the balancing payment or get a refund.

## Why January feels like 150%

Year 1 actual tax: £8,000 (say).

31 January demand:
- Year 1 balancing payment: £8,000 (paying for the year just ended)
- Year 2 first Payment on Account: £4,000 (advance for the current year, 50% of Year 1)

Total demand: £12,000. That's 150% of the year's tax bill.

The first time you experience this is in late January of the year AFTER you became self-employed. If you started trading in tax year 2026/27 (April 2026 - April 2027), the January 2028 demand will be roughly 150% of your 2026/27 bill.

## When Payment on Account does NOT apply

You're exempt from Payments on Account if EITHER:

- Your previous Self Assessment tax bill was less than £1,000, OR

- More than 80% of your tax was already deducted at source (e.g. you have a small amount of self-employed income alongside a salaried role where PAYE already covers the bulk of your tax).

For most full-time self-employed people in their first year above the personal allowance, Payments on Account WILL apply.

## What you can do about it

Set aside the recommended tax reserve percentage from each payment received (see Module 1's Sole trader tax reserve reference). At the 25% rate recommended for the £30k-£50k profit band, by the time January 2028 arrives, you'll have ~£11,250 in reserve against a typical demand of £12,000-£14,000. The demand stops being a crisis; it becomes a known transaction.

If your Year 2 income is going to be substantially lower than Year 1 (e.g. you took a sabbatical, took a job, scaled back), you can apply to HMRC to REDUCE both Payments on Account (via Form SA303 or online). HMRC accepts a reasonable estimate.

If your Year 2 income is going to be substantially higher, you can pay extra voluntarily but don't have to.

## The persistent cycle

After the first year, the cycle smooths out. By Year 3, you're in a rhythm: January pays the balancing for the prior year plus the first PoA for the current year; July pays the second PoA. The cash demand is predictable; the tax reserve covers it; January is not a crisis.

The first January is the spike. After that, it's just rhythm.$ref$,
    NULL,
    ARRAY[4, 11, 13],
    '2026-05-25',
    'solo-team'
  ),

  (
    'link',
    'HMRC: register for VAT',
    'Official gov.uk page to register your business for VAT. Required above £90,000 of rolling 12-month turnover (2026/27 threshold) or voluntary registration.',
    $ref$# HMRC VAT registration

Register for VAT if either: your rolling 12-month VAT-able turnover exceeds £90,000 (the 2026/27 threshold); OR you're choosing to register voluntarily.

Most independent consultants who register voluntarily do so when their clients are primarily VAT-registered businesses (who can reclaim the VAT you charge), and they have meaningful input costs they want to reclaim VAT on.

Registration is online. You'll need: your Government Gateway ID; National Insurance number; details of your business; bank account details (for refunds); date you exceeded the threshold or want voluntary registration to start.

The registration process gives you a VAT registration number, an effective date of registration, and login access to submit returns. Once registered, you must comply with Making Tax Digital, file VAT returns through compatible software (Xero, FreeAgent, QuickBooks, Sage all compatible) and keep digital records.

You can deregister later if your turnover falls below £88,000 (the 2026/27 deregistration threshold).$ref$,
    'https://www.gov.uk/register-for-vat',
    ARRAY[5],
    '2026-05-25',
    'solo-team'
  ),

  (
    'comparison',
    'Flat Rate Scheme vs Standard VAT: the decision',
    'Comparison of VAT Standard scheme vs Flat Rate Scheme for service-business independent consultants, with the Limited Cost Trader trap.',
    $ref$# Flat Rate Scheme vs Standard VAT

If you're VAT-registered, you have a choice of accounting scheme. For service-business independent consultants with low input costs, the choice usually comes down to Standard scheme vs Flat Rate Scheme (FRS).

## Standard scheme

You charge 20% VAT on outputs (your invoices). You reclaim VAT on inputs (your costs that include VAT). Quarterly returns calculate the net VAT to pay (output VAT minus input VAT). Most flexible; most paperwork.

Example: invoice £10,000 + £2,000 VAT to client. Pay £100 VAT on a software subscription. Net VAT to HMRC: £2,000 - £100 = £1,900.

## Flat Rate Scheme

You charge 20% VAT on outputs (same as standard). You pay HMRC a flat percentage of your gross turnover (including the VAT you charged). You keep the difference. You generally CANNOT reclaim input VAT (with one exception below).

The flat rate depends on your sector. For independent consultants in 2026/27:

| Sector | Flat rate |
|---|---|
| Management consultancy | 14.5% |
| Computer and IT consultancy | 14.5% |
| Architectural / civil / structural engineering | 11% |
| Lawyer / legal services | 14.5% |
| Advertising | 11% |
| Accountancy / book-keeping | 14.5% |
| Business services not elsewhere listed | 12% |

First-year discount: 1% reduction in your flat rate for the first 12 months of VAT registration.

Example: invoice £10,000 + £2,000 VAT to client. Gross turnover = £12,000. Flat rate at 14.5% management consultancy = £1,740 to HMRC. You keep £260 of the VAT you charged. Net VAT to HMRC: £1,740.

In this example, FRS saves you £160 compared to Standard scheme.

## The Limited Cost Trader trap

If your "goods" (defined narrowly, physical items, NOT software services, NOT subcontractor fees, NOT travel, NOT food) are LESS than 2% of your turnover OR less than £1,000 per year, HMRC reclassifies you as a Limited Cost Trader and you pay 16.5% regardless of sector.

For most pure-advisory independent consultants, you ARE a Limited Cost Trader because your input "goods" are minimal (just office supplies and the occasional piece of equipment). At 16.5% the FRS is significantly less attractive, often equivalent to or worse than the Standard scheme.

Calculate before joining FRS: if you're a Limited Cost Trader, you pay 16.5% on gross. On a £12,000 invoice (£10k + £2k VAT) that's £1,980 to HMRC, only £20 less than the Standard scheme without reclaiming any input VAT. Standard scheme almost certainly nets out better once you reclaim any input VAT at all.

## The one exception (Capital goods)

Under FRS, you CAN reclaim input VAT on a single capital purchase over £2,000 including VAT. Useful if you buy expensive equipment occasionally; otherwise, FRS = no input VAT reclaim.

## Cash Accounting scheme

Compatible with the Standard scheme; you pay VAT to HMRC when the client actually pays you (not when you invoice). Reclaim input VAT only when you pay supplier invoices. Useful if you invoice in arrears or have slow-paying clients. NOT compatible with FRS.

## Annual Accounting scheme

One annual VAT return instead of quarterly. Monthly or quarterly interim payments based on prior-year's bill. Reduces paperwork. Compatible with Standard or FRS.

## Decision pattern

For most independent management/IT consultants in 2026/27:

- VAT-registered + low input costs + management/IT consultancy: FRS at 14.5% probably saves money if you're NOT a Limited Cost Trader. If you ARE a Limited Cost Trader (typical for pure-advisory), Standard scheme with Cash Accounting is usually better.

- VAT-registered + meaningful input costs (subcontractors, equipment): Standard scheme with Cash Accounting is almost always better.

- Just-registered, choosing scheme: model both for your expected first 12 months including the 1% FRS first-year discount; pick the better one. You can switch later.$ref$,
    NULL,
    ARRAY[5],
    '2026-05-25',
    'solo-team'
  ),

  (
    'link',
    'HMRC CEST: Check Employment Status for Tax',
    'HMRC''s online tool to check whether an engagement is inside or outside IR35. Results are accepted by HMRC if the inputs are honest and the facts match.',
    $ref$# HMRC CEST tool

Check Employment Status for Tax (CEST) is HMRC's free online tool for determining whether an engagement falls inside or outside IR35 (the off-payroll working rules).

Use CEST for any limited-company engagement where IR35 status matters. The tool walks you through questions covering: the contract type (your worker status, the client's worker status); substitution rights; control over how, when, and where the work is done; financial risk; equipment provision; integration with the client's organisation.

The result is one of: "Outside IR35" (independent contractor status), "Inside IR35" (deemed employment for tax purposes), or "Unable to determine" (often the result for advisory engagements with ambiguity).

Important points about CEST.

HMRC will stand by CEST results provided: (1) the answers given were honest and accurate; (2) the actual working practices match the answers. If working practices diverge from answers, CEST result no longer protects you.

CEST is criticised by tax specialists for under-weighting some case-law factors (particularly mutuality of obligation). Many specialists run CEST PLUS a separate specialist assessment for engagements of meaningful value or complexity.

Save the CEST output as a PDF along with the date and the engagement details. Keep with the contract for the duration of the engagement plus 6 years (HMRC's investigation window for non-deliberate matters).

If the result is "Unable to determine", that itself is information, the engagement has features that don't clearly tip one way or another. Consider a specialist review (£200-£400 typical) for engagements above ~£20k.$ref$,
    'https://www.tax.service.gov.uk/check-employment-status-for-tax/',
    ARRAY[6],
    '2026-05-25',
    'solo-team'
  ),

  (
    'checklist',
    'IR35 contract and working-practice protections',
    'Practical checklist of contract clauses and working practices that support an outside-IR35 position for limited-company contractors.',
    $ref$# IR35 protections checklist

For limited-company contractors who want to maintain an outside-IR35 position, contract terms and actual working practices BOTH matter. HMRC examines both in any investigation. A pristine contract with employee-like working practices fails IR35; pristine working practices with a weak contract are vulnerable.

## Contract clauses

**Substitution clause.** The right to send a substitute to do the work in your place. Must be genuine and exercisable. Weak language: "Contractor may propose a substitute, subject to Client's approval, such approval not to be unreasonably withheld." This is too weak, case law often treats it as personal-service-only. Strong language: "Contractor may, at Contractor's sole discretion, provide a substitute to perform the Services, provided the substitute meets the same general experience requirements. Contractor remains responsible for the work delivered." Stronger still: actually USE the substitution clause at least once in a long engagement, even briefly.

**Right of refusal / no obligation to accept future work.** "Client is under no obligation to offer further work and Contractor is under no obligation to accept any work offered." Demonstrates absence of mutuality of obligation.

**Fee per deliverable not per day where possible.** "Contractor will deliver [specific outputs] for a fixed fee of £X" is stronger than "Contractor will work N days at £Y/day". Day-rate engagements can still be outside IR35 but require stronger evidence elsewhere.

**Provision of own equipment.** "Contractor will use Contractor's own equipment to deliver the Services" with a carve-out for client-system access where genuinely required for the work.

**Indemnity and liability cap symmetric to a business engagement** (not employment-like). Suggests business-to-business relationship.

**No employee-style provisions.** No notice periods exceeding normal business contract terms (30-90 days is fine; 3-month employment-style notice is suspect). No paid holiday, no sick pay, no benefits language.

**Specific Statement of Work for each engagement** under a Master Services Agreement framework. Strengthens project-based positioning.

## Working practices

**Don't appear in the client's internal directory or org chart.** If the client lists you alongside employees in their internal systems, you look like an employee.

**Don't attend internal team meetings as a team member.** Attend project meetings as the external supplier; don't attend team retrospectives, all-hands, or social events as if you're staff.

**Don't accept direction on hours, location, or method.** You decide when and where to work; you decide what method to use to deliver. The client specifies the deliverables and deadlines.

**Bill against defined milestones or deliverables** where possible, not against time on the client's clock. If day-rate billing, attach to project milestones or sprints.

**Use your own equipment** for as much of the work as practical. Where client systems must be used (access to internal data, security tools), this is acceptable, but bring your own laptop where possible.

**Don't take on activities outside the agreed scope** without a written change request and amended fee. The "while you're at it" task pattern is employee-like and weakens IR35 position.

**Have your own business presence.** Professional indemnity insurance; business bank account; business website; multiple concurrent clients where possible. Being a "business of your own" is a context factor in IR35 case law.

**Decline employment perks even if offered.** No corporate Christmas gifts. No corporate health insurance access. No company social events as a participant. These are nice gestures from clients but each one weakens IR35.

## What the client controls (under reforms since 2021)

Since April 2021, for engagements with medium-large private sector clients (more than 50 employees OR turnover above £10.2m OR balance sheet above £5.1m, meeting 2 of 3) AND ALL public sector clients, the CLIENT determines IR35 status and issues a Status Determination Statement (SDS). You can appeal in writing within 45 days if you disagree; the client must respond within 45 days.

For small private clients (below all thresholds), the contractor still determines IR35 status.

The protections above support YOUR position when you determine; they ALSO support an outside-IR35 SDS where the client is determining, because the client's determination should reflect the actual contract and working practices.

## What to do if a client issues an inside-IR35 SDS for work you believe is outside

Appeal in writing within 45 days. The client has 45 days to respond. If they hold the determination, your options are: accept and continue (taxed as employment for that engagement with no employment rights); switch to umbrella for that engagement (cleaner administratively); decline the work; escalate to HMRC's dispute team if you believe the determination is genuinely wrong.$ref$,
    NULL,
    ARRAY[6, 7],
    '2026-05-25',
    'solo-team'
  ),

  (
    'template',
    'Essential contract clauses for independent consultants',
    'Practical checklist of the clauses that must appear in any service contract between an independent consultant and a UK business client.',
    $ref$# Essential contract clauses

Every service contract between an independent consultant and a UK business client should cover the clauses below. The contract may be your template, the client's template, or a Master Services Agreement plus Statement of Work pair. Whichever it is, these clauses must be present and worded appropriately.

## Scope of work

Specific deliverables, not "consulting services". The scope clause is the contract-critical specification of what you are delivering. Vague scope creates scope creep and disputes.

Good: "Contractor will deliver: (1) a 20-page strategy document covering [specific topics]; (2) one 90-minute facilitated workshop with the executive team; (3) one round of revisions to the document based on workshop feedback." Bad: "Contractor will provide strategic consulting services."

## Payment terms

Amount; payment schedule; currency; late payment provisions. Include the statutory Late Payment of Commercial Debts (Interest) Act rights, 8% over Bank of England base rate plus £40-£100 fixed costs per overdue invoice.

Standard: net 30 from invoice. Consider 50% upfront for projects under £20k from new clients.

## Intellectual Property

Specify three things separately:

**Foreground IP** (what you create specifically for the client during the engagement): typically vests in the client on payment.

**Background IP** (your pre-existing methodologies, frameworks, templates, tools): explicitly retained by you, with a perpetual licence granted to the client to use them as part of the deliverable.

**Reusable IP developed during the engagement** (general frameworks not specific to this client): retained by you with carve-out language.

Default work-for-hire language often assigns EVERYTHING to the client including your pre-existing IP. Push back on this.

## Liability cap

Industry standard: fees paid in the 12 months preceding the claim. Never accept uncapped liability for an advisory engagement.

Standard exclusions (which remain uncapped): gross negligence, wilful misconduct, IP infringement, breach of confidentiality. These uncapped exclusions are reasonable; the cap should apply to everything else.

## Indemnities

Should be mutual. Client indemnifies you for claims arising from the client's instructions or materials they provided; you indemnify the client for IP infringement and breach of confidentiality. One-sided indemnities (only you indemnify) are a flag.

## Confidentiality

Define what is confidential (client business information, customer data, financial information). Define duration (typically 3-5 years after engagement ends). Include carve-outs: information already in the public domain, independently developed information, information lawfully obtained from a third party.

## Termination

Notice periods for either party to terminate. Typically 30 days for retainer engagements; project engagements often run to completion without termination provisions. Specify what happens on termination: payment for work completed; return of confidential information; transition obligations.

## Governing law and jurisdiction

For UK independents: "This Agreement shall be governed by the laws of England and Wales, and the parties submit to the exclusive jurisdiction of the English courts."

## Sub-processing of personal data

If the engagement involves any personal data processing, include UK GDPR / DPA obligations: lawful basis, security measures, breach notification, sub-processor approval, data return or deletion on termination. Often a separate Data Processing Agreement.

## Insurance

Specify the insurance you carry (Professional Indemnity limit; Public Liability if relevant; Employer's Liability if applicable). Client may specify minimum levels they require.

## Change request process

How scope changes are handled mid-engagement. Specify: any change in writing; priced before work begins; signed off by named approver on client side.

## What NOT to include

**Non-compete clauses** that prevent you working with the client's competitors for X months after the engagement. For independents, these are usually unenforceable and harmful to your practice. Push back.

**Exclusivity clauses** that prevent you working with other clients during the engagement. Acceptable for full-time interim placements; not for advisory work.

**Open-ended warranty language** like "the deliverables will be free of errors and fit for purpose". Unrealistic for advisory work. Soften to "performed with reasonable professional skill and care".

**Indemnity for consequential losses** (lost profits, business interruption). Standard contracts exclude consequential losses on both sides.

## Template sources

For engagements under £20k with professional business clients, templates from Law Depot, Rocket Lawyer, or your professional body are usually sufficient.

For engagements above ~£20k, heavily one-sided client contracts, or unusual IP/indemnity/liability provisions: a one-hour commercial solicitor review (£200-£400) is worth it. UK commercial solicitors who work with consultants and contractors regularly: Markel Law, Bytestart, and many smaller firms specialise in this work.$ref$,
    NULL,
    ARRAY[7],
    '2026-05-25',
    'solo-team'
  ),

  (
    'template',
    'Privacy notice structure for independent consultants',
    'Template structure for a UK GDPR-compliant privacy notice that an independent consultant can publish on their website or include in engagement letters.',
    $ref$# Privacy notice structure

Under UK GDPR (Article 13), you must provide certain information to data subjects when you collect personal data from them directly. This is typically done via a Privacy Notice, published on your website, linked in your email signature, or included in engagement letters.

The structure below covers the required information. Adapt to your specific business; the categories are mandatory but the specifics vary.

## Required content

**1. Who you are and how to contact you**

Your name (or business name); business address; ICO registration number; contact email for data protection matters.

**2. What personal data you collect**

Be specific. Common categories for an independent consultant: name; business email; phone number; job title; organisation; correspondence content; meeting notes; commercial information about engagement.

If you collect special category data (health, ethnic origin, political opinions, religious belief, biometric, genetic, sexual orientation, trade union membership), state this explicitly and the additional lawful basis under Article 9.

**3. Where you get the data**

Direct from the data subject; from a referrer or introducer; from public business directories (Companies House, LinkedIn); from a third-party platform.

**4. Why you process it (purposes)**

Specific purposes. Examples for an independent consultant: respond to enquiries; deliver contracted services; issue invoices and process payments; manage relationships with past, current, and prospective clients; comply with legal obligations (tax records, AML if applicable).

**5. Lawful basis for each purpose**

Article 6 of UK GDPR provides six lawful bases:

- Consent
- Contract (necessary for the contract performance)
- Legal obligation
- Vital interests
- Public task
- Legitimate interests

For an independent consultant, the typical bases are: Contract (for active engagements); Legitimate Interests (for prospective client communications, contact-list maintenance, marketing); Legal Obligation (for tax records and statutory record-keeping).

If relying on Legitimate Interests, you must conduct a Legitimate Interests Assessment (LIA) and be able to produce it on request.

**6. Who you share the data with (recipients and categories)**

Your accountant (named or category, "professional accountancy services"); HMRC and other tax authorities; your bank; cloud service providers you use (Google Workspace / Microsoft 365 / Dropbox / Notion etc); any sub-processors involved in delivering specific engagements.

**7. International transfers**

If any of your data processors are outside the UK or EU (US-based cloud services are common), state the legal mechanism: adequacy decision, Standard Contractual Clauses (SCCs), or UK International Data Transfer Agreement.

**8. Retention period**

How long you keep the data. Examples: tax-relevant records for 5 years post the relevant Self Assessment filing deadline (sole trader) or 6 years post financial year end (Ltd); correspondence retained for 3 years post engagement end; prospective client contact data retained while engagement is plausibly possible.

**9. Data subject rights**

Under UK GDPR, data subjects have rights to: be informed; access their data (Subject Access Request); rectification of inaccurate data; erasure (right to be forgotten, subject to exceptions); restriction of processing; data portability; object to processing (particularly for legitimate interests basis); rights related to automated decision-making.

List these rights and explain how to exercise them.

**10. Right to complain to the ICO**

State that data subjects can complain to the ICO at ico.org.uk or 0303 123 1113.

**11. Date of last update**

Privacy notices should be reviewed and updated at least annually or when processing materially changes.

## Where to publish

For independent consultants with a website: a dedicated /privacy page linked from the footer. Some consultants also include a short privacy note in their email signature linking to the full notice.

For consultants without a website: include the privacy notice in engagement letters and in any contact form on a third-party platform you use (LinkedIn message templates, contact emails).

## Common mistakes

Copy-pasting a privacy notice from another business without adapting to your actual data processing. The ICO can examine your notice and the actual processing; mismatch is a compliance gap.

Vague language like "we may share with third parties". Be specific. Name categories at minimum.

Omitting the Legitimate Interests Assessment. If you rely on Legitimate Interests for any processing, the LIA must exist; not having it is a compliance gap even if your notice is well-written.

Forgetting to update when you add a new sub-processor or change retention practice.

## ICO resources

The ICO publishes a free Privacy Notice Generator at ico.org.uk that walks through the required sections. Useful starting point; review and customise rather than publishing verbatim.$ref$,
    NULL,
    ARRAY[8],
    '2026-05-25',
    'solo-team'
  ),

  (
    'template',
    'Data Processing Agreement template structure',
    'Required clauses for a UK GDPR Article 28 Data Processing Agreement, typically requested by clients when you process personal data on their behalf.',
    $ref$# Data Processing Agreement (DPA) structure

A Data Processing Agreement is required by Article 28 of UK GDPR whenever a Controller engages a Processor. For an independent consultant working with a client's personal data under the client's direction, you are the Processor and the client is the Controller. The Controller must put the DPA in place; the Processor (you) signs and complies.

Many clients send their own DPA. Some clients (smaller businesses, less GDPR-mature) ask you to provide one. Have a template ready.

## Mandatory clauses (Article 28)

**1. Subject matter and duration of the processing**

The specific personal data processing you'll perform and how long it will last. Tie to the engagement.

**2. Nature and purpose of the processing**

What you'll do with the data and why. Examples: "Analysis of customer behaviour patterns for retention improvement"; "Preparation of HR policy recommendations based on employee survey data".

**3. Type of personal data**

Categories of data. Examples: "Employee names, job titles, salary information, performance ratings"; "Customer names, contact details, purchase history, satisfaction scores".

**4. Categories of data subjects**

Whose data. Examples: "Employees of [Client]"; "Customers of [Client]'s retail division".

**5. Obligations and rights of the Controller**

What the Controller (client) commits to: provide documented instructions; ensure the lawful basis for the processing is in place; provide the processor with necessary information; be the primary point of contact for data subject requests.

**6. Processor obligations (Article 28(3))**

The Processor must:

(a) Process the personal data only on documented instructions from the Controller, including for international transfers (unless required by law to act otherwise, in which case notify the Controller in advance unless prohibited by law).

(b) Ensure persons authorised to process the personal data have committed to confidentiality.

(c) Take all measures required by Article 32 (security of processing), appropriate technical and organisational measures including pseudonymisation, encryption, ongoing confidentiality / integrity / availability of processing systems, ability to restore availability after incidents, regular testing.

(d) Respect conditions for engaging sub-processors (Article 28(2) and (4)), usually requires general or specific written authorisation; flow down DPA terms.

(e) Assist the Controller in fulfilling data subject rights requests (access, rectification, erasure, restriction, portability, objection).

(f) Assist the Controller with compliance with Articles 32-36 (security, breach notification, DPIAs, prior consultation).

(g) At the Controller's choice, delete or return all personal data after the engagement ends, and delete existing copies unless retention required by law.

(h) Make available to the Controller all information necessary to demonstrate compliance with Article 28 and allow for audits including inspections.

**7. Sub-processor list**

List of approved sub-processors. For an independent consultant, common sub-processors include: cloud storage (Google Drive, Dropbox); email provider (Google Workspace, Microsoft 365); document collaboration (Notion, Microsoft 365); transcription services if used; project management tools if used. Some clients require advance notification of changes; most require general advance authorisation in the DPA.

**8. Security measures**

Specific measures you have in place. Examples for an independent consultant: device encryption (BitLocker, FileVault); strong passwords + 2FA on all accounts; secure file deletion on engagement end; client data segregated from personal data; locked premises when working from a shared location.

**9. Breach notification**

Processor must notify the Controller "without undue delay" after becoming aware of a breach, with information sufficient to enable the Controller to notify the ICO within 72 hours.

**10. Return or deletion of data**

Specify timing (typically 30 days after engagement end) and method (secure deletion; certificate of deletion if requested).

**11. Audit rights**

Allow the Controller to audit your compliance (typically via questionnaire annually, with right to on-site audit if reasonable).

## Optional additional clauses

- Insurance and liability for breaches caused by Processor
- International transfer mechanisms if you operate from or use processors outside the UK/EU
- Confidentiality beyond Article 28 baseline
- Cooperation with regulator investigations

## Practical tips

Most large client DPAs include all the above plus extensive boilerplate. The boilerplate is often inherited from contracts written for larger processors (corporate IT vendors); some clauses are difficult or impossible for an independent consultant to comply with as written (e.g. "annual SOC 2 Type II audit"). Push back on disproportionate requirements with realistic alternatives.

If you process small volumes of personal data for a small number of clients, your DPA negotiation position is "I will comply with the substantive obligations; I cannot comply with disproportionate audit and certification clauses designed for enterprise vendors. Here's what I can offer instead." Most clients accept.

The DPA is signed by the Controller and Processor; it sits alongside the main commercial contract. Some clients put DPA terms inside the main contract rather than as a separate document, substantively equivalent.$ref$,
    NULL,
    ARRAY[8],
    '2026-05-25',
    'solo-team'
  ),

  (
    'checklist',
    'Insurance shopping checklist for new independents',
    'Practical checklist of what to buy first, what to defer, and what to ask brokers when shopping for independent consultant insurance.',
    $ref$# Insurance shopping checklist

For a new independent consultant in the UK, the insurance question can be confusing. The list below sequences what to buy first, what to defer, and what to actively decline. Calibrate to your specific work and clients.

## Buy first (before your first client engagement)

**Professional Indemnity (PI) insurance.** £250,000-£2,000,000 cover depending on revenue and client requirements. £300-£1,500/year typical. Required by most corporate clients in procurement.

Shopping route: 2-3 quotes from brokers familiar with your sector. See Module 1's "How to pick a PI broker" reference for selection criteria.

What to specify when getting quotes: your expected revenue band; your work type (advisory, project delivery, implementation, training); your client base profile (large corporate, SME, public sector, individual); any prior PI claims history.

What to compare across quotes: cover limit (each-and-every-claim better than aggregate); excess (your contribution per claim); specific exclusions relevant to your work; territory and jurisdiction; cost.

## Buy if applicable

**Public Liability (PL).** £1m-£2m cover. £100-£300/year. Relevant if you regularly attend client premises (could trip a client, knock over equipment, damage property). Often bundled with PI at a small discount. Less relevant for fully remote work.

**Employers' Liability (EL).** Legally required £5m+ cover if you employ anyone, including some contractor relationships and family members on payroll. £100-£300/year for a director-only company with no employees may still need this depending on structure, check with your insurer. Not required for a director-only Ltd with no other employees.

**Business equipment cover.** £40-£150/year for £3,000-£5,000 of equipment (laptop, monitors, peripherals). Home contents insurance often excludes business equipment. Often bundled with PI/PL packages.

**Cyber insurance.** £200-£500/year for an independent. Covers data breach response costs, business interruption from cyber attack, legal defence costs. Increasingly recommended for any consultant processing client personal data; some PI policies include limited cyber cover, but standalone is broader.

## Personal protection, review whether needed

**Income protection.** £40-£150/month for 30-50 year old non-smoker. Insures a percentage of pre-tax income (typically 50-65%) if you can't work due to illness or injury. Particularly important for solo earners with no employer sick pay; doubly so if you have dependents.

Critical specifications to compare: deferred period (4 weeks / 3 months / 6 months / 12 months, longer = lower premium); definition of incapacity ("own occupation" is strong; "any occupation" is weak); whether premiums are guaranteed or reviewable.

**Critical illness cover.** £100,000-£500,000 lump sum on diagnosis of specified critical illnesses (cancer, heart attack, stroke being the big three). Useful if you have dependents or a mortgage. Not essential for solo earners with no dependents.

**Life cover (term assurance).** £8-£25/month for £250,000 over 20-25 years for non-smoker in 30s-40s. Critical if you have financial dependents. Joint life or single life decision; level term or decreasing term aligned with mortgage.

## Defer to month 6+ unless specific reason

**Cyber insurance**, defer if you process minimal personal data and use only well-secured mainstream tools.

**Directors and Officers (D&O) insurance**, relevant when you take external investment, sit on a board, or have material liability exposure beyond normal trading. Not relevant for solo independent consultants typically.

**Trade credit insurance**, relevant for businesses with concentrated AR exposure; not relevant for typical independent consultants invoicing established businesses on net 30 terms.

## Actively decline

**Tax investigation insurance**, sold by some accountants as £100-£300/year for HMRC enquiry defence. If you have a competent accountant and have filed honestly, the risk is low. Some accountants include this in their retainer; if so, no need to buy separately.

**Business equipment cover that duplicates home contents.** Check your home contents policy carefully before buying separate cover; some include limited business equipment cover.

**Cheap cyber insurance with minimal cover.** £100/year cyber policies often have £10,000 limits and significant exclusions, close to useless for a real incident. If you need cyber, buy meaningful cover or don't bother.

## Questions to ask any insurance broker

1. How many independent consultants in my sector do you have on your book?
2. Which insurers do you typically place me with, and why?
3. What are the specific exclusions in the proposed wording I should know about?
4. What is your claims handling process if I need to claim?
5. How does renewal work, premium reviews, claims experience impact, ability to switch insurers?

A broker who gives clear specific answers to all five is a good sign. A broker who can only quote prices without addressing the substance is not the broker for you.$ref$,
    NULL,
    ARRAY[9],
    '2026-05-25',
    'solo-team'
  );
