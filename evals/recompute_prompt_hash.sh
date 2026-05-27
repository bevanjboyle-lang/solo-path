#!/usr/bin/env bash
# evals/recompute_prompt_hash.sh
#
# Maintains the prompt_hash field in every prompts/**/*.md file's HTML-comment
# header block. Used by the pre-commit hook (W1) and by run_eval.ts (sub-PR C).
#
# Wrapper around evals/recompute_prompt_hash.py for portability — Python is on
# every macOS / Linux dev machine, bash + awk drift on whitespace handling.
#
# Exit codes:
#   0  No header drift; all hashes match what's in the files.
#   1  At least one file's header was updated (drift detected). The script
#      still writes the corrected headers — re-stage and commit.
#   2  Unexpected error.
#
# Usage:
#   ./evals/recompute_prompt_hash.sh             # walks prompts/, writes fixes
#   PROMPTS_DIR=prompts ./evals/recompute_prompt_hash.sh

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$HERE/recompute_prompt_hash.py"

if [[ ! -f "$PY" ]]; then
  echo "ERROR: $PY not found" >&2
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found in PATH" >&2
  exit 2
fi

exec python3 "$PY" "$@"
