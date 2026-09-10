// Dev-only visual verification harness. Not part of the site bundle.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'home-desktop', path: '/', width: 1440, height: 900, full: true },
  { name: 'home-hero-desktop', path: '/', width: 1440, height: 900 },
  { name: 'home-hero-laptop', path: '/', width: 1280, height: 800 },
  { name: 'home-hero-tablet', path: '/', width: 820, height: 1000 },
  { name: 'home-mobile', path: '/', width: 390, height: 844, full: true },
  { name: 'opportunityx-desktop', path: '/products/opportunityx', width: 1440, height: 900, full: true },
  { name: 'products-desktop', path: '/products', width: 1440, height: 900, full: true },
  { name: 'company-desktop', path: '/company', width: 1440, height: 900, full: true },
  { name: 'insights-desktop', path: '/insights', width: 1440, height: 900, full: true },
  { name: 'careers-desktop', path: '/careers', width: 1440, height: 900, full: true },
  { name: 'contact-desktop', path: '/contact', width: 1440, height: 900, full: true },
  { name: 'notfound-desktop', path: '/nope', width: 1440, height: 900 },
];

const browser = await chromium.launch();
const errors = [];

for (const target of targets) {
  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: 1,
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${target.name}] console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${target.name}] pageerror: ${err.message}`));

  await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' });

  if (target.full) {
    // Trigger every scroll reveal before capturing.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.7;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${target.name}.png`, fullPage: Boolean(target.full) });
  console.log(`captured ${target.name}`);
  await page.close();
}

// Mobile menu state
const menuPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await menuPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await menuPage.getByLabel('Open navigation').click();
await menuPage.waitForTimeout(300);
await menuPage.screenshot({ path: `${OUT}/mobile-menu.png` });
console.log('captured mobile-menu');
await menuPage.close();

// Products mega menu
const megaPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await megaPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await megaPage.getByRole('link', { name: 'Products' }).hover();
await megaPage.waitForTimeout(400);
await megaPage.screenshot({ path: `${OUT}/mega-menu.png`, clip: { x: 0, y: 0, width: 1440, height: 520 } });
console.log('captured mega-menu');
await megaPage.close();

await browser.close();

if (errors.length) {
  console.log('\n--- RUNTIME ERRORS ---');
  for (const e of errors) console.log(e);
  process.exitCode = 1;
} else {
  console.log('\nNo console or page errors.');
}
