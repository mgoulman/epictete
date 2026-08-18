import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto('http://localhost:3000/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

async function search(q) {
  await page.fill('input[type="text"]', q);
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const cards = document.querySelectorAll('section[id^="category-"] h3');
    return Array.from(cards).map(c => c.textContent?.trim()).filter(Boolean);
  });
}

console.log('search "pizza":', (await search('pizza')).slice(0, 30));
console.log('search "fromage":', (await search('fromage')).slice(0, 30));
console.log('search "espresso":', (await search('espresso')).slice(0, 10));
console.log('search "epictete":', (await search('epictete')).slice(0, 10));
await browser.close();
