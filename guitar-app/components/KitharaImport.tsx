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

// ── Client-side HTML parser (used when server fetch is blocked) ────────────
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
  // Find the id attribute regardless of quote style or surrounding attributes
  let idx = html.indexOf(`id="${id}"`);
  if (idx === -1) idx = html.indexOf(`id='${id}'`);
  if (idx === -1) return null;

  // Walk backwards to find the opening <div that contains this id
  const divStart = html.lastIndexOf('<div', idx);
  if (divStart === -1) return null;

  // Find end of opening tag
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

function parseKitharaHtml(html: string): Omit<ParsedSong, 'lyricsBlocked' | 'siteBlocked'> {
  let title = '';
  let artist = '';
  let language: 'greek' | 'english' = 'greek';

  const titleM = html.match(/<h1[^>]*class="ti"[^>]*>([\s\S]*?)<\/h1>/);
  if (titleM) title = stripHtml(titleM[1]);

  const artistM = html.match(/<h2[^>]*class="ar"[^>]*>([\s\S]*?)<\/h2>/);
  if (artistM) artist = stripHtml(artistM[1]);

  // JSON-LD fallback
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

  // Chords
  const chordSet = new Set<string>();
  const chordRe = /class="clickPlay"[^>]*>([A-G][^<]{0,8})<\/a>/g;
  let cm: RegExpExecArray | null;
  while ((cm = chordRe.exec(html)) !== null) {
    const c = cm[1].trim().replace(/\s+/g, '');
    if (c) chordSet.add(c);
  }

  // Lyrics from #text div
  let lyrics = '';
  const textContent = extractDivById(html, 'text');
  if (textContent) {
    lyrics = textContent
      // Handle chord anchors with clickPlay class (inline chords)
      .replace(/<a[^>]*class=["']clickPlay["'][^>]*>([^<]+)<\/a>/g, '[$1]')
      // Handle chord spans with class "ch" or "chord" wrapping anchors or text
      .replace(/<span[^>]*class=["'][^"']*\b(ch|chord)\b[^"']*["'][^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/span>/g, '[$2]')
      .replace(/<span[^>]*class=["'][^"']*\b(ch|chord)\b[^"']*["'][^>]*>([^<]+)<\/span>/g, '[$2]')
      // Strip remaining tags (keep text content)
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
          flex: 1, padding: '10px 0',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer', border: 'none',
          borderRight: i === 0 ? '1px solid var(--gold-border)' : 'none',
          background: value === lang ? 'linear-gradient(135deg, rgba(200,152,32,0.2), rgba(200,152,32,0.08))' : 'transparent',
          color: value === lang ? 'var(--gold-bright)' : 'var(--cream-muted)',
          transition: 'all 0.15s',
        }}>
          {lang === 'greek' ? '🇬🇷 Greek' : '🇬🇧 English'}
        </button>
      ))}
    </div>
  );
}

export default function KitharaImport({ onImported }: { onImported: (song: Song) => void }) {
  const [open,      setOpen]      = useState(false);
  const [step,      setStep]      = useState<'url' | 'paste-html' | 'preview'>('url');
  const [url,       setUrl]       = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    title: '', artist: '', chords: '', lyrics: '', notes: '',
    language: 'greek' as 'greek' | 'english',
  });
  const [lyricsBlocked, setLyricsBlocked] = useState(false);

  const reset = () => {
    setOpen(false);
    setStep('url');
    setUrl('');
    setPastedHtml('');
    setError('');
    setLoading(false);
    setSaving(false);
    setLyricsBlocked(false);
    setForm({ title: '', artist: '', chords: '', lyrics: '', notes: '', language: 'greek' });
  };

  const handleFetch = async () => {
    if (!url.trim()) { setError('Please enter a URL.'); return; }
    setLoading(true);
    setError('');
    try {
      // Fetch from the browser via CORS proxy so the request uses the user's IP
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url.trim())}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url.trim())}`,
      ];

      let html = '';
      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const text = await res.text();
            if (text.includes('kithara') || text.includes('class="ti"') || text.includes('id="text"')) {
              html = text;
              break;
            }
          }
        } catch { /* try next proxy */ }
      }

      if (!html) {
        setStep('paste-html');
        return;
      }

      const parsed = parseKitharaHtml(html);
      if (!parsed.title && !parsed.artist) {
        setError('Could not extract song data. Try pasting the page source manually.');
        return;
      }

      setForm({
        title:    parsed.title,
        artist:   parsed.artist,
        chords:   parsed.chords.join(', '),
        lyrics:   parsed.lyrics,
        notes:    '',
        language: parsed.language,
      });
      setStep('preview');
    } catch (e) {
      setError('Failed to fetch: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.artist) { setError('Title and artist are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await addSong({
        title:    form.title,
        artist:   form.artist,
        chords:   form.chords.split(',').map((c) => c.trim()).filter(Boolean),
        lyrics:   form.lyrics || undefined,
        notes:    form.notes  || undefined,
        language: form.language,
      });
      // The last addSong returns the full updated list; the newest song is first
      const newest = updated[0];
      if (newest) onImported(newest);
      reset();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '13px 32px',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.95rem',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            border: '1px solid var(--gold-border-mid)',
            background: 'linear-gradient(135deg, rgba(200,152,32,0.18), rgba(200,152,32,0.06))',
            color: 'var(--gold-bright)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* Kithara-style icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Import from kithara.to
        </button>
      </div>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          onClick={reset}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(8,5,2,0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: 'var(--bg-surface)',
              border: '1px solid var(--gold-border-mid)',
              padding: 'clamp(24px, 4vw, 44px)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
            }}
          >
            {/* Corner brackets */}
            {([
              { top: 8, left: 8,   borderTop: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
              { top: 8, right: 8,  borderTop: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
              { bottom: 8, left: 8,  borderBottom: '1px solid var(--gold-border-mid)', borderLeft:  '1px solid var(--gold-border-mid)' },
              { bottom: 8, right: 8, borderBottom: '1px solid var(--gold-border-mid)', borderRight: '1px solid var(--gold-border-mid)' },
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
                  {step === 'url' ? 'Import from kithara.to' : step === 'paste-html' ? 'Paste Page Source' : 'Review & Save'}
                </h3>
              </div>
              <button onClick={reset} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--cream-muted)', cursor: 'pointer', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)', marginBottom: '28px' }} />

            {/* ── Step 2b: Paste HTML (site blocked) ── */}
            {step === 'paste-html' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '14px 16px', border: '1px solid rgba(200,152,32,0.35)', background: 'rgba(200,152,32,0.07)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--cream-soft)' }}>
                  <strong style={{ color: 'var(--gold)' }}>kithara.to blocks automated requests.</strong><br />
                  To import, do the following:<br />
                  1. Open the song page in a new tab<br />
                  2. Press <strong>Ctrl+U</strong> (or right-click → View Page Source)<br />
                  3. Press <strong>Ctrl+A</strong> then <strong>Ctrl+C</strong> to copy all<br />
                  4. Paste it in the box below and click Parse
                </div>

                <Field label="Paste page source here">
                  <VTextarea
                    placeholder="Paste the full HTML source of the kithara.to song page…"
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
                        const parsed = parseKitharaHtml(pastedHtml);
                        if (!parsed.title && !parsed.artist) { setError('Could not parse the HTML. Make sure you copied the full page source.'); return; }
                        setForm({ title: parsed.title, artist: parsed.artist, chords: parsed.chords.join(', '), lyrics: parsed.lyrics, notes: '', language: parsed.language });
                        setError('');
                        setStep('preview');
                      } catch {
                        setError('Failed to parse the pasted HTML.');
                      }
                    }}
                    style={{ flex: 1, padding: '13px 0', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid var(--gold-border-mid)', background: 'linear-gradient(135deg, rgba(122,92,16,0.6), rgba(90,68,24,0.4))', color: 'var(--gold-bright)', transition: 'all 0.2s' }}
                  >
                    Parse →
                  </button>
                  <button onClick={() => { setStep('url'); setError(''); }} style={{ padding: '13px 24px', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.9rem', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid var(--gold-border)', background: 'transparent', color: 'var(--cream-muted)' }}>
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 1: URL input ── */}
            {step === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Field label="kithara.to song URL">
                  <VInput
                    type="url"
                    placeholder="https://kithara.to/stixoi/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                    autoFocus
                  />
                </Field>

                <p style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--cream-muted)', lineHeight: 1.6, margin: 0 }}>
                  Paste the full URL of any song page from kithara.to. The title, artist, and chords will be extracted automatically. You can review and edit everything before saving.
                </p>

                {error && (
                  <div style={{ padding: '12px 16px', border: '1px solid rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.07)', color: 'var(--red-tuning)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleFetch}
                  disabled={loading}
                  style={{
                    padding: '13px 0',
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em',
                    textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer',
                    border: '1px solid var(--gold-border-mid)',
                    background: loading ? 'transparent' : 'linear-gradient(135deg, rgba(122,92,16,0.6), rgba(90,68,24,0.4))',
                    color: loading ? 'var(--cream-muted)' : 'var(--gold-bright)',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Fetching…' : 'Fetch Song →'}
                </button>
              </div>
            )}

            {/* ── Step 2: Preview & edit ── */}
            {step === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {lyricsBlocked && (
                  <div style={{
                    padding: '12px 16px',
                    border: '1px solid rgba(200,152,32,0.3)',
                    background: 'rgba(200,152,32,0.06)',
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '0.95rem', fontStyle: 'italic',
                    color: 'var(--cream-soft)', lineHeight: 1.6,
                  }}>
                    ⚠ The full lyrics were protected by kithara.to — only a preview excerpt was extracted. You can paste the complete lyrics manually below.
                  </div>
                )}

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

                <Field label={lyricsBlocked ? 'Lyrics (paste manually)' : 'Lyrics'}>
                  <VTextarea
                    placeholder={lyricsBlocked ? 'Paste the lyrics here from kithara.to…' : ''}
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
                      flex: 1, padding: '13px 0',
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em',
                      textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer',
                      border: '1px solid var(--gold-border-mid)',
                      background: saving ? 'transparent' : 'linear-gradient(135deg, rgba(122,92,16,0.6), rgba(90,68,24,0.4))',
                      color: saving ? 'var(--cream-muted)' : 'var(--gold-bright)',
                      transition: 'all 0.2s',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving…' : 'Save to Library'}
                  </button>

                  <button
                    onClick={() => { setStep('url'); setError(''); }}
                    style={{
                      padding: '13px 24px',
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
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
