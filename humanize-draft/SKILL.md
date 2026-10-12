---
name: humanize-draft
description: Removes AI-sounding words, phrases, and patterns from a document or pasted text by running the humanizer skill and then the stop-slop skill in sequence, then writes the result to a NEW draft file. Never edits the original in place. Use when the user asks to "humanize" text or a document, "de-slop" or "de-AI" writing, make text sound human or less AI-written, or wants a humanized draft or version of a file.
version: 0.1.0
---

# Humanize Draft: two-pass de-AI with a reviewable draft

## Purpose

Take a document or pasted text, strip the words, phrases, and patterns that mark it as AI-written, and hand back a draft the user can review. The pipeline is fixed: run the `humanizer` skill over the text first, then the `stop-slop` skill over the result. The final text goes to a **new draft file**; the original is never touched. The user reads the draft and decides whether to copy it over the original.

## Hard rules

1. The user's original is **read-only**. Never write to it, edit it, move it, or delete it. Sole exception: an input that already carries the `.humanized` marker is itself a draft from an earlier run — refine it in place.
2. The sequence is fixed: `humanizer` first, `stop-slop` second. Never reordered, never skipped.
3. The draft file contains clean final text only: no metadata, no change log, no scores. Review information belongs in the chat report, never in the draft.
4. Fact discipline: never invent facts. Every name, number, date, quote, and link in the original survives into the draft.
5. Re-runs overwrite the draft. The draft is regenerable; the original is not. Say in the report when an existing draft was overwritten.

## Step 0: Ensure both skills are installed

Before anything else, confirm the `humanizer` and `stop-slop` skills can be invoked. If either is missing, install it now, then continue:

```bash
# humanizer
git clone --depth 1 https://github.com/blader/humanizer /tmp/opencode/install-humanizer
mkdir -p ~/.config/opencode/skills/humanizer
cp /tmp/opencode/install-humanizer/SKILL.md /tmp/opencode/install-humanizer/LICENSE ~/.config/opencode/skills/humanizer/

# stop-slop
git clone --depth 1 https://github.com/hardikpandya/stop-slop /tmp/opencode/install-stop-slop
mkdir -p ~/.config/opencode/skills/stop-slop
cp -r /tmp/opencode/install-stop-slop/SKILL.md /tmp/opencode/install-stop-slop/LICENSE /tmp/opencode/install-stop-slop/references ~/.config/opencode/skills/stop-slop/
```

If installation fails (no network, clone error, missing files), stop with a clear error naming the skill that could not be installed, and never improvise either skill's rules from memory; the rewrite depends on the real skill content.

## Step 1: Identify the input

- A file path: confirm it exists and is a text file. Missing file → say so, create nothing, stop. Binary or non-text formats (`.docx`, `.pdf`, images) → say the skill handles text files only, stop.
- Pasted text: the text in the conversation is the input.
- Multiple files: run the whole pipeline once per file, each with its own draft and report.

## Step 2: Compute the draft path

For a file, the draft sits next to the original with `.humanized` inserted before the extension:

- `docs/report.md` → `docs/report.humanized.md`
- `notes.txt` → `notes.humanized.txt`
- extensionless `README` → `README.humanized.md`
- an input already ending in `.humanized.<ext>` (a draft from an earlier run) → the draft path is the input itself; suffixes never stack.

For pasted text: `humanized-draft-YYYYMMDD-HHMM.md` in the current working directory, using local time (for example `humanized-draft-20261012-1430.md`).

## Step 3: Create the draft

Copy the original file, byte for byte, to the draft path. For pasted text, write the text to the draft path. From this point the original is read-only: every later step reads the original at most, and writes only the draft. (Exception per hard rule 1: a `.humanized` input is its own draft, so the copy is a no-op and work proceeds on it in place.)

## Step 4: Humanize (first pass)

Invoke the `humanizer` skill and apply its full process to the **draft file** — its file mode: mark the tells, draft the rewrite, check it against the patterns and the original claims, write only the final text back to the draft. Never point humanizer at the original. If the user supplied a writing sample for voice matching, forward it to this pass only.

## Step 5: De-slop (second pass)

Invoke the `stop-slop` skill and apply it to the draft file: cut the banned phrases (references/phrases.md), break the formulaic structures (references/structures.md), and enforce the sentence-level rules.

## Step 6: Quality gate

Score the draft 1–10 on each stop-slop dimension: Directness, Rhythm, Trust, Authenticity, Density. If the total is below 35/50, run exactly one more `stop-slop` revision pass on the draft, then re-score. Never more than one extra pass; report the final scores as they stand.

## Step 7: Report

Reply in exactly this shape, filling in the values:

```
Draft written: <draft path>
Original untouched: <original path> (read-only)

Biggest changes:
- <the few largest edits, one line each>

Score: Directness N · Rhythm N · Trust N · Authenticity N · Density N = NN/50

Check yourself:
- <items the user should verify, if any; omit this block when there are none>
```

When the input was itself a `.humanized` draft refined in place, replace the `Original untouched` line with `Draft refined in place: <path> (the input was already a humanized draft)`. If the draft path already existed and was overwritten, add one line saying so. The report lives in the chat reply only — never write it into the draft file.
