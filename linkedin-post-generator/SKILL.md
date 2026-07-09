---
name: LinkedIn Post Generator
description: This skill should be used when the user asks to "create a linkedin post", "create a technical infographic", basically to create linked post text matter and infographics regarding any topic, preferrably a technical topic - a cs / software development concept
version: 0.2.0
---

# Technical LinkedIn Post + Dark-Theme HTML Infographic Generator

## Purpose

You generate **LinkedIn posts about technical/CS/engineering topics** paired with **at least 4 standalone HTML infographic files** (more if the topic is dense enough to warrant it). The post text and the images are always delivered SEPARATELY — never embedded together — because LinkedIn does not support embedded interactive content. The user copies the text directly into LinkedIn and screenshots each HTML file individually to post as an image carousel.

This skill defines: the writing voice, the post structure, the exact visual design system (colors, fonts, spacing, components), and the image content formula. Follow this specification exactly — every hex code, font, and spacing value is intentional and consistent across a whole series of posts.

---

## PART 1 — POST TEXT STYLE GUIDE

### 1.1 Voice & Persona

Write as a **full-stack developer sharing a personal learning journey**, not as a corporate tech blog or a textbook. The tone is:

- **Curious and explanatory ("teach-first")** — the writer just understood something and wants to pass on the "aha" moment, not lecture.
- **Conversational but technically precise** — short sentences, plain words, but every technical claim must be correct and specific (real syscalls, real command names, real error messages, real numbers).
- **Confident enough to have opinions** — willing to say "most posts stop here — let's go further" or name common misconceptions directly.
- **Never salesy, never hype-driven.** No "🚀 game-changing" or "mind-blowing" language. The excitement comes from genuine clarity, not exclamation marks.

### 1.2 Standard Post Structure

Every post follows this skeleton (adapt section count to topic, but keep the shape):

1. **Hook (1–3 short lines).** Open with a relatable, slightly provocative observation or a question that most readers have wondered about but never dug into. Often uses a surprising fact or a "why does X exist" framing.
   - Example: *"Why does `List<String>` exist instead of just `List`?"*
   - Example: *"I spent three days confused about why my EC2 instance couldn't reach the internet."*

2. **Reframe / thesis statement (1–2 lines).** Name the actual concept and promise the payoff.
   - Example: *"It's called zero-copy transfer. And once you understand it, you'll never look at I/O the same way."*

3. **The naive/problem approach, explained honestly (1 section).** Show what people do without the concept, and *why* it's inadequate — with a concrete cost (a number, a complexity class, a real failure mode). Never strawman it — explain why someone would reasonably reach for it first.

4. **The concept itself, explained mechanically ("under the hood").** This is the core teaching section. Go one level deeper than most explainers — mention the actual syscall, the actual algorithm, the actual data structure, the actual compiler behavior. Use concrete before/after examples, not just abstract description.

5. **How a specific well-known system uses it.** Ground the abstract concept in a named real system (Kafka, Postgres, Kubernetes, a specific language's compiler, etc.) with specifics — not "many systems use this" but "Kafka's consumer fetch path does X specifically."

6. **The honest tradeoffs section — ALWAYS INCLUDED.** Explicitly signal: *"Here's the part most posts skip"* or *"Let's go further than the benefits."* List genuine costs, failure modes, or limitations. This section is what separates this style from marketing content. Never end a post only on the upside.

7. **A decision framework or "when to reach for this" section (for pattern/architecture topics).** Numbered questions or a checklist the reader can literally use.

8. **Closing line + engagement question.** One reflective closing sentence, then a genuine, specific question inviting comments (not "thoughts?" — ask something a practitioner would actually answer, e.g. *"What's a generic abstraction in your codebase that earned its complexity?"*).

9. **Hashtags.** 6–8 tags, mix of specific technology names and broad categories. Format: `#Kafka #SystemDesign #DistributedSystems #Backend #WebPerformance #SoftwareEngineering`

### 1.3 Formatting Rules for Post Text

- Use `→` for outcome/result arrows, `✓`/`✗` sparingly for pass/fail framing, `🔴🟡🟢` traffic-light emoji for severity/comparison tiers (used consistently: red=bad/naive, amber=partial/tradeoff, green=good/solution).
- Bold key terms using `**term**` markdown when writing for a canvas/doc; when writing plain text for direct LinkedIn paste, use no markdown — LinkedIn doesn't render it. Default to **plain text with visual line breaks and em-dashes** unless told the destination renders markdown.
- Use horizontal rule breaks (`---`) between major sections for readability in the delivered text block.
- Section headers inside the post are short and in **bold sentence case**, not title case: "The honest tradeoffs" not "The Honest Tradeoffs."
- Keep paragraphs to 1–4 lines. LinkedIn readers scan; never write a solid block over 5 lines.
- Length target: max 3000 characters for the full post text (LinkedIn's post text character limit).
- Always include at least one ASCII diagram or inline code block in the text itself when explaining a flow, even though the HTML infographics also visualize it — the text should stand alone if someone never opens the images.

---

## PART 2 — VISUAL DESIGN SYSTEM (HTML Infographics)

Every infographic is a **single self-contained HTML file** (inline `<style>`, no external JS dependencies except Google Fonts) sized for a clean screenshot, rendered on a **dark background**. This exact system must be reused across ALL 4 images in a series and across ALL post topics — visual consistency across a person's whole content series is the entire point.

### 2.1 Color Tokens (use these exact hex values every time)

```css
/* BASE (identical across every infographic, every post) */
--bg:              #0e1621;   /* page background */
--surface:         #111c2a;   /* card / panel background */
--surface-alt:     #0a1018;   /* nested / inner panel background (darker) */
--border:          #1e2d3d;   /* default border color for all cards/panels */
--text-primary:    #f0ece4;   /* headline text (warm off-white) */
--text-body:       #8a9aaa;   /* lead paragraph / body text (muted blue-grey) */
--text-dim:        #5a7080;   /* secondary descriptive text inside cards */
--text-faint:      #3a5060;   /* tertiary labels, captions, footer */
--text-ghost:      #2a3a4a;   /* footer page numbers, barely-there annotations */
```

**Semantic accent colors** — pick ONE per concept/theme, used for tag pill, headline italic word, and all matching highlights within that specific infographic. Reuse the same accent across all 4 images ONLY if they share a throughline color; more often, each of the 4 images gets its own accent matching its content's role (see Part 3):

```css
--green:   #7ac47a;   /* backgrounds: #0d2214, borders: #2a5030 — used for: "the solution", "good/correct", write-optimized, success states */
--red:     #e05050;   /* backgrounds: #1d1214 / #2a1212, borders: #4a2020 — used for: "the problem", "bad/naive", failure states, costs */
--blue:    #7aaacf;   /* backgrounds: #0d1e2e, borders: #1e3a54 — used for: neutral technical detail, read-optimized, "the mechanism" */
--amber:   #c4a820;   /* backgrounds: #1a1a0e, borders: #4a3800 — used for: "the tradeoff / caution", partial solutions, warnings */
--purple:  #b890e0;   /* backgrounds: #1a1028, borders: #4a2a7a — used for: decision frameworks, "both/hybrid", meta-level insight */
--gold:    #d4a820;   /* backgrounds: #1a1500, borders: #4a3500 — used for: golden rule / key insight callouts, graph/special category */
--teal:    #5abcbc;   /* backgrounds: #0a1e1e, borders: #1a5050 — used sparingly for a 6th/7th category when needed (e.g. document stores) */
```

**Rule:** every accent color has a fixed (background, border, text) triplet. Never mix — e.g. green text always pairs with `#0d2214` background and `#2a5030` border. This is what makes every image "feel" like the same design system even though the accent color rotates per section.

**Mapping accent colors to CSS custom properties.** Each infographic picks ONE accent color from the table above. Define these four custom properties in that file's `<style>` block by mapping the chosen accent's triplet:

```css
/* Example: choosing BLUE as the accent for this infographic */
:root {
  --accent-text:    #7aaacf;   /* text color from the accent triplet */
  --accent-bg:      #0d1e2e;   /* background from the accent triplet */
  --accent-border:  #1e3a54;   /* border from the accent triplet */
  --accent-solid:   #7aaacf;   /* same as --accent-text, used for solid fills (left-border, dot, strong) */
}
```

Use these `--accent-*` properties in all component patterns that reference them (`.tag`, `.callout`, `.insight`, `.q-num`, etc.). This keeps components accent-agnostic — swap the four values above and the whole infographic recolors consistently.

### 2.2 Typography

Import via Google Fonts in every file's `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
```

Three-font stack, each with a fixed job — never swap their roles:

| Font | Role | Usage |
|---|---|---|
| **Fraunces** (serif, editorial) | Headlines only | `h1`, card/section titles (`font-weight:700`), always paired with an *italic* accent word colored with the section's accent |
| **DM Sans** | Body text | Lead paragraphs, descriptions, all prose inside cards |
| **DM Mono** | Everything technical | Code blocks, labels, tags, table headers, badges, footer text, syscalls, SQL, any literal value |

Headline pattern (always this shape):
```html
<h1>Plain opening clause<br><em>the punchy accent-colored closer.</em></h1>
```
`h1 em { font-style: italic; color: var(--accent-for-this-image); }`

Sizes (consistent across all infographics):
- `h1`: 36–38px, weight 700, line-height 1.15–1.2
- `.lead` paragraph: 14px, color `--text-body`, line-height 1.65, `max-width: 600–640px` (never let body text run full width)
- Card titles (Fraunces): 13–16px, weight 700
- Body text inside cards (DM Sans): 11–12px
- Mono labels/code: 9–11px
- Section eyebrow labels (DM Mono, uppercase, letter-spacing 0.1em): 9–10px

### 2.3 The Tag Pill (top-left, every single image)

Every infographic opens with a small uppercase eyebrow pill above the headline, colored to the image's accent:

```html
<div class="tag">Section Name Here</div>
```
```css
.tag{
  font-family:'DM Mono',monospace;font-size:11px;font-weight:500;
  letter-spacing:0.12em;text-transform:uppercase;
  color:var(--accent-text);background:var(--accent-bg);
  border:1px solid var(--accent-border);
  border-radius:5px;padding:4px 11px;display:inline-block;margin-bottom:22px;
}
```

### 2.4 Section Title / Divider (used to break an image into sub-sections)

```html
<div class="section-title">Label describing the section below</div>
```
```css
.section-title{
  font-family:'DM Mono',monospace;font-size:10px;font-weight:500;
  letter-spacing:0.1em;text-transform:uppercase;color:#3a5060;
  margin-bottom:16px;display:flex;align-items:center;gap:8px;
}
.section-title::after{content:'';flex:1;height:1px;background:#1e2d3d;}
```
This produces a label with a trailing horizontal rule filling the remaining width — use before every distinct sub-block within a single infographic.

### 2.5 Standard Card / Panel

The atomic building block. Every visual element (comparison box, code block, table, callout) is built from nested versions of this:

```css
.card{
  background:#111c2a;      /* --surface */
  border:1px solid #1e2d3d; /* --border */
  border-radius:10px–14px;  /* 10px small, 12px medium, 14px large containers */
  padding:14px–24px;
}
```
Nested/inner elements (code blocks, mini-panels inside a card) drop one level darker: `background:#0a1018;` with the same border color.

### 2.6 Two-Tone Comparison Pattern (used constantly — problem/solution, before/after, monoglot/polyglot, TCP/QUIC)

This is the single most reused layout in the whole system:

```html
<div class="split"> <!-- display:grid; grid-template-columns:1fr 1fr; gap:14px; -->
  <div class="panel panel-bad">...</div>   <!-- red accent triplet -->
  <div class="panel panel-good">...</div>  <!-- green or blue accent triplet -->
</div>
```
Each panel:
```css
.panel{ border-radius:12px; padding:20px; border:1px solid; }
.panel-bad{ background:#1d1214; border-color:#4a2020; }
.panel-good{ background:#0d2214; border-color:#2a5030; }
```
Panel header always: colored dot (10px circle) + Fraunces title in matching accent color.

**Variant:** when three states are needed (e.g. HTTP/1.1 vs /2 vs /3), stack panels vertically instead of side-by-side, same color logic (red → amber → green as a progression).

### 2.7 Code Block Pattern

Every code/SQL/syscall snippet uses this exact treatment:

```css
.code-block{
  font-family:'DM Mono',monospace;font-size:10.5px–11px;
  background:#0a1018;border:1px solid #1e2d3d;border-radius:7px;
  padding:10px–16px;line-height:1.7–1.75;
  white-space:pre;
}
```
Inline syntax coloring inside code blocks (consistent token colors across every post):
- Keywords (`SELECT`, `class`, `public`, `extends`): `#b890e0` (purple)
- Types/identifiers (`String`, `T`, column names): `#7aaacf` (blue)
- String/success values: `#7ac47a` (green)
- Comments: `#3a5060` (faint)
- Error/bad values: `#e05050` (red)
- Special params/generics placeholders: `#f4a261` (orange — a one-off accent used ONLY for generic type params / special emphasis, background `#2a1e0e`, border `#6a4a10`)

### 2.8 Row-Based Data Tables (query planner tables, index type tables, decision matrices)

```css
.t-head{ display:grid; grid-template-columns:[custom widths]; background:#0a1018; padding:10px 14–16px; font-family:'DM Mono',monospace; font-size:9–10px; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; color:#3a5060; }
.t-row{ display:grid; grid-template-columns:[same as head]; padding:10–12px 14–16px; border-top:1px solid #1a2535; align-items:center; }
.t-row:nth-child(even){ background:#0e1720; } /* subtle zebra striping */
```
Wrap in a `.table-wrap` with `background:#111c2a; border:1px solid #1e2d3d; border-radius:12px; overflow:hidden;`

### 2.9 Callout / Insight Box (the "key takeaway" moment — one per image, usually near the end)

Two variants:

**Left-border accent strip** (quick insight, 1–2 sentences):
```css
.callout{
  background: var(--accent-bg); border:1px solid var(--accent-border);
  border-left:3px solid var(--accent-solid);
  border-radius:0 10px 10px 0;
  padding:14–16px 18–20px;
  font-size:13px; color:#5a7080; line-height:1.6;
}
.callout strong{ color: var(--accent-solid); }
```

**Icon + title + body box** (bigger, closing insight of the whole infographic):
```html
<div class="insight">
  <div class="insight-icon">💡</div>  <!-- 48x48 rounded box, emoji centered, on --surface-alt -->
  <div>
    <div class="insight-title">Short punchy title, Fraunces 16px bold</div>
    <div class="insight-body">2-4 sentences, DM Sans 13px, color #5a7080, <strong>key phrases in #c0c8d0</strong>.</div>
  </div>
</div>
```
`display:grid; grid-template-columns:48px 1fr; gap:16px;` on the outer `.insight`, background `#111c2a`, border `#1e2d3d`, border-radius 12px, padding 22-24px.

### 2.10 Do / Don't (or Costs / Benefits) Split

```css
.dd-card{ border-radius:12px; padding:18–20px; border:1px solid; }
.dd-do{ background:#0d2214; border-color:#2a5030; }   /* green */
.dd-dont{ background:#1d1214; border-color:#4a2020; } /* red */
```
Each item in the list: small 5px colored dot + text, text color slightly desaturated toward the accent (e.g. green items use `#6a9a74` text, not full `#7ac47a`, to stay readable against a colored background at body-text size).

### 2.11 Numbered Step Flows (protocol steps, decision questions, migration steps)

```html
<div class="q-row">
  <div class="q-num">1</div>  <!-- 28x28 rounded box, accent bg+border, mono bold number -->
  <div class="q-content">
    <div class="q-question">The question or step, 13px, #c0c8d0, weight 500</div>
    <div class="q-sub">Supporting detail, 11px, #5a7080</div>
  </div>
</div>
```
Container: `background:#111c2a; border:1px solid #1e2d3d; border-radius:10px; padding:14px 18px; display:grid; grid-template-columns:28px 1fr; gap:12px;`

### 2.12 Pipeline / Flow Diagrams (multi-stage horizontal processes)

Used for things like "raw input → gate → storage → output" or OSI-style layered diagrams:

```css
.pipeline{ display:flex; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
.stage{ flex:1; padding:20px 16px; border-right:1px solid #1e2d3d; background:#111c2a; }
.arrow-col{ width:28px; display:flex; align-items:center; justify-content:center; background:#0a1018; border-right:1px solid #1e2d3d; color:#3a5060; }
```
One stage can be visually "highlighted" (the gate/decision point) by giving it a unique accent background (e.g. `#0d2214` for an enforcement gate) while siblings stay neutral `#111c2a`.

For **vertical** tree/hierarchy diagrams (B-tree levels, medallion architecture layers), use the same card language but stack with connector arrows (`↓` glyph, `color:#2a3a4a`) or dashed vertical lines between levels.

### 2.13 Footer (identical structure on every single image, every post)

```html
<div class="footer">
  <span>{{Post Topic Title}} · Visual Series</span>
  <span class="pg">{{n}} / {{total}}</span>
</div>
```
```css
.footer{ margin-top:22px; display:flex; align-items:center; justify-content:space-between; font-size:11px; color:#2a3a4a; font-family:'DM Mono',monospace; }
.pg{ background:#f0ece4; color:#0e1621; padding:3px 10px; border-radius:5px; font-size:10px; font-weight:500; }
```
Note the page-number badge INVERTS the palette (light background, dark text) — this is the one deliberate inversion in the entire system, used as a visual anchor in the bottom-right corner of every image. `{{total}}` equals the total number of infographics in the series (minimum 4, more if the topic demands it).

### 2.14 Page Structure / Boilerplate

Every HTML file follows this exact skeleton:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{{Descriptive title}}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  background:#0e1621;
  color:#f0ece4;              /* CRITICAL: set base text color so unwrapped text is readable */
  font-family:'DM Sans',sans-serif;
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:48px;
}
.wrap{width:780px–820px;} /* pick one width and stick to it for all 4 images in a series */
/* ... rest of component CSS from sections above ... */
</style>
</head>
<body>
<div class="wrap">
  <div class="tag">...</div>
  <h1>...</h1>
  <p class="lead">...</p>
  <!-- content sections -->
  <div class="footer">...</div>
</div>
</body>
</html>
```

**IMPORTANT:** The `color:#f0ece4` on `body` ensures any text not explicitly wrapped in a styled element (e.g. stray text nodes, or elements that inherit color) remains readable against the dark background. Without this, the browser default is black — invisible on `#0e1621`.

Fixed body padding of `48px` and a `.wrap` width between 780–820px (pick ONE per series, consistent across all 4 images) is what makes screenshots crop cleanly and consistently.

---

## PART 3 — THE IMAGE CONTENT FORMULA

Every post's visuals are split into **at least 4 images**, each with a distinct **role** and a distinct **accent color**. The minimum is 4 images, but dense topics may warrant 5–7 images to fully convey the information. Never go below 4. This mapping is not arbitrary — reuse this exact structure for any new technical topic:

### Image 1 — "The Problem" (accent: RED, occasionally BLUE if there's no real 'problem' framing)
- What breaks / what's naive / what's slow without the concept
- Always include a concrete before-state: real numbers, real complexity class, a code example of the naive approach
- Ends with the cost made explicit (a complexity table, a "why this fails at scale" callout)

### Image 2 — "The Mechanism" / "Under the Hood" (accent: BLUE, or GREEN if framed as "the fix")
- How the concept actually works, mechanically, at the lowest level you can credibly explain
- This is where syscalls, algorithms, tree structures, bytecode, compiler behavior go
- Always more technically dense than Image 1 — this is the "teach" payload
- Often includes a labeled diagram (pipeline, tree, or layered structure) built from Part 2.12

### Image 3 — "Real-World Application" / "How [Named System] Uses This" (accent: GREEN or PURPLE)
- Ground the concept in a specific, named, real system or a realistic example scenario
- Use the two-tone or multi-row pattern to show concrete examples (real stack components, real query patterns, real code use-cases)
- This image should feel the most "practical" — a reader should be able to map it directly onto their own codebase

### Image 4 — "Tradeoffs & Decision Framework" (accent: AMBER/GOLD, with RED/GREEN do-dont split)
- The honest costs section — ALWAYS present, matching the post text's mandatory tradeoffs section
- A do/don't or costs/benefits split (Part 2.10)
- A numbered decision-question list (Part 2.11) OR a "golden rule" insight box (Part 2.9, gold variant)
- This image should let a reader make an actual decision, not just admire the concept

**Do not skip the tradeoffs image.** It is the single most identity-defining part of this content style — it's what makes the series feel honest and senior rather than promotional.

**Need more than 4?** If the topic has multiple distinct mechanisms, more than one real-world system to showcase, or particularly dense tradeoffs, split the content across additional images. For example: split Image 2 into 2a (mechanism part 1) and 2b (mechanism part 2), or add an Image 5 for a second real-world case study. Always keep the full arc (problem → mechanism → application → decision) intact — extra images extend sections, they don't replace them.

---

## PART 4 — WORKED EXAMPLE MAPPING (for calibration)

| Topic | Img 1 (red/problem) | Img 2 (blue/mechanism) | Img 3 (green/application) | Img 4 (amber/decision) |
|---|---|---|---|---|
| HOL Blocking | What HOL blocking is, single-lane analogy | HTTP/1.1 vs /2 vs /3 stream diagrams | TCP vs QUIC packet-loss comparison | Summary table + "bottom line" callout |
| Schema on Read/Write | (split into 2 dedicated images instead — write then read) | — | — | Head-to-head comparison → Medallion architecture (both together) |
| Zero-Copy / Kafka | Traditional 4-copy path, context switches | sendfile() fast path, DMA | Kafka broker internals, page cache reuse | Performance numbers, TLS/compression caveats |
| Multi-Level Indexing | Seq scan O(n) vs index O(log n) | B-tree level-by-level structure | Query planner: index scan / bitmap / seq scan choice | Write penalty, index types table, do/don't |
| Polyglot Persistence | Monoglot strain vs polyglot specialization | (folded into img 1 as categories) | Two real stacks (e-commerce, social) row by row | Cost/benefit tradeoffs + decision matrix |
| Generics | Duplication vs unsafe-cast, two bad options | Type erasure vs monomorphization | Real code patterns (List\<T\>, Optional\<T\>, Repository\<T\>) | Tradeoffs + decision questions |
| AWS Networking | VPC/subnet public-vs-private mechanics | IGW & NAT Gateway mechanics + misconceptions | Route table matching logic | End-to-end flow diagrams + takeaways |

Not every topic maps 1:1 to "problem → mechanism → application → decision" — adapt the *labels* to the topic, but always preserve the arc: **naive/costly state → how it actually works → where it's used for real → what it costs you and how to decide.** If your topic is dense enough that a single image can't do a section justice, split that section across multiple images while keeping the arc order intact.

---

## PART 5 — DELIVERY FORMAT (CRITICAL — DO NOT DEVIATE)

1. **Always deliver post text and images as separate deliverables.** Never suggest embedding HTML into a LinkedIn post. State plainly that LinkedIn doesn't support embedded interactive content and the images are meant to be screenshotted individually.
2. **Post text comes first**, formatted as plain copy-paste-ready text (no markdown syntax visible, since LinkedIn doesn't render `**bold**` or `#headers`).
3. **Then produce at least 4 HTML files**, one per image, named sequentially (e.g. `1-problem.html`, `2-mechanism.html`, `3-application.html`, `4-decisions.html`, and if needed `5-extended-case-study.html`, `6-deeper-tradeoffs.html`) — all inside a topic subdirectory at `$LINKEDIN_OUTPUT_BASE/{topic-slug}/` (defaults to `$HOME/Downloads/linkedin/{topic-slug}/`). Each file name should follow the pattern `{n}-{section-slug}.html`.
4. **Review each HTML file for layout issues before rendering PNGs.** Check for missing spacing between sibling div elements, ensure cards have proper margins, and verify no content overlaps or gets clipped. Common issue: adjacent divs with no gap/margin between them causing elements to touch.
5. **Then run the render script** (see Part 9.3) to generate both individual PNG previews and the combined multi-page PDF. The PDF (`{topic-slug}-carousel.pdf`) is the primary LinkedIn deliverable — upload it directly as a LinkedIn document post (creates the swipeable carousel). The PNG files are for quick preview only.
6. **All images in a series must share:** identical `--bg`, `--surface`, `--border` base tokens, identical font stack, identical `.wrap` width, identical footer structure, identical page-number badge style. Only the accent color rotates per image's role.
7. If revising a subset of images (e.g. "make these consistent," "redo image 3"), always re-check against this exact token list before finalizing — the most common failure mode is drifting to a light theme or a different accent palette on one image while others stay dark. Confirm every image in a series uses `#0e1621` background before delivering.
8. Close each delivery with a short, non-repetitive summary of what each image covers (1–2 lines per image), a note on the total image count, and confirmation that the combined PDF is ready for upload.

---

## PART 6 — QUICK-REFERENCE CHEAT SHEET

```
BACKGROUND:      #0e1621
CARD SURFACE:    #111c2a
INNER SURFACE:   #0a1018
BORDER:          #1e2d3d
HEADLINE TEXT:   #f0ece4  (Fraunces, 700)
BODY TEXT:       #8a9aaa  (DM Sans, 400)
DIM TEXT:        #5a7080
FAINT TEXT:      #3a5060
GHOST TEXT:      #2a3a4a

GREEN  (good/solution):     text #7ac47a | bg #0d2214 | border #2a5030
RED    (bad/problem):       text #e05050 | bg #1d1214 | border #4a2020
BLUE   (neutral/mechanism): text #7aaacf | bg #0d1e2e | border #1e3a54
AMBER  (tradeoff/warning):  text #c4a820 | bg #1a1a0e | border #4a3800
PURPLE (meta/decision):     text #b890e0 | bg #1a1028 | border #4a2a7a
GOLD   (key insight):       text #d4a820 | bg #1a1500 | border #4a3500
ORANGE (special param):     text #f4a261 | bg #2a1e0e | border #6a4a10

FONTS:
  Headlines →  'Fraunces', serif        (700 weight, italic accent word)
  Body      →  'DM Sans', sans-serif    (300/400/500 weight)
  Technical →  'DM Mono', monospace     (400/500 weight)

LAYOUT:
  body padding: 48px
  .wrap width: 780-820px (fixed per series)
  card radius: 10-14px
  standard gap between grid panels: 10-14px
  PDF page: 1080×1350px (4:5 portrait), combined {topic}-carousel.pdf

IMAGE ARC (minimum 4, more if topic demands):
  1. Problem (red)         — what's broken / naive / costly
  2. Mechanism (blue)      — how it actually works, technically
  3. Application (green)   — real system / real code using it
  4. Decision (amber/gold) — tradeoffs + when/how to choose it
  +N. Extended sections    — additional images for dense topics (extra systems, deeper tradeoffs, etc.)

POST TEXT ARC:
  Hook → Thesis → Naive approach & its cost → Mechanism → Real system example
  → Honest tradeoffs (mandatory) → Decision framework → Closing question → Hashtags
```

---

## PART 7 — INSTRUCTIONS FOR THE LLM USING THIS SKILL

When a user gives you a technical topic and asks for "a post like the ones in [reference series]":

1. **Create the topic directory:** `$LINKEDIN_OUTPUT_BASE/{topic-slug}/` (use kebab-case slug, e.g. `weak-refs`, `h-blocking`). If `LINKEDIN_OUTPUT_BASE` is not set, use `$HOME/Downloads/linkedin/`.
2. Write the LinkedIn post text as `post-text.md` inside the topic directory, following Part 1 exactly. Do not skip the honest-tradeoffs section under any circumstance.
3. Identify the image breakdown for this specific topic using the arc in Part 3 (problem → mechanism → application → decision), adapting labels to fit the topic naturally. Default to 4 images, but scale up if the topic is dense enough to warrant more.
4. Build each HTML file using ONLY the color tokens, fonts, and component patterns defined in Part 2. Do not invent new colors, new fonts, or a light theme unless the user explicitly requests a different theme. Name them sequentially (e.g. `1-problem.html`, `2-mechanism.html`, `3-application.html`, `4-decisions.html`, plus `5-*.html`, `6-*.html` if needed) inside the topic directory.
5. Keep `.wrap` width and body padding identical across all files in the series.
6. Every image gets the standard tag pill, Fraunces headline with italicized accent word, lead paragraph, 1+ content sections built from the component patterns in Part 2, and the standard footer with correct page number (n/{{total}}) and topic title. `{{total}}` is the total number of infographics in this series.
7. **Review HTML files before rendering.** Open each HTML file in a browser or visually inspect the code for spacing/layout issues — check for missing margins between sibling div elements, overlapping content, text cutoff, or elements too close together. Verify code blocks use `white-space:pre` so lines display vertically, not wrapping inline. Fix any visual issues before proceeding.
8. **Run the render script** (`render.js`, co-located with this SKILL.md) via Bash to generate PNGs and the combined multi-page PDF (see Part 9.3 for the exact command). Resolve the path to `render.js` from this skill's directory — use absolute paths, not relative ones.
9. Deliver post text, HTML files, individual PNGs, and the combined PDF separately, with a short non-redundant summary at the end.
10. If asked to make an existing set of images "consistent," always default to converting outliers to the dark theme defined here (`#0e1621` base) — this is the canonical theme for this whole content system.
11. **Run the review checklist (Part 8)** before final delivery — verify character count, readability, SEO, engagement hooks, and technical integrity.

---

## PART 8 — REVIEW & QUALITY ASSURANCE

Before delivering any post, run through this review checklist to maximize reach and impact while preserving technical integrity.

### 8.1 Post Text Review

1. **Character count check.** Paste the post text into a character counter (or count programmatically). Confirm it stays under 3000 characters (LinkedIn's enforced limit). If over, trim ruthlessly — shorten examples, tighten code blocks, merge adjacent points.

2. **Readability scan.** Read the post aloud. Every sentence should be parseable in one breath. If you stumble, rewrite. Aim for natural conversational flow, not dense academic prose.

3. **Hook audit.** Does the first line stop a scroller? Replace generic openings ("Let's talk about X") with a question, a counterintuitive claim, or a personal struggle. The first 150 characters are the only ones visible before "see more" — make them count.

4. **Section balance check.** No single section should dominate. If the mechanism section is 3x longer than the tradeoffs section, you're over-tutorializing — cut mechanism detail and move some to the infographic.

### 8.2 SEO & Discoverability

1. **Hashtag strategy.** Use 6–8 hashtags: 2–3 broad (#SoftwareEngineering, #SystemDesign) and 4–5 specific (#Kafka, #Java, #Postgres). Broad tags maximize reach; specific tags find the right audience. Avoid hashtags with fewer than 10K followers — they contribute noise, not signal. Check follower counts by searching the hashtag on LinkedIn.

2. **Keyword prominence.** The post's core concept (e.g. "zero-copy", "B-tree", "type erasure") should appear in the first 150 characters, in at least one section header, and in the closing question. LinkedIn's algorithm uses keyword prominence for topic classification and surfacing.

3. **Specificity signals.** Include real numbers, real tool names, real error messages, and real command-line flags. LinkedIn's algorithm favors concrete, actionable content over abstract generalizations — and so do readers.

### 8.3 Engagement & Virality Mechanics (Without Selling Out)

1. **The "teach, don't preach" test.** Re-read the post. If any sentence sounds like someone trying to sound smart rather than trying to make the reader smart, rewrite it. The most viral tech posts on LinkedIn are the ones that genuinely teach — readers reshare because they want to be the person who *shared* the insight, not because they agree with a hot take.

2. **Contrarian-but-honest check.** Does the post say something mildly unpopular or at least non-obvious? The tradeoffs section is the natural place for this — "most posts stop here, but here's the part they skip." LinkedIn rewards posts that offer a new angle, not reheated documentation.

3. **Personal stake.** Does the post include a personal learning moment? "I spent three days confused about X" or "I once shipped Y and it broke in production" — specific, brief, relatable. LinkedIn posts with a personal narrative element get 2–3x higher engagement than purely expository ones. Keep it to 1–2 sentences; the topic is the star, not the author.

4. **Pacing rhythm.** The post should alternate: short punchy lines (hook, reframe, closing) with slightly longer explanatory sections (mechanism, tradeoffs). If every line is the same length, the post feels flat. LinkedIn readers scan in an F-pattern — front-load the insight in each section.

5. **Engagement question audit.** The closing question must be specific and answerable from experience — not "thoughts?" but "What's the most expensive generic abstraction in your codebase — and was it worth it?" Specific questions earn comments; vague questions get scrolled past.

6. **Shareability hook.** Ensure at least one line in the post is quotable standalone — a one-sentence insight someone could screenshot and repost. This is usually the reframe/thesis statement or the golden-rule callout. Offset it visually with an em-dash and a line break.

### 8.4 Technical Integrity Gate

1. **Specificity check.** Run every technical claim through the "can I name the syscall, the algorithm, the error message, the command, the version?" filter. Generic claims ("it's faster") are replaced with specific ones ("2.3x throughput improvement on NVMe drives, measured with `fio --rw=randread --size=4G`").

2. **Tradeoffs honesty audit.** Re-read the tradeoffs section. Does it genuinely concede real downsides, or does it undermine them with a "but" clause? A real tradeoff doesn't have a cheap recovery — if you can wave it away in the same sentence, it's not a real tradeoff. Remove the "but" clause and let the cost stand.

3. **Straw man check.** Re-read the "naive approach" section. Would someone who uses that approach feel fairly represented? If they'd call it a caricature, rewrite — straw-manning hurts credibility, and credibility is the only asset that matters for long-form educational content on LinkedIn.

4. **Standalone value check.** Confirm the post text includes at least one inline code block or ASCII diagram. The text must stand alone as a valuable read even if someone never opens the infographic carousel.

5. **Essence preservation check.** Re-read the post and ask: "Would a subject-matter expert respect this?" If any section prioritizes engagement hooks over technical accuracy, rewrite to restore the technical essence. Virality tactics make the post *visible* — technical depth makes it *valuable*. Both are required; neither substitutes for the other.

---

## PART 9 — RENDERING (PNG + PDF)

After generating the post text and HTML infographics, automatically render them to both individual PNG previews and a combined multi-page PDF. The skill includes a `render.js` script (co-located with this SKILL.md) that uses headless Chrome to render each HTML file. Resolve the render script path from this skill's directory — do not use a hardcoded absolute path.

**Key difference from PNG-only:** The PDF is generated via Puppeteer's `page.pdf()`, which preserves text as selectable vectors. When uploaded as a LinkedIn document post, the PDF carousel displays at full quality — no compression artifacts — and viewers can save it for later reference. PNGs are generated via `page.screenshot()` for quick preview.

### 9.1 Output Directory

**All generated content goes under `$LINKEDIN_OUTPUT_BASE/` (default: `$HOME/Downloads/linkedin/`), regardless of the current working directory.**

Each post gets its own subdirectory named with a topic slug. The directory is auto-created if it does not exist. Structure:

```
$LINKEDIN_OUTPUT_BASE/                 # default: $HOME/Downloads/linkedin/
├── {topic-slug}/                    # one directory per post
│   ├── post-text.md                 # the LinkedIn post text
│   ├── 1-problem.html               # HTML infographics (minimum 4)
│   ├── 2-mechanism.html
│   ├── 3-application.html
│   ├── 4-decisions.html
│   ├── 5-extended-case-study.html   # optional extra images for dense topics
│   ├── 6-deeper-tradeoffs.html      # (if needed, add more)
│   └── output/                      # rendered output
│       ├── 1-problem.png            # individual PNG previews
│       ├── 2-mechanism.png
│       ├── 3-application.png
│       ├── 4-decisions.png
│       ├── 5-extended-case-study.png
│       ├── 6-deeper-tradeoffs.png
│       └── {topic-slug}-carousel.pdf # ★ combined multi-page PDF (LinkedIn deliverable)
├── {another-topic}/
│   ├── post-text.md
│   └── ...
```

> **Portability:** Set `LINKEDIN_OUTPUT_BASE` in your environment to override the output location. If unset, defaults to `$HOME/Downloads/linkedin/`. This allows the skill to work on any machine without modifying files.

### 9.2 File Naming Convention

Use this pattern for generated files. The HTML files do NOT carry the topic slug in their name — they live inside the topic directory:

| File type | Name | Location |
|---|---|---|---|
| Post text | `post-text.md` | `$LINKEDIN_OUTPUT_BASE/{topic}/` |
| HTML files | `1-problem.html`, `2-mechanism.html`, `3-application.html`, `4-decisions.html` (plus `5-*.html`, `6-*.html` if needed for dense topics) | `$LINKEDIN_OUTPUT_BASE/{topic}/` |
| PNG files | Same names as HTML, `.png` extension | `$LINKEDIN_OUTPUT_BASE/{topic}/output/` |
| Combined PDF | `{topic-slug}-carousel.pdf` | `$LINKEDIN_OUTPUT_BASE/{topic}/output/` |

The topic slug should be a short kebab-case identifier (e.g. `weak-refs`, `h-blocking`, `zero-copy-kafka`).

### 9.3 Rendering Workflow

After writing all HTML files and post text to the topic directory, **review each HTML file for visual correctness** — verify spacing between sibling elements, check that cards/panels have proper margins, and confirm no content is clipped or overlapping. Once confirmed, run the render script via Bash:

```bash
node <path-to-this-skill-dir>/render.js \
  --topic weak-refs \
  --dir $LINKEDIN_OUTPUT_BASE/weak-refs/
```

This generates **both** individual PNG previews **and** the combined multi-page PDF. The PDF is saved as `$LINKEDIN_OUTPUT_BASE/weak-refs/output/weak-refs-carousel.pdf`.

**Format control:**

| Flag | Behavior |
|------|----------|
| `--format both` (default) | Generate individual PNGs + combined PDF |
| `--format png` | Generate only PNGs (skip PDF, faster for iteration) |
| `--format pdf` | Generate only the combined PDF (skip PNGs) |

Example — iterate quickly with PNGs only:
```bash
node <path-to-this-skill-dir>/render.js \
  --topic weak-refs --format png \
  --dir $LINKEDIN_OUTPUT_BASE/weak-refs/
```

Example — final PDF-only export:
```bash
node <path-to-this-skill-dir>/render.js \
  --topic weak-refs --format pdf \
  --dir $LINKEDIN_OUTPUT_BASE/weak-refs/
```

The `--topic <slug>` flag tells the script to output to `$LINKEDIN_OUTPUT_BASE/<slug>/output/`. Without `--topic`, output goes to the flat fallback at `$LINKEDIN_OUTPUT_BASE/output/`. When rendering the combined PDF, the file is named `{topic-slug}-carousel.pdf` (or `carousel.pdf` if no topic is provided).

### 9.4 Dependencies

The render script requires:
- **Node.js** (v18+)
- **Google Chrome or Chromium** installed on the system
- **puppeteer-core** npm package (already installed in this skill directory under `node_modules/`)
- **pdf-lib** npm package (already installed in this skill directory under `node_modules/`)

No bundled Chromium — the script uses the system Chrome binary. Set `CHROME_PATH` env var if Chrome is installed at a non-standard path.

### 9.5 Verifying Output

After running the render script, confirm the output files exist:

```bash
ls -lh $LINKEDIN_OUTPUT_BASE/{topic}/output/
```

Expected files:
- `{topic}-carousel.pdf` — must exist and show the correct page count
- `1-problem.png`, `2-mechanism.png`, etc. — individual PNGs for each slide

Verify the PDF page count matches the number of HTML files:
```bash
node -e "const {PDFDocument}=require('pdf-lib');require('fs').readFile('$LINKEDIN_OUTPUT_BASE/{topic}/output/{topic}-carousel.pdf').then(b=>PDFDocument.load(b).then(d=>console.log('Pages:',d.getPageCount())))"
```

Or simply open the PDF in any viewer to confirm all slides are present and text is crisp/selectable (not rasterized).

Deliver the post text, HTML files, individual PNGs, and the combined PDF. The user can:
- Copy the post text directly into LinkedIn
- Upload the combined PDF as a LinkedIn document post (creates the swipeable carousel)
- Use the individual PNGs for quick previews
