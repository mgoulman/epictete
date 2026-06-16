// Shared helpers (no external deps — Node 18+ has global fetch).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(HERE, 'out');

export function loadEnv() {
  const p = path.join(HERE, '.env');
  const env = { ...process.env };
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#') || !s.includes('=')) continue;
      const i = s.indexOf('=');
      env[s.slice(0, i).trim()] = s.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pull a bare domain out of a website URL (drops www, paths, query).
export function domainOf(url) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `http://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// Skip domains that are never a real company mailbox.
const JUNK_DOMAINS = new Set([
  'facebook.com', 'instagram.com', 'linkedin.com', 'google.com', 'youtube.com',
  'wa.me', 'whatsapp.com', 'business.site', 'wixsite.com', 'blogspot.com',
]);
export const isJunkDomain = (d) => !d || JUNK_DOMAINS.has(d) || d.endsWith('.google.com');

// ── minimal CSV ──────────────────────────────────────────────────────────────
const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCSV(rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
export function writeCSV(name, rows, columns) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, toCSV(rows, columns));
  return file;
}
export function readCSV(name) {
  const file = path.join(OUT, name);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n').filter(Boolean);
  const cols = parseCSVLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = parseCSVLine(l);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
}
function parseCSVLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
