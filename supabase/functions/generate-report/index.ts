import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ARCHETYPES = [{"id":"ARCH_RISK","name":"Risk / Audit / Compliance","core_identity":"Brings structured risk thinking, control frameworks, and regulatory knowledge to organisations that need to manage uncertainty, meet obligations, and satisfy auditors or regulators. Often holds the institutional memory of what can go wrong and why.","capabilities":["Risk identification, assessment, and heat-mapping","Control design, implementation, and testing","Regulatory interpretation and application (FCA, GDPR, SOX, Basel, ISO)","Internal audit methodology: planning, fieldwork, report writing","Three lines of defence framework design and implementation","Compliance monitoring and management reporting","Policy and procedure documentation","Board and audit committee reporting on risk and compliance matters","Root cause analysis of control failures","Regulatory inspection preparation"],"monetisable_translations":["Help regulated SMEs build credible compliance frameworks they couldn't afford in-house","Prepare businesses for regulatory scrutiny, auditor visits, or accreditation processes","Reduce the cost and anxiety of external audit for growing businesses","Help firms understand and respond to regulatory change without hiring a full-time specialist","Provide independent assurance on whether an organisation's controls and risks are being managed adequately"],"pricing_power":"medium-high","time_to_revenue_bias":"fast"},{"id":"ARCH_FIN","name":"Finance & Commercial","core_identity":"Understands business performance, financial decision-making, and commercial logic at depth. Can translate complex financial data into useful management insight. Speaks the language of owners, boards, and investors.","capabilities":["Financial modelling, scenario analysis, and sensitivity testing","Management reporting design and delivery","Cashflow forecasting and working capital management","Budgeting and rolling forecast process design","Business case development and investment appraisal","Pricing and margin analysis","Financial due diligence for M&A transactions","KPI framework design and dashboard development","Board and investor communication on financial performance","Banking relationship management and covenant monitoring"],"monetisable_translations":["Give SME owners the financial clarity they need to make confident decisions","Provide fractional CFO capability that growing businesses can't yet afford full-time","Help businesses understand their unit economics and improve profitability","Support fundraising, M&A, or growth planning with credible financial work","Build the forecasting and management reporting infrastructure that enables the business to scale"],"pricing_power":"high","time_to_revenue_bias":"fast"},{"id":"ARCH_CONS","name":"Generalist Consultant","core_identity":"Brings broad analytical, problem-structuring, and communication capabilities across industries. Comfortable with ambiguity. Skilled at framing problems, structuring thinking, and influencing senior stakeholders.","capabilities":["Structured problem decomposition and hypothesis-driven analysis","Stakeholder management and executive communication","Strategy and business case development","Operating model design and organisational diagnosis","Facilitation of workshops and leadership sessions","Benchmarking, market analysis, and competitive intelligence","Presentation and narrative construction for senior audiences","Project and workstream management","Client relationship management and account development"],"monetisable_translations":["Strategy and growth advisory for owner-managed or mid-market businesses","Independent sounding board and analytical rigour for senior leaders who lack trusted challenge","Specialist in a narrow problem type","Interim programme or change leadership for organisations without internal capability","Diagnostic and improvement advisory for businesses at strategic inflection points"],"pricing_power":"medium-high (conditional on clear niche)","time_to_revenue_bias":"medium"},{"id":"ARCH_PMO","name":"Delivery / PMO / Transformation","core_identity":"Brings discipline to how organisations run change, manage programmes, and deliver outcomes. Understands the gap between strategy and execution and knows how to close it.","capabilities":["Programme and project governance framework design","Portfolio management and investment prioritisation","Benefits realisation planning and tracking","Risk and issue identification, escalation, and management","Stakeholder reporting and programme communications","Dependency mapping and critical path analysis","Change readiness assessment and planning","Resource and capacity planning","Agile and waterfall delivery methodology","Vendor and third-party management in programme contexts"],"monetisable_translations":["Give mid-market businesses the programme discipline to actually deliver their strategic initiatives","Rescue troubled programmes that are at risk of failure or already failing","Provide independent assurance on major investments to boards and audit committees","Help organisations build the internal capability to run change without permanent external dependency","Fractional PMO: provide the governance infrastructure for complex change at a fraction of the cost"],"pricing_power":"medium","time_to_revenue_bias":"fast to medium"},{"id":"ARCH_OPS","name":"Operations / Process","core_identity":"Understands how work actually flows through an organisation. Can identify inefficiency, redesign processes, and help businesses operate more reliably at lower cost.","capabilities":["Process mapping and analysis","Lean and Six Sigma methodology","Root cause analysis and problem-solving","Standard operating procedure design and documentation","Performance measurement, KPI design, and operational dashboards","Operational technology selection and implementation oversight","Continuous improvement programme design and facilitation","AI and automation tool identification and workflow integration"],"monetisable_translations":["Help growing SMEs replace informal processes with scalable, documented operating models","Reduce operational waste and cost in businesses that have grown faster than their processes","Help businesses implement AI and automation tools into their real workflows","Build operational infrastructure for scale ahead of growth, investment, or acquisition"],"pricing_power":"medium","time_to_revenue_bias":"fast (project) to medium (retainer)"}];

const MAPPING = [{"archetype":"ARCH_FIN","model":"BM_FCFO","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":5,"recurrence":5,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_CWC","capability_fit":5,"credibility_gap":1,"speed_to_revenue":5,"sales_complexity":2,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_FPA","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_PRICE","capability_fit":4,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":2,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_FDD","capability_fit":5,"credibility_gap":3,"speed_to_revenue":4,"sales_complexity":4,"income_potential":5,"recurrence":3,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_ARS","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":3,"recurrence":5,"avoid":true},{"archetype":"ARCH_FIN","model":"BM_STRAT","capability_fit":3,"credibility_gap":4,"speed_to_revenue":2,"sales_complexity":5,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_OPEFF","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":2,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_CAAS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_ARS","capability_fit":5,"credibility_gap":1,"speed_to_revenue":4,"sales_complexity":2,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_RISK","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_IACS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_REGCH","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_PASS","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_FCFO","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":4,"recurrence":4,"avoid":true},{"archetype":"ARCH_RISK","model":"BM_FDD","capability_fit":2,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":5,"income_potential":4,"recurrence":2,"avoid":true},{"archetype":"ARCH_CONS","model":"BM_STRAT","capability_fit":5,"credibility_gap":3,"speed_to_revenue":2,"sales_complexity":5,"income_potential":5,"recurrence":5,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_CHANGE","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_PREC","capability_fit":4,"credibility_gap":3,"speed_to_revenue":4,"sales_complexity":3,"income_potential":5,"recurrence":2,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_DXADV","capability_fit":4,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_PASS","capability_fit":4,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_PRICE","capability_fit":3,"credibility_gap":4,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":2,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":3,"recurrence":5,"avoid":true},{"archetype":"ARCH_CONS","model":"BM_CWC","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":3,"recurrence":2,"avoid":true},{"archetype":"ARCH_PMO","model":"BM_PMOAS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_PREC","capability_fit":5,"credibility_gap":2,"speed_to_revenue":5,"sales_complexity":3,"income_potential":5,"recurrence":2,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_PASS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_DXADV","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_CHANGE","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_AIWF","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_FCFO","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":4,"recurrence":4,"avoid":true},{"archetype":"ARCH_PMO","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":3,"recurrence":4,"avoid":true},{"archetype":"ARCH_OPS","model":"BM_PROCIM","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_AIWF","capability_fit":4,"credibility_gap":1,"speed_to_revenue":5,"sales_complexity":2,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_OPEFF","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":2,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_BSYS","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":2,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_PMOAS","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_FCFO","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":4,"recurrence":4,"avoid":true},{"archetype":"ARCH_OPS","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":3,"recurrence":4,"avoid":true},{"archetype":"ARCH_OPS","model":"BM_FDD","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":4,"recurrence":2,"avoid":true}];

const BUSINESS_MODELS = [{"id":"BM_FCFO","name":"Fractional CFO","category":"Finance","description":"Part-time senior finance leadership for SMEs that need CFO-level strategic and commercial capability but cannot justify or afford a full-time hire. Combines financial strategy, management reporting, forecasting, and board-level communication in a structured monthly retainer.","target_customer":"Owner-managed and PE-backed SMEs with £1m–£20m revenue, typically post-initial growth phase where financial decisions are becoming more complex and the gap between bookkeeping and strategic finance is visible.","target_buyer":"Founder, CEO, or Managing Director","commercial_model":"retainer","price_low":2000,"price_high":4500,"price_per":"month","ttrev_weeks":"2–6","sales_motion":"Accountant and business advisor introductions (highest conversion). Peer referral from CFO/FD network. LinkedIn content targeting SME founders.","difficulty":"medium","recurrence":"high"},{"id":"BM_CWC","name":"Cashflow & Working Capital Specialist","category":"Finance","description":"Focused engagement helping businesses understand, forecast, and improve their cashflow and working capital position. More specific than Fractional CFO — targets an acute, named pain that drives fast decisions and willing payment.","target_customer":"SMEs experiencing cashflow pressure, seasonal businesses, businesses in growth mode outrunning their cash, businesses preparing for a bank review or refinancing.","target_buyer":"Founder, CEO, Finance Director, or Managing Director","commercial_model":"project then optional retainer","price_low":3000,"price_high":9000,"price_per":"project","ttrev_weeks":"1–3","sales_motion":"Accountant referrals (highest conversion). Business advisory introductions. Direct LinkedIn content on cashflow management.","difficulty":"low-medium","recurrence":"medium"},{"id":"BM_FPA","name":"FP&A Consultant","category":"Finance","description":"Financial planning, analysis, and management reporting advisory for businesses that need better visibility into performance. Builds the budgeting, forecasting, and management information infrastructure that enables confident decision-making.","target_customer":"Mid-market businesses (£5m–£100m revenue), PE-backed portfolio companies requiring improved reporting post-investment, businesses preparing for audit, fundraising, or growth.","target_buyer":"CFO, Finance Director, or CEO","commercial_model":"project then retainer","price_low":5000,"price_high":15000,"price_per":"project","ttrev_weeks":"4–10","sales_motion":"CFO and FD peer referrals. PE firm introductions to portfolio companies. Audit firm introductions where management reporting improvement is flagged.","difficulty":"medium","recurrence":"high"},{"id":"BM_PRICE","name":"Pricing Strategy Advisor","category":"Finance","description":"Helps businesses design, test, and improve their pricing models to improve margins and revenue without increasing costs. Often dramatically undervalued by clients until they see the impact of even small pricing changes on profitability.","target_customer":"Product and service businesses with undifferentiated or unexamined pricing; SaaS and subscription businesses; professional services firms; manufacturing companies with complex margin structures.","target_buyer":"CEO, CFO, or Commercial Director","commercial_model":"project","price_low":5000,"price_high":18000,"price_per":"project","ttrev_weeks":"6–12","sales_motion":"CFO and CEO peer referrals. Investor and board advisor introductions. LinkedIn content demonstrating pricing insight.","difficulty":"high","recurrence":"low-medium"},{"id":"BM_FDD","name":"Financial Due Diligence","category":"Finance","description":"Buy-side or sell-side financial due diligence support for M&A transactions. High-value, time-pressured work that requires strong analytical skills and M&A process knowledge. Deal flow is lumpy but unit value is high.","target_customer":"Private equity firms and corporate acquirers needing buy-side FDD capacity. Owner-managed businesses preparing for sale needing sell-side support. Deal advisory boutiques needing experienced analysts.","target_buyer":"Deal partner, M&A director, or corporate finance lead","commercial_model":"project","price_low":6000,"price_high":25000,"price_per":"transaction","ttrev_weeks":"1–4 once deal is live","sales_motion":"Corporate finance boutiques and deal advisors needing capacity. PE firm relationships. M&A lawyer introductions.","difficulty":"high","recurrence":"medium"},{"id":"BM_CAAS","name":"Compliance-as-a-Service","category":"Risk & Compliance","description":"Outsourced compliance function for regulated SMEs that need ongoing compliance support but cannot justify the cost of a full-time compliance officer. Structured as a retained monthly engagement with clear deliverables and accountability.","target_customer":"FCA-regulated SMEs (wealth managers, IFAs, brokers, fintechs, insurance intermediaries), regulated professional services firms, businesses with significant data protection or sector-specific compliance obligations.","target_buyer":"CEO, Managing Director, or Board","commercial_model":"retainer","price_low":1500,"price_high":4000,"price_per":"month","ttrev_weeks":"2–5","sales_motion":"Compliance officer and regulator network introductions. Law firm referrals serving regulated SMEs. Trade association and professional body contacts.","difficulty":"medium","recurrence":"very high"},{"id":"BM_ARS","name":"Audit Readiness Specialist","category":"Risk & Compliance","description":"Helps businesses prepare for external audit, internal audit, or regulatory inspection. Addresses the anxiety and unnecessary cost created by being unprepared, and improves outcomes from the audit or inspection process.","target_customer":"Growing businesses approaching their first statutory audit, businesses that have had a difficult prior audit or management letter, businesses preparing for FCA or sector-specific regulatory inspection.","target_buyer":"Finance Director, CEO, or Managing Director","commercial_model":"project","price_low":3000,"price_high":10000,"price_per":"project","ttrev_weeks":"2–6 once engaged","sales_motion":"Accountant introductions (strongest route). Audit firm contact referrals. Finance director peer network.","difficulty":"low-medium","recurrence":"high — annual audit cycle"},{"id":"BM_RISK","name":"Risk Management Consultant","category":"Risk & Compliance","description":"Helps organisations design, implement, and embed enterprise risk management frameworks. Addresses board-level concerns about strategic risk visibility and the adequacy of risk culture and controls.","target_customer":"Mid-market businesses preparing for growth or acquisition, PE-backed portfolio companies, businesses post-incident or post-near-miss, regulated professional services firms.","target_buyer":"CEO, Board, or Audit Committee Chair","commercial_model":"project then optional retained advisory","price_low":5000,"price_high":18000,"price_per":"project","ttrev_weeks":"6–12","sales_motion":"Board-level and NED referrals. PE firm introductions to portfolio companies. Legal advisor referrals following a risk event.","difficulty":"medium-high","recurrence":"low-medium"},{"id":"BM_IACS","name":"Internal Audit Co-source","category":"Risk & Compliance","description":"Provides specialist internal audit capability to supplement in-house internal audit teams, or delivers the entire internal audit function for businesses that outsource it. Provides audit committee assurance without the cost of a full internal audit department.","target_customer":"Businesses with in-house internal audit functions needing specialist skills. Businesses that fully outsource their internal audit function. Listed companies and highly regulated entities with audit committee obligations.","target_buyer":"Chief Internal Auditor, Audit Committee Chair, or CFO","commercial_model":"retainer or block of days per year","price_low":700,"price_high":1200,"price_per":"day","ttrev_weeks":"4–10 (formal procurement common)","sales_motion":"Head of Internal Audit peer network. Audit committee chair referrals. Big Four and mid-tier alumni networks.","difficulty":"medium","recurrence":"very high"},{"id":"BM_REGCH","name":"Regulatory Change Advisor","category":"Risk & Compliance","description":"Helps regulated businesses understand, assess, and respond to new or changing regulatory requirements. Particularly valuable during active regulatory change cycles where internal teams lack the bandwidth or specialist knowledge to keep pace.","target_customer":"FCA-regulated firms, financial institutions, data-intensive businesses, businesses entering new regulated markets, professional services firms facing regulatory change.","target_buyer":"Compliance Director, CEO, or General Counsel","commercial_model":"project then retainer","price_low":4000,"price_high":15000,"price_per":"project","ttrev_weeks":"2–6 during active regulatory change","sales_motion":"Legal firm referrals (strong conversion). Trade association and professional body introductions. Compliance officer peer network.","difficulty":"medium-high","recurrence":"medium"},{"id":"BM_PMOAS","name":"PMO-as-a-Service","category":"Delivery & Transformation","description":"Fractional programme management office capability for mid-market businesses running significant change programmes. Provides the governance, reporting, and oversight discipline that most organisations lack internally at a fraction of the cost of building a PMO function.","target_customer":"Mid-market businesses running technology implementations, business transformation, or significant operational change. Businesses where a programme is being run without adequate governance.","target_buyer":"Programme sponsor, CEO, CTO, or CFO","commercial_model":"retainer","price_low":2500,"price_high":6000,"price_per":"month","ttrev_weeks":"3–8","sales_motion":"IT director and CTO referrals. Programme sponsor networks. Strategy consulting alumni where transformation work is common.","difficulty":"medium","recurrence":"high — tied to programme duration"},{"id":"BM_PREC","name":"Programme Recovery Specialist","category":"Delivery & Transformation","description":"Specialist advisory for organisations with troubled, delayed, or at-risk programmes. High-stakes, high-urgency engagements where the cost of failure is significantly greater than the cost of recovery advisory.","target_customer":"Boards and executive teams with a programme in crisis. PE-backed businesses with failing integrations. Technology programmes significantly over budget or behind schedule.","target_buyer":"CEO, CFO, Board, or Audit Committee","commercial_model":"project","price_low":10000,"price_high":35000,"price_per":"project","ttrev_weeks":"1–3","sales_motion":"Board-level and audit committee referrals. CFO and CTO peer networks. Law firm introductions in contentious programme situations.","difficulty":"high","recurrence":"low per client, but strong referral source"},{"id":"BM_DXADV","name":"Digital Transformation Advisor","category":"Delivery & Transformation","description":"Advisory support for organisations navigating significant technology-enabled business change. Helps leaders make better decisions about technology investments and manage the organisational change required to realise value from them.","target_customer":"Mid-market businesses investing in ERP, CRM, or core operational systems. Businesses modernising legacy technology. Businesses at an early stage of AI and automation adoption.","target_buyer":"CEO, CTO, or COO","commercial_model":"project then advisory retainer","price_low":6000,"price_high":20000,"price_per":"project","ttrev_weeks":"6–14","sales_motion":"Board and C-suite referrals. Technology vendor introductions. Strategy consulting alumni networks.","difficulty":"high","recurrence":"medium"},{"id":"BM_CHANGE","name":"Change Management Consultant","category":"Delivery & Transformation","description":"Helps organisations manage the people, culture, and behavioural side of significant change programmes. Addresses the most commonly underfunded and underdelivered element of transformation — the human side.","target_customer":"Organisations undergoing restructuring, large system implementations, cultural transformation, post-acquisition integration, or significant operational change.","target_buyer":"HR Director, Chief People Officer, or Programme Sponsor","commercial_model":"project or retainer","price_low":700,"price_high":1300,"price_per":"day","ttrev_weeks":"4–8","sales_motion":"HR Director and CHRO peer referrals. Programme sponsor networks. OD and change community contacts.","difficulty":"medium","recurrence":"medium"},{"id":"BM_PASS","name":"Project Assurance Reviewer","category":"Delivery & Transformation","description":"Independent review and assurance of major projects or programmes on behalf of boards, audit committees, or senior sponsors. Provides an objective, expert view of the likelihood of delivery success and the adequacy of controls without being part of the delivery team.","target_customer":"Boards with significant capital investment or transformation programmes. Audit committees with programme oversight responsibilities. PE-backed businesses with major change initiatives.","target_buyer":"Audit Committee Chair, Board, or Non-Executive Director","commercial_model":"project","price_low":4000,"price_high":16000,"price_per":"review","ttrev_weeks":"4–10","sales_motion":"Audit committee chair and NED referrals. Internal audit introductions. Board advisor network.","difficulty":"medium","recurrence":"medium"},{"id":"BM_PROCIM","name":"Process Improvement Consultant","category":"Operations","description":"Helps businesses identify, prioritise, and implement process improvements that reduce cost, improve quality, and increase capacity. Applies Lean and Six Sigma methodology to real operational problems with a focus on measurable outcomes.","target_customer":"Manufacturing businesses, logistics and distribution companies, financial services operations functions, professional services firms with high-volume repeatable processes.","target_buyer":"Operations Director, COO, or CEO","commercial_model":"project then retained programme","price_low":5000,"price_high":18000,"price_per":"project","ttrev_weeks":"4–8","sales_motion":"Operations director peer referrals. Manufacturing trade associations. Business improvement community networks.","difficulty":"medium","recurrence":"high"},{"id":"BM_AIWF","name":"AI Workflow Implementation","category":"Operations","description":"Helps SMEs and mid-market businesses identify, select, and implement AI tools that improve operational efficiency and reduce manual work. Bridges the gap between AI potential and practical, sustainable adoption in real business workflows.","target_customer":"Professional services firms, financial services SMEs, administrative-heavy businesses looking to reduce cost and manual effort. Any business where staff are spending significant time on repetitive rules-based tasks.","target_buyer":"CEO, COO, or Operations Director","commercial_model":"project then retainer","price_low":4000,"price_high":14000,"price_per":"project","ttrev_weeks":"2–5","sales_motion":"Direct LinkedIn content on practical AI adoption. Business network referrals. Technology partner introductions.","difficulty":"low-medium","recurrence":"high"},{"id":"BM_OPEFF","name":"Operational Efficiency Advisor","category":"Operations","description":"Helps businesses reduce costs and improve operational performance without major capital investment. Structured diagnostic followed by a prioritised improvement roadmap with clear financial ROI case.","target_customer":"Businesses under cost pressure or margin squeeze. Businesses preparing for PE investment or sale where operational efficiency improves valuation. Businesses that have grown without operational discipline.","target_buyer":"CEO, COO, or CFO","commercial_model":"project","price_low":5000,"price_high":20000,"price_per":"project","ttrev_weeks":"4–8","sales_motion":"CFO and COO peer referrals. PE firm introductions to portfolio companies preparing for exit. Business sale advisor introductions.","difficulty":"medium","recurrence":"low-medium"},{"id":"BM_BSYS","name":"Business Systems & Tooling Consultant","category":"Operations","description":"Helps growing businesses select, implement, and get sustainable value from their operational systems — ERP, CRM, project management, HRIS, and workflow tools. Addresses the persistent gap between technology promises and operational reality.","target_customer":"Growing SMEs that have outgrown spreadsheets and fragmented point solutions. Businesses implementing their first ERP or CRM. Businesses where existing systems are poorly adopted or not delivering expected value.","target_buyer":"CEO, COO, or IT Director","commercial_model":"project","price_low":4000,"price_high":16000,"price_per":"project","ttrev_weeks":"6–12","sales_motion":"Technology vendor referrals. IT manager and operations network. CFO introductions where system cost or complexity is a concern.","difficulty":"medium","recurrence":"low-medium"},{"id":"BM_STRAT","name":"Strategy & Growth Advisor","category":"Advisory","description":"Ongoing strategic advisory for owner-managed and mid-market businesses. Provides the thinking partnership, analytical rigour, and structured challenge that growing business leaders often lack access to internally. Deepest trust of all the business models — and the hardest to sell.","target_customer":"Owner-managed businesses with £2m–£30m revenue. Businesses at strategic inflection points: new market entry, post-growth plateau, acquisition or exit preparation. Leaders who want a trusted external thought partner.","target_buyer":"Founder, CEO, or MD","commercial_model":"monthly retainer","price_low":2500,"price_high":6000,"price_per":"month","ttrev_weeks":"8–20","sales_motion":"CEO peer referrals (essential — cold selling does not work). Non-executive director networks. Private bank and wealth manager introductions.","difficulty":"high","recurrence":"very high — once established, relationships are typically multi-year"}];

async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI error:", res.status, err);
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function chatCompletionText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI error:", res.status, err);
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth check
  const authHeader = req.headers.get("Authorization");
  console.log("Auth header present:", !!authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("No Bearer token found");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
  console.log("Auth result:", user?.id, userError?.message);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized", detail: userError?.message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  let reportId: string | null = null;

  try {
    const { answers } = await req.json();
    if (!answers) throw new Error("Missing answers");

    // Create report record
    const { data: report, error: insertErr } = await adminClient
      .from("reports")
      .insert({ user_id: userId, answers, status: "processing" })
      .select("id")
      .single();

    if (insertErr) throw insertErr;
    reportId = report.id;

    // Format answers
    const formattedAnswers = JSON.stringify({
      q1_background: answers["1"],
      q2_seniority: answers["2"],
      q3_years: answers["3"],
      q4_org_type: answers["4"],
      q5_work_done: answers["5"],
      q6_industries: answers["6"],
      q7_reputation: answers["7"],
      q8_motivation: answers["8"],
      q9_biz_dev_comfort: answers["9"],
      q10_model_preference: answers["10"],
      q11_client_sectors: answers["11"],
      q12_independent_work: answers["12"],
      q13_network: answers["13"],
      q14_employment: answers["14"],
      q15_location: answers["15"],
    });

    // ─── PROMPT 1: Core Report ───
    const p1System = `You are the intelligence engine for Solo, a product helping mid-career professionals find a realistic Plan B. Analyse the user's background and produce structured solo business recommendations.

You have access to the following data:

ARCHETYPES (classify the user into one of these):
${JSON.stringify(ARCHETYPES)}

BUSINESS MODELS (score and recommend from these):
${JSON.stringify(BUSINESS_MODELS)}

MAPPING TABLE (use these scores for archetype-model combinations):
${JSON.stringify(MAPPING)}

Steps:
1. Classify primary archetype and optional secondary with confidence score 0–1.
2. Filter models where capability_fit is 2 or below, credibility_gap is 4 or above, or avoid is true.
3. Score remaining models using: (2×capability_fit) + (2×speed_to_revenue) + (2×(6-credibility_gap)) + income_potential + recurrence - sales_complexity. Adjust +2 to fast-revenue models if user signals urgency, -1 to high-complexity models if user signals low selling confidence, +1 to high-income models if 10+ years experience.
4. Select top 3 with different categories and sales motions — label Option A (safest/fastest), B (moderate), C (most ambitious).
5. Return JSON with this exact structure. IMPORTANT: model_name MUST be the human-readable "name" field from BUSINESS_MODELS (e.g. "Process Improvement Consultant"), NEVER the "id" field (e.g. "BM_PROCIM").
{
  "archetype": { "primary": string, "secondary": string|null, "confidence": number, "summary": string },
  "transferable_value": { "what_they_can_sell": string, "why_buyers_would_pay": string, "credibility_assets": [string, string, string] },
  "options": [
    { "label": "A"|"B"|"C", "model_name": "<friendly name from BUSINESS_MODELS, e.g. Process Improvement Consultant>", "positioning": string, "target_buyer": string, "what_they_are_buying": string, "pricing": { "model": string, "range_low_gbp": number, "range_high_gbp": number, "cadence": string }, "time_to_first_revenue": string, "difficulty_rating": "easy"|"moderate"|"hard", "why_this_works_for_them": string }
  ],
  "recommendation": { "recommended_option": "A"|"B"|"C", "rationale": string, "key_condition": string },
  "reality_check": { "most_likely_failure_mode": string, "second_failure_mode": string, "what_they_will_find_hard": string, "honest_income_outlook": string },
  "first_steps": [string, string, string, string, string]
}`;

    const p1User = `USER ANSWERS:\n${formattedAnswers}`;

    console.log("Running Prompt 1...");
    const p1Result = await chatCompletion(p1System, p1User, 0.4, 3000);
    const p1Json = JSON.parse(p1Result);

    // ─── PROMPT 2: Evaluation ───
    const p2System = `You are a senior commercial critic. Evaluate the Solo report against 6 criteria:
1. Specificity — target_buyer must name type/size/situation
2. Commercial realism — pricing and timelines plausible for UK market
3. Option diversity — 3 options must not share same category or sales motion
4. Recommendation quality — specific reason tied to this user
5. Reality check honesty — archetype-specific failure modes, GBP figures in income outlook
6. First steps quality — all 5 specific and tied to recommended model

Additionally, generate a "hook_insight" — a single punchy sentence of 8–12 words that captures the most commercially compelling insight about this user's independent potential. Use their industry experience (Q6), reputation (Q7), client/sector knowledge (Q11), and any independent work history (Q12) to craft this. It should read like a headline that would make the user want to see their full report.

If all pass: return JSON with {"verdict":"pass","hook_insight":"<your 8-12 word insight>","final_report":<original report>}.
If any fail: revise only failing sections and return {"verdict":"revise","hook_insight":"<your 8-12 word insight>","final_report":<revised report>}.
Hard constraint: NEVER change a model_name value.`;

    const p2UserData = {
      report: p1Json,
      q6_industries: answers["6"],
      q7_reputation: answers["7"],
      q11_client_sectors: answers["11"],
      q12_independent_work: answers["12"],
    };

    console.log("Running Prompt 2...");
    const p2Result = await chatCompletion(p2System, JSON.stringify(p2UserData), 0.3, 3000);
    const p2Json = JSON.parse(p2Result);
    const finalReport = p2Json.final_report;
    const hookInsight = p2Json.hook_insight || null;

    // ─── PROMPTS 3 & 4 in parallel ───
    const p3System = `You are Solo's activation specialist. Produce a 14-Day Activation Plan and Network Activation Toolkit for the recommended model.

Pacing based on employment status:
- Employed full-time: 1–1.5h weekday evenings, 3–4h weekend days
- Unemployed or in notice: 5–6h weekdays
- Part-time: 2–3h weekdays

Network calibration:
- Strong (100+ contacts): ambitious referral-led targets
- Medium (30–100): moderate mix of warm and cold
- Weak (under 30): conservative, rebuild relationships first

Cover 4 phases: Foundations (Days 1–3), Network Activation (Days 4–7), Outreach (Days 8–11), Consolidation (Days 12–14).

Return JSON:
{
  "activation_plan": { "summary": string, "pacing_note": string, "network_note": string, "phases": [{ "phase": string, "days": string, "goal": string, "days_detail": [{ "day": string, "tasks": [string] }] }] },
  "network_toolkit": {
    "reconnect_email": { "subject": string, "body": string },
    "linkedin_dm": { "body": string },
    "referral_ask_email": { "subject": string, "body": string },
    "verbal_positioning": { "script": string }
  }
}`;

    const p3User = `RECOMMENDED MODEL & REPORT:\n${JSON.stringify(finalReport)}\n\nQ13 (Network): ${answers["13"]}\nQ14 (Employment): ${answers["14"]}`;

    const p4System = `You are Solo's market research analyst. Produce a Local Market Feasibility Snapshot. You do not have live data — label all figures as indicative.

Output plain text with these 5 section headings:
DEMAND SIGNAL
PRICING BENCHMARK (open with explicit sentence that figures are indicative)
COMPETITOR LANDSCAPE
MARKET ENTRY INSIGHT
HONEST ASSESSMENT

Header format:
LOCAL MARKET FEASIBILITY SNAPSHOT
[Model name] | [Location]
Prepared as indicative research — not primary market data`;

    const recommendedOption = finalReport.options?.find(
      (o: any) => o.label === finalReport.recommendation?.recommended_option
    );
    const p4User = `Recommended model: ${recommendedOption?.model_name || "Unknown"}
Archetype: ${finalReport.archetype?.primary || "Unknown"}
Pricing: £${recommendedOption?.pricing?.range_low_gbp || "?"} – £${recommendedOption?.pricing?.range_high_gbp || "?"} ${recommendedOption?.pricing?.cadence || ""}
Location: ${answers["15"] || "UK"}`;

    console.log("Running Prompts 3 & 4 in parallel...");
    const [p3Result, p4Result] = await Promise.all([
      chatCompletion(p3System, p3User, 0.5, 2500),
      chatCompletionText(p4System, p4User, 0.3, 1500),
    ]);

    const activationPlan = JSON.parse(p3Result);

    // Save completed report
    const { error: updateErr } = await adminClient
      .from("reports")
      .update({
        core_report: finalReport,
        activation_plan: activationPlan,
        market_snapshot: p4Result,
        hook_insight: hookInsight,
        status: "complete",
      })
      .eq("id", reportId);

    if (updateErr) throw updateErr;

    console.log("Report complete:", reportId);
    return new Response(
      JSON.stringify({
        report_id: reportId,
        core_report: finalReport,
        activation_plan: activationPlan,
        market_snapshot: p4Result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-report error:", err);

    // Update report status to error if we have a reportId
    if (reportId) {
      await adminClient
        .from("reports")
        .update({
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", reportId);
    }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
