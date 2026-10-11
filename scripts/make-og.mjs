// Renders scripts/og-image.html to public/og.png (1200×630). Run: npm run og
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const html = new URL('./og-image.html', import.meta.url);
const out = fileURLToPath(new URL('../public/og.png', import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(html.href);
await page.screenshot({ path: out });
await browser.close();
console.log(`Wrote ${out}`);
