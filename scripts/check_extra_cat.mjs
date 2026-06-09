import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Find sections for secondi + risotto and check if "Escalope" appears in both
const result = await page.evaluate(() => {
  const sections = Array.from(document.querySelectorAll('section[id]')).map(s => {
    return {
      id: s.id,
      hasEscalope: s.textContent?.includes('Escalope alla Milanese') ?? false,
      title: s.querySelector('h2,h3')?.textContent?.trim().slice(0, 40),
    };
  });
  return sections;
});
console.log(JSON.stringify(result, null, 2));

await browser.close();
