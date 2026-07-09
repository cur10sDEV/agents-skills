# LinkedIn Post Generator — PDF Carousel Output

Date: 2026-07-09

## Motivation

LinkedIn document posts (PDF carousels) outperform image posts by a significant margin:
- **7.00% engagement rate** vs ~5.20% for single images (Socialinsider, 1.3M posts, 2025-2026)
- **3.4x dwell time** and **2.1x more saves** vs single-image posts (Konvrt, Q1 2026)
- PDFs preserve text as vectors — no compression artifacts from LinkedIn's aggressive image compression
- LinkedIn's LiRank algorithm explicitly rewards dwell time via a "Long Dwell" binary classifier
- PDFs are saveable by viewers (one save = ~5x reach of one like)

## Scope

Modify the existing `linkedin-post-generator` skill (in `agents-skills` repo) to output a single multi-page PDF carousel alongside individual PNGs, instead of PNGs alone.

Non-goals:
- No changes to the post text format (stays as `post-text.md`)
- No changes to the HTML infographic visual design system (colors, fonts, tokens, layout)
- No changes to the `link.js` linker or any other skill

## Design

### Output structure

```
$LINKEDIN_OUTPUT_BASE/{topic}/
├── post-text.md            (unchanged)
├── 1-problem.html          (unchanged)
├── 2-mechanism.html        (unchanged)
├── ...
└── output/
    ├── 1-problem.png        (unchanged — individual PNGs still generated)
    ├── 2-mechanism.png
    ├── ...
    └── {topic}-carousel.pdf  (NEW — single multi-page PDF, all slides combined)
```

The PNG files remain for quick preview, embed in other contexts, or archival. The PDF is the primary LinkedIn deliverable — upload directly as a LinkedIn document post.

### render.js changes

The existing `renderHtmlToImage()` (screenshot → PNG) is preserved. A new function `renderAllToPdf()` is added:

1. **For each HTML file**: Open a browser page, set viewport to 1080x1350, load the HTML, generate a single-page PDF buffer via Puppeteer's `page.pdf()`
2. **Merge**: Use `pdf-lib` to concatenate all individual PDF buffers into one document
3. **Save**: Write the merged PDF to `output/{topic}-carousel.pdf`

Key characteristics:
- **Page size**: 1080 CSS px × 1350 CSS px (4:5 portrait ratio — LinkedIn's recommended format)
- **Full-page per slide**: Each HTML file becomes exactly one PDF page
- **Vector text preserved**: `page.pdf()` renders text as selectable vector text, not rasterized
- **File size**: Target <10MB total for the PDF (LinkedIn's aggressive compression kicks in over 15MB)

### File name convention

The PDF is named `{topic-slug}-carousel.pdf` (e.g., `zero-copy-kafka-carousel.pdf`). This is unambiguous when downloaded.

### Dependencies

- `pdf-lib` (npm): Lightweight pure-JS PDF manipulation for merging individual page PDFs

No other new dependencies. `puppeteer-core` is already installed.

### CLI interface changes

New `--format` flag for `render.js`:

| Value | Behavior |
|-------|----------|
| `both` (default) | Generate individual PNGs + combined PDF |
| `png` | Generate only individual PNGs (skip PDF, faster) |
| `pdf` | Generate only combined PDF (skip PNG rendering) |

The `--topic` flag is unchanged and required for PDF output (determines the output filename).

### SKILL.md changes

**Part 5 (Delivery Format):**
- Delivery instructions updated: PDF is the deliverable for LinkedIn upload, PNGs are for quick preview
- New instruction: "Run `node render.js --topic <slug> --dir <path>` to generate both PNGs and PDF"
- Output structure diagram updated

**Part 9 (PNG Rendering) → renamed to Part 9 (Rendering):**
- Title changed to "Rendering"
- Split into: 9.1 Output Directory, 9.2 File Naming Convention, 9.3 HTML Generation (unchanged from old 9.1-9.2), 9.4 Rendering Workflow (updated with both formats), 9.5 Dependencies (unchanged), 9.6 Verifying Output (check both PNGs and PDF)
- New table showing format options
- Add: check PDF page count matches HTML file count

**Quick-reference cheat sheet (Part 6):**
- Add PDF dimension info: `PDF: 1080×1350px (4:5 portrait), single combined {topic}-carousel.pdf`

### No changes to

- HTML visual design system (Part 2) — same colors, fonts, components
- Post text style guide (Part 1) — same structure, voice, formatting
- Image content formula (Part 3) — same 4+ image arc
- Delivery format rules (Part 5) — post text and visuals still separate deliverables

## Open questions / future work

- Currently the PDF page size (1080x1350) differs from the PNG viewport width (900px). The HTML wrap width (780-820px) sits centered in both — fine, but the margins are wider on PDF. If wider slides are desired, the HTML `.wrap` width can be increased in a future change. No change now for backward compatibility.
