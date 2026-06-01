#!/usr/bin/env python3
"""
Solo report linter (Battery 3) — deterministic, no LLM, zero cost.

Checks a generated report object against Solo's own tone/quality rules
(tone-of-voice.md banned list, bible §12) and flags the failure modes the
2026-06-01 AI pre-pass found. Complements lib/guardrails.ts (which checks
output strings); this checks the whole report OBJECT.

Usage:
    python3 report_linter.py path/to/report.json
where report.json is a single reports row with keys:
    core_report, activation_plan, market_snapshots, ai_impact_section

Exit code 1 if any HIGH finding is present (so it can gate CI).
"""
import json, re, sys

BANNED_HYPE = [
    "unlock", "unleash", "supercharge", "game-chang", "revolutionary", "disruption",
    "empower", "synergy", "seamless", "hustle", "crushing it", "level up",
    "world-class", "best-in-class", "cutting-edge", "amazing", "incredible",
    "thrilled", "delighted", "holistic", "comprehensive",
]
BANNED_OPENERS = ["i hope this", "i wanted to reach out", "reach out", "hope this finds you well"]
RESTATE_PAT = re.compile(r"you selected|user selected|you chose|you have selected|selected a portfolio|selected the following", re.I)
ISNT_PAT = re.compile(r"(isn'?t|is not|aren'?t|are not)[^,.]{1,45}(,| )(it'?s|it is|they'?re|they are)", re.I)

def all_prose(report):
    return " ".join(json.dumps(report.get(k) or "", ensure_ascii=False)
                     for k in ("core_report","activation_plan","market_snapshots","ai_impact_section"))

def collect_drafts(ap):
    drafts = []
    if not isinstance(ap, dict): return drafts
    fm = (ap.get("first_move") or {}).get("move") or {}
    if fm.get("draft"): drafts.append(("first_move", fm["draft"]))
    for t in (ap.get("network_toolkit") or {}).get("templates") or []:
        if t.get("content"): drafts.append((t.get("use_case") or t.get("type") or "template", t["content"]))
    for ph in (ap.get("activation_plan") or {}).get("phases") or []:
        for d in ph.get("days_detail") or []:
            for tk in d.get("tasks") or []:
                if tk.get("outreach_draft"): drafts.append((f"day {d.get('day')}", tk["outreach_draft"]))
    return drafts

def lint(report):
    findings = []
    def add(sev, code, msg): findings.append({"severity": sev, "check": code, "detail": msg})
    prose = all_prose(report)
    cr = report.get("core_report") or {}
    ap = report.get("activation_plan") or {}

    # 1. Em dashes (banned AI tell)
    n = prose.count("—")
    if n: add("HIGH", "em_dash", f"{n} em dashes in generated output (tone guide bans them as an AI tell)")
    # 2. "isn't X, it's Y" construction (banned)
    if ISNT_PAT.search(prose): add("HIGH", "isnt_x_its_y", "banned 'isn't X, it's Y' construction present")
    # 3. Exclamations in product copy (banned)
    if "!" in prose: add("MED", "exclamation", "exclamation mark in product copy")
    # 4. Banned hype words
    low = prose.lower()
    hits = [f"{w} x{low.count(w)}" for w in BANNED_HYPE if w in low]
    if hits: add("MED", "banned_hype", ", ".join(hits))
    # 5. Recommendation rationale restates the selection
    rat = (cr.get("recommendation") or {}).get("rationale") or ""
    if RESTATE_PAT.search(rat): add("HIGH", "rationale_restates", "recommendation rationale restates the selection instead of reasoning")
    if rat and len(rat) < 200: add("MED", "rationale_thin", f"rationale only {len(rat)} chars")
    # 6. Hook insight present + headline length (schema key is 'paragraph')
    hi = cr.get("hook_insight") or {}
    headline = (hi.get("headline") or "").strip()
    para = (hi.get("paragraph") or hi.get("insight") or "").strip()
    if not headline: add("HIGH", "hook_headline_missing", "no hook headline")
    else:
        wc = len(headline.split())
        if wc < 6 or wc > 14: add("MED", "hook_headline_length", f"headline is {wc} words (target 8-12)")
        if "—" in headline or ISNT_PAT.search(headline):
            add("HIGH", "hook_headline_banned", "the hook headline itself uses a banned construction (em dash / isn't-X-its-Y)")
    if not para: add("HIGH", "hook_paragraph_missing", "hook insight paragraph missing")
    # 7. Pricing anchor: cheap wedge present vs early-months reality
    opts = cr.get("options") or []
    lows = [ (o.get("pricing") or {}).get("range_low_gbp") for o in opts if (o.get("pricing") or {}).get("range_low_gbp")]
    io = (cr.get("income_outlook") or {}).get("year_1") or {}
    build = (io.get("revenue_build","") + " " + io.get("assumptions","")).lower()
    early_zero = ("£0" in build or "0-5" in build or "0–5" in build or "slow build" in build)
    if lows and min(lows) > 8000 and early_zero:
        add("MED", "anchor_mismatch", f"lowest option entry is £{min(lows)} with no cheap wedge, but early months are ~£0 — anchor/expectation gap")
    # 8. Outreach drafts
    for label, d in collect_drafts(ap):
        wc = len(d.split())
        if wc > 250: add("MED", "draft_too_long", f"{label} draft is {wc} words (>250)")
        dl = d.lower()
        for opener in BANNED_OPENERS:
            if opener in dl: add("HIGH", "draft_banned_opener", f"{label} draft contains banned phrase '{opener}'")
    return findings

if __name__ == "__main__":
    rep = json.load(open(sys.argv[1]))
    fs = lint(rep)
    if not fs:
        print("PASS — no findings"); sys.exit(0)
    for f in sorted(fs, key=lambda x: x["severity"]):
        print(f"[{f['severity']}] {f['check']}: {f['detail']}")
    sys.exit(1 if any(f["severity"] == "HIGH" for f in fs) else 0)
