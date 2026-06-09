import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
// Click a pasta item that likely has customizations
const item = page.locator('h3:has-text("Carbonara"), h3:has-text("Spaghetti"), h3:has-text("Tagliatelle"), h3:has-text("Pasta")').first();
await item.scrollIntoViewIfNeeded();
await item.click();
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/modal_long.png' });
const modalH = await page.evaluate(() => {
  const m = document.querySelector('[class*="bg-card"][class*="rounded-2xl"]');
  if (!m) return null;
  const r = m.getBoundingClientRect();
  const inner = m.querySelector('[class*="overflow-y-auto"]');
  return {
    modalHeight: r.height,
    modalTop: r.top,
    modalBottom: r.bottom,
    viewport: window.innerHeight,
    scrollable: inner ? { scrollHeight: inner.scrollHeight, clientHeight: inner.clientHeight } : null,
  };
});
console.log(JSON.stringify(modalH, null, 2));
await browser.close();
