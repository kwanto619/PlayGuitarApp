// Reports chords used in songs that the app's chord library does not recognise.
//
// "Recognised" mirrors the app: ChordTooltip does
//   chordLibrary.find((c) => c.name === name)
// i.e. an exact, case-sensitive name match against data/chords.ts. Any chord
// chip whose name isn't in that list shows no diagram — what the user sees.
//
// Run from the guitar-app dir:  node scripts/find-unknown-chords.mjs
// Loads .env.local automatically via @next/env (same as `next dev`).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
const { loadEnvConfig } = nextEnv;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

loadEnvConfig(root); // populates process.env from .env.local

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

// ── Build the known-chord set from data/chords.ts (no TS runtime needed) ──
const chordsSrc = readFileSync(join(root, 'data', 'chords.ts'), 'utf8');
const known = new Set(
  [...chordsSrc.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]),
);
console.log(`Chord library: ${known.size} known chords\n`);

// ── Fetch all songs ──
const supabase = createClient(url, key);
const { data: songs, error } = await supabase
  .from('songs')
  .select('id, title, artist, chords')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Query failed:', error.message);
  process.exit(1);
}

// ── Collect unrecognised chords from each song's chord chips ──
const unknown = new Map(); // chord -> { count, songs:Set }
for (const s of songs ?? []) {
  for (const raw of s.chords ?? []) {
    const c = String(raw).trim();
    if (!c || known.has(c)) continue;
    if (!unknown.has(c)) unknown.set(c, { count: 0, songs: new Set() });
    const e = unknown.get(c);
    e.count++;
    e.songs.add(`${s.title} — ${s.artist}`);
  }
}

console.log(`Scanned ${songs?.length ?? 0} songs.\n`);

if (unknown.size === 0) {
  console.log('✅ No unrecognised chords. Every chord chip matches the library.');
  process.exit(0);
}

const sorted = [...unknown.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`❌ ${sorted.length} unrecognised chord name(s):\n`);
for (const [chord, info] of sorted) {
  console.log(`  ${chord.padEnd(12)} ×${info.count}`);
  for (const title of [...info.songs].slice(0, 5)) console.log(`      • ${title}`);
  if (info.songs.size > 5) console.log(`      • …and ${info.songs.size - 5} more`);
}
console.log(`\nBare list: ${sorted.map(([c]) => c).join(', ')}`);
