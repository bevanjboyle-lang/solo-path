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

const BUSINESS_MODELS = [{"id":"BM_FCFO","name":"Fractional CFO","category":"Finance","description":"Part-time senior finance leadership for SMEs that need CFO-level strategic and commercial capability but cannot justify or afford a full-time hire. Combines financial strategy, management reporting, forecasting, and board-level communication in a structured monthly retainer.","target_customer":"Owner-managed and PE-backed SMEs with ÃÂÃÂ£1mÃÂ¢ÃÂÃÂÃÂÃÂ£20m revenue, typically post-initial growth phase where financial decisions are becoming more complex and the gap between bookkeeping and strategic finance is visible.","target_buyer":"Founder, CEO, or Managing Director","commercial_model":"retainer","price_low":2000,"price_high":4500,"price_per":"month","ttrev_weeks":"2ÃÂ¢ÃÂÃÂ6","sales_motion":"Accountant and business advisor introductions (highest conversion). Peer referral from CFO/FD network. LinkedIn content targeting SME founders.","difficulty":"medium","recurrence":"high"},{"id":"BM_CWC","name":"Cashflow & Working Capital Specialist","category":"Finance","description":"Focused engagement helping businesses understand, forecast, and improve their cashflow and working capital position. More specific than Fractional CFO ÃÂ¢ÃÂÃÂ targets an acute, named pain that drives fast decisions and willing payment.","target_customer":"SMEs experiencing cashflow pressure, seasonal businesses, businesses in growth mode outrunning their cash, businesses preparing for a bank review or refinancing.","target_buyer":"Founder, CEO, Finance Director, or Managing Director","commercial_model":"project then optional retainer","price_low":3000,"price_high":9000,"price_per":"project","ttrev_weeks":"1ÃÂ¢ÃÂÃÂ3","sales_motion":"Accountant referrals (highest conversion). Business advisory introductions. Direct LinkedIn content on cashflow management.","difficulty":"low-medium","recurrence":"medium"},{"id":"BM_FPA","name":"FP&A Consultant","category":"Finance","description":"Financial planning, analysis, and management reporting advisory for businesses that need better visibility into performance. Builds the budgeting, forecasting, and management information infrastructure that enables confident decision-making.","target_customer":"Mid-market businesses (ÃÂÃÂ£5mÃÂ¢ÃÂÃÂÃÂÃÂ£100m revenue), PE-backed portfolio companies requiring improved reporting post-investment, businesses preparing for audit, fundraising, or growth.","target_buyer":"CFO, Finance Director, or CEO","commercial_model":"project then retainer","price_low":5000,"price_high":15000,"price_per":"project","ttrev_weeks":"4ÃÂ¢ÃÂÃÂ10","sales_motion":"CFO and FD peer referrals. PE firm introductions to portfolio companies. Audit firm introductions where management reporting improvement is flagged.","difficulty":"medium","recurrence":"high"},{"id":"BM_PRICE","name":"Pricing Strategy Advisor","category":"Finance","description":"Helps businesses design, test, and improve their pricing models to improve margins and revenue without increasing costs. Often dramatically undervalued by clients until they see the impact of even small pricing changes on profitability.","target_customer":"Product and service businesses with undifferentiated or unexamined pricing; SaaS and subscription businesses; professional services firms; manufacturing companies with complex margin structures.","target_buyer":"CEO, CFO, or Commercial Director","commercial_model":"project","price_low":5000,"price_high":18000,"price_per":"project","ttrev_weeks":"6ÃÂ¢ÃÂÃÂ12","sales_motion":"CFO and CEO peer referrals. Investor and board advisor introductions. LinkedIn content demonstrating pricing insight.","difficulty":"high","recurrence":"low-medium"},{"id":"BM_FDD","name":"Financial Due Diligence","category":"Finance","description":"Buy-side or sell-side financial due diligence support for M&A transactions. High-value, time-pressured work that requires strong analytical skills and M&A process knowledge. Deal flow is lumpy but unit value is high.","target_customer":"Private equity firms and corporate acquirers needing buy-side FDD capacity. Owner-managed businesses preparing for sale needing sell-side support. Deal advisory boutiques needing experienced analysts.","target_buyer":"Deal partner, M&A director, or corporate finance lead","commercial_model":"project","price_low":6000,"price_high":25000,"price_per":"transaction","ttrev_weeks":"1ÃÂ¢ÃÂÃÂ4 once deal is live","sales_motion":"Corporate finance boutiques and deal advisors needing capacity. PE firm relationships. M&A lawyer introductions.","difficulty":"high","recurrence":"medium"},{"id":"BM_CAAS","name":"Compliance-as-a-Service","category":"Risk & Compliance","description":"Outsourced compliance function for regulated SMEs that need ongoing compliance support but cannot justify the cost of a full-time compliance officer. Structured as a retained monthly engagement with clear deliverables and accountability.","target_customer":"FCA-regulated SMEs (wealth managers, IFAs, brokers, fintechs, insurance intermediaries), regulated professional services firms, businesses with significant data protection or sector-specific compliance obligations.","target_buyer":"CEO, Managing Director, or Board","commercial_model":"retainer","price_low":1500,"price_high":4000,"price_per":"month","ttrev_weeks":"2ÃÂ¢ÃÂÃÂ5","sales_motion":"Compliance officer and regulator network introductions. Law firm referrals serving regulated SMEs. Trade association and professional body contacts.","difficulty":"medium","recurrence":"very high"},{"id":"BM_ARS","name":"Audit Readiness Specialist","category":"Risk & Compliance","description":"Helps businesses prepare for external audit, internal audit, or regulatory inspection. Addresses the anxiety and unnecessary cost created by being unprepared, and improves outcomes from the audit or inspection process.","target_customer":"Growing businesses approaching their first statutory audit, businesses that have had a difficult prior audit or management letter, businesses preparing for FCA or sector-specific regulatory inspection.","target_buyer":"Finance Director, CEO, or Managing Director","commercial_model":"project","price_low":3000,"price_high":10000,"price_per":"project","ttrev_weeks":"2ÃÂ¢ÃÂÃÂ6 once engaged","sales_motion":"Accountant introductions (strongest route). Audit firm contact referrals. Finance director peer network.","difficulty":"low-medium","recurrence":"high ÃÂ¢ÃÂÃÂ annual audit cycle"},{"id":"BM_RISK","name":"Risk Management Consultant","category":"Risk & Compliance","description":"Helps organisations design, implement, and embed enterprise risk management frameworks. Addresses board-level concerns about strategic risk visibility and the adequacy of risk culture and controls.","target_customer":"Mid-market businesses preparing for growth or acquisition, PE-backed portfolio companies, businesses post-incident or post-near-miss, regulated professional services firms.","target_buyer":"CEO, Board, or Audit Committee Chair","commercial_model":"project then optional retained advisory","price_low":5000,"price_high":18000,"price_per":"project","ttrev_weeks":"6ÃÂ¢ÃÂÃÂ12","sales_motion":"Board-level and NED referrals. PE firm introductions to portfolio companies. Legal advisor referrals following a risk event.","difficulty":"medium-high","recurrence":"low-medium"},{"id":"BM_IACS","name":"Internal Audit Co-source","category":"Risk & Compliance","description":"Provides specialist internal audit capability to supplement in-house internal audit teams, or delivers the entire internal audit function for businesses that outsource it. Provides audit committee assurance without the cost of a full internal audit department.","target_customer":"Businesses with in-house internal audit functions needing specialist skills. Businesses that fully outsource their internal audit function. Listed companies and highly regulated entities with audit committee obligations.","target_buyer":"Chief Internal Auditor, Audit Committee Chair, or CFO","commercial_model":"retainer or block of days per year","price_low":700,"price_high":1200,"price_per":"day","ttrev_weeks":"4ÃÂ¢ÃÂÃÂ10 (formal procurement common)","sales_motion":"Head of Internal Audit peer network. Audit committee chair referrals. Big Four and mid-tier alumni networks.","difficulty":"medium","recurrence":"very high"},{"id":"BM_REGCH","name":"Regulatory Change Advisor","category":"Risk & Compliance","description":"Helps regulated businesses understand, assess, and respond to new or changing regulatory requirements. Particularly valuable during active regulatory change cycles where internal teams lack the bandwidth or specialist knowledge to keep pace.","target_customer":"FCA-regulated firms, financial institutions, data-intensive businesses, businesses entering new regulated markets, professional services firms facing regulatory change.","target_buyer":"Compliance Director, CEO, or General Counsel","commercial_model":"project then retainer","price_low":4000,"price_high":15000,"price_per":"project","ttrev_weeks":"2ÃÂ¢ÃÂÃÂ6 during active regulatory change","sales_motion":"Legal firm referrals (strong conversion). Trade association and professional body introductions. Compliance officer peer network.","difficulty":"medium-high","recurrence":"medium"},{"id":"BM_PMOAS","name":"PMO-as-a-Service","category":"Delivery & Transformation","description":"Fractional programme management office capability for mid-market businesses running significant change programmes. Provides the governance, reporting, and oversight discipline that most organisations lack internally at a fraction of the cost of building a PMO function.","target_customer":"Mid-market businesses running technology implementations, business transformation, or significant operational change. Businesses where a programme is being run without adequate governance.","target_buyer":"Programme sponsor, CEO, CTO, or CFO","commercial_model":"retainer","price_low":2500,"price_high":6000,"price_per":"month","ttrev_weeks":"3ÃÂ¢ÃÂÃÂ8","sales_motion":"IT director and CTO referrals. Programme sponsor networks. Strategy consulting alumni where transformation work is common.","difficulty":"medium","recurrence":"high ÃÂ¢ÃÂÃÂ tied to programme duration"},{"id":"BM_PREC","name":"Programme Recovery Specialist","category":"Delivery & Transformation","description":"Specialist advisory for organisations with troubled, delayed, or at-risk programmes. High-stakes, high-urgency engagements where the cost of failure is significantly greater than the cost of recovery advisory.","target_customer":"Boards and executive teams with a programme in crisis. PE-backed businesses with failing integrations. Technology programmes significantly over budget or behind schedule.","target_buyer":"CEO, CFO, Board, or Audit Committee","commercial_model":"project","price_low":10000,"price_high":35000,"price_per":"project","ttrev_weeks":"1ÃÂ¢ÃÂÃÂ3","sales_motion":"Board-level and audit committee referrals. CFO and CTO peer networks. Law firm introductions in contentious programme situations.","difficulty":"high","recurrence":"low per client, but strong referral source"},{"id":"BM_DXADV","name":"Digital Transformation Advisor","category":"Delivery & Transformation","description":"Advisory support for organisations navigating significant technology-enabled business change. Helps leaders make better decisions about technology investments and manage the organisational change required to realise value from them.","target_customer":"Mid-market businesses investing in ERP, CRM, or core operational systems. Businesses modernising legacy technology. Businesses at an early stage of AI and automation adoption.","target_buyer":"CEO, CTO, or COO","commercial_model":"project then advisory retainer","price_low":6000,"price_high":20000,"price_per":"project","ttrev_weeks":"6ÃÂ¢ÃÂÃÂ14","sales_motion":"Board and C-suite referrals. Technology vendor introductions. Strategy consulting alumni networks.","difficulty":"high","recurrence":"medium"},{"id":"BM_CHANGE","name":"Change Management Consultant","category":"Delivery & Transformation","description":"Helps organisations manage the people, culture, and behavioural side of significant change programmes. Addresses the most commonly underfunded and underdelivered element of transformation ÃÂ¢ÃÂÃÂ the human side.","target_customer":"Organisations undergoing restructuring, large system implementations, cultural transformation, post-acquisition integration, or significant operational change.","target_buyer":"HR Director, Chief People Officer, or Programme Sponsor","commercial_model":"project or retainer","price_low":700,"price_high":1300,"price_per":"day","ttrev_weeks":"4ÃÂ¢ÃÂÃÂ8","sales_motion":"HR Director and CHRO peer referrals. Programme sponsor networks. OD and change community contacts.","difficulty":"medium","recurrence":"medium"},{"id":"BM_PASS","name":"Project Assurance Reviewer","category":"Delivery & Transformation","description":"Independent review and assurance of major projects or programmes on behalf of boards, audit committees, or senior sponsors. Provides an objective, expert view of the likelihood of delivery success and the adequacy of controls without being part of the delivery team.","target_customer":"Boards with significant capital investment or transformation programmes. Audit committees with programme oversight responsibilities. PE-backed businesses with major change initiatives.","target_buyer":"Audit Committee Chair, Board, or Non-Executive Director","commercial_model":"project","price_low":4000,"price_high":16000,"price_per":"review","ttrev_weeks":"4ÃÂ¢ÃÂÃÂ10","sales_motion":"Audit committee chair and NED referrals. Internal audit introductions. Board advisor network.","difficulty":"medium","recurrence":"medium"},{"id":"BM_PROCIM","name":"Process Improvement Consultant","category":"Operations","description":"Helps businesses identify, prioritise, and implement process improvements that reduce cost, improve quality, and increase capacity. Applies Lean and Six Sigma methodology to real operational problems with a focus on measurable outcomes.","target_customer":"Manufacturing businesses, logistics and distribution companies, financial services operations functions, professional services firms with high-volume repeatable processes.","target_buyer":"Operations Director, COO, or CEO","commercial_model":"project then retained programme","price_low":5000,"price_high":18000,"price_per":"project","ttrev_weeks":"4ÃÂ¢ÃÂÃÂ8","sales_motion":"Operations director peer referrals. Manufacturing trade associations. Business improvement community networks.","difficulty":"medium","recurrence":"high"},{"id":"BM_AIWF","name":"AI Workflow Implementation","category":"Operations","description":"Helps SMEs and mid-market businesses identify, select, and implement AI tools that improve operational efficiency and reduce manual work. Bridges the gap between AI potential and practical, sustainable adoption in real business workflows.","target_customer":"Professional services firms, financial services SMEs, administrative-heavy businesses looking to reduce cost and manual effort. Any business where staff are spending significant time on repetitive rules-based tasks.","target_buyer":"CEO, COO, or Operations Director","commercial_model":"project then retainer","price_low":4000,"price_high":14000,"price_per":"project","ttrev_weeks":"2ÃÂ¢ÃÂÃÂ5","sales_motion":"Direct LinkedIn content on practical AI adoption. Business network referrals. Technology partner introductions.","difficulty":"low-medium","recurrence":"high"},{"id":"BM_OPEFF","name":"Operational Efficiency Advisor","category":"Operations","description":"Helps businesses reduce costs and improve operational performance without major capital investment. Structured diagnostic followed by a prioritised improvement roadmap with clear financial ROI case.","target_customer":"Businesses under cost pressure or margin squeeze. Businesses preparing for PE investment or sale where operational efficiency improves valuation. Businesses that have grown without operational discipline.","target_buyer":"CEO, COO, or CFO","commercial_model":"project","price_low":5000,"price_high":20000,"price_per":"project","ttrev_weeks":"4ÃÂ¢ÃÂÃÂ8","sales_motion":"CFO and COO peer referrals. PE firm introductions to portfolio companies preparing for exit. Business sale advisor introductions.","difficulty":"medium","recurrence":"low-medium"},{"id":"BM_BSYS","name":"Business Systems & Tooling Consultant","category":"Operations","description":"Helps growing businesses select, implement, and get sustainable value from their operational systems ÃÂ¢ÃÂÃÂ ERP, CRM, project management, HRIS, and workflow tools. Addresses the persistent gap between technology promises and operational reality.","target_customer":"Growing SMEs that have outgrown spreadsheets and fragmented point solutions. Businesses implementing their first ERP or CRM. Businesses where existing systems are poorly adopted or not delivering expected value.","target_buyer":"CEO, COO, or IT Director","commercial_model":"project","price_low":4000,"price_high":16000,"price_per":"project","ttrev_weeks":"6ÃÂ¢ÃÂÃÂ12","sales_motion":"Technology vendor referrals. IT manager and operations network. CFO introductions where system cost or complexity is a concern.","difficulty":"medium","recurrence":"low-medium"},{"id":"BM_STRAT","name":"Strategy & Growth Advisor","category":"Advisory","description":"Ongoing strategic advisory for owner-managed and mid-market businesses. Provides the thinking partnership, analytical rigour, and structured challenge that growing business leaders often lack access to internally. Deepest trust of all the business models ÃÂ¢ÃÂÃÂ and the hardest to sell.","target_customer":"Owner-managed businesses with ÃÂÃÂ£2mÃÂ¢ÃÂÃÂÃÂÃÂ£30m revenue. Businesses at strategic inflection points: new market entry, post-growth plateau, acquisition or exit preparation. Leaders who want a trusted external thought partner.","target_buyer":"Founder, CEO, or MD","commercial_model":"monthly retainer","price_low":2500,"price_high":6000,"price_per":"month","ttrev_weeks":"8ÃÂ¢ÃÂÃÂ20","sales_motion":"CEO peer referrals (essential ÃÂ¢ÃÂÃÂ cold selling does not work). Non-executive director networks. Private bank and wealth manager introductions.","difficulty":"high","recurrence":"very high ÃÂ¢ÃÂÃÂ once established, relationships are typically multi-year"}];

const ARCHETYPES_AI_IMPACT: Record<string, any> = Object.fromEntries(
  (JSON.parse('[{"archetype_id":"ARCH_RISK","archetype_name":"Risk / Audit / Compliance","ai_impact":{"displacement_risk":"medium-high","risk_horizon":"3-6 years","pressure_mechanisms":["ChatFin Autonomous Audit Agents run control tests continuously replacing junior audit work","MindBridge/DataSnipper ingest 100% of transactions replacing statistical sampling","Drata/Centraleyes provide continuous automated control testing and evidence collection","LLMs accelerate policy writing, procedure drafting, audit observation writing","RegTech platforms 4CRisk.ai/RegScale/Compliance.ai parse regulatory texts automatically","Junior and coordinator roles disappearing fastest"],"resilient_aspects":["Regulatory judgment in novel contested situations","Personal accountability and sign-off - regulators want a named human","Relationships with regulators and audit committees","Understanding of organisational culture and politics","EU AI Act compliance and AI governance - new domain requiring human judgment"],"near_term_outlook":"AI is automating transactional and rule-based layers rapidly. Judgment-heavy, accountability-bearing, and relationship-led dimensions remain durable."}},{"archetype_id":"ARCH_FIN","archetype_name":"Finance & Commercial","ai_impact":{"displacement_risk":"medium","risk_horizon":"3-7 years","pressure_mechanisms":["ChatFin/Datarails/Runway deploy autonomous forecasting agents","Excel-integrated AI tools reducing modelling advantage","Automated management reporting generates commentary from data","Bookkeeping/reconciliation heavily automated","AI-assisted due diligence tools reducing hours","Mastercard Virtual C-Suite signals AI delivering CFO-level intelligence"],"resilient_aspects":["Strategic financial judgment","CFO-level relationships with banks, investors, and boards","Commercial negotiation requiring human judgment","Business model insight","AI governance and financial oversight - emerging CFO responsibility"],"near_term_outlook":"Transactional and reporting layers being automated rapidly. Strategic, advisory, and relationship-bearing dimensions more durable."}},{"archetype_id":"ARCH_CONS","archetype_name":"Generalist Consultant","ai_impact":{"displacement_risk":"medium-high","risk_horizon":"2-5 years","pressure_mechanisms":["AI research and synthesis eliminate weeks of junior analyst work","LLMs generate strategy decks and business cases rapidly","Major consulting firms deployed proprietary AI","Clients conduct own research using AI tools","Agentic AI tools automating multi-step analytical workflows"],"resilient_aspects":["Senior advisory judgment in specific organisational context","Stakeholder facilitation, workshop leadership","Client relationships built on trust","Political navigation within complex organisations","AI strategy advisory - fast-growing demand"],"near_term_outlook":"Deliverable-heavy consulting model being disrupted. Senior advisory and relationship-led dimensions remain durable."}},{"archetype_id":"ARCH_PMO","archetype_name":"Delivery / PMO / Transformation","ai_impact":{"displacement_risk":"medium","risk_horizon":"4-7 years","pressure_mechanisms":["Wrike AI Agents execute multi-step programme workflows","ClickUp Brain converts workspace knowledge into execution","AI portfolio tools enable enterprise-wide resource optimisation","LLMs generate project documents and risk registers at speed","Automated programme health monitoring replaces manual status chasing"],"resilient_aspects":["Stakeholder management and political navigation","Change management and managing workforce anxiety about AI","Senior programme leadership accountability","Escalation judgment requiring experience","AI adoption programme leadership - significant new demand"],"near_term_outlook":"Agentic tools automating programme workflows. Leadership and change management remain durable."}},{"archetype_id":"ARCH_OPS","archetype_name":"Operations / Process","ai_impact":{"displacement_risk":"medium","risk_horizon":"3-5 years with significant offsetting opportunity","pressure_mechanisms":["Celonis/SAP Signavio provide AI process intelligence","Microsoft Power Automate Process Mining made AI process analysis accessible","KYP.ai and iGrafx offer self-service process intelligence","LLMs generate SOPs and process maps rapidly","Hyperautomation combining RPA and AI automating complex workflows"],"resilient_aspects":["Complex cross-functional process redesign","Implementation leadership","AI implementation and workflow automation advisory - urgent demand","Judgment about what to automate versus what requires human discretion","Continuous improvement culture - leadership challenge AI cannot address"],"near_term_outlook":"Opportunity side growing faster than threat side - demand for AI workflow implementation advisory is surging."}}]') as any[]).map((a: any) => [a.archetype_id, a])
);

const MODELS_AI_IMPACT: Record<string, any> = Object.fromEntries(
  (JSON.parse('[{"model_id":"BM_FCFO","ai_impact":{"displacement_risk":"low-medium","opportunity":"AI-native FP&A platforms handle mechanical forecasting, freeing Fractional CFO to focus on strategic judgment.","resilient_positioning":"Fractional CFO using AI tools to deliver enterprise-grade financial intelligence at SME prices.","adaptation_skills":["Datarails FP&A Genius or ChatFin","AI governance and financial oversight","Excel Copilot for faster scenario analysis"]}},{"model_id":"BM_CWC","ai_impact":{"displacement_risk":"medium","opportunity":"Float, Fluidly, and Helm now have AI forecasting built in.","resilient_positioning":"Specialist who configures AI-enhanced cashflow monitoring systems.","adaptation_skills":["Float, Fluidly, or Helm","Datarails for AI-integrated forecasting","AI-driven procurement platforms"]}},{"model_id":"BM_FPA","ai_impact":{"displacement_risk":"medium-high","opportunity":"AI-native FP&A platforms automate mechanical forecast production.","resilient_positioning":"FP&A specialist who designs AI-powered planning systems.","adaptation_skills":["ChatFin, Datarails, Runway, or Anaplan","AI agent configuration for forecasting","Power BI or Tableau"]}},{"model_id":"BM_PRICE","ai_impact":{"displacement_risk":"low-medium","opportunity":"AI analytics process pricing data and model elasticity rapidly.","resilient_positioning":"Pricing advisor combining AI-powered analysis with commercial judgment.","adaptation_skills":["AI competitive intelligence tools","LLMs for market research","Revenue management platforms"]}},{"model_id":"BM_FDD","ai_impact":{"displacement_risk":"medium","opportunity":"AI document review tools compress the review phase.","resilient_positioning":"FDD specialist using AI-powered document review.","adaptation_skills":["Kira, Luminance, or LLM contract review","AI financial anomaly detection","LLMs for memorandum review"]}},{"model_id":"BM_CAAS","ai_impact":{"displacement_risk":"low","opportunity":"Drata, Centraleyes, Hyperproof provide continuous automated control testing.","resilient_positioning":"AI-enhanced compliance partner with continuous regulatory monitoring.","adaptation_skills":["Drata, Centraleyes, or Hyperproof","4CRisk.ai, Compliance.ai","EU AI Act and AI governance"]}},{"model_id":"BM_ARS","ai_impact":{"displacement_risk":"low-medium","opportunity":"AI document analysis rapidly assesses completeness and control gaps.","resilient_positioning":"Audit readiness specialist using AI-powered gap analysis.","adaptation_skills":["Hyperproof or Centraleyes","DataSnipper","Regulatory intelligence tools"]}},{"model_id":"BM_RISK","ai_impact":{"displacement_risk":"medium","opportunity":"AI GRC platforms provide continuous automated risk monitoring.","resilient_positioning":"Risk advisor delivering continuous AI-powered risk intelligence.","adaptation_skills":["Optro, Centraleyes, Hyperproof, or LogicGate","EU AI Act risk frameworks","LLMs for risk scenario generation"]}},{"model_id":"BM_IACS","ai_impact":{"displacement_risk":"medium-high","opportunity":"ChatFin Autonomous Audit Agents run control tests continuously.","resilient_positioning":"AI-augmented internal audit with enterprise-grade continuous coverage.","adaptation_skills":["ChatFin or MindBridge","DataSnipper","Optro"]}},{"model_id":"BM_REGCH","ai_impact":{"displacement_risk":"medium","opportunity":"AI regulatory monitoring platforms solve horizon-scanning.","resilient_positioning":"Advisor transforming regulatory intelligence into implementation guidance.","adaptation_skills":["4CRisk.ai, Compliance.ai, or Ascent RegTech","EU AI Act","LLMs for regulatory analysis"]}},{"model_id":"BM_PMOAS","ai_impact":{"displacement_risk":"medium","opportunity":"Wrike AI Agents and ClickUp Brain execute programme workflows autonomously.","resilient_positioning":"Senior PMO advisor using agentic AI for programme mechanics.","adaptation_skills":["Wrike AI Agents or ClickUp Brain","Forecast PSA","AI adoption programme management"]}},{"model_id":"BM_PREC","ai_impact":{"displacement_risk":"low","opportunity":"AI programme analytics rapidly identify failure patterns.","resilient_positioning":"Recovery specialist combining AI diagnostics with deep experience.","adaptation_skills":["AI project analytics tools","AI programme failure modes","Stakeholder political mapping"]}},{"model_id":"BM_DXADV","ai_impact":{"displacement_risk":"low-medium","opportunity":"AI adoption IS digital transformation in 2026.","resilient_positioning":"Digital transformation advisor specialising in AI adoption.","adaptation_skills":["Microsoft Copilot, Google Workspace AI","EU AI Act compliance","AI change management"]}},{"model_id":"BM_CHANGE","ai_impact":{"displacement_risk":"low","opportunity":"AI adoption programmes are the dominant change management category.","resilient_positioning":"Change management specialist leading human side of AI adoption.","adaptation_skills":["AI adoption change management methodology","AI sentiment and engagement tools","Microsoft Copilot adoption"]}},{"model_id":"BM_PASS","ai_impact":{"displacement_risk":"low-medium","opportunity":"AI programme health analytics flag risks automatically.","resilient_positioning":"Assurance specialist using AI analytics for data-driven risk assessment.","adaptation_skills":["AI programme health analytics","AI governance assurance frameworks","LLMs for assurance document review"]}},{"model_id":"BM_PROCIM","ai_impact":{"displacement_risk":"medium","opportunity":"Microsoft Power Automate Process Mining has democratised AI process analysis.","resilient_positioning":"Process improvement specialist using AI process mining.","adaptation_skills":["Microsoft Power Automate Process Mining","Celonis or SAP Signavio","AI workflow automation assessment"]}},{"model_id":"BM_AIWF","ai_impact":{"displacement_risk":"very low","opportunity":"This model IS the AI opportunity.","resilient_positioning":"Advisor making AI workflow tools work in real businesses.","adaptation_skills":["n8n, Gumloop, or Vellum AI","Microsoft Power Automate and Zapier AI","EU AI Act compliance"]}},{"model_id":"BM_OPEFF","ai_impact":{"displacement_risk":"medium","opportunity":"AI operational analytics provide continuous efficiency data.","resilient_positioning":"Operational efficiency advisor using AI analytics.","adaptation_skills":["Microsoft Power Automate Process Mining","AI automation opportunity assessment","Hyperautomation implementation oversight"]}},{"model_id":"BM_BSYS","ai_impact":{"displacement_risk":"low","opportunity":"AI tool landscape expanding faster than organisations can evaluate.","resilient_positioning":"Advisor helping businesses navigate the AI and systems landscape.","adaptation_skills":["Breadth across AI tool landscape","EU AI Act risk classification","AI tool evaluation methodology"]}},{"model_id":"BM_STRAT","ai_impact":{"displacement_risk":"low","opportunity":"AI is now a core strategic question for most businesses.","resilient_positioning":"Strategy advisor using AI for richer market intelligence.","adaptation_skills":["AI strategy frameworks","AI governance and EU AI Act","AI research and intelligence tools"]}}]') as any[]).map((m: any) => [m.model_id, m])
);

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
    const { answers, cv_extract } = await req.json();
    const cvContextBlock = cv_extract ? '\n\nCV CONTEXT (extracted from uploaded CV - use to enrich and personalise the output):\n' + JSON.stringify(cv_extract) : '';
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
      q2_seniority: answers["5"],
      q3_sector: answers["3"],
      q3b_employer_type: answers["30"] || "",
      q4_work_type: answers["4"],
      q5_seniority_was_work: answers["5"],
      q6_achievement: answers["6"],
      q7_advisory_practice: answers["7"],
      q8_peer_perception: answers["8"],
      q9_income_urgency: answers["9"],
      q10_independence_confidence: answers["10"],
      q11_client_sectors: answers["11"],
      q12_independent_work: answers["12"],
      q13_network: answers["13"],
      q14_employment: answers["14"],
      q15_location: answers["15"],
    });

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ PROMPT 1: Core Report ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    const p1System = `You are the intelligence engine for Solo, a product helping mid-career professionals find a realistic Plan B. Analyse the user's background and produce structured solo business recommendations.

You have access to the following data:

ARCHETYPES (classify the user into one of these):
${JSON.stringify(ARCHETYPES)}

BUSINESS MODELS (score and recommend from these):
${JSON.stringify(BUSINESS_MODELS)}

MAPPING TABLE (use these scores for archetype-model combinations):
${JSON.stringify(MAPPING)}

Steps:
1. Classify primary archetype and optional secondary with confidence score 0ÃÂ¢ÃÂÃÂ1.
2. Filter models where capability_fit is 2 or below, credibility_gap is 4 or above, or avoid is true.
3. Score remaining models using: (2ÃÂÃÂcapability_fit) + (2ÃÂÃÂspeed_to_revenue) + (2ÃÂÃÂ(6-credibility_gap)) + income_potential + recurrence - sales_complexity. Adjust +2 to fast-revenue models if user signals urgency, -1 to high-complexity models if user signals low selling confidence, +1 to high-income models if 10+ years experience.
4. Select top 3 with different categories and sales motions ÃÂ¢ÃÂÃÂ label Option A (safest/fastest), B (moderate), C (most ambitious).
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

    const p1User = `USER ANSWERS:\n${formattedAnswers}${cvContextBlock}`;

    console.log("Running Prompt 1...");
    const p1Result = await chatCompletion(p1System, p1User, 0.4, 3000);
    const p1Json = JSON.parse(p1Result);

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ PROMPT 2: Evaluation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    const p2System = `You are a senior commercial critic. Evaluate the Solo report against 6 criteria:
1. Specificity ÃÂ¢ÃÂÃÂ target_buyer must name type/size/situation
2. Commercial realism ÃÂ¢ÃÂÃÂ pricing and timelines plausible for UK market
3. Option diversity ÃÂ¢ÃÂÃÂ 3 options must not share same category or sales motion
4. Recommendation quality ÃÂ¢ÃÂÃÂ specific reason tied to this user
5. Reality check honesty ÃÂ¢ÃÂÃÂ archetype-specific failure modes, GBP figures in income outlook
6. First steps quality ÃÂ¢ÃÂÃÂ all 5 specific and tied to recommended model

Additionally, generate a "hook_insight" ÃÂ¢ÃÂÃÂ a single punchy sentence of 8ÃÂ¢ÃÂÃÂ12 words that captures the most commercially compelling insight about this user's independent potential. Use their industry experience (Q6), reputation (Q7), client/sector knowledge (Q11), and any independent work history (Q12) to craft this. It should read like a headline that would make the user want to see their full report.

If all pass: return JSON with {"verdict":"pass","hook_insight":"<your 8-12 word insight>","final_report":<original report>}.
If any fail: revise only failing sections and return {"verdict":"revise","hook_insight":"<your 8-12 word insight>","final_report":<revised report>}.
Hard constraint: NEVER change a model_name value.`;

    const p2UserData = {
      report: p1Json,
      q6_achievement: answers["6"],
      q7_advisory_practice: answers["7"],
      q11_client_sectors: answers["11"],
      q12_independent_work: answers["12"],
      ...(cv_extract ? { cv_context: cv_extract } : {}),
    };

    console.log("Running Prompt 2...");
    const p2Result = await chatCompletion(p2System, JSON.stringify(p2UserData), 0.3, 3000);
    const p2Json = JSON.parse(p2Result);
    const finalReport = p2Json.final_report;
    const hookInsight = p2Json.hook_insight || null;

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ PROMPTS 3 & 4 in parallel ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    const p3System = `You are Solo's activation specialist. Produce a 30-Day Activation Plan and Network Activation Toolkit for the recommended model.

Pacing based on employment status:
- Employed full-time: 1ÃÂ¢ÃÂÃÂ1.5h weekday evenings, 3ÃÂ¢ÃÂÃÂ4h weekend days
- Unemployed or in notice: 5ÃÂ¢ÃÂÃÂ6h weekdays
- Part-time: 2ÃÂ¢ÃÂÃÂ3h weekdays

Network calibration:
- Strong (100+ contacts): ambitious referral-led targets
- Medium (30ÃÂ¢ÃÂÃÂ100): moderate mix of warm and cold
- Weak (under 30): conservative, rebuild relationships first

Cover 4 phases: Foundations (Days 1ÃÂ¢ÃÂÃÂ7), Network Activation (Days 8ÃÂ¢ÃÂÃÂ16), Outreach (Days 17ÃÂ¢ÃÂÃÂ25), Consolidation (Days 26ÃÂ¢ÃÂÃÂ30).


FIRST MOVE: Before the plan, generate a first_move ÃÂ¢ÃÂÃÂ the single highest-probability action for generating real-world signal within 24 hours. Must be an outreach action naming a specific type of person to contact. Include a complete, ready-to-send draft (email, LinkedIn DM, or WhatsApp). follow_up_prompt is the exact question to ask the user 24 hours later.

OUTREACH DRAFTS: For every outreach task in the 30-day plan â any task that involves contacting a person â produce the task as an object, not a string. The object must have: task_type ("outreach"), task (task description, one sentence), target_recipient_type (specific description of who to contact), and outreach_draft containing: format (email/linkedin_dm/verbal), subject (email only, null otherwise), body (ready-to-send message, 100-200 words, direct and warm, in plain British English), tone_note (one sentence on strategic tone intent), personalisation_instructions (what the user needs to customise before sending). Non-outreach tasks remain plain strings. Never use "I hope this finds you well", "I wanted to reach out", or any cliche opener. Use the user's archetype, sector context, and specific achievement to make every draft feel written for this specific person.
Return JSON:
{
  "first_move": {
    "action": "One sentence: specific action, specific type of person to contact",
    "window": "Within 24 hours",
    "why_first": "One sentence: why this action before anything else",
    "outreach_draft": {
      "format": "email | linkedin_dm | whatsapp",
      "subject": "Subject line (email only, omit for DM)",
      "body": "Complete ready-to-send message",
      "tone_note": "Brief note on tone",
      "personalisation_instructions": "What the user needs to customise"
    },
    "follow_up_prompt": "Exact question to ask the user 24 hours later"
  },
  "activation_plan": { "summary": string, "pacing_note": string, "network_note": string, "phases": [{ "phase": string, "days": string, "goal": string, "days_detail": [{ "day": string, "tasks": [string | { "task_type": "outreach", "task": string, "target_recipient_type": string, "outreach_draft": { "format": string, "subject": string | null, "body": string, "tone_note": string, "personalisation_instructions": string } }] }] }] },
  "network_toolkit": {
    "reconnect_email": { "subject": string, "body": string },
    "linkedin_dm": { "body": string },
    "referral_ask_email": { "subject": string, "body": string },
    "verbal_positioning": { "script": string }
  }
}`;

    const p3User = `RECOMMENDED MODEL & REPORT:\n${JSON.stringify(finalReport)}\n\nQ13 (Network): ${answers["13"]}\nQ14 (Employment): ${answers["14"]}`;

    const p4System = `You are Solo's market research analyst. Produce a Local Market Feasibility Snapshot. You do not have live data ÃÂ¢ÃÂÃÂ label all figures as indicative.

Output plain text with these 5 section headings:
DEMAND SIGNAL
PRICING BENCHMARK (open with explicit sentence that figures are indicative)
COMPETITOR LANDSCAPE
MARKET ENTRY INSIGHT
HONEST ASSESSMENT

Header format:
LOCAL MARKET FEASIBILITY SNAPSHOT
[Model name] | [Location]
Prepared as indicative research ÃÂ¢ÃÂÃÂ not primary market data${cvContextBlock}`;

    const recommendedOption = finalReport.options?.find(
      (o: any) => o.label === finalReport.recommendation?.recommended_option
    );
    const p4User = `Recommended model: ${recommendedOption?.model_name || "Unknown"}
Archetype: ${finalReport.archetype?.primary || "Unknown"}
Pricing: ÃÂÃÂ£${recommendedOption?.pricing?.range_low_gbp || "?"} ÃÂ¢ÃÂÃÂ ÃÂÃÂ£${recommendedOption?.pricing?.range_high_gbp || "?"} ${recommendedOption?.pricing?.cadence || ""}
Location: ${answers["15"] || "UK"}${cvContextBlock}`;

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ PROMPT 7: AI Impact & Adaptation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    const archetypeName = finalReport.archetype?.primary || "";
    const recommendedModelId = BUSINESS_MODELS.find(
      (m: any) => m.name === recommendedOption?.model_name
    )?.id || "";
    // Look up archetype AI impact by name (report uses display names, not IDs)
    const archEntry = Object.values(ARCHETYPES_AI_IMPACT).find(
      (a: any) => a.archetype_name === archetypeName
    );
    const archAI = archEntry?.ai_impact || {};
    const modelAI = MODELS_AI_IMPACT[recommendedModelId]?.ai_impact || {};
    const archName = archetypeName;

    const p7System = `You are Solo's AI impact analyst. Your job is to write a clear, specific, commercially honest assessment of how AI will affect this user's career ÃÂ¢ÃÂÃÂ both their current role and their recommended Plan B path.

THE THREE PARTS YOU MUST WRITE:

Part 1 ÃÂ¢ÃÂÃÂ AI Risk to Your Current Role: Write a candid, archetype-specific assessment. Name specific pressure mechanisms, identify resilient aspects, provide honest near-term outlook.

Part 2 ÃÂ¢ÃÂÃÂ AI Resilience of Your Plan B: State displacement risk honestly, explain specifically how AI could enhance this model, describe how to position as AI-enabled.

Part 3 ÃÂ¢ÃÂÃÂ Your Adaptation Path: Write 3-5 specific, actionable things tied to their specific recommended business model. Name real tools and platforms. Achievable in 90 days.

OUTPUT FORMAT ÃÂ¢ÃÂÃÂ Return valid JSON only:
{
  "ai_impact_section": {
    "section_title": "AI & Your Future: Current Role and Plan B",
    "part_1": { "heading": "How AI is Affecting Your Current Role", "displacement_risk": "low|medium|medium-high|high", "risk_horizon": "e.g. 3-6 years", "content": "3-4 paragraphs prose, max 250 words" },
    "part_2": { "heading": "AI Resilience of Your Plan B: [Model Name]", "displacement_risk": "low|medium|medium-high|high", "content": "2-3 paragraphs prose, max 200 words" },
    "part_3": { "heading": "Your Adaptation Path: What to Do in the Next 90 Days", "steps": [ { "priority": 1, "action": "Specific named action", "rationale": "One sentence" } ] }
  }
}`;

    const p7User = `The user has been classified as archetype: ${archName}
Their recommended Plan B model is: ${recommendedOption?.model_name || "Unknown"}

Archetype AI impact data:
Displacement risk: ${archAI.displacement_risk || "unknown"}
Risk horizon: ${archAI.risk_horizon || "unknown"}
Pressure mechanisms: ${JSON.stringify(archAI.pressure_mechanisms || [])}
Resilient aspects: ${JSON.stringify(archAI.resilient_aspects || [])}
Near-term outlook: ${archAI.near_term_outlook || "unknown"}

Plan B model AI impact data:
Displacement risk: ${modelAI.displacement_risk || "unknown"}
Opportunity: ${modelAI.opportunity || "unknown"}
Resilient positioning: ${modelAI.resilient_positioning || "unknown"}
Adaptation skills: ${JSON.stringify(modelAI.adaptation_skills || [])}

Using this data, write the three-part AI Impact section. Return JSON output.`;

    console.log("Running Prompts 3, 4 & 7 in parallel...");
    const [p3Result, p4Result, p7Result] = await Promise.all([
      chatCompletion(p3System, p3User, 0.5, 2500),
      chatCompletionText(p4System, p4User, 0.3, 1500),
      chatCompletion(p7System, p7User, 0.3, 1200),
    ]);

    const activationPlan = JSON.parse(p3Result);
    const p7Json = JSON.parse(p7Result);
    const aiImpactSection = p7Json.ai_impact_section || p7Json;

    // Save completed report
    const { error: updateErr } = await adminClient
      .from("reports")
      .update({
        core_report: finalReport,
        activation_plan: activationPlan,
        market_snapshot: p4Result,
        hook_insight: hookInsight,
        ai_impact_section: aiImpactSection,
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
