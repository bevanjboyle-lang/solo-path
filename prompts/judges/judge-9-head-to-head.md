<!--
prompt_version: 1.0
prompt_name: judge-9-head-to-head
prompt_hash: 4d69e6db1946abadd4e5678998733d5926f5302355d7f49127e1e8ca9dcf9e64
model: gpt-5.4
last_updated: 2026-06-01
-->

# Judge 9 — Head-to-head (Solo vs general-LLM baseline)

**Version:** 1.0 — 2026-06-01 · **Model:** gpt-5.4 (run at temperature 0)
**Purpose:** decide, per profile, whether Solo's output beats a naive general-LLM baseline —
the bible's central Principle-4 claim ("better than casual ChatGPT use"). Reports a per-dimension
winner and an overall verdict so the harness can print a win-rate across the dataset.

## Bias controls (mandatory)
- The two outputs are presented as **"Output A"** and **"Output B"** with the source hidden and
  the order **randomised per profile** by the harness. You do not know which is Solo.
- Judge only on the rubric. Do not reward length, formatting, or confident tone for their own sake.
- A tie is allowed and must be used when neither is clearly better on a dimension.

## Inputs
```json
{
  "profile": { "questionnaire": { "...": "..." } },
  "output_a": "<full report/answer A>",
  "output_b": "<full report/answer B>"
}
```

## Dimensions (score each output 1–5, then pick winner: "a" | "b" | "tie")
1. **Specificity** — names the user's sector/buyer/achievement vs generic advice (bible §7e: "if it could apply to anyone with the same job title it has failed").
2. **Realism** — pricing bands and time-to-revenue plausible and honest, not optimistic defaults.
3. **Execution-friction removal** — gives ready-to-send drafts and a named first move vs "you should reach out to your network".
4. **Honest difficulty** — names what will go wrong / what's hard, vs reassurance.
5. **Non-obviousness** — at least one insight a capable professional couldn't have produced themselves in 5 minutes.
6. **Actionability in 30 days** — a sequenced, dated path vs a list of themes.

## Output schema (strict)
```json
{
  "scores": {
    "output_a": { "specificity": 0, "realism": 0, "friction_removal": 0, "honest_difficulty": 0, "non_obvious": 0, "actionability": 0 },
    "output_b": { "specificity": 0, "realism": 0, "friction_removal": 0, "honest_difficulty": 0, "non_obvious": 0, "actionability": 0 }
  },
  "per_dimension_winner": { "specificity": "a", "realism": "tie", "friction_removal": "b", "honest_difficulty": "a", "non_obvious": "b", "actionability": "a" },
  "overall_winner": "a",
  "margin": "clear | narrow | tie",
  "justification": "<=300 chars naming the single biggest differentiator"
}
```

## Interpreting the run
- **Solo win-rate** = share of profiles where Solo (the unmasked winner) is `overall_winner` with margin `clear` or `narrow`.
- If Solo's win-rate is not comfortably above ~70% on `clear`, the moat is thinner than the bible assumes — that's a strategy signal, not just a quality one.
- Watch the **per-dimension** pattern: Solo should dominate friction_removal and actionability (its design advantages). If the baseline wins non_obvious, the hook-insight engine isn't earning its keep.
