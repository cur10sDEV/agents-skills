#!/usr/bin/env node

const puppeteer = require('puppeteer-core');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PAGE_WIDTH = 900;
const PADDING = 40;
const OUTPUT_FORMAT = 'png';
const DEVICE_SCALE_FACTOR = 2;

const PDF_PAGE_WIDTH = 1080;
const PDF_PAGE_HEIGHT = 1350;
const PDF_PADDING = 48;

const BASE_DIR = process.env.LINKEDIN_OUTPUT_BASE
  || path.join(os.homedir(), 'Downloads', 'linkedin');

async function renderHtmlToImage(htmlPath, outputPath, browser) {
  const absoluteHtmlPath = path.resolve(htmlPath);
  const fileUrl = `file://${absoluteHtmlPath}`;

  const page = await browser.newPage();
  await page.setViewport({
    width: PAGE_WIDTH,
    height: 800,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate((padding) => {
    // Set base text color so unwrapped text is readable on dark background
    document.body.style.color = '#f0ece4';
    document.body.style.minHeight = 'auto';
    document.body.style.height = 'auto';
    document.body.style.padding = `${padding}px`;
    document.body.style.boxSizing = 'border-box';

    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.minHeight === '100vh') {
        el.style.minHeight = 'auto';
      }
    });

    document.documentElement.style.height = 'auto';
    document.documentElement.style.minHeight = 'auto';
  }, PADDING);

  await page.screenshot({
    path: outputPath,
    type: OUTPUT_FORMAT,
    fullPage: true,
  });

  await page.close();
  console.log(`\u2713 ${path.basename(outputPath)}`);
}

async function renderHtmlToPdfBuffer(htmlPath, browser) {
  const absoluteHtmlPath = path.resolve(htmlPath);
  const fileUrl = `file://${absoluteHtmlPath}`;

  const page = await browser.newPage();
  await page.setViewport({
    width: PDF_PAGE_WIDTH,
    height: PDF_PAGE_HEIGHT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate((padding) => {
    document.body.style.color = '#f0ece4';
    document.body.style.minHeight = 'auto';
    document.body.style.height = 'auto';
    document.body.style.padding = `${padding}px`;
    document.body.style.boxSizing = 'border-box';

    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.minHeight === '100vh') {
        el.style.minHeight = 'auto';
      }
    });

    document.documentElement.style.height = 'auto';
    document.documentElement.style.minHeight = 'auto';
  }, PDF_PADDING);

  // Resize viewport to full content height so nothing gets clipped in PDF
  const contentHeight = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight
    );
  });

  await page.setViewport({
    width: PDF_PAGE_WIDTH,
    height: Math.max(contentHeight, PDF_PAGE_HEIGHT),
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });

  const pdfHeight = Math.max(contentHeight, PDF_PAGE_HEIGHT);

  const pdfBuffer = await page.pdf({
    width: `${PDF_PAGE_WIDTH}px`,
    height: `${pdfHeight}px`,
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });

  await page.close();
  return pdfBuffer;
}

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

function printHelp() {
  console.log(`Usage:
  node render.js --topic <slug> <file1.html> [file2.html ...]
  node render.js --topic <slug> --dir <directory>
  node render.js <file1.html> [file2.html ...]

Options:
  --topic <slug>    Post topic slug (creates $LINKEDIN_OUTPUT_BASE/<slug>/output/)
  --dir <directory> Render all .html files in a directory
  --outdir <path>   Override output directory (ignores --topic)
  --format <type>   Output format: 'both' (default), 'png', or 'pdf'
  --help            Show this message

Environment:
  LINKEDIN_OUTPUT_BASE  Base output directory (default: ${BASE_DIR})

Output structure (with --topic):
  $LINKEDIN_OUTPUT_BASE/<slug>/
  ├── 1-problem.html
  ├── 2-mechanism.html
  └── output/
      ├── 1-problem.png
      ├── 2-mechanism.png
      └── <slug>-carousel.pdf

Without --topic (flat fallback):
  $LINKEDIN_OUTPUT_BASE/output/

Examples:
  node render.js --topic weak-refs --dir /path/to/html/files/
  node render.js --topic weak-refs /path/to/1-problem.html /path/to/2-mechanism.html
  node render.js --topic weak-refs --format pdf --dir /path/to/html/files/
  node render.js /path/to/files/*.html

Formats:
  both (default)  Generate individual PNGs + combined PDF
  png             Generate only individual PNGs
  pdf             Generate only combined multi-page PDF

Chrome:
  Set CHROME_PATH env var to override auto-detected Chrome path.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.length === 0) {
    printHelp();
    process.exit(1);
  }

  // Parse flags
  let outputDir = null;
  let topic = null;
  let format = 'both';
  const filteredArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[++i];
    } else if (args[i] === '--outdir' && args[i + 1]) {
      outputDir = path.resolve(args[++i]);
    } else if (args[i] === '--format' && args[i + 1]) {
      format = args[++i];
    } else {
      filteredArgs.push(args[i]);
    }
  }

  // Resolve output directory
  if (!outputDir) {
    if (topic) {
      outputDir = path.join(BASE_DIR, topic, 'output');
    } else {
      outputDir = path.join(BASE_DIR, 'output');
    }
  }

  // Auto-create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find Chrome executable
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  const chromePaths = isMac
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ]
    : isWin
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ]
    : [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
      ];

  let chromePath = null;
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      chromePath = p;
      break;
    }
  }

  chromePath = process.env.CHROME_PATH || chromePath;

  if (!chromePath) {
    console.error('Error: Chrome/Chromium not found. Install google-chrome or set CHROME_PATH env var.');
    process.exit(1);
  }

  // Collect HTML files
  let htmlFiles = [];
  if (filteredArgs[0] === '--dir') {
    const dir = path.resolve(filteredArgs[1] || '.');
    htmlFiles = fs.readdirSync(dir)
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(dir, f));
  } else {
    htmlFiles = filteredArgs.map(f => path.resolve(f));
  }

  // Filter to only existing .html files
  htmlFiles = htmlFiles.filter(f => {
    if (fs.existsSync(f) && f.endsWith('.html')) return true;
    console.warn(`Skipping ${f} (not found or not .html)`);
    return false;
  });

  if (htmlFiles.length === 0) {
    console.error('No valid HTML files found.');
    process.exit(1);
  }

  console.log(`Using Chrome: ${chromePath}`);
  console.log(`Output dir:  ${outputDir}`);
  console.log(`Operations:  ${format === 'both' ? 'PNG + PDF' : format === 'png' ? 'PNG only' : 'PDF only'}`);
  console.log(`Files:       ${htmlFiles.length} slide(s)\n`);

  const browser = await puppeteer.launch({
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
    // PNG rendering
    if (format !== 'pdf') {
      console.log('Rendering PNGs...');
      for (const htmlFile of htmlFiles) {
        const baseName = path.basename(htmlFile, '.html');
        const outputPath = path.join(outputDir, `${baseName}.png`);
        try {
          await renderHtmlToImage(htmlFile, outputPath, browser);
        } catch (err) {
          console.error(`\u2717 ${path.basename(htmlFile)}: ${err.message}`);
        }
      }
    }

    // PDF rendering
    if (format !== 'png') {
      console.log(`\nRendering PDF...`);
      const pdfBuffers = [];
      for (const htmlFile of htmlFiles) {
        const baseName = path.basename(htmlFile, '.html');
        process.stdout.write(`  ${baseName}... `);
        try {
          const buffer = await renderHtmlToPdfBuffer(htmlFile, browser);
          pdfBuffers.push(buffer);
          console.log('\u2713');
        } catch (err) {
          console.error(`\u2717 ${path.basename(htmlFile)}: ${err.message}`);
        }
      }

      if (pdfBuffers.length > 0) {
        const mergedPdfBuffer = await mergePdfBuffers(pdfBuffers);
        const pdfFileName = topic
          ? `${topic}-carousel.pdf`
          : 'carousel.pdf';
        const pdfPath = path.join(outputDir, pdfFileName);
        fs.writeFileSync(pdfPath, mergedPdfBuffer);
        console.log(`\n\u2713 PDF saved: ${pdfPath} (${pdfBuffers.length} page(s))`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. Output in ${outputDir}/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
