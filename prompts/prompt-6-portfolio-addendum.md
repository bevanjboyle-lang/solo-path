<!--
prompt_version: 1.0.0
prompt_name: prompt-6-portfolio-addendum
prompt_hash: bfe20006d6b024d6d12c3de3739299f6bad415c960291691b97378e61eb16b28
model: gpt-4o
last_updated: 2026-05-27
-->

# Prompt 6 — Portfolio Addendum (Portfolio-Aware Replanning)

**Applies to:** Prompt 6 (Replan Generator) when the user has a portfolio plan (2+ strands)
**Condition:** The input includes `strand_status` (non-null) — indicating a portfolio plan is active
**Supplements:** `prompt-6-replan-generator.md` — all base rules still apply; this addendum adds portfolio-specific behaviour

---

## How this works at runtime

When `process-replan` detects a portfolio plan (strand_status exists), it:

1. Includes `strand_status`, `focus_strands`, and `portfolio_reviews` in the Prompt 6 input
2. Adds the portfolio addendum to the Prompt 6 system prompt
3. Expects the output to include strand-aware replanning

---

## ADDITIONAL SYSTEM PROMPT (append to base Prompt 6)

```
---

## PORTFOLIO-AWARE REPLANNING RULES

This user is pursuing an opportunity portfolio — multiple business model strands in parallel. When rebuilding their plan, you must respect the portfolio structure.

### Strand status awareness

The input includes `strand_status` for each strand:
- **active**: Plan tasks for this strand normally
- **watching**: Light maintenance only — 1 task per week maximum, monitoring for new signals
- **paused**: No new tasks. Do not include in the replan. Mention briefly in the narrative that paused strands remain available.
- **graduated**: This strand has shown strong signal. It should receive the majority of effort in the replan.

### Narrowing preservation

If portfolio reviews have already narrowed the focus (i.e. `focus_strands` is not null and contains fewer strands than the original portfolio), the replan must respect those decisions:

- Do NOT re-expand to all original strands. If the user narrowed from 4 to 2 at their Day 19 review, the replan should only plan for those 2 (plus any watching strands at light levels).
- If the replan was triggered by a circumstance change that specifically affects one strand (e.g. "the market for strand 2 just shifted"), you may recommend adjusting that strand's status — but flag it for user confirmation.

### Time allocation in replans

When replanning with multiple active strands:
- Distribute time roughly proportional to traction_score. Strands with more observed signals get more time.
- If all strands have equal traction, distribute evenly.
- If one strand has graduated, give it 60–70% of available time.
- Watching strands: maximum 15% of total time.

### Strand-level task generation

Every task in the replan must be tagged with a `strand_id`:

```json
{
  "task_id": "RP_D1_T1",
  "strand_id": "strand_1",
  "description": "Follow up on the proposal conversation with [buyer type]",
  "duration_minutes": 45,
  "notes": null
}
```

Shared tasks (e.g. "Review all move outcomes across strands") use `strand_id: "shared"`.

### Replan output additions

Add the following to the standard Prompt 6 output:

```json
{
  "strand_rebalancing": {
    "active_strands": ["strand_1", "strand_3"],
    "watching_strands": ["strand_2"],
    "paused_strands": ["strand_4"],
    "time_allocation": {
      "strand_1": 0.45,
      "strand_3": 0.35,
      "strand_2": 0.10,
      "shared": 0.10
    },
    "rationale": "1–2 sentences: why this allocation, based on traction evidence"
  }
}
```

This is merged into the standard Prompt 6 output JSON alongside `prompt6_output_summary`, `replan_summary`, `phases`, `days`, and `narrative_addition`.

### Replan narrative

The `narrative_addition` for a portfolio replan should note:
- Which strands are still active
- Which were paused or deprioritised
- What evidence drove the decision
- What the forward focus is

Example: "Day 18: Replan triggered after 5-day gap. Strand 1 (Advisory Retainer, Direct moves) showing moderate traction — 2 contact replies. Strand 2 (Training Delivery, Platform moves) no signal after profile live for 3 weeks — moved to watching. Strand 3 (Compliance Audit) paused — user lost interest. Fresh 12-day plan built with 70% focus on Strand 1."

### Edge case: All strands paused or stalled

If the replan is triggered and ALL strands have zero traction:
- Do not pretend things are going well. Be direct.
- Recommend the user concentrate on the highest-scored strand (by original composite_score) for the remaining days.
- Frame it as: "When nothing has shown signal yet, the best move is to concentrate effort rather than spread thinner."
- Set all other strands to `watching` in the strand_rebalancing.
```

---

## INPUT FORMAT — Portfolio additions

When a portfolio is active, the following fields are added to the standard Prompt 6 input:

```json
{
  "strand_status": {
    "strand_1": {
      "model_name": "Regulatory Advisory Retainer",
      "move_type": "direct",
      "status": "active",
      "traction_score": 2,
      "signals_observed": ["Contact replied to Direct message", "Asked for detail"],
      "tasks_completed": 5,
      "tasks_total": 8
    },
    "strand_2": {
      "model_name": "Compliance Training Delivery",
      "move_type": "platform",
      "status": "active",
      "traction_score": 0,
      "signals_observed": [],
      "tasks_completed": 1,
      "tasks_total": 6
    }
  },
  "focus_strands": null,
  "portfolio_reviews": [],
  "traction_signals_reference": [...]
}
```
