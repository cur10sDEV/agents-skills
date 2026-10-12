# humanize-draft Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendor the `humanizer` and `stop-slop` skills into this repo and add a `humanize-draft` orchestrator skill that runs them in sequence on a document or pasted text, always writing the result to a new draft file and never editing the original in place.

**Architecture:** Copy-then-process. The orchestrator copies the original verbatim to the draft path first; humanizer and stop-slop then operate on the draft copy in their natural file mode, so the original is never opened for writing. A bootstrap step installs the two sub-skills from GitHub if they are missing. Purity constraint: vendored skills stay byte-identical to upstream.

**Tech Stack:** Markdown SKILL.md files with YAML frontmatter; `link.js` (zero-dependency Node) for symlinking; git/sha256/diff for verification.

**Spec:** `docs/superpowers/specs/2026-10-12-humanize-draft-skill-design.md`

## Global Constraints

- Repo: `/home/cur10sdev/Desktop/coding/agents-skills`, work directly on `main` (existing repo pattern), conventional commit messages (`feat:`, `docs:`, `chore:`).
- Vendored `humanizer/` and `stop-slop/` files are **byte-identical to upstream `main`** — verified by `diff` against a fresh clone. **No local modifications, ever** (user decision).
- Orchestrator directory name: `humanize-draft`. Skill IDs invoked by it: `humanizer` then `stop-slop`, in that fixed order.
- Draft naming (verbatim from spec): `docs/report.md` → `docs/report.humanized.md`; `notes.txt` → `notes.humanized.txt`; extensionless `README` → `README.humanized.md`; input already carrying the `.humanized` marker → draft path is itself (refine in place, suffixes never stack); pasted text → `humanized-draft-YYYYMMDD-HHMM.md` in CWD.
- The original is read-only. Draft contains clean final text only. Quality gate: score 1–10 on Directness, Rhythm, Trust, Authenticity, Density; below 35/50 → exactly one extra stop-slop revision pass, then re-score. No loops.
- Never invent facts; names, numbers, dates, quotes, links survive from the source.
- No npm dependencies, no `skills.json` changes, nothing under `docs/` becomes a skill (excluded from discovery).
- Use `/tmp/opencode/` for clones and test fixtures; quote paths.

## Review Focus

Failure modes the spec implies; each is pinned to the task whose tests exercise it:

1. **Original modified during a run** (violates the core guarantee) → Task 5 checksums the original before/after every scenario.
2. **Suffix stacking** (`report.humanized.humanized.md` when re-processing a draft) → Task 5 scenario B asserts no stacked-suffix file exists.
3. **Review metadata leaking into the draft** (violates clean-text rule) → Task 5 greps the draft for report markers (`Score:`, `Draft written:`).
4. **Sequence violated** (stop-slop before humanizer, or a pass skipped) → Task 3 verifies the SKILL.md documents humanizer-then-stop-slop in order; Task 5 executes that order and both passes appear in the run.
5. **Pasted-text run writes no file** (violates "always a draft file") → Task 5 scenario C asserts a `humanized-draft-*.md` file appears in the CWD.
6. **Missing skill + failed bootstrap → rules improvised from memory** → Task 3 verifies the SKILL.md mandates stop-with-error instead of improvising.

---

### Task 1: Vendor the humanizer skill

**Files:**
- Create: `humanizer/SKILL.md`
- Create: `humanizer/LICENSE`

**Interfaces:**
- Consumes: upstream `blader/humanizer` at `main`.
- Produces: skill directory `humanizer/` in repo root (skill ID `humanizer`), complete per its own SKILL.md — no external file references (verified below).

- [ ] **Step 1: Clone upstream**

```bash
rm -rf /tmp/opencode/vendor-humanizer
git clone --depth 1 https://github.com/blader/humanizer /tmp/opencode/vendor-humanizer
```

- [ ] **Step 2: Copy SKILL.md and LICENSE into the repo**

```bash
mkdir -p humanizer
cp /tmp/opencode/vendor-humanizer/SKILL.md /tmp/opencode/vendor-humanizer/LICENSE humanizer/
```

- [ ] **Step 3: Verify byte-identical and self-contained**

```bash
diff /tmp/opencode/vendor-humanizer/SKILL.md humanizer/SKILL.md
diff /tmp/opencode/vendor-humanizer/LICENSE humanizer/LICENSE
grep -n "references/" humanizer/SKILL.md
head -8 humanizer/SKILL.md
```

Expected: both `diff`s print nothing; `grep` finds **no** `references/` paths (humanizer SKILL.md is self-contained); frontmatter has `name: humanizer` and a `description`.

- [ ] **Step 4: Commit**

```bash
git add humanizer/
git commit -m "feat: vendor humanizer skill from blader/humanizer"
```

### Task 2: Vendor the stop-slop skill

**Files:**
- Create: `stop-slop/SKILL.md`
- Create: `stop-slop/LICENSE`
- Create: `stop-slop/references/phrases.md`
- Create: `stop-slop/references/structures.md`
- Create: `stop-slop/references/examples.md`

**Interfaces:**
- Consumes: upstream `hardikpandya/stop-slop` at `main`.
- Produces: skill directory `stop-slop/` (skill ID `stop-slop`), complete with the three reference files its SKILL.md links.

- [ ] **Step 1: Clone upstream**

```bash
rm -rf /tmp/opencode/vendor-stop-slop
git clone --depth 1 https://github.com/hardikpandya/stop-slop /tmp/opencode/vendor-stop-slop
```

- [ ] **Step 2: Copy SKILL.md, LICENSE, and references/ into the repo**

```bash
mkdir -p stop-slop
cp /tmp/opencode/vendor-stop-slop/SKILL.md /tmp/opencode/vendor-stop-slop/LICENSE stop-slop/
cp -r /tmp/opencode/vendor-stop-slop/references stop-slop/
```

- [ ] **Step 3: Verify byte-identical and complete**

```bash
diff -r /tmp/opencode/vendor-stop-slop/SKILL.md stop-slop/SKILL.md
diff -r /tmp/opencode/vendor-stop-slop/references stop-slop/references
ls -la stop-slop/references/
grep -n "references/" stop-slop/SKILL.md
```

Expected: `diff`s print nothing; `references/` holds `phrases.md`, `structures.md`, `examples.md`, all non-empty; every `references/...` path in SKILL.md resolves to a file in `stop-slop/references/`.

- [ ] **Step 4: Commit**

```bash
git add stop-slop/
git commit -m "feat: vendor stop-slop skill from hardikpandya/stop-slop"
```

### Task 3: Write the humanize-draft orchestrator SKILL.md

**Files:**
- Create: `humanize-draft/SKILL.md`

**Interfaces:**
- Consumes: skill IDs `humanizer` (Task 1) and `stop-slop` (Task 2), invoked in that order.
- Produces: skill ID `humanize-draft`; draft files named per the Global Constraints.

- [ ] **Step 1: Write `humanize-draft/SKILL.md`**

Exact frontmatter (description wording may be polished, keywords must stay):

```yaml
---
name: humanize-draft
description: Removes AI-sounding words, phrases, and patterns from a document or pasted text by running the humanizer skill and then the stop-slop skill in sequence, then writes the result to a NEW draft file. Never edits the original in place. Use when the user asks to "humanize" text or a document, "de-slop" or "de-AI" writing, make text sound human or less AI-written, or wants a humanized draft or version of a file.
version: 0.1.0
---
```

Body, sections in this order. Prose is the implementer's; the pinned copy is not:

1. **Purpose** — two-skill pipeline in fixed order; output is a reviewable draft, user decides whether to copy it over the original.
2. **Hard rules** — numbered, this exact content: (1) the user-provided original is read-only, never written, edited, moved, or deleted; sole exception: an input already carrying the `.humanized` marker is itself a draft and is refined in place. (2) Sequence fixed: humanizer first, stop-slop second — never reordered, never skipped. (3) The draft contains clean final text only — no metadata, no change log, no scores. (4) Never invent facts; every name, number, date, quote, and link survives from the source. (5) Re-runs overwrite the draft; mention it in the report.
3. **Step 0: Ensure both skills are installed** — if `humanizer` or `stop-slop` cannot be invoked, install the missing one before anything else: `git clone --depth 1 https://github.com/blader/humanizer` and copy `SKILL.md` + `LICENSE` to `~/.config/opencode/skills/humanizer/`; `git clone --depth 1 https://github.com/hardikpandya/stop-slop` and copy `SKILL.md` + `LICENSE` + `references/` to `~/.config/opencode/skills/stop-slop/`. If installation fails, stop with a clear error — never improvise either skill's rules from memory.
4. **Step 1: Identify the input** — file path or pasted text. Missing file → report, create nothing, stop. Binary/non-text (e.g. `.docx`) → out of scope, stop. Multiple files → run the whole pipeline per file.
5. **Step 2: Compute the draft path** — the five naming rules from Global Constraints, with the four file examples (`docs/report.md` → `docs/report.humanized.md`, `notes.txt` → `notes.humanized.txt`, extensionless `README` → `README.humanized.md`, `.humanized` input → itself) and the pasted-text rule (`humanized-draft-YYYYMMDD-HHMM.md`, CWD, local time).
6. **Step 3: Create the draft** — copy the original verbatim to the draft path (pasted text: write it there). The original is read-only from this point.
7. **Step 4: Humanize (first pass)** — invoke the `humanizer` skill and apply it to the **draft file** (its file mode). Never point it at the original. Forward any user voice sample to this pass.
8. **Step 5: De-slop (second pass)** — invoke the `stop-slop` skill and apply it to the draft file.
9. **Step 6: Quality gate** — score the draft 1–10 on Directness, Rhythm, Trust, Authenticity, Density. Below 35/50: run exactly one more stop-slop revision pass on the draft and re-score. Never more than one extra pass.
10. **Step 7: Report** — exact template:

```
Draft written: <draft path>
Original untouched: <original path> (read-only)

Biggest changes:
- <short list>

Score: Directness N · Rhythm N · Trust N · Authenticity N · Density N = NN/50

Check yourself:
- <items needing user verification, if any>
```

Append a line when an existing draft was overwritten. Review info goes in this report only, never in the draft file.

- [ ] **Step 2: Run the content verification checklist**

```bash
f=humanize-draft/SKILL.md
grep -c '^---$' $f            # expect: 2 (frontmatter delimiters; no other --- lines in the file)
grep -n "name: humanize-draft" $f
awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2' $f | grep -m1 -n "humanizer"
awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2' $f | grep -m1 -n "stop-slop"
grep -n "read-only" $f
grep -n "report.humanized.md" $f
grep -n "notes.humanized.txt" $f
grep -n "README.humanized.md" $f
grep -n "humanized-draft-YYYYMMDD-HHMM.md" $f
grep -n "blader/humanizer" $f
grep -n "hardikpandya/stop-slop" $f
grep -n "35/50" $f
grep -n "Directness" $f
grep -n "Draft written:" $f
grep -n "never improvise" $f
grep -n "never invent" $f
```

Expected: every grep prints at least one match. The two `awk` commands print the first **body** (post-frontmatter) occurrence of each skill name with its line number — the `humanizer` line number must be **lower** than the `stop-slop` line number (sequence documented in flow order).

- [ ] **Step 3: Review against the spec**

Read `humanize-draft/SKILL.md` next to the spec's "Hard safety rules", "Orchestrator flow", and "Chat report format" sections. Every spec rule must be traceable to a line in the SKILL.md. Fix gaps, re-run Step 2.

- [ ] **Step 4: Commit**

```bash
git add humanize-draft/
git commit -m "feat: add humanize-draft orchestrator skill (humanizer -> stop-slop, draft-only output)"
```

### Task 4: Link all three skills

**Files:** none in the repo — symlinks in `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.codex/skills/`.

**Interfaces:**
- Consumes: `link.js` (repo root), skill dirs from Tasks 1–3.
- Produces: invocable skill IDs `humanizer`, `stop-slop`, `humanize-draft` for all three agents.

- [ ] **Step 1: Dry-run**

```bash
node link.js --dry-run
```

Expected: output lists `humanizer`, `stop-slop`, and `humanize-draft` as new links for opencode, claude, and codex (no skills.json changes needed — no whitelists configured).

- [ ] **Step 2: Link and verify**

```bash
node link.js --yes
ls -la ~/.config/opencode/skills/ | grep -E "humanizer|stop-slop|humanize-draft"
ls -la ~/.claude/skills/ | grep -E "humanizer|stop-slop|humanize-draft"
ls -la ~/.codex/skills/ | grep -E "humanizer|stop-slop|humanize-draft"
```

Expected: all three names appear as symlinks in each of the three target dirs, pointing into this repo.

- [ ] **Step 3: Sanity-read through a link**

```bash
head -3 ~/.config/opencode/skills/humanize-draft/SKILL.md
```

Expected: prints `---` then `name: humanize-draft` (symlink resolves).

### Task 5: End-to-end smoke test

**Files:**
- Test fixtures under `/tmp/opencode/humanize-e2e/` (never in the repo).

**Interfaces:**
- Consumes: the full pipeline — `humanize-draft/SKILL.md` as the entry point, vendored skills as invoked steps.
- Produces: verification evidence that the orchestrator's guarantees hold. No repo commit.

- [ ] **Step 1: Create the fixture and record its checksum**

```bash
mkdir -p /tmp/opencode/humanize-e2e/pasted
cat > /tmp/opencode/humanize-e2e/sample.md <<'EOF'
# Embracing the Journey of Database Indexing

Let's dive into database indexing! It's not just a feature — it's a game-changer that will revolutionize how you think about queries. Indexing is the language of performance.

**Performance:** Performance is enhanced through meticulously crafted B-trees, showcasing O(log n) lookups. **Speed:** Queries are significantly bolstered.

In conclusion, indexing stands as a testament to elegant design. The future looks bright for your queries!
EOF
sha256sum /tmp/opencode/humanize-e2e/sample.md
```

Expected: checksum printed; save it for comparison.

- [ ] **Step 2: Execute the orchestrator on the fixture (scenario A: file input)**

Attempt to invoke the `humanizer` and `stop-slop` skills via the skill tool when their steps come up; if the harness cannot load skills added mid-session, read `~/.config/opencode/skills/<id>/SKILL.md` and follow it exactly — identical semantics. Follow `humanize-draft/SKILL.md` from Step 0 through Step 7 for `/tmp/opencode/humanize-e2e/sample.md`, producing the draft and the chat report.

- [ ] **Step 3: Verify scenario A**

```bash
test -f /tmp/opencode/humanize-e2e/sample.humanized.md && echo DRAFT_EXISTS
sha256sum /tmp/opencode/humanize-e2e/sample.md
grep -nE "not just|meticulous|showcas|testament|bolstered|revolutioniz|game-changer|Let's dive|—|\*\*Performance|future looks bright|Embracing the Journey" /tmp/opencode/humanize-e2e/sample.humanized.md
grep -nE "Score:|Draft written:|Biggest changes" /tmp/opencode/humanize-e2e/sample.humanized.md
grep -n "O(log n)" /tmp/opencode/humanize-e2e/sample.humanized.md
```

Expected: `DRAFT_EXISTS`; original checksum unchanged; the AI-tell grep matches **nothing** (or only documented exceptions in code/quotes); the metadata grep matches **nothing**; `O(log n)` survives (fact preserved).

- [ ] **Step 4: Execute and verify scenario B (re-process a draft)**

Run the pipeline on `/tmp/opencode/humanize-e2e/sample.humanized.md`.

```bash
ls /tmp/opencode/humanize-e2e/
sha256sum /tmp/opencode/humanize-e2e/sample.md
```

Expected: **no** `sample.humanized.humanized.md` (suffixes never stack); `sample.humanized.md` was refined in place; original checksum still unchanged.

- [ ] **Step 5: Execute and verify scenario C (pasted text)**

Working directory `/tmp/opencode/humanize-e2e/pasted`, run the pipeline on the sample text passed as pasted text (not as a file path).

```bash
ls /tmp/opencode/humanize-e2e/pasted/
grep -nE "Score:|Draft written:|Biggest changes" /tmp/opencode/humanize-e2e/pasted/humanized-draft-*.md
```

Expected: a file matching `humanized-draft-*.md` exists there; the metadata grep matches **nothing** (humanized text only, no report content).

- [ ] **Step 6: Report results**

Summarize: which scenarios passed, the draft paths, the original's checksum stability, and note that the first real user-facing invocation should happen in a fresh session (new skills are picked up at session start).

---

## Post-plan

Nothing else. The spec's verification plan is fully covered by Tasks 4–5.
