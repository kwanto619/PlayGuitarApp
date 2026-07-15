// Inserts a song (scripts/_song.json) into Supabase as the signed-in user.
// RLS (songs_insert) requires auth.uid() = user_id, so this signs you in.
//
//   $env:SUPABASE_USER_EMAIL="info@iegroup.gr"
//   $env:SUPABASE_USER_PASSWORD="••••••"
//   node scripts/insert-song.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
nextEnv.loadEnvConfig(join(here, '..'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_USER_EMAIL;
const password = process.env.SUPABASE_USER_PASSWORD;
if (!url || !key) { console.error('Missing Supabase URL/anon key in .env.local'); process.exit(1); }
if (!email || !password) { console.error('Set SUPABASE_USER_EMAIL and SUPABASE_USER_PASSWORD'); process.exit(1); }

const song = JSON.parse(readFileSync(join(here, '_song.json'), 'utf8'));

const supabase = createClient(url, key);
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr || !auth.user) { console.error('Sign-in failed:', authErr?.message); process.exit(1); }

const { error } = await supabase.from('songs').insert({
  title: song.title,
  artist: song.artist,
  chords: song.chords,
  lyrics: song.lyrics || null,
  notes: song.notes || null,
  language: song.language,
  user_id: auth.user.id,
});
if (error) { console.error('Insert failed:', error.message); process.exit(1); }
console.log(`✓ Added "${song.title}" — ${song.artist} (${song.language}).`);
