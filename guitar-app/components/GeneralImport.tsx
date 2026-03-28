'use client';

import { useState } from 'react';
import { addSong } from '@/lib/storage';
import { Song } from '@/types';

interface ParsedSong {
  title: string;
  artist: string;
  chords: string[];
  language: 'greek' | 'english';
  lyrics: string;
  lyricsSnippet: string;
  lyricsBlocked: boolean;
  siteBlocked: boolean;
}

type Site = 'kithara' | 'tabsy' | 'ug' | 't4a' | 'unknown';

function detectSite(url: string): Site {
  if (url.includes('kithara.to')) return 'kithara';
  if (url.includes('tabsy.gr')) return 'tabsy';
  if (url.includes('ultimate-guitar.com')) return 'ug';
  if (url.includes('tabs4acoustic.com')) return 't4a';
  return 'unknown';
}

// ── Shared HTML utilities ─────────────────────────────────────────────────────
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&shy;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function extractDivById(html: string, id: string): string | null {
  let idx = html.indexOf(`id="${id}"`);
  if (idx === -1) idx = html.indexOf(`id='${id}'`);
  if (idx === -1) return null;
  const divStart = html.lastIndexOf('<div', idx);
  if (divStart === -1) return null;
  const tagEnd = html.indexOf('>', divStart);
  if (tagEnd === -1) return null;
  const contentStart = tagEnd + 1;
  let pos = contentStart;
  let depth = 1;
  while (depth > 0) {
    const nextOpen  = html.indexOf('<div',  pos);
    const nextClose = html.indexOf('</div', pos);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; pos = nextOpen + 4; }
    else { depth--; if (depth === 0) return html.slice(contentStart, nextClose); pos = nextClose + 6; }
  }
  return null;
}

// ── kithara.to parser ─────────────────────────────────────────────────────────
function parseKitharaHtml(html: string): Omit<ParsedSong, 'lyricsBlocked' | 'siteBlocked'> {
  let title = '';
  let artist = '';
  let language: 'greek' | 'english' = 'greek';

  const titleM = html.match(/<h1[^>]*class="ti"[^>]*>([\s\S]*?)<\/h1>/);
  if (titleM) title = stripHtml(titleM[1]);

  const artistM = html.match(/<h2[^>]*class="ar"[^>]*>([\s\S]*?)<\/h2>/);
  if (artistM) artist = stripHtml(artistM[1]);

  const ldRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let ldM: RegExpExecArray | null;
  while ((ldM = ldRe.exec(html)) !== null) {
    try {
      const items = JSON.parse(ldM[1]);
      const arr: Record<string, unknown>[] = Array.isArray(items) ? items : [items];
      for (const item of arr) {
        if (item['@type'] === 'MusicComposition') {
          if (!title && item.name) title = stripHtml(String(item.name));
          if (!artist) {
            const rec = item.recordedAs as Record<string, unknown> | undefined;
            const by = (rec?.byArtist as Record<string, unknown> | undefined);
            if (by?.name) artist = stripHtml(String(by.name));
          }
          if (String(item.inLanguage ?? '').startsWith('en')) language = 'english';
        }
      }
    } catch { /* skip */ }
  }

  const chordSet = new Set<string>();
  const chordRe = /sndType="[^"]*"[^>]*>([A-G][^<]{0,8})<\/a>/g;
  let cm: RegExpExecArray | null;
  while ((cm = chordRe.exec(html)) !== null) {
    const c = cm[1].trim().replace(/\s+/g, '');
    if (c) chordSet.add(c);
  }

  let lyrics = '';
  const textContent = extractDivById(html, 'text');
  if (textContent) {
    lyrics = textContent
      .replace(/<a[^>]*class=["']clickPlay["'][^>]*>([^<]+)<\/a>/g, '[$1]')
      .replace(/<span[^>]*class=["'][^"']*\b(ch|chord)\b[^"']*["'][^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/span>/g, '[$2]')
      .replace(/<span[^>]*class=["'][^"']*\b(ch|chord)\b[^"']*["'][^>]*>([^<]+)<\/span>/g, '[$2]')
      .replace(/<\/?(span|a|em|strong|b|i|u)[^>]*>/g, '')
      .replace(/<\/p>\s*<p[^>]*>/g, '\n\n').replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '\n\n')
      .replace(/<\/div>\s*<div[^>]*>/g, '\n\n').replace(/<\/?div[^>]*>/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&shy;/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .split('\n').map((l) => l.trimEnd()).join('\n')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  return { title, artist, chords: [...chordSet], language, lyrics, lyricsSnippet: '' };
}

// ── tabsy.gr parser ───────────────────────────────────────────────────────────
const CHORD_TOKEN = /^[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|add\d+|M)?\d*(\/[A-G][#b]?)?$/;

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => CHORD_TOKEN.test(t));
}

function extractChordsFromTab(content: string): string[] {
  const chordSet = new Set<string>();
  for (const line of content.split('\n')) {
    if (isChordLine(line)) {
      for (const token of line.trim().split(/\s+/)) {
        if (token) chordSet.add(token);
      }
    }
  }
  return [...chordSet];
}

function findTabString(data: unknown, depth = 0): string {
  if (depth > 8) return '';
  if (typeof data === 'string' && data.length > 80) {
    const hasSection = /\[(?:Εισαγωγή|Κουπλέ|Ρεφραίν|Intro|Verse|Chorus|Bridge)/.test(data);
    const hasChordLine = data.split('\n').some((l) => isChordLine(l));
    if (hasSection || hasChordLine) return data;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findTabString(item, depth + 1);
      if (found) return found;
    }
  }
  if (data && typeof data === 'object') {
    for (const value of Object.values(data as Record<string, unknown>)) {
      const found = findTabString(value, depth + 1);
      if (found) return found;
    }
  }
  return '';
}

function parseTabsyHtml(html: string): Omit<ParsedSong, 'lyricsBlocked' | 'siteBlocked'> {
  let title = '';
  let artist = '';
  let tabContent = '';

  // Title + artist from JSON-LD headline: "Song Title - Artist Name"
  const ldRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let ldM: RegExpExecArray | null;
  while ((ldM = ldRe.exec(html)) !== null) {
    try {
      const item = JSON.parse(ldM[1]);
      const headline = item.headline || item.name;
      if (headline) {
        const parts = String(headline).split(' - ');
        if (parts.length >= 2) {
          if (!title)  title  = stripHtml(parts[0].trim());
          if (!artist) artist = stripHtml(parts.slice(1).join(' - ').trim());
        } else if (!title) {
          title = stripHtml(String(headline));
        }
      }
    } catch { /* skip */ }
  }

  // Fallback: <title> tag "Song - Artist | …"
  if (!title || !artist) {
    const titleTagM = html.match(/<title>([^<]+)<\/title>/);
    if (titleTagM) {
      const text = titleTagM[1].split('|')[0].trim();
      const parts = text.split(' - ');
      if (parts.length >= 2) {
        if (!title)  title  = stripHtml(parts[0].trim());
        if (!artist) artist = stripHtml(parts.slice(1).join(' - ').trim());
      }
    }
  }

  // Tab content from window.__NUXT__ (Nuxt 2 IIFE format)
  // The IIFE arguments contain all data values as JS string literals
  const nuxtScriptM = html.match(/<script[^>]*>\s*window\.__NUXT__\s*=([\s\S]*?)<\/script>/);
  if (nuxtScriptM) {
    const scriptContent = nuxtScriptM[1];

    // Strategy A: find a string literal containing a section marker [Κουπλέ] etc.
    const sectionM = scriptContent.match(/"((?:[^"\\]|\\.){30,}\[(?:Εισαγωγή|Κουπλέ|Ρεφραίν|Intro|Verse|Chorus|Bridge)(?:[^"\\]|\\.){20,})"/);
    if (sectionM) {
      tabContent = sectionM[1]
        .replace(/\\n/g, '\n').replace(/\\r/g, '')
        .replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\t/g, '\t');
    }

    // Strategy B: iterate long string literals, find one with chord lines
    if (!tabContent) {
      const stringRe = /"((?:[^"\\]|\\.){100,})"/g;
      let sm: RegExpExecArray | null;
      while ((sm = stringRe.exec(scriptContent)) !== null) {
        const s = sm[1]
          .replace(/\\n/g, '\n').replace(/\\r/g, '')
          .replace(/\\\\/g, '\\').replace(/\\"/g, '"');
        const lines = s.split('\n');
        if (lines.length >= 4 && lines.some((l) => isChordLine(l))) {
          tabContent = s;
          break;
        }
      }
    }
  }

  // Fallback: __NUXT_DATA__ JSON (Nuxt 3)
  if (!tabContent) {
    const nuxtDataM =
      html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i) ||
      html.match(/<script[^>]*type="application\/json"[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nuxtDataM) {
      try { tabContent = findTabString(JSON.parse(nuxtDataM[1])); } catch { /* skip */ }
    }
  }

  return {
    title,
    artist,
    chords: extractChordsFromTab(tabContent),
    language: 'greek',
    lyrics: tabContent.trim(),
    lyricsSnippet: '',
  };
}

// ── tabs4acoustic.com parser ──────────────────────────────────────────────────
function parseTabs4AcousticHtml(html: string): Omit<ParsedSong, 'lyricsBlocked' | 'siteBlocked'> {
  // Chords are in img alt text: alt="Chord Am (x,0,2,2,1,0)"
  const chordSet = new Set<string>();
  const altRe = /alt="Chord\s+([A-G][^(\s"]{0,10})\s*\(/g;
  let cm: RegExpExecArray | null;
  while ((cm = altRe.exec(html)) !== null) {
    const c = cm[1].trim();
    if (c) chordSet.add(c);
  }

  // Title & artist from <title> tag: "Simple Man Guitar Tab, Lynyrd Skynyrd"
  let title  = '';
  let artist = '';
  const titleTagM = html.match(/<title>([^<,]+?)\s+Guitar Tab[^,<]*,\s*([^<]+?)\s*<\/title>/i);
  if (titleTagM) {
    title  = titleTagM[1].trim();
    artist = titleTagM[2].trim();
  }
  // Fallback: breadcrumb link whose href matches the song page pattern (contains "-tab-\d+")
  if (!title) {
    const songLinkM = html.match(/<a[^>]+href="[^"]*-tab-\d+\.html"[^>]*>([^<]+)<\/a>/i);
    if (songLinkM) title = songLinkM[1].trim();
  }
  if (!title) {
    const h2M = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
    if (h2M) title = h2M[1].replace(/\s+tab$/i, '').trim();
  }
  // Fallback artist: breadcrumb link whose href matches artist tabs pattern (contains "-tabs-\d+")
  if (!artist) {
    const artistLinkM = html.match(/<a[^>]+href="[^"]*-tabs-\d+\.html"[^>]*>([^<]+)<\/a>/i);
    if (artistLinkM) artist = artistLinkM[1].replace(/\s+tabs?$/i, '').trim();
  }

  // Content from <pre> blocks — skip guitar tab notation (e|---|) blocks, keep chord+lyric blocks
  const preRe = /<pre[^>]*>([\s\S]*?)<\/pre>/g;
  const sections: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = preRe.exec(html)) !== null) {
    const rawText = pm[1].replace(/<[^>]+>/g, '');
    const lines   = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    // Detect guitar tab notation: lines starting with string names like e| B| G| D| A| E|
    const tabLines = lines.filter((l) => /^[eEbBgGdDaA]\s*\|/.test(l));
    if (tabLines.length >= 2) continue; // skip — this is a guitar tab block

    const section = pm[1]
      // Replace <a><img alt="Chord X (...)"></a> with [X]
      .replace(/<a[^>]*>\s*<img[^>]+alt="Chord\s+([A-G][^(\s"]{0,10})[^"]*"[^>]*>\s*<\/a>/g, '[$1]')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
      .split('\n').map((l) => l.trimEnd()).join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (section) sections.push(section);
  }

  return {
    title,
    artist,
    chords: [...chordSet],
    language: 'english',
    lyrics: sections.join('\n\n'),
    lyricsSnippet: '',
  };
}

// ── ultimate-guitar.com parser ────────────────────────────────────────────────
function parseUGHtml(html: string): Omit<ParsedSong, 'lyricsBlocked' | 'siteBlocked'> {
  // UG embeds all data as HTML-encoded JSON in <div class="js-store" data-content="...">
  const storeM = html.match(/class="js-store"\s+data-content="([^"]+)"/);
  if (!storeM) throw new Error('Could not find UG store data. Make sure you copied the full page source.');

  const jsonStr = storeM[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse UG page data.');
  }

  const tab     = (data as Record<string, unknown> & { store?: { page?: { data?: { tab?: Record<string, unknown>; tab_view?: Record<string, unknown> } } } })?.store?.page?.data?.tab ?? {};
  const tabView = (data as Record<string, unknown> & { store?: { page?: { data?: { tab_view?: { wiki_tab?: { content?: string } } } } } })?.store?.page?.data?.tab_view;

  const title  = String(tab.song_name   ?? '');
  const artist = String(tab.artist_name ?? '');

  // Content is in tab_view.wiki_tab.content (preferred) or tab.content
  const rawContent = String(tabView?.wiki_tab?.content ?? tab.content ?? '');

  // Extract unique chords from [ch]...[/ch] markers
  const chordSet = new Set<string>();
  const chordRe  = /\[ch\]([^\[]+)\[\/ch\]/g;
  let cm: RegExpExecArray | null;
  while ((cm = chordRe.exec(rawContent)) !== null) {
    const c = cm[1].trim();
    if (c) chordSet.add(c);
  }

  // Convert UG markup to plain text
  const lyrics = rawContent
    .replace(/\[tab\]/g, '').replace(/\[\/tab\]/g, '')
    .replace(/\[ch\]([^\[]+)\[\/ch\]/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title,
    artist,
    chords: [...chordSet],
    language: 'english',
    lyrics,
    lyricsSnippet: '',
  };
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 16px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '1.05rem',
  background: 'var(--bg-input)',
  border: '1px solid var(--gold-border-mid)',
  color: 'var(--cream)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.62rem',
  letterSpacing: '0.4em',
  textTransform: 'uppercase',
  color: 'var(--gold-dim)',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  marginBottom: '6px',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function VInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; props.onFocus?.(e); }}
      onBlur={(e)  => { e.target.style.borderColor = 'var(--gold-border-mid)'; props.onBlur?.(e); }}
    />
  );
}

function VTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        minHeight: '180px',
        resize: 'vertical',
        fontFamily: 'var(--font-ibm-mono, monospace)',
        fontSize: '0.9rem',
        ...props.style,
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; props.onFocus?.(e); }}
      onBlur={(e)  => { e.target.style.borderColor = 'var(--gold-border-mid)'; props.onBlur?.(e); }}
    />
  );
}

function LangToggle({ value, onChange }: { value: 'greek' | 'english'; onChange: (v: 'greek' | 'english') => void }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--gold-border)', overflow: 'hidden' }}>
      {(['greek', 'english'] as const).map((lang, i) => (
        <button key={lang} type="button" onClick={() => onChange(lang)} style={{
          flex: 1, padding: '12px 0', minHeight: '44px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer', border: 'none',
          borderRight: i === 0 ? '1px solid var(--gold-border)' : 'none',
          background: value === lang ? 'linear-gradient(135deg, rgba(0,196,180,0.2), rgba(0,196,180,0.08))' : 'transparent',
          color: value === lang ? 'var(--gold-bright)' : 'var(--cream-muted)',
          transition: 'all 0.15s',
        }}>
          {lang === 'greek' ? '🇬🇷 Greek' : '🇬🇧 English'}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GeneralImport({ onImported }: { onImported: (song: Song) => void }) {
  const [open,       setOpen]       = useState(false);
  const [step,       setStep]       = useState<'url' | 'paste-html' | 'preview'>('url');
  const [url,        setUrl]        = useState('');
  const [site,       setSite]       = useState<Site>('unknown');
  const [pastedHtml, setPastedHtml] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [lyricsBlocked, setLyricsBlocked] = useState(false);

  const [form, setForm] = useState({
    title: '', artist: '', chords: '', lyrics: '', notes: '',
    language: 'greek' as 'greek' | 'english',
  });

  const reset = () => {
    setOpen(false); setStep('url'); setUrl(''); setSite('unknown');
    setPastedHtml(''); setError(''); setLoading(false); setSaving(false);
    setLyricsBlocked(false);
    setForm({ title: '', artist: '', chords: '', lyrics: '', notes: '', language: 'greek' });
  };

  const applyParsed = (parsed: Omit<ParsedSong, 'lyricsBlocked' | 'siteBlocked'>) => {
    setForm({
      title:    parsed.title,
      artist:   parsed.artist,
      chords:   parsed.chords.join(', '),
      lyrics:   parsed.lyrics,
      notes:    '',
      language: parsed.language,
    });
  };

  const handleFetch = async () => {
    if (!url.trim()) { setError('Please enter a URL.'); return; }
    const detectedSite = detectSite(url.trim());
    setSite(detectedSite);
    setLoading(true);
    setError('');

    try {
      const target = url.trim();
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(target)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
        `https://thingproxy.freeboard.io/fetch/${target}`,
        `https://cors.eu.org/${target}`,
      ];

      const isValidHtml = (t: string) => {
        if (detectedSite === 'kithara') return t.includes('kithara') || t.includes('class="ti"') || t.includes('id="text"');
        if (detectedSite === 'tabsy')   return t.includes('tabsy') || t.includes('__NUXT') || t.includes('sygxordies');
        if (detectedSite === 'ug')      return t.includes('js-store') || t.includes('ultimate-guitar');
        if (detectedSite === 't4a')     return t.includes('tabs4acoustic') || t.includes('T4A_TAB_ID');
        return t.length > 1000;
      };

      // UG uses Cloudflare — skip proxies and go straight to paste fallback
      if (detectedSite === 'ug') {
        setStep('paste-html');
        return;
      }

      let html = '';
      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const text = await res.text();
            if (isValidHtml(text)) { html = text; break; }
          }
        } catch { /* try next */ }
      }

      if (!html) {
        setError('All proxies failed or were rate-limited. Wait a moment and try again, or use the "Paste page source" fallback.');
        return;
      }

      const parsed =
        detectedSite === 'tabsy' ? parseTabsyHtml(html) :
        detectedSite === 't4a'   ? parseTabs4AcousticHtml(html) :
        parseKitharaHtml(html);
      if (!parsed.title && !parsed.artist) {
        setError('Could not extract song data. The URL may be incorrect or the site structure has changed.');
        return;
      }

      applyParsed(parsed);
      if (detectedSite === 'kithara') setLyricsBlocked(true);
      setStep('preview');
    } catch (e) {
      setError('Failed to fetch: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.artist) { setError('Title and artist are required.'); return; }
    setSaving(true); setError('');
    try {
      const updated = await addSong({
        title:    form.title,
        artist:   form.artist,
        chords:   form.chords.split(',').map((c) => c.trim()).filter(Boolean),
        lyrics:   form.lyrics   || undefined,
        notes:    form.notes    || undefined,
        language: form.language,
      });
      const newest = updated[0];
      if (newest) onImported(newest);
      reset();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const siteName = site === 'tabsy' ? 'tabsy.gr' : site === 'kithara' ? 'kithara.to' : site === 'ug' ? 'ultimate-guitar.com' : site === 't4a' ? 'tabs4acoustic.com' : 'the site';

  return (
    <>
      {/* ── Trigger button ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '13px 32px',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.95rem', fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            cursor: 'pointer', border: '1px solid var(--gold-border-mid)',
            background: 'linear-gradient(135deg, rgba(0,196,180,0.18), rgba(0,196,180,0.06))',
            color: 'var(--gold-bright)', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Import from Tabs
        </button>
      </div>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          onClick={reset}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative', background: 'var(--bg-surface)',
              border: '1px solid var(--gold-border-mid)',
              padding: 'clamp(24px, 4vw, 44px)',
              width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
            }}
          >
            {/* Corner brackets */}
            {([
              { top: 8, left: 8,    borderTop: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
              { top: 8, right: 8,   borderTop: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
              { bottom: 8, left: 8,   borderBottom: '1px solid var(--gold-border-mid)', borderLeft:  '1px solid var(--gold-border-mid)' },
              { bottom: 8, right: 8,  borderBottom: '1px solid var(--gold-border-mid)', borderRight: '1px solid var(--gold-border-mid)' },
            ] as React.CSSProperties[]).map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 18, height: 18, ...s }} />
            ))}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'var(--gold-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)', marginBottom: '6px' }}>
                  {step === 'url' ? 'Step 1' : step === 'paste-html' ? 'Step 2 — Manual' : 'Step 2 of 2'}
                </div>
                <h3 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.8rem', fontWeight: 500, letterSpacing: '0.1em', color: 'var(--gold)', margin: 0 }}>
                  {step === 'url' ? 'Import Song' : step === 'paste-html' ? 'Paste Page Source' : 'Review & Save'}
                </h3>
              </div>
              <button onClick={reset} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--cream-muted)', cursor: 'pointer', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)', marginBottom: '28px' }} />

            {/* ── Step 1: URL input ── */}
            {step === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Field label="Song URL">
                  <VInput
                    type="url"
                    placeholder="https://tabsy.gr/kithara/sygxordies/…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                    autoFocus
                  />
                </Field>

                <p style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--cream-muted)', lineHeight: 1.6, margin: 0 }}>
                  Paste a song URL from <strong style={{ color: 'var(--cream-soft)', fontStyle: 'normal' }}>tabsy.gr</strong>, <strong style={{ color: 'var(--cream-soft)', fontStyle: 'normal' }}>kithara.to</strong>, <strong style={{ color: 'var(--cream-soft)', fontStyle: 'normal' }}>tabs4acoustic.com</strong>, or <strong style={{ color: 'var(--cream-soft)', fontStyle: 'normal' }}>ultimate-guitar.com</strong>. Title, artist, chords, and lyrics will be extracted automatically.
                </p>

                <div style={{ padding: '12px 16px', border: '1px solid rgba(0,196,180,0.25)', background: 'rgba(0,196,180,0.05)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.88rem', color: 'var(--cream-muted)', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--gold-dim)', fontStyle: 'normal' }}>Ultimate Guitar note:</strong> UG is Cloudflare-protected, so you&apos;ll need to paste the page source manually.<br />
                  Paste the URL → click Fetch → follow the instructions in the next step.
                </div>

                {error && (
                  <div style={{ padding: '12px 16px', border: '1px solid rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.07)', color: 'var(--red-tuning)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span>{error}</span>
                    <button
                      onClick={() => { setError(''); setStep('paste-html'); }}
                      style={{ alignSelf: 'flex-start', padding: '6px 14px', background: 'transparent', border: '1px solid rgba(224,72,72,0.5)', color: 'var(--red-tuning)', cursor: 'pointer', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.85rem', letterSpacing: '0.12em' }}
                    >
                      Use manual paste instead →
                    </button>
                  </div>
                )}

                <button
                  onClick={handleFetch}
                  disabled={loading}
                  style={{
                    padding: '13px 0', fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em',
                    textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer',
                    border: '1px solid var(--gold-border-mid)',
                    background: loading ? 'transparent' : 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
                    color: loading ? 'var(--cream-muted)' : 'var(--gold-bright)',
                    transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Fetching…' : 'Fetch Song →'}
                </button>
              </div>
            )}

            {/* ── Step 2b: Paste HTML (site blocked) ── */}
            {step === 'paste-html' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '14px 16px', border: '1px solid rgba(0,196,180,0.35)', background: 'rgba(0,196,180,0.07)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--cream-soft)' }}>
                  <strong style={{ color: 'var(--gold)' }}>{siteName} requires manual import.</strong><br />
                  To import:<br />
                  1. Open the song page in your browser<br />
                  2. Press <strong>Ctrl+U</strong> (or right-click → View Page Source)<br />
                  3. Press <strong>Ctrl+A</strong> then <strong>Ctrl+C</strong> to copy all<br />
                  4. Paste it below and click Parse
                  {site === 'ug' && (
                    <><br /><br /><em style={{ color: 'var(--gold-dim)' }}>Tip: make sure you are on a &ldquo;Chords&rdquo; tab page, not a Guitar Pro or Tab page.</em></>
                  )}
                </div>

                <Field label="Paste page source here">
                  <VTextarea
                    placeholder="Paste the full HTML source of the song page…"
                    value={pastedHtml}
                    onChange={(e) => setPastedHtml(e.target.value)}
                    style={{ minHeight: '200px', fontFamily: 'var(--font-ibm-mono, monospace)', fontSize: '0.8rem' }}
                  />
                </Field>

                {error && (
                  <div style={{ padding: '12px 16px', border: '1px solid rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.07)', color: 'var(--red-tuning)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      if (!pastedHtml.trim()) { setError('Please paste the page source first.'); return; }
                      try {
                        const detectedSite = detectSite(url);
                        let parsed: Omit<ParsedSong, 'lyricsBlocked' | 'siteBlocked'>;
                        if (detectedSite === 'tabsy')        parsed = parseTabsyHtml(pastedHtml);
                        else if (detectedSite === 'ug')      parsed = parseUGHtml(pastedHtml);
                        else if (detectedSite === 't4a')     parsed = parseTabs4AcousticHtml(pastedHtml);
                        else                                 parsed = parseKitharaHtml(pastedHtml);
                        if (!parsed.title && !parsed.artist) { setError('Could not parse the HTML. Make sure you copied the full page source.'); return; }
                        applyParsed(parsed);
                        if (detectedSite === 'kithara') setLyricsBlocked(true);
                        setError('');
                        setStep('preview');
                      } catch (e) {
                        setError((e as Error).message || 'Failed to parse the pasted HTML.');
                      }
                    }}
                    style={{ flex: 1, padding: '13px 0', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid var(--gold-border-mid)', background: 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))', color: 'var(--gold-bright)', transition: 'all 0.2s' }}
                  >
                    Parse →
                  </button>
                  <button onClick={() => { setStep('url'); setError(''); }} style={{ padding: '13px 24px', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.9rem', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid var(--gold-border)', background: 'transparent', color: 'var(--cream-muted)' }}>
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Preview & edit ── */}
            {step === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <Field label="Title *">
                  <VInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </Field>

                <Field label="Artist *">
                  <VInput value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
                </Field>

                <Field label="Chords (comma separated)">
                  <VInput value={form.chords} onChange={(e) => setForm({ ...form, chords: e.target.value })} />
                </Field>

                <Field label="Language">
                  <LangToggle value={form.language} onChange={(v) => setForm({ ...form, language: v })} />
                </Field>

                <Field label="Notes">
                  <VInput
                    placeholder="Optional notes about the song…"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Field>

                <Field label="Lyrics">
                  {lyricsBlocked && site === 'kithara' && (
                    <div style={{ marginBottom: '8px', padding: '10px 14px', background: 'rgba(0,196,180,0.06)', border: '1px solid rgba(0,196,180,0.25)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.88rem', color: 'var(--cream-soft)', lineHeight: 1.6 }}>
                      kithara.to encrypts lyrics client-side — they can&apos;t be auto-extracted.<br />
                      Go to the song page → select all (<strong>Ctrl+A</strong>) → copy (<strong>Ctrl+C</strong>) → paste below.
                    </div>
                  )}
                  <VTextarea
                    placeholder={site === 'kithara' ? 'Paste the lyrics here from the kithara.to page…' : 'Lyrics extracted from the tab…'}
                    value={form.lyrics}
                    onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
                    style={{ minHeight: '220px' }}
                  />
                </Field>

                {error && (
                  <div style={{ padding: '12px 16px', border: '1px solid rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.07)', color: 'var(--red-tuning)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '13px 0', fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em',
                      textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer',
                      border: '1px solid var(--gold-border-mid)',
                      background: saving ? 'transparent' : 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
                      color: saving ? 'var(--cream-muted)' : 'var(--gold-bright)',
                      transition: 'all 0.2s', opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving…' : 'Save to Library'}
                  </button>

                  <button
                    onClick={() => { setStep('url'); setError(''); }}
                    style={{
                      padding: '13px 24px', fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
                      textTransform: 'uppercase', cursor: 'pointer',
                      border: '1px solid var(--gold-border)',
                      background: 'transparent', color: 'var(--cream-muted)',
                      transition: 'all 0.2s',
                    }}
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
