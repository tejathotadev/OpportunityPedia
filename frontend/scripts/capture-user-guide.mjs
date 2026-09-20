/**
 * One-off screenshots for USER_GUIDE (no GIFs).
 * Run: node scripts/capture-user-guide.mjs
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../../docs/user-guide')
const base = process.env.GUIDE_BASE_URL || 'http://127.0.0.1:5173'
const email = process.env.GUIDE_EMAIL || 'demo@opportunitypedia.com'
const password = process.env.GUIDE_PASSWORD || ''

async function shot(page, name) {
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: false })
  console.log('wrote', file)
}

async function main() {
  if (!password) {
    console.error('Set GUIDE_PASSWORD (demo account password) before capturing.')
    process.exit(1)
  }
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })

  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#login-email', { timeout: 15000 })
  await page.waitForTimeout(800)
  await shot(page, '01-login.png')

  await page.fill('#login-email', email)
  await page.fill('#login-password', password)
  await Promise.all([
    page.waitForURL(/\/app\//, { timeout: 45000 }),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(2500)
  await shot(page, '02-overview.png')

  await page.goto(`${base}/app/opportunities`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await shot(page, '03-opportunities.png')

  await page.goto(`${base}/app/vendors`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await shot(page, '04-vendors.png')

  await page.goto(`${base}/app/settings?section=email`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await shot(page, '05-settings-email.png')

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
