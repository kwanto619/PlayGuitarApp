import { NextRequest } from 'next/server';

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&shy;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\u201c|\u201d|\u00ab|\u00bb|"|"/g, '') // remove decorative quotes
    .trim();
}

/** Extract the full inner HTML of the first <div id="id"> accounting for nested divs */
function extractDivById(html: string, id: string): string | null {
  const startRe = new RegExp(`<div[^>]+id="${id}"[^>]*>`);
  const startM = startRe.exec(html);
  if (!startM) return null;

  const contentStart = startM.index + startM[0].length;
  let depth = 1;
  let i = contentStart;

  while (i < html.length && depth > 0) {
    if (html[i] === '<') {
      if (html.slice(i, i + 5) === '</div') {
        depth--;
        if (depth === 0) return html.slice(contentStart, i);
        // skip to '>'
        i = html.indexOf('>', i) + 1;
      } else if (html.slice(i, i + 4) === '<div') {
        depth++;
        i = html.indexOf('>', i) + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  return null;
}

function parseJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      results.push(...arr);
    } catch { /* skip malformed */ }
  }
  return results;
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }

  // Fetch the page server-side (no CORS restrictions here)
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });
    html = await res.text();
  } catch (e) {
    return Response.json({ error: 'Failed to fetch the URL: ' + (e as Error).message }, { status: 502 });
  }

  // ── Title ──────────────────────────────────────────────────────────────────
  let title = '';
  const titleM = html.match(/<h1[^>]*class="ti"[^>]*>([\s\S]*?)<\/h1>/);
  if (titleM) title = stripHtml(titleM[1]);

  // ── Artist ─────────────────────────────────────────────────────────────────
  let artist = '';
  const artistM = html.match(/<h2[^>]*class="ar"[^>]*>([\s\S]*?)<\/h2>/);
  if (artistM) artist = stripHtml(artistM[1]);

  // ── JSON-LD enrichment ─────────────────────────────────────────────────────
  let lyricsSnippet = '';
  let language: 'greek' | 'english' = 'greek';

  const jsonLdItems = parseJsonLd(html);
  for (const item of jsonLdItems) {
    if (item['@type'] === 'MusicComposition') {
      if (!title && item.name) title = stripHtml(String(item.name));
      if (!artist) {
        const rec = item.recordedAs as Record<string, unknown> | undefined;
        const byArtist = rec?.byArtist as Record<string, unknown> | undefined;
        if (byArtist?.name) artist = stripHtml(String(byArtist.name));
      }
      const lyricsObj = item.lyrics as Record<string, unknown> | undefined;
      if (lyricsObj?.text && !lyricsSnippet) {
        lyricsSnippet = stripHtml(String(lyricsObj.text));
      }
      const lang = String(item.inLanguage ?? '');
      if (lang.startsWith('en')) language = 'english';
    }
    // Also check WebPage type for inLanguage
    if (item['@type'] === 'WebPage') {
      const lang = String(item.inLanguage ?? '');
      if (lang.startsWith('en')) language = 'english';
    }
  }

  // ── Lyrics from #text div ──────────────────────────────────────────────────
  let lyrics = '';
  const textDivContent = extractDivById(html, 'text');
  if (textDivContent) {
    lyrics = textDivContent
      // Replace any clickPlay anchor (chords) with [ChordName]
      .replace(/<a[^>]*class="clickPlay"[^>]*>([^<]+)<\/a>/g, '[$1]')
      // Strip remaining span/a tags but keep their text content
      .replace(/<\/?(span|a|em|strong|b|i)[^>]*>/g, '')
      // Paragraph breaks → double newline
      .replace(/<\/p>\s*<p[^>]*>/g, '\n\n')
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '\n\n')
      // div breaks
      .replace(/<\/div>\s*<div[^>]*>/g, '\n\n')
      .replace(/<\/?div[^>]*>/g, '\n')
      // Line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Strip any remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&shy;/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Trim trailing spaces on each line
      .split('\n').map((l) => l.trimEnd()).join('\n')
      // Collapse 3+ blank lines to 2
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Fall back to JSON-LD snippet if #text div wasn't found
  if (!lyrics) lyrics = lyricsSnippet;

  // ── Chords ─────────────────────────────────────────────────────────────────
  // Parse ALL clickPlay chord links from the full page
  const chordSet = new Set<string>();
  const clickPlayRe = /class="clickPlay"[^>]*>([A-G][^<]{0,8})<\/a>/g;
  let cm: RegExpExecArray | null;
  while ((cm = clickPlayRe.exec(html)) !== null) {
    const chord = cm[1].trim().replace(/\s+/g, '');
    if (chord) chordSet.add(chord);
  }
  const chords = [...chordSet];

  // ── Lyrics availability ────────────────────────────────────────────────────
  const lyricsBlocked = html.includes('checkVic') || html.includes('Προστασία υπερφόρτωσης');

  return Response.json({
    title,
    artist,
    chords,
    language,
    lyrics,
    lyricsSnippet,
    lyricsBlocked,
  });
}
