'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { Song } from '@/types';
import { loadSongById, updateSong, deleteSong } from '@/lib/storage';
import ChordTooltip, { parseLyrics } from '@/components/ChordTooltip';
import { transposeChords, getTransposeLabel } from '@/lib/transpose';
import FavoriteButton from '@/components/FavoriteButton';
import Comments from '@/components/Comments';
import { exportSongPdf } from '@/lib/pdf';
import { useAuth } from '@/lib/auth';
import Flag from '@/components/Flag';

// ── Shared style helpers ────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6rem',
  letterSpacing: '0.45em',
  textTransform: 'uppercase',
  color: 'var(--gold-dim)',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  marginBottom: '8px',
};

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

function VintageInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; props.onFocus?.(e); }}
      onBlur={(e)  => { e.target.style.borderColor = 'var(--gold-border-mid)'; props.onBlur?.(e); }}
    />
  );
}

function VintageTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        minHeight: '260px',
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
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          style={{
            flex: 1, padding: '10px 0',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            cursor: 'pointer', border: 'none',
            borderRight: i === 0 ? '1px solid var(--gold-border)' : 'none',
            background: value === lang ? 'linear-gradient(135deg, rgba(0,196,180,0.2), rgba(0,196,180,0.08))' : 'transparent',
            color: value === lang ? 'var(--gold-bright)' : 'var(--cream-muted)',
            transition: 'all 0.15s',
          }}
        >
          <Flag lang={lang} withLabel />
        </button>
      ))}
    </div>
  );
}

// ── Auto-scroll bar ─────────────────────────────────────────────────────────
function AutoScrollBar({ hasLyrics }: { hasLyrics: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed]     = useState(1.0);
  const speedRef  = useRef(speed);
  const accumRef  = useRef(0);   // fractional pixel accumulator
  const rafRef    = useRef<number | null>(null);

  // Keep ref in sync so the RAF loop always sees the latest speed
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const scroll = useCallback(() => {
    // Accumulate fractional pixels — avoids sub-pixel rounding to 0
    accumRef.current += speedRef.current * 0.6;
    const px = Math.floor(accumRef.current);
    if (px > 0) {
      window.scrollBy(0, px);
      accumRef.current -= px;
    }
    rafRef.current = requestAnimationFrame(scroll);
  }, []); // stable — reads speed via ref, never re-creates

  useEffect(() => {
    if (playing) {
      accumRef.current = 0;
      rafRef.current = requestAnimationFrame(scroll);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, scroll]);

  if (!hasLyrics) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 100,
      background: 'rgba(6,6,6,0.92)',
      border: '1px solid var(--gold-border-mid)',
      backdropFilter: 'blur(12px)',
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,196,180,0.06)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '0.55rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--gold-dim)' }}>
        Auto-scroll
      </span>

      <button
        onClick={() => setPlaying((p) => !p)}
        style={{
          width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
          border: `1px solid ${playing ? 'var(--gold-bright)' : 'var(--gold-border-mid)'}`,
          background: playing ? 'rgba(0,196,180,0.2)' : 'transparent',
          color: playing ? 'var(--gold-bright)' : 'var(--cream-soft)',
          fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setSpeed((s) => Math.max(0.2, +(s - 0.2).toFixed(1)))}
          style={scrollNudge}
        >−</button>
        <span style={{ fontSize: '0.75rem', color: 'var(--cream-soft)', minWidth: '28px', textAlign: 'center' }}>
          {speed.toFixed(1)}×
        </span>
        <button
          onClick={() => setSpeed((s) => Math.min(5, +(s + 0.2).toFixed(1)))}
          style={scrollNudge}
        >+</button>
      </div>
    </div>
  );
}

const scrollNudge: React.CSSProperties = {
  minWidth: '40px', height: '40px', padding: '0 10px',
  cursor: 'pointer',
  border: '1px solid var(--gold-border-mid)',
  background: 'rgba(0,196,180,0.08)', color: 'var(--gold-bright)',
  fontSize: '1.1rem', fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};

// ── Page component ──────────────────────────────────────────────────────────
export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const fromPlaylist = searchParams.get('from') === 'playlist';
  const playlistId = searchParams.get('playlistId');
  const playlistName = searchParams.get('playlistName');
  const fromPage = searchParams.get('fromPage');
  const fromLang = searchParams.get('fromLang');
  const fromQ    = searchParams.get('fromQ');

  const buildMySongsUrl = () => {
    const params = new URLSearchParams();
    if (fromLang) params.set('lang', fromLang);
    if (fromPage) params.set('page', fromPage);
    if (fromQ)    params.set('q', fromQ);
    const qs = params.toString();
    return qs ? `/songs?${qs}` : '/songs';
  };

  const [song,            setSong]            = useState<Song | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [editMode,        setEditMode]        = useState(false);
  const [transposeOffset, setTransposeOffset] = useState(0);
  const [edited, setEdited] = useState({
    title: '', artist: '', chords: '', lyrics: '', notes: '',
    language: 'english' as 'greek' | 'english',
    bpm: '' as string,
    youtubeUrl: '' as string,
  });
  const [lyricsFullscreen, setLyricsFullscreen] = useState(false);
  const [fullscreenFontSize, setFullscreenFontSize] = useState(1.1);

  // Lock body scroll while fullscreen overlay is open so the underlying sticky
  // top bar can't peek through and create a "double navbar" look.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (lyricsFullscreen) {
      document.body.classList.add('scroll-locked');
      return () => document.body.classList.remove('scroll-locked');
    }
  }, [lyricsFullscreen]);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [videoUrlDraft, setVideoUrlDraft] = useState('');
  const [searchingVideo, setSearchingVideo] = useState(false);

  const extractVideoId = (input: string): string | null => {
    if (!input) return null;
    // Already a plain video ID (11 chars)
    if (/^[\w-]{11}$/.test(input)) return input;
    // youtu.be/VIDEO_ID
    const shortMatch = input.match(/youtu\.be\/([\w-]{11})/);
    if (shortMatch) return shortMatch[1];
    // youtube.com/watch?v=VIDEO_ID or youtube.com/embed/VIDEO_ID
    const longMatch = input.match(/youtube\.com\/(?:watch\?.*v=|embed\/)([\w-]{11})/);
    if (longMatch) return longMatch[1];
    return null;
  };

  const searchYouTube = async (artist: string, title: string) => {
    setSearchingVideo(true);
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(`/api/youtube-search?q=${q}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      if (data.videoId) {
        const updated = { ...song!, youtubeVideoId: data.videoId };
        await updateSong(song!.id, updated);
        setSong(updated);
      }
    } catch {
      alert('YouTube search failed. Try pasting a URL manually.');
    }
    setSearchingVideo(false);
  };

  const saveVideoId = async (videoId: string | undefined) => {
    if (!song) return;
    const updated = { ...song, youtubeVideoId: videoId };
    await updateSong(song.id, updated);
    setSong(updated);
    setShowVideoUrlInput(false);
    setVideoUrlDraft('');
  };

  useEffect(() => {
    loadSongById(id).then((found) => {
      setSong(found);
      if (found) {
        setEdited({
          title: found.title, artist: found.artist,
          chords: found.chords.join(', '),
          lyrics: found.lyrics ?? '', notes: found.notes ?? '',
          language: found.language,
          bpm: found.bpm != null ? String(found.bpm) : '',
          youtubeUrl: found.youtubeVideoId ?? '',
        });
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!song || !edited.title || !edited.artist) { alert('Title and artist are required.'); return; }
    const bpmVal = edited.bpm ? parseInt(edited.bpm, 10) : undefined;
    const updated: Song = {
      ...song,
      title: edited.title, artist: edited.artist,
      chords: edited.chords.split(',').map((c) => c.trim()).filter(Boolean),
      lyrics: edited.lyrics || undefined, notes: edited.notes || undefined,
      language: edited.language,
      bpm: Number.isFinite(bpmVal) ? bpmVal : undefined,
      youtubeVideoId: edited.youtubeUrl || undefined,
    };
    try {
      await updateSong(song.id, updated);
      setSong(updated);
      setEditMode(false);
    } catch { alert('Failed to save. Please try again.'); }
  };

  const handleDelete = async () => {
    if (!song || !confirm('Delete this song?')) return;
    try {
      await deleteSong(song.id);
      router.push('/');
    } catch { alert('Failed to delete.'); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-deep)',
      }}>
        <div style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.2rem', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'var(--cream-muted)',
        }}>
          Loading…
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!song) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', gap: '24px',
      }}>
        <div style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.5rem', color: 'var(--cream-muted)', letterSpacing: '0.1em',
        }}>
          Song not found
        </div>
        <button onClick={() => router.push('/')} style={backBtnStyle}>← Back</button>
      </div>
    );
  }

  const displayChords = transposeOffset !== 0
    ? transposeChords(song.chords, transposeOffset)
    : song.chords;

  const transposeLabel = getTransposeLabel(transposeOffset);

  // ── Full page view / edit ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', paddingBottom: '80px' }}>
      {/* ── Top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', height: '60px',
      }}>
        {/* Back button */}
        {fromPlaylist && playlistId ? (
          <button onClick={() => router.push(`/playlists?active=${playlistId}`)} style={backBtnStyle}>
            ← {playlistName ? decodeURIComponent(playlistName) : 'Playlist'}
          </button>
        ) : (
          <button onClick={() => router.push(buildMySongsUrl())} style={backBtnStyle}>
            ← Songs
          </button>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!editMode && <FavoriteButton songId={id} />}
          {!editMode && song && (
            <ActionBtn onClick={() => exportSongPdf(song)} prominent title="Download song as PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
                <path d="M12 12v6" />
                <path d="m9 15 3 3 3-3" />
              </svg>
              PDF
            </ActionBtn>
          )}
          {editMode ? (
            <>
              <ActionBtn onClick={handleSave} gold>Save</ActionBtn>
              <ActionBtn onClick={() => setEditMode(false)}>Cancel</ActionBtn>
            </>
          ) : (
            user && song && song.userId === user.id && (
              <>
                <ActionBtn onClick={() => setEditMode(true)} gold>Edit</ActionBtn>
                <ActionBtn onClick={handleDelete} danger>Delete</ActionBtn>
              </>
            )
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) clamp(20px, 4vw, 48px)',
      }}>
        {editMode ? (
          /* ── Edit form ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '0.6rem', letterSpacing: '0.5em', textTransform: 'uppercase',
              color: 'var(--gold-dim)', marginBottom: '4px',
            }}>
              Editing
            </div>
            <div><label style={labelStyle}>Title *</label><VintageInput value={edited.title} onChange={(e) => setEdited({ ...edited, title: e.target.value })} /></div>
            <div><label style={labelStyle}>Artist *</label><VintageInput value={edited.artist} onChange={(e) => setEdited({ ...edited, artist: e.target.value })} /></div>
            <div><label style={labelStyle}>Chords</label><VintageInput value={edited.chords} placeholder="Am, F, Dm, Em" onChange={(e) => setEdited({ ...edited, chords: e.target.value })} /></div>
            <div><label style={labelStyle}>BPM</label><VintageInput type="number" min={40} max={240} value={edited.bpm} placeholder="e.g. 120" onChange={(e) => setEdited({ ...edited, bpm: e.target.value })} /></div>
            <div><label style={labelStyle}>Language</label><LangToggle value={edited.language} onChange={(v) => setEdited({ ...edited, language: v })} /></div>
            <div><label style={labelStyle}>Notes</label><VintageInput value={edited.notes} onChange={(e) => setEdited({ ...edited, notes: e.target.value })} /></div>
            <div><label style={labelStyle}>YouTube Video ID or URL</label><VintageInput value={edited.youtubeUrl} placeholder="e.g. dQw4w9WgXcQ or paste YouTube URL" onChange={(e) => setEdited({ ...edited, youtubeUrl: e.target.value })} /></div>
            <div><label style={labelStyle}>Lyrics</label><VintageTextarea value={edited.lyrics} onChange={(e) => setEdited({ ...edited, lyrics: e.target.value })} /></div>
          </div>
        ) : (
          /* ── View — two-column layout (collapses to one on mobile) ── */
          <div className="song-two-col">
            {/* ── LEFT: metadata ── */}
            <div className="song-sidebar">
              {/* Language flag (small) */}
              <div style={{ marginBottom: '10px', fontSize: '1.1rem', lineHeight: 1 }}>
                <Flag lang={song.language} style={{ width: '1.6em', height: '1.15em' }} />
              </div>

              {/* Uploader attribution */}
              {song.uploaderUsername && (
                <div style={{
                  fontSize: '0.72rem', letterSpacing: '0.15em', color: 'var(--cream-muted)',
                  fontFamily: 'var(--font-cormorant, Georgia, serif)', marginBottom: '14px',
                }}>
                  Uploaded by{' '}
                  <Link href={`/u/${song.uploaderUsername}`} style={{ color: 'var(--gold-bright)', textDecoration: 'none' }}>
                    @{song.uploaderUsername}
                  </Link>
                </div>
              )}

              {/* Title */}
              <h1 style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
                fontWeight: 600, letterSpacing: '0.03em',
                color: 'var(--gold-bright)', margin: '0 0 10px',
                textShadow: '0 0 60px rgba(0,232,213,0.15)',
                lineHeight: 1.1,
              }}>
                {song.title}
              </h1>

              {/* Artist */}
              <p style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                fontStyle: 'italic', color: 'var(--cream-soft)', margin: '0 0 16px',
              }}>
                {song.artist}
              </p>

              {/* Star rating */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '28px' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (song.rating ?? 0);
                  return (
                    <span
                      key={star}
                      onClick={async () => {
                        const newRating = song.rating === star ? undefined : star;
                        const updated = { ...song, rating: newRating };
                        await updateSong(song.id, updated);
                        setSong(updated);
                      }}
                      style={{
                        fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
                        color: filled ? '#f5a623' : 'var(--cream-muted)',
                        opacity: filled ? 1 : 0.3,
                        transition: 'color 0.12s, opacity 0.12s',
                        userSelect: 'none',
                      }}
                    >
                      ★
                    </span>
                  );
                })}
              </div>

              {/* YouTube Player */}
              <section style={{ marginBottom: '28px' }}>
                {song.youtubeVideoId ? (
                  <>
                    <div style={{
                      position: 'relative', width: '100%', paddingBottom: '56.25%',
                      background: '#000', border: '1px solid var(--gold-border)',
                      overflow: 'hidden',
                    }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${song.youtubeVideoId}`}
                        title="YouTube video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{
                          position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%', border: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => { setShowVideoUrlInput(true); setVideoUrlDraft(''); }}
                        style={videoBtnStyle}
                      >
                        Change video
                      </button>
                      <button
                        onClick={() => searchYouTube(song.artist, song.title)}
                        disabled={searchingVideo}
                        style={{ ...videoBtnStyle, opacity: searchingVideo ? 0.5 : 1 }}
                      >
                        {searchingVideo ? 'Searching...' : 'Auto-find'}
                      </button>
                      <button
                        onClick={() => saveVideoId(undefined)}
                        style={{ ...videoBtnStyle, color: 'var(--red-tuning)', borderColor: 'rgba(224,72,72,0.3)' }}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{
                    border: '1px dashed var(--gold-border)',
                    padding: '20px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--gold-dim)', marginBottom: '12px' }}>
                      YouTube Video
                    </div>
                    <button
                      onClick={() => searchYouTube(song.artist, song.title)}
                      disabled={searchingVideo}
                      style={{
                        ...videoBtnStyle,
                        padding: '10px 20px',
                        background: 'rgba(0,196,180,0.1)',
                        opacity: searchingVideo ? 0.5 : 1,
                      }}
                    >
                      {searchingVideo ? 'Searching...' : 'Find on YouTube'}
                    </button>
                    <button
                      onClick={() => setShowVideoUrlInput(true)}
                      style={{ ...videoBtnStyle, marginLeft: '8px', padding: '10px 20px' }}
                    >
                      Paste URL
                    </button>
                  </div>
                )}

                {showVideoUrlInput && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                    <input
                      value={videoUrlDraft}
                      onChange={(e) => setVideoUrlDraft(e.target.value)}
                      placeholder="Paste YouTube URL..."
                      style={{
                        ...inputStyle, flex: 1, padding: '8px 12px', fontSize: '0.85rem',
                      }}
                    />
                    <button
                      onClick={() => {
                        const vid = extractVideoId(videoUrlDraft);
                        if (vid) saveVideoId(vid);
                        else alert('Invalid YouTube URL');
                      }}
                      style={{ ...videoBtnStyle, padding: '8px 14px', background: 'rgba(0,196,180,0.1)' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowVideoUrlInput(false); setVideoUrlDraft(''); }}
                      style={videoBtnStyle}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </section>

              {/* Divider */}
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, var(--gold-border-mid), transparent)',
                marginBottom: '28px',
              }} />

              {/* Chords + Transpose */}
              {song.chords.length > 0 && (
                <section style={{ marginBottom: '28px' }}>
                  {/* Transpose controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={labelStyle}>Chords</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => setTransposeOffset((o) => o - 1)} style={transBtn}>−</button>
                      <span style={{
                        fontSize: '0.7rem', minWidth: '36px', textAlign: 'center',
                        color: transposeOffset !== 0 ? 'var(--gold-bright)' : 'var(--cream-muted)',
                        letterSpacing: '0.1em',
                      }}>
                        {transposeLabel}
                      </span>
                      <button onClick={() => setTransposeOffset((o) => o + 1)} style={transBtn}>+</button>
                      {transposeOffset !== 0 && (
                        <button
                          onClick={() => setTransposeOffset(0)}
                          style={{ ...transBtn, fontSize: '0.6rem', padding: '0 6px', letterSpacing: '0.1em' }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {displayChords.map((chord, idx) => (
                      <ChordTooltip key={idx} name={chord}>
                        <span className="chord-chip" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          border: '1px solid var(--gold-border-mid)',
                          background: 'rgba(0,196,180,0.1)',
                          fontFamily: 'var(--font-cormorant, Georgia, serif)',
                          fontSize: '1.1rem', fontWeight: 600,
                          color: 'var(--gold-bright)', letterSpacing: '0.06em',
                          cursor: 'pointer',
                          minHeight: '44px',
                          boxSizing: 'border-box',
                        }}>
                          {chord}
                        </span>
                      </ChordTooltip>
                    ))}
                  </div>

                </section>
              )}

              {/* Notes */}
              {song.notes && (
                <section>
                  <div style={labelStyle}>Notes</div>
                  <p style={{
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '1rem', fontStyle: 'italic',
                    color: 'var(--cream-soft)', lineHeight: 1.7,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--gold-border)',
                    padding: '16px 20px', margin: 0,
                  }}>
                    {song.notes}
                  </p>
                </section>
              )}
            </div>

            {/* ── RIGHT: lyrics ── */}
            <div>
              {song.lyrics ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={labelStyle}>Lyrics</div>
                    <button
                      onClick={() => setLyricsFullscreen(true)}
                      title="Expand lyrics fullscreen"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 18px', minHeight: '44px',
                        fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
                        fontFamily: 'var(--font-cormorant, Georgia, serif)',
                        cursor: 'pointer',
                        border: '1px solid var(--gold-border-mid)',
                        background: 'linear-gradient(135deg, rgba(0,130,120,0.35), rgba(0,90,83,0.15))',
                        color: 'var(--gold-bright)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 3h6v6" />
                        <path d="M9 21H3v-6" />
                        <path d="M21 3 14 10" />
                        <path d="M3 21l7-7" />
                      </svg>
                      Expand
                    </button>
                  </div>
                  <pre className="lyrics-pre" style={{
                    whiteSpace: 'pre',
                    fontFamily: 'var(--font-ibm-mono, monospace)',
                    fontSize: 'clamp(0.78rem, 1.4vw, 1rem)',
                    color: 'var(--cream-soft)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--gold-border)',
                    padding: 'clamp(16px, 3vw, 36px)',
                    margin: 0, lineHeight: 1.9,
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                  }}>
                    {parseLyrics(song.lyrics).map((seg, i) => {
                      if (seg.type !== 'chord') return <span key={i}>{seg.content}</span>;
                      const rendered = transposeOffset !== 0
                        ? transposeChords([seg.content], transposeOffset)[0]
                        : seg.content;
                      const slotLen = Math.max(seg.content.length, rendered.length);
                      return (
                        <ChordTooltip key={i} name={rendered}>
                          <span className="chord-inline" style={{
                            color: 'var(--gold-bright)',
                            fontWeight: 600,
                            cursor: 'default',
                            borderBottom: '1px dashed rgba(0,196,180,0.45)',
                            paddingBottom: '1px',
                            width: `${slotLen}ch`,
                          }}>
                            {rendered}
                          </span>
                        </ChordTooltip>
                      );
                    })}
                  </pre>
                </>
              ) : (
                <div style={{
                  border: '1px solid var(--gold-border)',
                  background: 'var(--bg-card)',
                  padding: '48px 32px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: '1.1rem', fontStyle: 'italic',
                  color: 'var(--cream-muted)',
                  letterSpacing: '0.05em',
                }}>
                  No lyrics added yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen lyrics overlay */}
      {lyricsFullscreen && song.lyrics && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'var(--bg-deep)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--gold-border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '1.1rem', color: 'var(--gold-bright)', fontWeight: 600,
              }}>
                {song.title}
              </span>
              <span style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '0.9rem', color: 'var(--cream-muted)', fontStyle: 'italic',
              }}>
                {song.artist}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.55rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold-dim)' }}>
                Size
              </span>
              <button
                onClick={() => setFullscreenFontSize((s) => Math.max(0.6, +(s - 0.1).toFixed(1)))}
                style={scrollNudge}
              >−</button>
              <span style={{ fontSize: '0.75rem', color: 'var(--cream-soft)', minWidth: '32px', textAlign: 'center' }}>
                {fullscreenFontSize.toFixed(1)}
              </span>
              <button
                onClick={() => setFullscreenFontSize((s) => Math.min(2.5, +(s + 0.1).toFixed(1)))}
                style={scrollNudge}
              >+</button>
              <button
                onClick={() => setLyricsFullscreen(false)}
                style={{
                  marginLeft: '12px',
                  padding: '8px 18px',
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  border: '1px solid var(--gold-border-mid)',
                  background: 'transparent', color: 'var(--cream-muted)',
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* Lyrics content */}
          <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' as const }}>
            <pre style={{
              whiteSpace: 'pre',
              fontFamily: 'var(--font-ibm-mono, monospace)',
              fontSize: `${fullscreenFontSize}rem`,
              color: 'var(--cream-soft)',
              padding: 'clamp(20px, 4vw, 48px)',
              margin: 0, lineHeight: 2.0,
              overflowX: 'auto',
            }}>
              {parseLyrics(song.lyrics).map((seg, i) => {
                if (seg.type !== 'chord') return <span key={i}>{seg.content}</span>;
                const rendered = transposeOffset !== 0
                  ? transposeChords([seg.content], transposeOffset)[0]
                  : seg.content;
                const slotLen = Math.max(seg.content.length, rendered.length);
                return (
                  <ChordTooltip key={i} name={rendered}>
                    <span className="chord-inline" style={{
                      color: 'var(--gold-bright)',
                      fontWeight: 600,
                      cursor: 'default',
                      borderBottom: '1px dashed rgba(0,196,180,0.45)',
                      paddingBottom: '1px',
                      width: `${slotLen}ch`,
                    }}>
                      {rendered}
                    </span>
                  </ChordTooltip>
                );
              })}
            </pre>
          </div>
        </div>
      )}

      {/* Comments */}
      {!editMode && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(20px, 4vw, 48px) 32px' }}>
          <Comments songId={song.id} />
        </div>
      )}

      {/* Auto-scroll floating bar */}
      {!editMode && <AutoScrollBar hasLyrics={!!song.lyrics} />}
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────
const backBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
  textTransform: 'uppercase', cursor: 'pointer',
  border: '1px solid var(--gold-border-mid)',
  background: 'transparent', color: 'var(--cream-muted)',
  transition: 'all 0.15s',
  display: 'flex', alignItems: 'center', gap: '8px',
  minHeight: '44px', whiteSpace: 'nowrap' as const,
};

const transBtn: React.CSSProperties = {
  minWidth: '40px', height: '40px', padding: '0 10px',
  cursor: 'pointer',
  border: '1px solid var(--gold-border-mid)',
  background: 'rgba(0,196,180,0.08)', color: 'var(--gold-bright)',
  fontSize: '1.1rem', fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};

const videoBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  cursor: 'pointer',
  border: '1px solid var(--gold-border)',
  background: 'transparent', color: 'var(--cream-muted)',
  transition: 'all 0.15s',
};

function ActionBtn({ onClick, children, gold, danger, prominent, title }: {
  onClick: () => void; children: React.ReactNode;
  gold?: boolean; danger?: boolean; prominent?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: prominent ? '11px 22px' : '10px 20px',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: prominent ? '0.92rem' : '0.85rem', fontWeight: 600, letterSpacing: '0.2em',
        textTransform: 'uppercase', cursor: 'pointer',
        border: danger ? '1px solid rgba(224,72,72,0.45)'
               : gold || prominent ? '1px solid var(--gold-border-mid)'
               :         '1px solid var(--gold-border)',
        background: danger ? 'rgba(224,72,72,0.08)'
                  : prominent ? 'linear-gradient(135deg, rgba(0,130,120,0.5), rgba(0,90,83,0.3))'
                  : gold   ? 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))'
                  :          'transparent',
        color: danger ? 'var(--red-tuning)' : (gold || prominent) ? 'var(--gold-bright)' : 'var(--cream-muted)',
        transition: 'all 0.15s',
        minHeight: '44px',
      }}
    >
      {children}
    </button>
  );
}
