<!--
prompt_version: 1.0
prompt_name: baseline-general-llm
prompt_hash: 8cff45db8ae5b00944f01ec5b7e1cff7d8ac5301fa8e68a24d3f6598f6a41d84
model: gpt-5.4
last_updated: 2026-06-01
-->

# Baseline — naive general-LLM (the "just use ChatGPT" control)

**Purpose:** the control arm for the head-to-head (Battery 2). This is what a capable
but non-expert user would get by pasting their situation into a general chatbot with a
reasonable-but-untrained prompt and **none of Solo's scaffolding** — no archetype library,
no business-model library, no scoring, no seniority calibration, no hook-insight tests, no
outreach-draft standard, no knowledge bank.

Run this once per golden profile, same temperature as production, then have judge-9 score
Solo's real output and this baseline **blind** on the shared rubric. Solo's win-rate is the
evidence for (or against) the bible's Principle-4 moat claim.

Keep this prompt deliberately *ordinary*. Do not engineer it to be bad — engineer it to be
exactly what a smart professional would actually type. If Solo cannot beat this, the moat
claim is weaker than assumed and we need to know.

---

## The baseline prompt (sent to the general LLM)

System: `You are a helpful career and small-business advisor.`

User:
```
I'm a {Q1} with {Q2} years of experience. I work in {Q3a} — specifically {Q3b}.
My role is mostly {Q4} at {Q5} level. A piece of work I'm proud of: {Q6}.
People say I'm good at: {Q8}. Clients/sectors I know well: {Q11}.
Past independent work: {Q12}. My network: {Q13}. I'm {Q14}, based in {Q15}.

I'm worried my role could become less secure. If I had to build an independent income
from my experience, what are my most realistic options, and how would I get my first
client in the next 30 days? Be specific and realistic.
```

Capture the full response as `baseline_output`.
