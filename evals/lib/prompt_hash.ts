// evals/lib/prompt_hash.ts
//
// Computes a stable hash representing the current state of the prompts/
// directory. Used as the run identifier — same prompt_hash means same
// baseline comparison target.
//
// Implementation: SHA-256 over the concatenated sorted (relative-path :: file-content)
// for every .md file under prompts/. Deterministic across machines.
//
// Sub-PR D will add per-prompt headers; this function will then optionally
// switch to using the embedded prompt_hash fields rather than recomputing.

import { walk } from "https://deno.land/std@0.220.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.220.0/path/mod.ts";

export interface PromptVersions {
  // Map of prompt filename → version string parsed from the file's header.
  // Populated by sub-PR D. Empty record until then.
  [prompt_name: string]: string;
}

export async function computePromptHash(promptsDir: string): Promise<string> {
  const files: Array<{ path: string; content: string }> = [];

  for await (const entry of walk(promptsDir, { exts: [".md"], includeDirs: false })) {
    const rel = relative(promptsDir, entry.path);
    const content = await Deno.readTextFile(entry.path);
    files.push({ path: rel, content });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  const concat = files.map((f) => `${f.path}\n${f.content}\n--EOF--\n`).join("");
  const buf = new TextEncoder().encode(concat);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Parses the HTML-comment header block at the top of each prompt file
 * (the format introduced by sub-PR B and required by sub-PR D's pre-commit hook):
 *
 *   <!--
 *   prompt_version: 1.0
 *   prompt_name: judge-1-specificity
 *   prompt_hash: <sha256 of file body after header>
 *   model: gpt-4o
 *   last_updated: 2026-05-27
 *   -->
 *
 * Returns versions keyed by prompt_name. Falls back to filename if no header.
 */
export async function readPromptVersions(promptsDir: string): Promise<PromptVersions> {
  const versions: PromptVersions = {};

  for await (const entry of walk(promptsDir, { exts: [".md"], includeDirs: false })) {
    const content = await Deno.readTextFile(entry.path);
    const headerMatch = content.match(/^<!--([\s\S]*?)-->/);
    if (!headerMatch) {
      const fallback = entry.path.split("/").pop() ?? entry.path;
      versions[fallback] = "unknown";
      continue;
    }

    const header = headerMatch[1];
    const nameMatch = header.match(/prompt_name:\s*(\S+)/);
    const versionMatch = header.match(/prompt_version:\s*(\S+)/);
    if (nameMatch && versionMatch) {
      versions[nameMatch[1]] = versionMatch[1];
    }
  }

  return versions;
}
