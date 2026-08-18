import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

const offenders = await page.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  const walk = (el) => {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 0.5) {
      out.push({
        tag: el.tagName,
        right: r.right,
        width: r.width,
        text: (el.textContent || '').slice(0, 60).replace(/\s+/g, ' '),
        className: el.className?.toString?.().slice(0, 100) || '',
      });
    }
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  // dedupe: keep elements whose parent doesn't already overflow more
  return out.slice(0, 25);
});
console.log(JSON.stringify(offenders, null, 2));
await browser.close();
