import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const w of [360, 375, 390, 412]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const burger = document.querySelector('[aria-controls="mobile-menu"]');
    if (!burger) return { burger: null };
    const r = burger.getBoundingClientRect();
    return { burger: { x: r.x, right: r.right, w: r.width, visible: r.width > 0 } };
  });
  console.log(`width=${w}:`, JSON.stringify(info));
  await ctx.close();
}
await browser.close();
