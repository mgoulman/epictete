import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 700 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/home_360.png', fullPage: false });
const burgerInfo = await page.evaluate(() => {
  const b = document.querySelector('[aria-controls="mobile-menu"]');
  if (!b) return { burger: null };
  const r = b.getBoundingClientRect();
  const cs = getComputedStyle(b);
  return {
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    visible: cs.visibility === 'visible' && cs.display !== 'none' && cs.opacity !== '0',
    zIndex: cs.zIndex,
    parent: b.parentElement?.tagName,
  };
});
console.log(JSON.stringify(burgerInfo, null, 2));
await browser.close();
