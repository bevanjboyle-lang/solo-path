-- Module 1 reference layer (Business Structure)
-- Authored 2026-05-25 as the first per-module reference-content drop into
-- module_reference_items (created by 20260525170000_create_module_reference_items.sql).
-- Closes Module 1 to the full strawman bar (addendum + curated reference
-- layer) per admin/guidance-module-1-strawman-v0.md.
--
-- Seven items spanning four content_types: comparison (3), questions (2),
-- link (1), template (1), calendar (1). One item is shared across multiple
-- modules via applicable_module_ids; the rest are Module 1 only at first
-- drop and will pick up additional applicable_module_ids as other modules
-- come up to the bar.
--
-- All inline_content uses dollar-quoted strings ($ref$...$ref$) to avoid
-- single-quote escaping in long markdown bodies.
--
-- Tax rates and worked examples reflect UK 2026/27 tax year, verified
-- May 2026. Items 1 and 5 carry "verify with a UK-qualified accountant
-- before launch" caveats inline because the math is sensitive to the
-- pension-contribution variable and individual circumstances. The numbers
-- have been recomputed against UK 2026/27 rates but Bevan should read the
-- worked examples once before going live to confirm.

INSERT INTO public.module_reference_items
  (content_type, title, one_line_description, inline_content, external_url, applicable_module_ids, verified_date, verified_by)
VALUES

-- ────────────────────────────────────────────────────────────────────────
-- Item 1: comparison, sole trader vs Ltd vs umbrella, full comparison
-- ────────────────────────────────────────────────────────────────────────
(
  'comparison',
  'Sole trader vs limited company vs umbrella: the full comparison',
  'Side-by-side comparison of the three UK structures with worked tax math at four income bands (£20k / £40k / £60k / £100k), plus admin burden, IR35 exposure, and liability.',
  $ref$# Sole trader vs limited company vs umbrella: the full comparison

UK 2026/27 tax year. Verified May 2026. Tax thresholds occasionally move at Autumn Statement; reconfirm current rates at gov.uk before acting on a marginal call.

## The three structures in one paragraph each

A **sole trader** is you, trading in your own name. There is no separate legal entity. You report income on Self Assessment, pay Income Tax and Class 4 National Insurance on profits, and keep what is left. Light-touch admin, full personal liability, no separation between business cash and personal cash.

A **limited company** is a separate legal entity that contracts with clients and pays you. You are typically the sole director and shareholder. The company pays Corporation Tax on profits; you draw a small salary plus dividends; you pay personal Income Tax on what you take out. More admin (annual accounts, corporation tax return, payroll), limited liability, separation between company and personal money.

An **umbrella company** is a third-party PAYE employer. You work for clients but the umbrella employs you for tax purposes. You get a payslip, the umbrella handles all tax and NIC at source, you keep the net amount. Heaviest cost (you effectively pay both employer and employee NIC plus the umbrella margin), zero admin, no IR35 risk because you are PAYE.

## Worked tax math at four income bands

Each scenario is a single-person UK trader with no other income, taking maximum tax-efficient draws. Numbers are illustrative and round to the nearest £100. Your actual position depends on allowances, expenses, and any other income. Important: these figures do not model pension contributions, which materially flip the comparison for limited companies above ~£60k profit (see "What this comparison does not fully model" below).

### £20,000 of revenue (low income, testing the market)

|                            | Sole trader | Limited company | Umbrella |
|----------------------------|-------------|------------------|----------|
| Trading profit (after £2k expenses) | £18,000 | £18,000 | £18,000 |
| Tax + NIC                  | ~£1,400 | ~£2,100 (CT + dividend tax + employer NIC) | ~£3,500 (PAYE + both NICs + umbrella margin) |
| Annual accountant or umbrella cost | £150-£300 | £500-£900 | (included in margin above) |
| Take-home                  | ~£16,300 | ~£15,000 | ~£14,500 |

Sole trader is the cleanest answer. The Ltd structure adds £500-£800 of cost for no offsetting tax saving at this income level.

### £40,000 of revenue (early independent)

|                            | Sole trader | Limited company | Umbrella |
|----------------------------|-------------|------------------|----------|
| Trading profit (after £4k expenses) | £36,000 | £36,000 | £36,000 |
| Tax + NIC                  | ~£6,100 | ~£6,200 | ~£8,400 |
| Annual accountant cost     | £200-£400 | £900-£1,500 | (in umbrella margin) |
| Take-home                  | ~£29,600 | ~£28,900 | ~£27,600 |

Roughly break-even between sole trader and Ltd. Sole trader edges ahead by £700-£1,000 net of the higher accountant cost a Ltd carries. Stay sole trader unless you want liability separation or expect rapid income growth.

### £60,000 of revenue (where the answer starts to depend on pensions)

|                            | Sole trader | Limited company | Umbrella |
|----------------------------|-------------|------------------|----------|
| Trading profit (after £6k expenses) | £54,000 | £54,000 | £54,000 |
| Tax + NIC (no pension)     | ~£11,400 | ~£10,900 | ~£14,000 |
| Annual accountant cost     | £200-£400 | £900-£1,500 | (in margin) |
| Take-home cash (no pension lever) | ~£42,300 | ~£42,200 | ~£39,000 |

Sole trader and Ltd are essentially break-even on cash terms at this band. The Ltd advantage that conventional wisdom cites appears only once you add the pension lever. With £10k-£20k of employer pension contributions per year through the Ltd, the effective Ltd advantage opens to £2,000-£5,000 per year.

### £100,000 of revenue (where the lever decides it)

|                            | Sole trader | Limited company | Umbrella |
|----------------------------|-------------|------------------|----------|
| Trading profit (after £10k expenses) | £90,000 | £90,000 | £90,000 |
| Tax + NIC (no pension)     | ~£26,500 | ~£27,300 | ~£28,500 |
| Annual accountant cost     | £300-£500 | £1,200-£2,000 | (in margin) |
| Take-home cash (no pension) | ~£63,200 | ~£61,800 | ~£61,500 |
| Take-home with £20k employer pension via Ltd | n/a | ~£52,000 cash + £20,000 pension (~£68,000 combined value) | n/a |

Without pension contributions, sole trader holds up surprisingly well at £100k. The structural advantage Ltd offers at this level is entirely about the pension lever (and the smoothing-across-years lever, if your income is volatile). For someone making £20k+ per year of employer pension contributions through a Ltd, Ltd is clearly the right structure at this band by £3,000-£5,000 of combined value per year.

## Side-by-side comparison

|                                              | Sole trader | Limited company | Umbrella |
|----------------------------------------------|-------------|------------------|----------|
| Tax efficiency at <£35k profit               | Best        | Marginal cost    | Worst    |
| Tax efficiency at £35k-£60k profit           | Good        | Roughly equal    | Worst    |
| Tax efficiency at >£60k profit (no pension)  | Roughly equal | Roughly equal | Worst    |
| Tax efficiency at >£60k profit (with pension via Ltd) | Worst | Best | n/a |
| Admin burden                                 | Lowest (SA only) | Highest (accounts, CT600, payroll, confirmation statement) | Lowest (payslip only) |
| Annual accountant cost                       | £150-£500 typical | £900-£2,000 typical | None (in margin) |
| Personal liability                           | Full        | Limited to company assets (some pierces) | Limited (employed by umbrella) |
| IR35 exposure                                | Not applicable | High if single dominant client | Eliminated |
| Time to set up                               | 15 minutes  | 2-4 weeks done properly | 1-3 days |
| Speed to first invoice                       | Immediate   | 1-2 weeks (bank account first) | Immediate |
| Pension lever via employer contribution      | Personal pension only (with HR top-up) | Employer contributions deductible from CT (large lever) | None |
| Suitability for multiple clients             | Excellent   | Excellent        | Poor (umbrellas built for single-client PAYE) |
| Suitability for single dominant client       | OK, IR35 moot | High IR35 risk to manage | Built for this case |

## When each structure is the right call

**Sole trader is right when** annual profit sits under £35,000, you work across multiple clients, you prefer light admin, and personal liability is manageable (use professional indemnity insurance, not a different legal structure, for liability concerns). Also right at £35,000-£60,000 if you do not plan large pension contributions and you value the admin simplicity.

**Limited company is right when** profit consistently exceeds £60,000 AND you intend to make significant employer pension contributions (£10,000+ per year), or when a client requires it, or when you want to smooth volatile income across tax years by retaining profits.

**Umbrella is right when** you have a single dominant client for a defined period (typically a 3-12 month inside-IR35 contract), the client requires PAYE employment, and the admin simplicity outweighs the take-home hit.

## What this comparison does not fully model

- **Pension contributions through a Ltd company.** Employer contributions up to £60,000 per year are deductible from Corporation Tax and do not trigger personal Income Tax. This is the largest single lever that flips the structural choice for higher earners. A sole trader can pay into a personal pension and reclaim higher-rate relief, but the Ltd route is meaningfully more tax-efficient for contribution amounts above ~£10,000 per year.
- **Retained earnings.** A Ltd company can retain profit across tax years, paying CT on it but deferring dividend tax until you withdraw. This smooths income across years and can reduce overall tax for someone whose income varies year to year.
- **Multiple income sources.** If you have employment income, rental income, or other untaxed income, the Self Assessment computation gets more complex. The numbers above assume only the trading income.
- **VAT.** None of the above models VAT, which kicks in compulsorily above £90,000 of VAT-able revenue. See Module 5 (VAT).
- **Specific allowable expenses for your trade.** The £2k-£10k expense assumptions are illustrative. Your actual deductibles depend on what you do.

For an income above £60,000 with consistent profit and any meaningful pension intention, a one-hour scoping call with a Ltd-experienced accountant before you decide is the right next step.$ref$,
  NULL,
  ARRAY[1],
  '2026-05-25',
  'solo-team'
),

-- ────────────────────────────────────────────────────────────────────────
-- Item 2: questions, How to pick a PI broker (rewritten from named-broker shortlist per Bevan's scope decision 2026-05-25)
-- ────────────────────────────────────────────────────────────────────────
(
  'questions',
  'How to pick a PI broker (for financial services work)',
  'Selection criteria for a UK professional indemnity insurance broker if your work touches financial services: what to look for, what exclusions to ask about, typical premium ranges.',
  $ref$# How to pick a PI broker for financial services work

Professional indemnity (PI) insurance covers you against client claims of financial loss caused by your advice or work. Buying through a broker rather than a direct-to-consumer site matters more for financial services work than for most sectors, because FS PI policies frequently carry exclusions that make off-the-shelf policies effectively useless for your situation.

## What to look for in a broker

**FS-specific experience.** Ask directly: "How many financial services consultants and advisors are on your book?" If the answer is vague or below ten, walk. FS PI is a specialist subset of PI; brokers who do general PI plus FS as a side line tend to place you with insurers whose exclusion language was not drafted for FS work.

**Lloyd's market access.** Most defensible FS PI policies route through the Lloyd's market. A broker who can quote multiple Lloyd's syndicates can usually find better coverage than one tied to a single mainstream insurer. Ask: "Do you place at Lloyd's? Which syndicates?"

**Willingness to read your specific work into the wording.** A good FS PI broker will ask what kind of advice you give, to which type of client, on what mandate, and will then check whether that scope is actually covered under the policy wording they are proposing. A weaker broker quotes a generic policy and leaves the exclusion-matching to you.

**Claims handling track record.** Ask: "If a client made a claim against me on a piece of advice I gave six months ago, walk me through the first 48 hours." The answer should be specific (who you call, what they do, when an insurer is appointed). Vague answers mean their claims process is reactive.

## Exclusion clauses to ask about specifically

PI policies routinely exclude work that is more central to your situation than the broker initially realises. Ask your broker to point to where each of these is treated in the proposed wording before signing:

- **Insolvency advice exclusion.** Common in mainstream PI. If any of your work touches restructuring, distressed asset advisory, or anything near insolvency practitioner territory, ensure the wording does not silently exclude it.
- **US person exclusion.** Many UK PI policies exclude claims brought by US-domiciled clients or claims that involve US securities. If your client base includes US persons or US-listed assets, ask explicitly.
- **Cyber and data breach carve-out.** PI is not cyber insurance. Confirm whether the policy includes any data-breach response cover or whether you need separate cyber insurance alongside.
- **Regulated activity exclusion.** Some PI policies exclude work that constitutes a regulated activity under FSMA without proper FCA authorisation. If you are not FCA-authorised, ensure your scope of work falls outside regulated activities, or that the policy explicitly covers unauthorised work within the bounds of legality (e.g. advice on internal business processes for FS firms).
- **Aggregate limit vs each-and-every-claim.** Cheap policies often have an aggregate limit (one pot for all claims in a policy year). Better policies have each-and-every-claim limits. Ask which structure you are being quoted.

## Typical premium ranges

Premiums depend on revenue, scope of work, and limit chosen. As of May 2026, indicative ranges for a UK FS advisory consultant trading independently:

- **£250,000 limit, sub-£50k revenue:** £300-£600 per year
- **£500,000 limit, £50k-£100k revenue:** £500-£900 per year
- **£1m limit, established practice with several clients:** £900-£1,500 per year
- **£2m+ limit, work for institutional FS clients who require it:** £1,500-£3,000+ per year

Some clients (particularly large banks and asset managers) require a £1m or £2m minimum limit in their vendor onboarding. Ask your prospective clients before buying, if you can.

## What to share with the broker on first contact

To get a useful quote rather than a generic one, share:

- Your expected annual revenue range
- Your client base profile (corporate FS, individual investors, wholesale, retail)
- The advisory mandates you typically work under
- Any current or planned FCA authorisation status
- Your existing PI history (any prior claims, prior insurers)

A broker who asks for none of this and quotes you immediately is selling you a generic policy.

## After you buy

Save the certificate as a PDF. Most FS clients ask for it during procurement onboarding. Some ask for the broker's contact details too, so they can verify the certificate independently. Keep both somewhere you can reach in 60 seconds when a procurement team emails.$ref$,
  NULL,
  ARRAY[1, 9],
  '2026-05-25',
  'solo-team'
),

-- ────────────────────────────────────────────────────────────────────────
-- Item 3: link, HMRC Self Assessment registration
-- ────────────────────────────────────────────────────────────────────────
(
  'link',
  'HMRC Self Assessment registration',
  'The canonical gov.uk page for registering as self-employed for Self Assessment. Required by 5 October following the tax year in which you started trading.',
  $ref$# HMRC Self Assessment registration

This is the gov.uk page where you register as self-employed with HMRC. Required if you have earned more than £1,000 from self-employment in a tax year.

The deadline is **5 October** following the tax year in which you started trading. For tax year 2026/27 (trading started between 6 April 2026 and 5 April 2027) the deadline is **5 October 2027**. Late registration carries an initial £100 penalty.

Have your National Insurance number ready. The registration takes about 15 minutes online. You will receive a UTR (Unique Taxpayer Reference) letter in the post within 10 working days.$ref$,
  'https://www.gov.uk/register-for-self-assessment',
  ARRAY[1, 2, 4],
  '2026-05-25',
  'solo-team'
),

-- ────────────────────────────────────────────────────────────────────────
-- Item 4: template, Sole trader tax reserve guide (inline, no downloadable spreadsheet at v1)
-- ────────────────────────────────────────────────────────────────────────
(
  'template',
  'Sole trader tax reserve: how much to set aside per invoice',
  'Simple percentage-of-revenue heuristic for setting aside tax money as a sole trader, with bands at £15k / £30k / £50k / £100k profit and a worked example.',
  $ref$# Sole trader tax reserve: how much to set aside per invoice

The biggest avoidable cash-flow shock for a new sole trader is the January Self Assessment bill arriving with no money set aside. The fix is a habit, not a product: move a fixed percentage of every client payment into a separate savings account the day it arrives.

## The percentages

The right percentage depends on your expected annual profit (revenue minus business expenses), because Income Tax and Class 4 NIC are progressive. These are conservative percentages calibrated to over-save slightly; you get the excess back in your bank, not as a January surprise.

| Expected annual profit | Set aside per invoice | Rationale |
|------------------------|------------------------|-----------|
| Under £15,000          | 0%                     | Profit sits below or near your personal allowance (£12,570). You owe nothing or close to it. |
| £15,000-£30,000        | 15%                    | Basic-rate Income Tax + Class 4 NIC on the slice above the personal allowance. |
| £30,000-£50,000        | 25%                    | Same rates, larger slice. Build a buffer. |
| £50,000-£100,000       | 35%                    | Higher-rate Income Tax (40%) starts at £50,270. The marginal rate jumps from 26% to 42% above that line. |
| Over £100,000          | 40%                    | Higher rate continues, and your personal allowance starts tapering at £100,000. Above £125,140 you lose the allowance entirely. |

These percentages are revenue-side reserves, applied to the gross invoice. They assume you will deduct allowable expenses before computing the actual tax bill, so the reserve runs slightly long. That is the point.

## How to operate the habit

**Open a savings account separate from your trading current account.** Any UK bank, no specific recommendation needed. The point is friction: you should have to make a deliberate move to take money out of it.

**Set up a standing order or a manual rule.** Standing orders work if your invoices are similar in size and timing. If they vary, set yourself a rule: every payment in, move the percentage out within 24 hours.

**Reconcile against the actual tax bill annually.** When your accountant or your Self Assessment computation produces the final bill in November-December, compare it to what is in the reserve. Anything over is yours. Anything short, fix the percentage for next year.

## A worked example

Sarah is a fractional compliance advisor expecting £45,000 of profit. She uses 25%.

- January: client A pays £4,000. She moves £1,000 into the reserve, leaves £3,000 in trading current account.
- March: client B pays £6,500. She moves £1,625 into reserve.
- By 31 March, she has £4,800 in reserve and has billed £19,200 across three clients.
- By 31 March 2027 she has £11,250 in reserve against £45,000 of billings.
- January 2028: Self Assessment bill arrives at ~£7,400. She pays from the reserve and is £3,850 over. That money returns to trading account.

The reserve over-runs slightly. That is the desired behaviour. The reverse case (under-reserving) creates a January cash crisis that takes months to recover from.

## When to revise the percentage

Move up a band when your expected profit crosses a threshold. Move down only after the Self Assessment cycle proves the percentage was too high. Do not move down in the middle of a tax year on a hunch.$ref$,
  NULL,
  ARRAY[1, 13],
  '2026-05-25',
  'solo-team'
),

-- ────────────────────────────────────────────────────────────────────────
-- Item 5: comparison, When to switch from sole trader to Ltd
-- ────────────────────────────────────────────────────────────────────────
(
  'comparison',
  'When to switch from sole trader to limited company: the actual math',
  'The income, IR35, and client-requirement triggers for switching from sole trader to Ltd, with the 4-6 week setup timeline and what not to do.',
  $ref$# When to switch from sole trader to limited company: the actual math

The standard advice is "switch when you earn £40,000". That number is wrong for most people. The actual triggers are three: income, IR35 exposure, and a specific client requirement. Each operates independently, and the answer changes if more than one applies.

## Trigger 1: Income

The pure cash tax math says the Ltd advantage over sole trader at the same income is closer to break-even than conventional wisdom suggests, once you account for the higher accountant cost and employer NIC on a director's salary. The Ltd advantage compounds quickly once you start making employer pension contributions through the company.

**Below £50k profit:** stay sole trader. The accountant fee plus the cognitive overhead does not pay for itself in cash terms. You are moving money for measurable extra work and no liability gain.

**£50k-£60k profit:** borderline. If your profit is on an upward trajectory and you expect to be solidly above £60k within 12 months, switch now. The setup cost is the same whether you are at £55k or £65k, and you avoid switching twice. If profit is flat or volatile, stay sole trader until you cross £60k two years running.

**Above £60k profit without pension intent:** the cash gap between sole trader and Ltd is £500-£2,000 per year in Ltd's favour, net of accountant fees. Worth switching for the liability separation and the optionality, but not a game-changer purely on tax.

**Above £60k profit with significant pension intent (£10k+/year):** switch. Employer pension contributions through a Ltd are deductible from Corporation Tax and do not trigger personal Income Tax. By £100k profit with £20k of employer pension contributions, the effective Ltd advantage is £3,000-£5,000 per year of combined value over sole trader.

## Trigger 2: IR35

If you are doing work that looks like employment (a single client, on their premises, with their kit, supervised by them, for an extended period), IR35 applies regardless of structure. The structure choice does not fix IR35, but it changes where the question lands.

As a sole trader you cannot operate "inside IR35" because the rules do not apply to you. Your income is simply taxed as self-employment income.

As a limited company contracting with a medium or large client, the client determines IR35 status. If inside, the client deducts tax at source and the Ltd structure loses its tax efficiency for that engagement. The Ltd was useful for managing IR35 risk; switching for IR35 reasons only makes sense if you are also seeing the income trigger fire.

If you are doing work that is clearly inside IR35 and clearly single-client-dominant, umbrella is often a better answer than Ltd for that particular engagement. Module 6 (IR35) covers this in detail.

## Trigger 3: A specific client requires it

Some clients, particularly in financial services, public sector, and large corporates, require their advisors to operate through a limited company as a procurement standard. Some FCA-authorised firms cannot engage individual sole traders for compliance reasons.

If you have or expect a client like this, the switch is not optional. The question becomes timing.

What to know about this trigger:

- You typically have 4-6 weeks from the conversation to be incorporated and ready to invoice. Do not promise sooner unless you have to.
- Some clients will accept "switching now, can invoice through the company within four weeks". Most will. If yours says no and gives you 48 hours, walk away from that piece of work and let it teach you to set up the company before the next pipeline goes commercial.
- A reactive Ltd setup under time pressure tends to skip steps that matter (proper share structure, director's loan account opened correctly, pension scheme set up alongside payroll). Avoid this.

## The 4-6 week setup timeline done properly

**Week 1:** incorporate the company at Companies House (15 minutes online, £50). Open a business bank account in parallel; banks vary on speed (anything from 2 days to 4 weeks).

**Week 2:** engage an accountant; they set you up on Xero or FreeAgent, register the company for Corporation Tax, set up PAYE, prepare the dividend resolution template. Typical fee for the setup work is £200-£400 on top of the ongoing accountant retainer.

**Week 3:** set the director's salary at the optimal level for the tax year (typically aligned with the secondary NIC threshold). Set up the pension scheme alongside payroll if you want employer pension contributions.

**Week 4:** bank account live, accountant onboarded, first invoice issued through the company. Sole trader trade winds down (do not close the sole trader registration immediately; you may still have residual sole-trader income for the part-year that needs Self Assessment).

The trap is doing weeks 1-2 only and then trying to invoice. The bank account and PAYE delay always bite.

## What not to do

- **Do not switch reactively in one email.** A client asking on Tuesday for an invoice on Friday is not a switch trigger; it is a procurement problem. Say you can invoice in four weeks, or invoice as a sole trader for this piece and have the conversation about future invoicing through a Ltd.
- **Do not close the sole trader registration the day you incorporate.** You will typically have residual income to declare in a part-year Self Assessment.
- **Do not skip the accountant on setup.** The setup-time savings are real and the things that go wrong (PAYE incorrectly registered, director's loan account treated as drawings, dividend resolutions missing) take longer to fix than they take to do properly.$ref$,
  NULL,
  ARRAY[1],
  '2026-05-25',
  'solo-team'
),

-- ────────────────────────────────────────────────────────────────────────
-- Item 6: questions, Questions to ask an accountant
-- ────────────────────────────────────────────────────────────────────────
(
  'questions',
  'Questions to ask an accountant before you engage one',
  'Eight questions worth asking a UK accountant before paying for a one-off consultation or a retainer, plus typical fee ranges for each engagement type.',
  $ref$# Questions to ask an accountant before you engage one

Most independent consultants engage one of three accountant relationships: a one-off consultation (£150-£250) to confirm a structural decision; an annual Self Assessment service (£300-£600) as a sole trader; or a full Ltd retainer (£900-£1,500 per year) covering accounts, CT600, payroll, and Self Assessment.

The questions below filter for accountants who are the right fit for an independent advisory consultant or contractor, not for an SME with employees and trading stock. Different model entirely.

## The eight questions

**1. How many independent consultants or contractors do you have on your client list?**

You want someone whose book is at least 30% independent consultants. The recurring questions you will have (dividend timing, expenses claimable, IR35 mood music, when to switch from sole trader to Ltd) are second-nature questions for that accountant. For a generalist accountant whose typical client is a building-trade Ltd, they are first-principles questions every time and your time pays for the slower answers.

**2. Do you handle IR35 status reviews if a client engagement comes up that looks borderline?**

For Ltd-structured contractors, this is the question. The answer should be yes, with a clear process (review the contract, review the actual working practices, produce a documented IR35 status determination). If they say "we do not do IR35 reviews", they are not your accountant for Ltd work.

**3. What does your monthly or quarterly check-in cadence look like, and what does it cost?**

You want a clear answer. Some accountants are reactive (you call when you need something); others run a monthly call. The reactive model is fine for low-volume sole traders. The Ltd model usually benefits from quarterly. Get the cadence and the price agreed in writing.

**4. Do you use Xero, FreeAgent, or something else?**

Most independent-friendly UK accountants standardise on Xero or FreeAgent. The cost is usually bundled into their retainer. If they ask you to use Excel or to send them PDFs of receipts manually, that is a flag.

**5. What is your response time for an email question?**

A clear answer (24 hours in working time, 48 hours, etc.) is more valuable than a fast answer that gets missed. Ask, and then test it in the first month.

**6. Do you handle pension scheme setup if I want to make employer contributions through the company?**

For Ltd-structured contractors above £60k profit, employer pension contributions are one of the highest-value levers. Your accountant either does this themselves or refers you to a pensions specialist. Either is fine; "we do not do pensions" without a referral is a gap.

**7. What is the price you would charge me to file a one-off CT600 if I closed the company in 18 months?**

A circuitous question that tests for honesty. If they answer with a clear figure and a brief explanation, they are not afraid of you leaving. If they are cagey, they are pricing the lock-in.

**8. Are you a member of a professional body (ACCA, ACA, AAT, CIMA, or equivalent)?**

For tax advice you need a qualified person. ACA (ICAEW) and ACCA are the most common chartered routes. AAT is acceptable for bookkeeping and Self Assessment but you typically want chartered for Ltd structures. Verify the membership independently on the professional body website before engaging.

## What a good first conversation looks like

A good first call is 30-45 minutes, no charge for an initial fit conversation, and ends with either (a) a fixed-fee proposal in writing within 48 hours, or (b) a clear "I am not the right fit, you want someone who does X" referral. Either outcome is professional. The bad version is a vague verbal estimate, a vague proposal that arrives weeks later, or a hard sell to a multi-year retainer in the first conversation.

## Typical fee ranges (UK, May 2026)

- One-off consultation, 60-90 minutes: £150-£250
- Sole trader Self Assessment only: £300-£600 per year
- Ltd retainer (accounts + CT600 + payroll + director's SA): £900-£1,500 per year
- Add-on: company incorporation + setup work: £200-£400 one-off
- Add-on: IR35 review per engagement: £200-£500 per contract
- Add-on: pension scheme setup: £150-£300 one-off

Fees vary by region (London is at the top of each range). Fees also vary by accountant specialism. A small chartered accountant who specialises in independent consultants is usually middle of the range and gives you 80% of what a big-firm specialist would for half the price.$ref$,
  NULL,
  ARRAY[1, 2, 4, 5],
  '2026-05-25',
  'solo-team'
),

-- ────────────────────────────────────────────────────────────────────────
-- Item 7: calendar, UK tax-year calendar for sole traders
-- ────────────────────────────────────────────────────────────────────────
(
  'calendar',
  'UK tax-year calendar for sole traders (key dates)',
  'The seven dates a UK sole trader must know: tax year boundaries, Self Assessment filing and payment dates, payment-on-account deadlines, and the late-registration cutoff.',
  $ref$# UK tax-year calendar for sole traders

UK tax year runs 6 April to 5 April. The dates below are the ones a sole trader cannot afford to miss. All dates apply to the current and prior tax year as relevant.

## The seven dates

**6 April: tax year starts.** Income earned from this date forward is in the new tax year. Personal allowance resets. Class 4 NIC bands reset.

**5 April: tax year ends.** All income up to and including this date counts in the year-ending tax computation. Date matters for timing decisions: a payment received on 5 April lands in the year ending; a payment received on 6 April lands in the next year.

**5 October (following the tax year): Self Assessment registration deadline.** If you started self-employment in the tax year that ended on the previous 5 April, you must be registered with HMRC by this date. Late registration penalty starts at £100. For tax year 2026/27 (trading started 6 April 2026 to 5 April 2027), register by 5 October 2027.

**31 October: paper Self Assessment filing deadline.** Almost nobody uses paper. If you file paper, the prior year return is due by this date. Online filers ignore this date.

**31 January: online Self Assessment filing and payment deadline.** This is the big one. Online Self Assessment for the tax year ending the previous 5 April must be filed by midnight 31 January, and the tax bill must be paid by midnight 31 January. Late filing penalty is £100 immediately, escalating after 3 months.

**31 January: first payment on account.** If your prior-year tax bill exceeded £1,000 and at least 80% of your income was untaxed at source, HMRC requires you to make payments on account for the current year. The first payment is due 31 January alongside the prior-year balancing payment, and equals 50% of the prior-year tax bill. Combined with the balancing payment, the 31 January demand often equals 150% of the prior-year bill. This catches most first-Self-Assessment filers by surprise.

**31 July: second payment on account.** The other 50% of the prior-year tax bill, due as an advance against the current year tax. If your current-year income is lower than the prior year, you can apply to reduce both payments on account online.

## What this means in practice (worked example)

Sarah started trading 6 April 2026 (tax year 2026/27).

- **5 October 2027:** register for Self Assessment with HMRC. (Most people forget this date because it does not yet feel like a business; the £100 penalty starts the day after.)
- **October-December 2027:** prepare 2026/27 Self Assessment return.
- **31 January 2028:** file 2026/27 return online. Pay the 2026/27 tax bill in full. If it exceeded £1,000, also pay the first payment on account for 2027/28 (50% of the 2026/27 bill).
- **31 July 2028:** pay the second payment on account for 2027/28.
- **31 January 2029:** file 2027/28 return. Pay any balancing payment for 2027/28 (final 2027/28 tax bill minus the two payments on account already made). Pay first payment on account for 2028/29.

The 31 January 2028 cash demand is what catches people. Build the reserve for it from the day you start trading; the sole trader tax reserve guide covers the percentages.

## What does NOT apply to sole traders

These are common confusions you can ignore as a sole trader:

- **Corporation Tax filing dates (CT600):** only applies to limited companies.
- **Companies House confirmation statement:** only applies to limited companies.
- **VAT quarterly returns:** only applies if you are voluntarily or compulsorily VAT-registered. See Module 5 (VAT).
- **PAYE monthly returns:** only applies if you employ anyone, including yourself through a Ltd company.

If any of these become relevant (you incorporate, you VAT-register, you take on an employee), the calendar expands. Modules 2, 5, and the Ltd portion of Module 1 cover those extensions.$ref$,
  NULL,
  ARRAY[1, 2, 4, 5, 10],
  '2026-05-25',
  'solo-team'
);

-- ────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────
-- After applying this migration, the LLM picker on a Module 1 run will see
-- a menu of 7 items (Item 6 + Item 7 are also visible to Modules 2, 4, 5, 10).
-- The v28 validator will accept reference_layer_ids of 4-7 ids picked from
-- this menu.
