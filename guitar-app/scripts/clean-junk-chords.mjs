// Removes junk entries from songs' `chords` arrays — values that aren't real
// chords (e.g. a tuning line "E A D G B E" or a header "Συγχορδία: …" that got
// saved into the chords field). An entry is "junk" if it does NOT resolve via
// the same rules the app uses (flats→sharps, slash, notation fixes).
//
// RLS (songs_update) only allows the row owner to update, so this signs in as
// you first. Dry-run by default — pass --apply to actually write.
//
//   $env:SUPABASE_USER_EMAIL="info@iegroup.gr"
//   $env:SUPABASE_USER_PASSWORD="••••••"
//   node scripts/clean-junk-chords.mjs            # preview
//   node scripts/clean-junk-chords.mjs --apply    # commit

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
nextEnv.loadEnvConfig(root);

const APPLY = process.argv.includes('--apply');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_USER_EMAIL;
const password = process.env.SUPABASE_USER_PASSWORD;
if (!url || !key) { console.error('Missing Supabase URL/anon key in .env.local'); process.exit(1); }
if (!email || !password) {
  console.error('Set SUPABASE_USER_EMAIL and SUPABASE_USER_PASSWORD env vars (owner login needed for RLS).');
  process.exit(1);
}

// ── Resolver (mirrors lib/chordResolve.ts) ──────────────────────────────────
const chordsSrc = readFileSync(join(root, 'data', 'chords.ts'), 'utf8');
const known = new Set([...chordsSrc.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]));
const ALIAS = { Ab: 'G#', Bb: 'A#', Cb: 'B', Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', 'E#': 'F', 'B#': 'C' };
const normRoot = (r) => ALIAS[r] ?? r;
function normName(core) {
  const m = core.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!m) return null;
  const r = normRoot(m[1][0].toUpperCase() + m[1].slice(1));
  let q = m[2].trim();
  if (q === 'M') q = 'm';
  else if (/^M(aj)?7$/.test(q)) q = 'maj7';
  else if (/^maj9$/i.test(q)) q = 'maj9';
  else if (/^maj$/i.test(q)) q = '';
  else if (/^min$/i.test(q)) q = 'm';
  else if (q === '°' || q === 'o') q = 'dim';
  else if (q === '+') q = 'aug';
  else if (q === 'sus') q = 'sus4';
  return r + q;
}
function resolves(raw) {
  const t = String(raw).trim();
  if (!t) return false;
  let core = t;
  const s = t.split('/');
  if (s.length === 2 && s[0] && s[1]) core = s[0].trim();
  if (known.has(core)) return true;
  const n = normName(core);
  return !!(n && known.has(n));
}

// ── Connect + sign in ───────────────────────────────────────────────────────
const supabase = createClient(url, key);
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr || !auth.user) { console.error('Sign-in failed:', authErr?.message); process.exit(1); }
const myId = auth.user.id;
console.log(`Signed in as ${email} (${myId})\n`);

// ── Scan ──────────────────────────────────────────────────────────────────
const { data: songs, error } = await supabase
  .from('songs')
  .select('id, title, artist, chords, user_id');
if (error) { console.error('Query failed:', error.message); process.exit(1); }

const toFix = [];
for (const s of songs ?? []) {
  const orig = s.chords ?? [];
  const cleaned = orig.filter((c) => resolves(c));
  if (cleaned.length === orig.length) continue; // nothing junk
  const dropped = orig.filter((c) => !resolves(c));
  toFix.push({ ...s, cleaned, dropped, owned: s.user_id === myId });
}

if (toFix.length === 0) { console.log('✅ No junk chord entries found.'); process.exit(0); }

console.log(`${APPLY ? 'APPLYING' : 'DRY RUN — preview'} (${toFix.length} song(s) with junk):\n`);
for (const f of toFix) {
  console.log(`  ${f.title} — ${f.artist}${f.owned ? '' : '  [NOT YOURS — RLS will block]'}`);
  f.dropped.forEach((d) => console.log(`      drop: ${JSON.stringify(d)}`));
}

if (!APPLY) {
  console.log('\nRe-run with --apply to write these changes.');
  process.exit(0);
}

// ── Apply ───────────────────────────────────────────────────────────────────
let ok = 0, blocked = 0, failed = 0;
for (const f of toFix) {
  const { data, error: upErr } = await supabase
    .from('songs')
    .update({ chords: f.cleaned })
    .eq('id', f.id)
    .select('id');
  if (upErr) { console.error(`  ✗ ${f.title}: ${upErr.message}`); failed++; }
  else if (!data || data.length === 0) { console.warn(`  ⚠ ${f.title}: 0 rows (RLS — not owner)`); blocked++; }
  else { console.log(`  ✓ ${f.title}`); ok++; }
}
console.log(`\nUpdated ${ok}, blocked ${blocked}, failed ${failed}.`);
