import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
const data = await page.evaluate(() => {
  const get = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { width: r.width, scrollWidth: el.scrollWidth, overflowX: cs.overflowX, position: cs.position };
  };
  return {
    html: get('html'),
    body: get('body'),
    headerInner: get('header > div'),
    location: get('#location'),
    locationInner: get('#location > div'),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
