import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3000/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });

// Inspect the header
const headerInfo = await page.evaluate(() => {
  const header = document.querySelector('header');
  if (!header) return { error: 'no header found' };
  const buttons = Array.from(header.querySelectorAll('button')).map(b => ({
    text: b.textContent?.trim() || '',
    aria: b.getAttribute('aria-label') || '',
    className: b.className,
    rect: b.getBoundingClientRect().toJSON(),
    visible: b.offsetWidth > 0 && b.offsetHeight > 0,
    display: getComputedStyle(b).display,
  }));
  return {
    headerRect: header.getBoundingClientRect().toJSON(),
    headerClasses: header.className,
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    buttons,
  };
});
console.log(JSON.stringify(headerInfo, null, 2));
await browser.close();
