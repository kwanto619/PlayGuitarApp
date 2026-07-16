import { NextRequest } from 'next/server';

// Only fetch from the tab sites the importer knows how to parse (prevents SSRF)
const ALLOWED_HOSTS = [
  'kithara.to',
  'tabsy.gr',
  'ultimate-guitar.com',
  'tabs4acoustic.com',
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h));
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

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
    return Response.json({ error: 'URL is not from a supported site' }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    return Response.json({ html, status: res.status });
  } catch (e) {
    return Response.json({ error: 'Failed to fetch the URL: ' + (e as Error).message }, { status: 502 });
  }
}
