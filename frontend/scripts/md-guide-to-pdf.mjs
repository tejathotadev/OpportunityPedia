/**
 * Convert USER_GUIDE.md → USER_GUIDE.pdf with embedded images.
 * Run from repo root: node frontend/scripts/md-guide-to-pdf.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { marked } from 'marked'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const mdPath = path.join(root, 'USER_GUIDE.md')
const outPdf = path.join(root, 'USER_GUIDE.pdf')

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toFileUrl(absPath) {
  const normalized = absPath.replace(/\\/g, '/')
  return 'file:///' + encodeURI(normalized)
}

async function main() {
  const md = fs.readFileSync(mdPath, 'utf8')
  // Resolve relative image paths to absolute file:// URLs for Chromium.
  const rewritten = md.replace(
    /!\[([^\]]*)\]\((docs\/user-guide\/[^)]+)\)/g,
    (_m, alt, rel) => {
      const abs = path.join(root, rel)
      const buf = fs.readFileSync(abs)
      const b64 = buf.toString('base64')
      const mime = 'image/png'
      return `![${escapeHtml(alt)}](data:${mime};base64,${b64})`
    },
  )

  const body = await marked.parse(rewritten)
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OpportunityPedia — Quick Start Guide</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #111827;
      line-height: 1.5;
      font-size: 11pt;
      max-width: 100%;
    }
    h1 { font-size: 22pt; color: #12372a; margin: 0 0 12px; }
    h2 { font-size: 14pt; color: #12372a; margin: 22px 0 8px; border-bottom: 1px solid #e7e9e4; padding-bottom: 4px; }
    h3 { font-size: 12pt; color: #12372a; margin: 16px 0 6px; }
    p, li { margin: 6px 0; }
    ul, ol { padding-left: 1.2em; }
    blockquote {
      margin: 10px 0;
      padding: 8px 12px;
      border-left: 3px solid #21805d;
      background: #f7f7f2;
      color: #475569;
    }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 10.5pt; }
    th, td { border: 1px solid #e7e9e4; padding: 6px 8px; text-align: left; }
    th { background: #f0f1ed; }
    img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 10px 0 14px;
      border: 1px solid #e7e9e4;
      border-radius: 6px;
    }
    hr { border: none; border-top: 1px solid #e7e9e4; margin: 18px 0; }
    em { color: #475569; }
  </style>
</head>
<body>
${body}
</body>
</html>`

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle' })
  // Wait for images to load from file://
  await page.evaluate(async () => {
    const imgs = Array.from(document.images)
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve
                img.onerror = resolve
              }),
      ),
    )
  })
  await page.pdf({
    path: outPdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
  })
  await browser.close()
  const size = fs.statSync(outPdf).size
  console.log(`wrote ${outPdf} (${size} bytes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
