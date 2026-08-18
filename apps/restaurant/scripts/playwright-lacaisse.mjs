// Drive backoffice.lacaisse.ma with Playwright; capture every API call,
// find the dashboard endpoint, and dump the JSON it returns for the date range
// shown in the user's screenshot (04/10/2025 → 04/27/2026).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

// Log every request and response (JSON only) so we can see the dashboard endpoint
const calls = [];
page.on('response', async (resp) => {
  const url = resp.url();
  const ct = resp.headers()['content-type'] || '';
  if (!/lacaisse\.ma|caisse\.ma/.test(url)) return;
  if (url.includes('/_next/') || url.includes('/static/') || url.includes('crisp.chat')) return;
  let body = null;
  let reqBody = null;
  let reqHeaders = null;
  try {
    if (ct.includes('json')) body = await resp.json();
    else if (ct.includes('text') || ct.includes('xml')) body = (await resp.text()).slice(0, 800);
  } catch {}
  try { reqBody = resp.request().postData(); } catch {}
  try { reqHeaders = resp.request().headers(); } catch {}
  calls.push({ method: resp.request().method(), status: resp.status(), url, ct, reqBody, reqHeaders, body });
});

console.log('1) Opening login page');
await page.goto('https://backoffice.lacaisse.ma/login', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
console.log('   url:', page.url());

// Helper to wait until at least one new request matches a predicate, with a window after
const waitFor = async (predicate, ms = 8000) => {
  const before = calls.length;
  await page.waitForTimeout(ms);
  return calls.slice(before).filter(predicate);
};

// Try filling the login form. Selectors are unknown, so try common ones.
const fillEmail = async () => {
  for (const sel of ['input[type="email"]', 'input[name="email"]', 'input[name="login"]', 'input[placeholder*="mail" i]', 'input[placeholder*="login" i]']) {
    const el = await page.$(sel);
    if (el) { await el.fill(env.LACAISSE_LOGIN); return sel; }
  }
  return null;
};
const fillPwd = async () => {
  for (const sel of ['input[type="password"]', 'input[name="password"]']) {
    const el = await page.$(sel);
    if (el) { await el.fill(env.LACAISSE_PASSWORD); return sel; }
  }
  return null;
};

const e1 = await fillEmail(); console.log('   email field:', e1);
const e2 = await fillPwd(); console.log('   password field:', e2);

if (e1 && e2) {
  // Submit by Enter or button
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.keyboard.press('Enter'),
  ]);
  await page.waitForTimeout(3000);
  console.log('2) After login, url:', page.url());
} else {
  console.log('2) Could not find login form; current page snippet:');
  const html = await page.content();
  console.log(html.slice(0, 1500));
}

// Take screenshot for sanity
await page.screenshot({ path: '/tmp/lc_after_login.png', fullPage: false });

// menuOption page: select Ville (Casablanca), then Point de Vente (EPICTETE), then click "Tableau de bord"
console.log('3) On /menuOption — selecting city and PDV');
await page.waitForTimeout(2500);

// React-select uses a clickable text container. Click Ville dropdown, type Casablanca, hit Enter.
const villeInput = page.locator('text=Sélectionnez une ville').first();
await villeInput.click({ timeout: 8000 }).catch(e => console.log('   ville click err:', e.message));
await page.waitForTimeout(800);
await page.keyboard.type('Casablanca', { delay: 30 });
await page.waitForTimeout(800);
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);

const pdvInput = page.locator('text=Sélectionnez un point de vente').first();
await pdvInput.click({ timeout: 8000 }).catch(e => console.log('   pdv click err:', e.message));
await page.waitForTimeout(800);
await page.keyboard.type('EPICTETE', { delay: 30 });
await page.waitForTimeout(800);
await page.keyboard.press('Enter');
await page.waitForTimeout(2000);

await page.screenshot({ path: '/tmp/lc_menuoption.png', fullPage: false });

console.log('4) Clicking "Tableau de bord" tile');
const tile = page.locator('text=Tableau de bord').first();
await tile.click({ timeout: 8000 }).catch(e => console.log('   tile click err:', e.message));
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(8000);
console.log('   url:', page.url());

// If we're on dashboard, set date range. Try setting via UI date inputs.
const dateInputs = await page.locator('input[type="date"], input[placeholder*="date" i]').all();
console.log('   date inputs found:', dateInputs.length);
if (dateInputs.length >= 2) {
  await dateInputs[0].fill('2025-10-04').catch(() => {});
  await dateInputs[1].fill('2026-04-27').catch(() => {});
  // Look for a "Valider" button
  const valider = page.locator('button:has-text("Valider")').first();
  await valider.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(8000);
}

await page.screenshot({ path: '/tmp/lc_dashboard.png', fullPage: true });

// Save calls
writeFileSync('/tmp/lc_calls.json', JSON.stringify(calls, null, 2));
console.log('\n=== Captured calls ===');
const seen = new Set();
for (const c of calls) {
  const k = c.method + ' ' + c.url.split('?')[0];
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`${c.method} ${c.status} ${c.url.slice(0, 200)}`);
}
console.log(`\nTotal calls captured: ${calls.length}`);
console.log('Screenshots: /tmp/lc_after_login.png, /tmp/lc_dashboard.png');
console.log('Full call log: /tmp/lc_calls.json');

await browser.close();
