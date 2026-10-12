# Design: `humanize-draft` skill (humanizer → stop-slop orchestrator)

Date: 2026-10-12
Status: Approved (user signed off on 2026-10-12)

## Goal

A new skill that takes a document (file path or pasted text), removes AI-sounding
words, phrases, and patterns, and writes the result to a **new draft file** — never
editing the original in place. The draft is a reviewable artifact the user can
inspect and, if satisfied, copy over the original themselves.

It works by running two existing third-party skills in a fixed sequence:

1. **humanizer** (github.com/blader/humanizer, MIT) — 26-pattern AI-tell removal,
   prose-only edits, never invents facts.
2. **stop-slop** (github.com/hardikpandya/stop-slop, MIT) — banned phrases,
   structural clichés, sentence-level rules, 50-point scoring rubric.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| How to access the two skills | Vendor both as separate skills in this repo; orchestrator invokes them by name in sequence |
| Draft location (file input) | Suffix next to original: `report.md` → `report.humanized.md`; re-runs overwrite the draft |
| Pasted-text input | New file in CWD: `humanized-draft-YYYYMMDD-HHMM.md` |
| Draft file content | Clean final text only; review notes go in the chat response, never in the file |
| Chaining approach | **Approach A — copy-then-process:** copy original → draft path first, then both skills operate on the draft copy in their natural file mode |
| Missing skills at runtime | Orchestrator installs (vendors) them first, then proceeds |
| Vendored humanizer purity | **Pure upstream — no local patches.** User accepts that invoking vendored humanizer directly on a file edits it in place and will avoid that |

## Repo layout

```
agents-skills/
├── humanizer/          # vendored from blader/humanizer — SKILL.md + LICENSE (byte-identical to upstream)
├── stop-slop/          # vendored from hardikpandya/stop-slop — SKILL.md + references/*.md + LICENSE (byte-identical to upstream)
└── humanize-draft/     # NEW orchestrator skill
    └── SKILL.md
```

All three are picked up automatically by `node link.js` (no `skills.json` changes
needed — no per-agent whitelists are configured). `docs/` is excluded from skill
discovery, so this spec does not become a skill.

## Orchestrator flow (per run)

1. **Bootstrap (only if needed).** Check that the `humanizer` and `stop-slop`
   skills are invocable. If either is missing, install it first: fetch the repo's
   skill files (SKILL.md, references/, LICENSE) from GitHub and write them into the
   agent's skills directory, then continue. On this machine they will already be
   vendored, so this step normally no-ops.
2. **Identify input.** A file path, or pasted text.
   - Missing file → report it, create nothing, stop.
   - Binary / non-text file (e.g. `.docx`) → explain it's out of scope, stop.
3. **Compute the draft path.**
   - File input: same directory, suffix before the extension —
     `docs/report.md` → `docs/report.humanized.md`;
     `notes.txt` → `notes.humanized.txt`;
     extensionless `README` → `README.humanized.md`.
   - Input that already carries the `.humanized` marker (e.g. a draft from a
     previous run) refines itself in place: its draft path is itself. Drafts are
     regenerable by definition, so overwriting one loses nothing that cannot be
     recreated from the true original. Suffixes never stack.
   - Pasted text: `humanized-draft-YYYYMMDD-HHMM.md` in the current working directory.
4. **Copy the original verbatim to the draft path** (or write the pasted text
   there). From this point the original is read-only — never written, edited,
   moved, or deleted again.
5. **Run the humanizer skill on the draft file.** Full 26-pattern methodology,
   prose-only (code, data, frontmatter, link targets untouched), never invents
   facts. If the user supplied a voice sample, pass it through to this pass.
6. **Run the stop-slop skill on the draft file.** Banned phrases, structural
   clichés, sentence-level rules, then score 1–10 on Directness, Rhythm, Trust,
   Authenticity, Density.
7. **Quality gate.** If the score is below 35/50, run one more stop-slop revision
   pass on the draft and re-score. Bounded to a single extra pass — no loops.
8. **Report in chat.** Draft path, confirmation the original is untouched, the
   biggest changes as a short list, the final score breakdown, and anything the
   user should verify (thin facts, ambiguities). If the draft path already existed
   and was overwritten, say so.

## Hard safety rules (written into the orchestrator SKILL.md)

1. The user-provided **original** is **read-only**. All writes go to the draft file only.
   (Exception: an input that already carries the `.humanized` marker is itself a
   draft — re-processing overwrites it in place; see draft-path rules.)
2. Sequence is fixed: **humanizer first, stop-slop second.** Never reordered, never skipped.
3. Draft contains clean final text only — no metadata, no change log.
4. Never invent facts; every name, number, date, quote, and link must survive from the source.
5. Re-runs overwrite the draft (regenerable); the original stays byte-identical.

## Chat report format

```
Draft written: docs/report.humanized.md
Original untouched: docs/report.md (read-only)

Biggest changes:
- ...
- ...

Score: Directness 8 · Rhythm 7 · Trust 8 · Authenticity 8 · Density 7 = 38/50

Check yourself:
- ... (items needing user verification, if any)
```

## Edge cases

- **Draft path already exists** → overwrite silently, mention it in the report.
- **Input is already a `.humanized` draft** → refine it in place (never stack suffixes).
- **Multiple files in one request** → process each through the same pipeline, one draft per file.
- **Voice sample provided** → forwarded to the humanizer pass only.
- **Skill-tool cannot load a skill even after bootstrap** → stop with a clear error rather than improvising the skill's rules from memory.

## Verification plan

1. `node link.js --dry-run` — confirm all three skills are discovered and would link.
2. `node link.js` — link them into opencode/claude/codex.
3. End-to-end test on a sample AI-sounding text file:
   - draft file appears at the expected path with humanized content,
   - original is byte-identical (`diff` / checksum before and after),
   - chat report matches the format above,
   - re-running overwrites the draft without touching the original.

## Out of scope

- Beating AI detectors (humanizer's own stance: not a goal).
- Non-text formats (`.docx`, PDFs).
- Any local modifications to the vendored skills.
