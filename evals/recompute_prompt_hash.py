#!/usr/bin/env python3
"""
evals/recompute_prompt_hash.py

Maintains the prompt_hash field in every prompts/**/*.md file's HTML-comment
header block. Idempotent: running twice with no underlying file changes is a
no-op.

Behaviour:
  - For each prompts/**/*.md file:
    - If no <!-- ... --> header block exists at the top, prepend a default one
      using the filename basename (minus .md) as prompt_name and version 1.0.0.
    - Compute SHA-256 of the canonical body (everything after the closing -->,
      with one leading blank line stripped if present, and CRLF normalised to
      LF for cross-platform stability).
    - Replace the prompt_hash: field in the header with the computed hash.
    - Write the file back in canonical form: header block, exactly one blank
      line, body. Idempotent.
  - Print the canonical aggregate hash (SHA-256 over sorted "path::hash" lines)
    to stdout. Suitable for CI:
        deno run --allow-all evals/run_eval.ts --prompt-hash $(./evals/recompute_prompt_hash.sh)

Exit codes:
  0  No header drift; all hashes match what's in the files.
  1  At least one file's header was updated (drift detected). The script
     still writes the corrected headers — re-stage and commit.
  2  Unexpected error.
"""

from __future__ import annotations

import hashlib
import os
import re
import sys
from datetime import date
from pathlib import Path

PROMPTS_DIR = Path(os.environ.get("PROMPTS_DIR", "prompts"))

HEADER_RE = re.compile(r"^<!--(.*?)-->\s*", re.DOTALL)
PROMPT_HASH_FIELD_RE = re.compile(r"^prompt_hash:\s*(\S.*?)\s*$", re.MULTILINE)
PROMPT_NAME_FIELD_RE = re.compile(r"^prompt_name:\s*(\S.*?)\s*$", re.MULTILINE)


def canonicalise_body(raw_body: str) -> str:
    """Normalise body for hashing. Strips one leading blank line + CRLF→LF."""
    body = raw_body.replace("\r\n", "\n")
    # Strip exactly one leading blank line (the separator between header and body).
    if body.startswith("\n"):
        body = body[1:]
    # Strip trailing whitespace; ensure single trailing newline.
    body = body.rstrip() + "\n"
    return body


def default_header(filename: str) -> str:
    name = filename
    return (
        "<!--\n"
        "prompt_version: 1.0.0\n"
        f"prompt_name: {name}\n"
        "prompt_hash: TBD\n"
        "model: gpt-4o\n"
        f"last_updated: {date.today().isoformat()}\n"
        "-->"
    )


def process_one(path: Path) -> tuple[str, bool]:
    """Returns (new_hash, was_updated)."""
    text = path.read_text(encoding="utf-8")

    m = HEADER_RE.match(text)
    if m:
        header_block_with_trailing_ws = m.group(0)  # includes trailing \s*
        header_block = header_block_with_trailing_ws.rstrip()  # the <!-- ... -->
        raw_body = text[len(header_block_with_trailing_ws):]
    else:
        # No header — synthesise one and treat the whole file as the body.
        header_block = default_header(path.stem)
        raw_body = text

    body = canonicalise_body(raw_body)

    new_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()

    # Read current hash from header (if present).
    existing_hash_match = PROMPT_HASH_FIELD_RE.search(header_block)
    current_hash = existing_hash_match.group(1).strip() if existing_hash_match else None

    # Build the new header by replacing (or appending) the prompt_hash field.
    if existing_hash_match:
        new_header = (
            header_block[: existing_hash_match.start()]
            + f"prompt_hash: {new_hash}"
            + header_block[existing_hash_match.end():]
        )
    else:
        # Insert the field just before the closing -->.
        new_header = header_block.rstrip().removesuffix("-->").rstrip() + f"\nprompt_hash: {new_hash}\n-->"

    # Ensure prompt_name field is present (synthesise from filename if missing).
    if not PROMPT_NAME_FIELD_RE.search(new_header):
        new_header = new_header.removesuffix("-->").rstrip() + f"\nprompt_name: {path.stem}\n-->"

    new_text = new_header + "\n\n" + body

    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        if current_hash is not None:
            print(f"[prompt-hash] updated {path}: {current_hash} -> {new_hash}", file=sys.stderr)
        else:
            print(f"[prompt-hash] added header to {path}: {new_hash}", file=sys.stderr)
        return new_hash, True

    return new_hash, False


def main() -> int:
    if not PROMPTS_DIR.is_dir():
        print(f"ERROR: prompts directory not found at {PROMPTS_DIR} (cwd: {os.getcwd()})", file=sys.stderr)
        return 2

    drift = False
    aggregate_parts: list[str] = []

    for path in sorted(PROMPTS_DIR.rglob("*.md")):
        new_hash, was_updated = process_one(path)
        if was_updated:
            drift = True
        rel = path.relative_to(Path.cwd()) if path.is_absolute() else path
        aggregate_parts.append(f"{rel}::{new_hash}")

    aggregate = hashlib.sha256("\n".join(aggregate_parts).encode("utf-8")).hexdigest()
    print(aggregate)

    return 1 if drift else 0


if __name__ == "__main__":
    sys.exit(main())
