import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
// Find and click an actual menu item — items are inside MenuSection
const item = await page.locator('h3:has-text("Cannelloni")').first();
await item.scrollIntoViewIfNeeded();
await item.click();
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/modal.png' });
console.log('clicked');
await browser.close();
