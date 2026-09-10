// Dev-only: capture a route in viewport-sized slices so sections are legible.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const ROUTE = process.env.ROUTE ?? '/';
const NAME = process.env.NAME ?? 'home';
const WIDTH = Number(process.env.WIDTH ?? 1440);
const HEIGHT = Number(process.env.HEIGHT ?? 900);
const OUT = `shots/${NAME}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });

// Warm every reveal first.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.6;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 80));
  }
});
await page.waitForTimeout(300);

const total = await page.evaluate(() => document.body.scrollHeight);
const step = HEIGHT - 60;
let i = 0;

for (let y = 0; y < total; y += step) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}.png` });
  i += 1;
}

console.log(`captured ${i} slices of ${NAME} (${total}px tall)`);
await browser.close();
