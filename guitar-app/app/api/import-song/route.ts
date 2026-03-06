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
  const startRe = new RegExp(`<div[^>]+id=["']${id}["'][^>]*>`);
  const startM = startRe.exec(html);
  if (!startM) return null;

  const contentStart = startM.index + startM[0].length;
  let pos = contentStart;
  let depth = 1;

  while (depth > 0) {
    const nextOpen  = html.indexOf('<div',  pos);
    const nextClose = html.indexOf('</div', pos);
    if (nextClose === -1) return null; // malformed HTML
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return html.slice(contentStart, nextClose);
      pos = nextClose + 6;
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

  // Fetch the page — try direct first, fall back to proxy if blocked
  let html: string;
  let httpStatus: number;
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    };

    let res = await fetch(url, { headers });
    httpStatus = res.status;

    if (res.status === 403 || res.status === 429) {
      // Direct fetch blocked — try via allorigins proxy
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const json = await proxyRes.json() as { contents: string; status: { http_code: number } };
        html = json.contents ?? '';
        httpStatus = json.status?.http_code ?? proxyRes.status;
      } else {
        html = await res.text(); // keep the 403 body as fallback
      }
    } else {
      html = await res.text();
    }
  } catch (e) {
    return Response.json({ error: 'Failed to fetch the URL: ' + (e as Error).message }, { status: 502 });
  }

  let title = '';
  let artist = '';
  let lyricsSnippet = '';
  let language: 'greek' | 'english' = 'greek';
  let lyrics = '';
  let chords: string[] = [];
  let lyricsBlocked = false;
  let parseError = '';

  try {
    // ── Title ────────────────────────────────────────────────────────────────
    const titleM = html.match(/<h1[^>]*class="ti"[^>]*>([\s\S]*?)<\/h1>/);
    if (titleM) title = stripHtml(titleM[1]);

    // ── Artist ───────────────────────────────────────────────────────────────
    const artistM = html.match(/<h2[^>]*class="ar"[^>]*>([\s\S]*?)<\/h2>/);
    if (artistM) artist = stripHtml(artistM[1]);

    // ── JSON-LD enrichment ───────────────────────────────────────────────────
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
      if (item['@type'] === 'WebPage') {
        const lang = String(item.inLanguage ?? '');
        if (lang.startsWith('en')) language = 'english';
      }
    }

    // ── Lyrics from #text div ─────────────────────────────────────────────────
    const textDivContent = extractDivById(html, 'text');
    if (textDivContent) {
      lyrics = textDivContent
        .replace(/<a[^>]*class="clickPlay"[^>]*>([^<]+)<\/a>/g, '[$1]')
        .replace(/<\/?(span|a|em|strong|b|i)[^>]*>/g, '')
        .replace(/<\/p>\s*<p[^>]*>/g, '\n\n')
        .replace(/<p[^>]*>/g, '')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<\/div>\s*<div[^>]*>/g, '\n\n')
        .replace(/<\/?div[^>]*>/g, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&shy;/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .split('\n').map((l) => l.trimEnd()).join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
    if (!lyrics) lyrics = lyricsSnippet;

    // ── Chords ────────────────────────────────────────────────────────────────
    const chordSet = new Set<string>();
    const clickPlayRe = /class="clickPlay"[^>]*>([A-G][^<]{0,8})<\/a>/g;
    let cm: RegExpExecArray | null;
    while ((cm = clickPlayRe.exec(html)) !== null) {
      const chord = cm[1].trim().replace(/\s+/g, '');
      if (chord) chordSet.add(chord);
    }
    chords = [...chordSet];

    // ── Lyrics blocked detection ──────────────────────────────────────────────
    lyricsBlocked = html.includes('checkVic') || html.includes('Προστασία υπερφόρτωσης');

  } catch (e) {
    parseError = (e as Error).message;
  }

  return Response.json({
    title,
    artist,
    chords,
    language,
    lyrics,
    lyricsSnippet,
    lyricsBlocked,
    _debug: {
      httpStatus,
      htmlLength: html.length,
      htmlSnippet: html.slice(0, 600),
      hasTitleTag: /<h1[^>]*class="ti"/.test(html),
      hasArtistTag: /<h2[^>]*class="ar"/.test(html),
      hasTextDiv: html.includes('id="text"'),
      hasClickPlay: html.includes('clickPlay'),
      hasJsonLd: html.includes('application/ld+json'),
      parseError,
    },
  });
}
