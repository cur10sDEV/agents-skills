---
name: notesmith
description: Use when the user points to a lecture, class, or talk transcript file, or pastes transcript text, and wants a note or study guide created from it. Triggers on "transcript", "study guide", "lecture notes", "make a note about this", caption exports (.vtt, .srt, .txt).
version: 1.0.0
---

# Notesmith

## Overview

Turn a lecture transcript (a file path or pasted text) into a first-draft study guide note — a NEW file in the current working directory. Absolute fidelity to the transcript: no invented facts, the lecturer's technical terms preserved, unclear passages flagged exactly where they occur — never silently fixed.

## Output Location — Hard Rule

Save the note in the **literal current working directory** — not a subdirectory, not next to the transcript.

- Filename: `study-guide-<slug>.md`, slug from the transcript's filename or the lecture's main topic (e.g. `study-guide-lecture-07-url-shortener.md`)
- Never modify, move, or rename the original transcript
- Deviate from CWD only if the user's message explicitly names another location

| Temptation | Reality |
|---|---|
| "A notes/ folder keeps things tidy" | CWD means the literal current working directory. No subfolders. |
| "Put it next to the transcript so they pair" | The transcript's directory is not the CWD. |
| "Better ask where to save it" | Don't ask. Default to CWD. |

## Note Structure — exact sections, in this order

1. **Header** — `# Study Guide: <Topic>`; source (filename or "pasted text"); whether timestamps were available
2. **Main Ideas** — organized by topic, not chronological
3. **Key Terms** — term → plain-language definition
4. **Examples, Evidence & Steps** — the lecture's important examples, evidence, procedures
5. **Formulas & Concepts to Memorize** — exactly as taught
6. **System Design Flow** — only if the transcript contains a design/architecture discussion; skip this section otherwise. The FINAL design, in extreme detail:
   - final requirements and constraints
   - final architecture and data flow, component by component
   - every participant input/question and how it changed the design
   - every improvement adopted during the discussion
   - edge cases and how the final design handles each
7. **Alternate Design Decisions** — approaches the instructor said could be done differently, collected here separately (NOT folded into the design flow)
8. **Study Questions** — questions answerable from this note

## Fidelity Rules

- If a claim isn't in the transcript, it doesn't go in the note. No derivations, no outside knowledge, no "obvious" fixes.
- Keep the lecturer's meaning and technical terms.
- Unclear or possibly misheard passage → quote it as-is and append `[check against audio]` at that exact spot. Never guess the intended word. Never silently correct. Never move the flag to a footnote or appendix.
- Intermediate deviations (ideas tried and dropped) stay out of the design flow — final design only.
- Timestamps: if present in the transcript, cite them where content appears (e.g. `[05:02]`). If absent, omit silently.

## Example

Transcript: `"...rate limiting on the write API - token bucket or the fitting wheel algorithm"`

- WRONG: `rate limiting via token bucket or leaky bucket` — a silent guess, presented as fact
- RIGHT: `rate limiting via token bucket or the fitting wheel algorithm [check against audio]`

## Red Flags — STOP

- Creating `notes/`, `study-guides/`, or any subfolder → write to the CWD instead
- Saving the note next to the transcript file
- Silently correcting a garble → flag it with `[check against audio]`
- Adding numbers or estimates the lecturer never stated
- Omitting timestamps that exist in the transcript
