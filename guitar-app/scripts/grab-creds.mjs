// One-off: pull the public Supabase URL + anon key from the live Netlify
// bundle and append them to .env.local so the chord scan can run.
// Run once:  node scripts/grab-creds.mjs
import { writeFileSync, appendFileSync, existsSync, readFileSync } from 'node:fs';

const base = 'https://songcord.netlify.app/';
const html = await (await fetch(base)).text();
const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]);

let url = null, key = null;
for (const path of [...new Set(chunks)]) {
  const js = await (await fetch(new URL(path, base))).text();
  url ??= js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0] ?? null;
  key ??= js.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/)?.[0] ?? null;
  if (url && key) break;
}

if (!url || !key) {
  console.error(`Could not extract creds (url=${!!url} key=${!!key}).`);
  process.exit(1);
}

const line = `\nNEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${key}\n`;
const existing = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
if (existing.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
  console.log('Creds already in .env.local — nothing to do.');
} else {
  appendFileSync('.env.local', line);
  console.log('Wrote Supabase URL + anon key to .env.local.');
}
console.log(`url=${!!url} key=${!!key}`);
