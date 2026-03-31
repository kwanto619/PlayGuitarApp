import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    console.error('YouTube API error:', err);
    return NextResponse.json({ error: 'YouTube search failed' }, { status: 502 });
  }

  const data = await res.json();
  const videoId = data.items?.[0]?.id?.videoId ?? null;
  const title = data.items?.[0]?.snippet?.title ?? null;

  return NextResponse.json({ videoId, title });
}
