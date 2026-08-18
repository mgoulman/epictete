import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const item = page.locator('h3:has-text("Cannelloni")').first();
await item.click();
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('div'));
  const modal = all.find(d => d.className && typeof d.className === 'string' && d.className.includes('shadow-2xl') && d.className.includes('z-50'));
  if (!modal) return { found: false, allShadow2xl: all.filter(d=>d.className&&typeof d.className==='string'&&d.className.includes('shadow-2xl')).length };
  const r = modal.getBoundingClientRect();
  const cs = getComputedStyle(modal);
  return {
    found: true,
    rect: { top: r.top, bottom: r.bottom, height: r.height },
    classNames: modal.className.slice(0, 400),
    computedMaxHeight: cs.maxHeight,
    computedTop: cs.top, computedBottom: cs.bottom,
    transform: cs.transform,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
