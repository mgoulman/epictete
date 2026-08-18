import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env.local','utf8').split('\n').filter(l=>l&&!l.startsWith('#')&&l.includes('='))
  .map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()];})
);
const a = await (await fetch('https://apiv2.lacaisse.ma/api/v1/auth',{
  method:'POST', headers:{'Content-Type':'application/json'},
  body:JSON.stringify({login:env.LACAISSE_LOGIN,password:env.LACAISSE_PASSWORD})
})).json();
console.log('Bearer first 30:', a.token.slice(0,30));
console.log('id_account_caisse:', a.id_account_caisse);

const tries = [
  { headers: { 'Authorization': `Bearer ${a.token}`, 'Content-Type':'application/json', 'x-identifier-account': String(a.id_account_caisse) } },
  { headers: { 'Authorization': `Bearer ${a.token}`, 'Content-Type':'application/json' } },
  { headers: { 'Authorization': `Bearer ${a.token}`, 'Content-Type':'application/json', 'x-identifier-account': String(a.id_account_caisse), 'x-identifier-val': String(a.id_account_caisse) } },
];

for (let i = 0; i < tries.length; i++) {
  const r = await fetch('https://apiv2.lacaisse.ma/api/v1/caisse/listCaisse', { method: 'POST', body: JSON.stringify({}), ...tries[i] });
  console.log(`\n=== try ${i+1} status: ${r.status} ===`);
  const text = await r.text();
  console.log(text.slice(0, 800));
}
