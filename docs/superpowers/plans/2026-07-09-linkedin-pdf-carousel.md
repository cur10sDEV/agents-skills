# LinkedIn PDF Carousel Output — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add combined multi-page PDF (4:5 portrait) output to the LinkedIn Post Generator render pipeline, alongside existing PNG output.

**Architecture:** Add `page.pdf()` rendering path in `render.js` using Puppeteer's built-in PDF output, merge per-slide PDFs into one document with `pdf-lib`, update SKILL.md delivery and rendering sections to reflect PDF-first workflow.

**Tech Stack:** Node.js, puppeteer-core (existing), pdf-lib (new)

---

### Task 1: Install pdf-lib dependency

**Files:**
- Modify: `linkedin-post-generator/package.json`

- [ ] **Step 1: Add pdf-lib to package.json**

```json
{
  "dependencies": {
    "puppeteer-core": "^25.3.0",
    "pdf-lib": "^1.17.1"
  }
}
```

- [ ] **Step 2: Install dependency**

Run: `npm install` in `linkedin-post-generator/`
Expected output: `added 1 package` (pdf-lib has zero sub-dependencies)

- [ ] **Step 3: Commit**

```bash
git add linkedin-post-generator/package.json linkedin-post-generator/package-lock.json
git commit -m "feat: add pdf-lib for PDF merging"
```

---

### Task 2: Add PDF generation + merging to render.js

**Files:**
- Modify: `linkedin-post-generator/render.js`

- [ ] **Step 1: Add `pdf-lib` require at top of file**

After `const puppeteer = require('puppeteer-core');`, add:

```javascript
const { PDFDocument } = require('pdf-lib');
```

- [ ] **Step 2: Add `--format` flag parsing in `main()`**

In the `// Parse flags` section, add after the `--topic` / `--outdir` parsing:

```javascript
if (args[i] === '--format' && args[i + 1]) {
  format = args[++i];
}
```

And add a default at the top of `main()`:

```javascript
let format = 'both';
```

- [ ] **Step 3: Add `renderHtmlToPdfBuffer()` function**

After the existing `renderHtmlToImage()` function (before `printHelp()`), add:

```javascript
async function renderHtmlToPdfBuffer(htmlPath, browser) {
  const absoluteHtmlPath = path.resolve(htmlPath);
  const fileUrl = `file://${absoluteHtmlPath}`;

  const page = await browser.newPage();
  await page.setViewport({
    width: 1080,
    height: 1350,
    deviceScaleFactor: 2,
  });

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  // Set body styling for PDF rendering
  await page.evaluate(() => {
    document.body.style.color = '#f0ece4';
    document.body.style.minHeight = 'auto';
    document.body.style.height = 'auto';
    document.body.style.boxSizing = 'border-box';
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.minHeight === '100vh') {
        el.style.minHeight = 'auto';
      }
    });
    document.documentElement.style.height = 'auto';
    document.documentElement.style.minHeight = 'auto';
  });

  const pdfBuffer = await page.pdf({
    width: '1080px',
    height: '1350px',
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });

  await page.close();
  return pdfBuffer;
}
```

- [ ] **Step 4: Add `mergePdfBuffers()` function**

After `renderHtmlToPdfBuffer()`, add:

```javascript
async function mergePdfBuffers(buffers) {
  const mergedPdf = await PDFDocument.create();
  for (const buffer of buffers) {
    const pdf = await PDFDocument.load(buffer);
    const pageIndices = pdf.getPageIndices();
    const pages = await mergedPdf.copyPages(pdf, pageIndices);
    for (const page of pages) {
      mergedPdf.addPage(page);
    }
  }
  return await mergedPdf.save();
}
```

- [ ] **Step 5: Add PDF rendering pipeline in `main()` after the PNG loop**

After the existing PNG rendering loop and `await browser.close();`, add PDF rendering block before the final console.log:

```javascript
// PDF rendering pipeline
if (format === 'both' || format === 'pdf') {
  console.log(`\nRendering PDF...`);
  const browser2 = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  try {
    const pdfBuffers = [];
    for (const htmlFile of htmlFiles) {
      const baseName = path.basename(htmlFile, '.html');
      process.stdout.write(`  Rendering ${baseName}... `);
      try {
        const buffer = await renderHtmlToPdfBuffer(htmlFile, browser2);
        pdfBuffers.push(buffer);
        console.log('✓');
      } catch (err) {
        console.error(`✗ ${err.message}`);
      }
    }

    if (pdfBuffers.length > 0) {
      const mergedPdfBuffer = await mergePdfBuffers(pdfBuffers);
      const pdfFileName = topic
        ? `${topic}-carousel.pdf`
        : 'carousel.pdf';
      const pdfPath = path.join(outputDir, pdfFileName);
      fs.writeFileSync(pdfPath, mergedPdfBuffer);
      console.log(`\n✓ PDF saved: ${pdfPath} (${pdfBuffers.length} page(s))`);
    }
  } finally {
    await browser2.close();
  }
}
```

- [ ] **Step 6: Update help text with `--format` flag**

In `printHelp()`, add after the existing options:

```
  --format <type>   Output format: 'both' (default), 'png', or 'pdf'
```

- [ ] **Step 7: Update the "Usage" and "Examples" sections in `printHelp()` to show --format**

Replace the examples section in printHelp() with:

```
Examples:
  node render.js --topic weak-refs --dir /path/to/html/files/
  node render.js --topic weak-refs /path/to/1-problem.html /path/to/2-mechanism.html
  node render.js --topic weak-refs --format pdf --dir /path/to/html/files/
  node render.js /path/to/files/*.html

Formats:
  both (default)  Generate individual PNGs + combined PDF
  png             Generate only individual PNGs
  pdf             Generate only combined multi-page PDF
```

- [ ] **Step 8: Commit**

```bash
git add linkedin-post-generator/render.js
git commit -m "feat: add multi-page PDF rendering with pdf-lib merging"
```

---

### Task 3: Update SKILL.md for PDF-first workflow

**Files:**
- Modify: `linkedin-post-generator/SKILL.md`

- [ ] **Step 1: Update Part 5 — Delivery Format (instruction 5)**

Replace old instruction 5 ("Then run the render script...") with:

> 5. **Then run the render script** (see Part 9) to generate both individual PNG previews and the combined multi-page PDF. The PDF (`{topic-slug}-carousel.pdf`) is the primary LinkedIn deliverable — upload it directly as a LinkedIn document post. The PNG files are for quick preview only.

- [ ] **Step 2: Update Part 5 — Delivery Format (instruction 8)**

Replace old instruction 8 ("Close each delivery...") with (keep the same but add PDF mention):

> 8. Close each delivery with a short summary of what each image covers (1–2 lines per image), a note on the total image count, and confirmation that the combined PDF is ready for upload.

- [ ] **Step 3: Update Part 5 — Delivery Format (instruction 9)**

Replace old instruction 9 (rendering) with:

> 9. After generating the HTML files, run: `node <skill-dir>/render.js --topic <slug> --dir <output-dir>/` to produce both PNGs and the combined PDF.

- [ ] **Step 4: Update Part 6 — Quick-Reference Cheat Sheet (LAYOUT section)**

Add to the LAYOUT section:

```
PDF: 1080×1350px (4:5 portrait), combined {topic}-carousel.pdf
```

- [ ] **Step 5: Update Part 9 title**

Change "## PART 9 — PNG RENDERING (AUTOMATED)" to:

```
## PART 9 — RENDERING (PNG + PDF)
```

- [ ] **Step 6: Update Part 9.1 — Output Directory**

Update the output structure diagram to include the PDF:

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
│   └── output/
│       ├── 1-problem.png            # individual PNG previews
│       ├── 2-mechanism.png
│       ├── 3-application.png
│       ├── 4-application.png
│       └── {topic}-carousel.pdf     # ★ combined multi-page PDF (LinkedIn deliverable)
```

- [ ] **Step 7: Update Part 9.2 — File Naming Convention**

Add PDF to the table:

```
| Combined PDF | `{topic-slug}-carousel.pdf` | `$LINKEDIN_OUTPUT_BASE/{topic}/output/` |
```

- [ ] **Step 8: Update Part 9.3 — Rendering Workflow**

Replace the entire rendering workflow section with:

> ### 9.3 Rendering Workflow
>
> After writing all HTML files and post text to the topic directory, review each HTML file for visual correctness — verify spacing between sibling elements, check that cards/panels have proper margins, and confirm no content is clipped or overlapping. Once confirmed, run the render script via Bash:
>
> ```bash
> node <path-to-this-skill-dir>/render.js \
>   --topic weak-refs \
>   --dir $LINKEDIN_OUTPUT_BASE/weak-refs/
> ```
>
> This generates **both** individual PNG previews **and** the combined multi-page PDF. The PDF is saved as `$LINKEDIN_OUTPUT_BASE/weak-refs/output/weak-refs-carousel.pdf`.
>
> **Format control:**
>
> | Flag | Behavior |
> |------|----------|
> | `--format both` (default) | Generate individual PNGs + combined PDF |
> | `--format png` | Generate only PNGs (skip PDF, faster for iteration) |
> | `--format pdf` | Generate only the combined PDF (skip PNGs) |
>
> Example — iterate quickly with PNGs only:
> ```bash
> node <path-to-this-skill-dir>/render.js \
>   --topic weak-refs --format png \
>   --dir $LINKEDIN_OUTPUT_BASE/weak-refs/
> ```
>
> Example — final PDF-only export:
> ```bash
> node <path-to-this-skill-dir>/render.js \
>   --topic weak-refs --format pdf \
>   --dir $LINKEDIN_OUTPUT_BASE/weak-refs/
> ```

- [ ] **Step 9: Update Part 9.5 — Verifying Output**

Replace the verifying output section with:

> ### 9.5 Verifying Output
>
> After running the render script, confirm the output files exist:
>
> ```bash
> ls -lh $LINKEDIN_OUTPUT_BASE/{topic}/output/
> ```
>
> Expected files:
> - `{topic}-carousel.pdf` — must exist and show the correct page count
> - `1-problem.png`, `2-mechanism.png`, etc. — individual PNGs for each slide
>
> Verify the PDF page count matches the number of HTML files:
> ```bash
> node -e "const {PDFDocument}=require('pdf-lib');require('fs').readFile('$LINKEDIN_OUTPUT_BASE/{topic}/output/{topic}-carousel.pdf').then(b=>PDFDocument.load(b).then(d=>console.log('Pages:',d.getPageCount())))"
> ```
>
> Or simply open the PDF in any viewer to confirm all slides are present and text is crisp/selectable (not rasterized).
>
> Deliver the post text, HTML files, PNGs, and the combined PDF. The user can:
> - Copy the post text directly into LinkedIn
> - Upload the PDF as a LinkedIn document post (creates the swipeable carousel)
> - Use the individual PNGs for quick previews

- [ ] **Step 10: Commit**

```bash
git add linkedin-post-generator/SKILL.md
git commit -m "feat: update SKILL.md for PDF carousel output workflow"
```

---

### Task 4: Self-review plan against spec

- [ ] **Step 1: Verify spec coverage**

Check each spec requirement against tasks:

| Spec requirement | Task(s) covering it |
|---|---|
| New `renderHtmlToPdfBuffer()` function | Task 2, Step 3 |
| New `mergePdfBuffers()` function | Task 2, Step 4 |
| `--format` flag (both/png/pdf) | Task 2, Step 2 + Step 5 |
| PDF saved as `{topic}-carousel.pdf` | Task 2, Step 5 |
| pdf-lib dependency | Task 1 |
| SKILL.md Part 5 updates | Task 3, Steps 1-3 |
| SKILL.md Part 6 update | Task 3, Step 4 |
| SKILL.md Part 9 rewrite | Task 3, Steps 5-9 |
| Both PNG+PDF default | Task 2, Step 5 (format === 'both') |
| Backward compat (--format png) | Task 2, Step 2 + Step 5 |
| Vector text preserved via page.pdf() | Task 2, Step 3 (uses page.pdf()) |
| 1080x1350 page size | Task 2, Step 3 (width/height) |

- [ ] **Step 2: Placeholder scan**

Search plan for: "TBD", "TODO", "implement later", "fill in details", "add appropriate". None found.

- [ ] **Step 3: Type consistency check**

All function names, file paths, and variable names are consistent across tasks. The `renderHtmlToPdfBuffer()` call in Task 2 Step 5 matches the definition in Step 3. The PDF filename pattern `{topic}-carousel.pdf` is consistent everywhere.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-07-09-linkedin-pdf-carousel.md
git commit -m "docs: add implementation plan for PDF carousel output"
```
