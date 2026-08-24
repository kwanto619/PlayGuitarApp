'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Song } from '@/types';
import { loadSongs, addSong, deleteSong, subscribeSongs, loadPlayCounts } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import GeneralImport from './GeneralImport';
import Flag from './Flag';
import RatingStars from './RatingStars';
import { useRatings } from '@/lib/useRatings';

type PlayCounts = Record<string, number>;
type SortKey = 'newest' | 'oldest' | 'rating' | 'watched';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',  label: 'Newest first' },
  { value: 'oldest',  label: 'Oldest first' },
  { value: 'rating',  label: 'Top rated' },
  { value: 'watched', label: 'Most watched' },
];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  letterSpacing: '0.4em',
  textTransform: 'uppercase',
  color: 'var(--gold-dim)',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  marginBottom: '6px',
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

function VintageInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...style }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; props.onFocus?.(e); }}
      onBlur={(e)  => { e.target.style.borderColor = 'var(--gold-border-mid)'; props.onBlur?.(e); }}
    />
  );
}

function VintageTextarea({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, minHeight: '180px', resize: 'vertical', fontFamily: 'var(--font-ibm-mono, monospace)', fontSize: '0.9rem', ...style }}
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

function PrimaryBtn({ onClick, children, danger = false }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 28px',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.22em',
        textTransform: 'uppercase', cursor: 'pointer',
        border: danger ? '1px solid rgba(224,72,72,0.45)' : '1px solid var(--gold-border-mid)',
        background: danger
          ? 'linear-gradient(135deg, rgba(224,72,72,0.12), rgba(224,72,72,0.06))'
          : 'linear-gradient(135deg, rgba(13,148,136,0.16), rgba(13,148,136,0.04))',
        color: danger ? 'var(--red-tuning)' : 'var(--gold-bright)',
        transition: 'all 0.18s', whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  );
}

const corners: React.CSSProperties[] = [
  { top: 8,    left: 8,   borderTop:    '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
  { top: 8,    right: 8,  borderTop:    '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
  { bottom: 8, left: 8,   borderBottom: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
  { bottom: 8, right: 8,  borderBottom: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
];

export default function SongsLibrary() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [songs,          setSongs]          = useState<Song[]>([]);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const initialLang = (searchParams.get('lang') as 'all' | 'greek' | 'english' | null) || 'all';
  const [languageFilter, setLanguageFilter] = useState<'all' | 'greek' | 'english'>(
    initialLang === 'greek' || initialLang === 'english' ? initialLang : 'all'
  );
  const [search,         setSearch]         = useState(searchParams.get('q') || '');
  const initialSort = searchParams.get('sort') as SortKey | null;
  const [sort,           setSort]           = useState<SortKey>(
    initialSort && SORT_OPTIONS.some((o) => o.value === initialSort) ? initialSort : 'newest'
  );
  const [playCounts,     setPlayCounts]     = useState<PlayCounts>({});
  const { summaryOf } = useRatings();
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const [page,           setPage]           = useState(initialPage);
  const PAGE_SIZE = 20;

  // Load this user's view counts from the DB (cross-device) on mount.
  useEffect(() => { loadPlayCounts().then(setPlayCounts); }, []);

  // Keep URL in sync with filter/page/search so back-nav restores state
  useEffect(() => {
    const params = new URLSearchParams();
    if (languageFilter !== 'all') params.set('lang', languageFilter);
    if (sort !== 'newest') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    if (search.trim()) params.set('q', search.trim());
    const qs = params.toString();
    router.replace(qs ? `/songs?${qs}` : '/songs', { scroll: false });
  }, [languageFilter, sort, page, search, router]);

  // Scroll to top when user changes page (skip initial mount so back-nav restore is preserved)
  const firstPageRender = useRef(true);
  useEffect(() => {
    if (firstPageRender.current) { firstPageRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const blankForm = { title: '', artist: '', chords: '', lyrics: '', notes: '', language: 'english' as 'greek' | 'english' };
  const [newSong, setNewSong] = useState(blankForm);

  useEffect(() => {
    loadSongs().then(setSongs);
    // Stay in sync when a background revalidation or mutation updates the cache.
    return subscribeSongs(setSongs);
  }, []);

  const handleAddSong = async () => {
    if (!newSong.title || !newSong.artist) { alert('Title and artist are required!'); return; }
    try {
      // Auto-search YouTube for the song
      let youtubeVideoId: string | undefined;
      try {
        const q = encodeURIComponent(`${newSong.artist} ${newSong.title}`);
        const res = await fetch(`/api/youtube-search?q=${q}`);
        if (res.ok) {
          const data = await res.json();
          if (data.videoId) youtubeVideoId = data.videoId;
        }
      } catch { /* YouTube search is best-effort */ }

      const updated = await addSong({
        title: newSong.title, artist: newSong.artist,
        chords: newSong.chords.split(',').map((c) => c.trim()).filter(Boolean),
        lyrics: newSong.lyrics || undefined,
        notes:  newSong.notes  || undefined,
        language: newSong.language,
        youtubeVideoId,
      });
      setSongs(updated);
      setNewSong(blankForm);
      setShowAddForm(false);
    } catch { alert('Failed to add song. Please try again.'); }
  };

  const handleDeleteSong = async (id: string) => {
    if (!confirm('Delete this song?')) return;
    try {
      const updated = await deleteSong(id);
      setSongs(updated);
    } catch { alert('Failed to delete song. Please try again.'); }
  };

  const filteredSongs = songs.filter((s) => {
    if (languageFilter !== 'all' && s.language !== languageFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    }
    return true;
  });

  const byNewest = (a: Song, b: Song) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    switch (sort) {
      case 'oldest':  return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
      // Ties fall back to newest so ordering is stable & meaningful.
      case 'rating': {
        // Community average first, then vote count, then recency.
        const ra = summaryOf(a.id), rb = summaryOf(b.id);
        return (rb?.avg ?? 0) - (ra?.avg ?? 0) || (rb?.count ?? 0) - (ra?.count ?? 0) || byNewest(a, b);
      }
      case 'watched': return (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0) || byNewest(a, b);
      default:        return byNewest(a, b);
    }
  });

  const totalPages  = Math.max(1, Math.ceil(sortedSongs.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const visibleSongs = sortedSongs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      {/* ── Top bar: actions (left) + search + filter (center) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        marginBottom: '32px', flexWrap: 'wrap',
      }}>
        {/* Left: action buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '0 0 auto' }}>
          <GeneralImport inline onImported={(song) => setSongs((prev) => [song, ...prev])} />
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '9px 16px',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '0.78rem', fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid var(--gold-border-mid)',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.16), rgba(13,148,136,0.04))',
              color: 'var(--gold-bright)', transition: 'all 0.18s',
            }}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Song'}
          </button>
        </div>

        {/* Center: search + language filter */}
        <div style={{
          display: 'flex', alignItems: 'stretch', gap: '10px',
          flex: '1 1 360px', justifyContent: 'center', minWidth: 0, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '460px', minWidth: '200px' }}>
            <span style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--gold-dim)', fontSize: '1rem', pointerEvents: 'none',
            }}>
              ⌕
            </span>
            <VintageInput
              placeholder="Search by title or artist…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '38px', paddingRight: search ? '38px' : '16px' }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'var(--cream-muted)',
                  cursor: 'pointer', fontSize: '1rem', padding: '4px 6px', lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Language filter */}
          <div style={{ display: 'flex', border: '1px solid var(--gold-border)', overflow: 'hidden', flex: '0 0 auto' }}>
            {(
              [
                ['all',     <>All Songs</>],
                ['greek',   <Flag key="gr" lang="greek" withLabel />],
                ['english', <Flag key="gb" lang="english" withLabel />],
              ] as const
            ).map(([val, label], i) => {
              const isActive = languageFilter === val;
              return (
                <button
                  key={val}
                  onClick={() => { setLanguageFilter(val); setPage(1); }}
                  style={{
                    padding: '10px 14px',
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                    cursor: 'pointer', border: 'none',
                    borderRight: i < 2 ? '1px solid var(--gold-border)' : 'none',
                    transition: 'all 0.15s',
                    background: isActive ? 'linear-gradient(135deg, rgba(0,196,180,0.2), rgba(0,196,180,0.08))' : 'transparent',
                    color: isActive ? 'var(--gold-bright)' : 'var(--cream-muted)',
                    fontWeight: isActive ? 600 : 400,
                    minHeight: '44px', whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Add form ── */}
      {showAddForm && (
        <div style={{
          position: 'relative',
          background: 'var(--bg-surface)',
          border: '1px solid var(--gold-border)',
          padding: 'clamp(24px, 4vw, 40px)',
          marginBottom: '36px',
          maxWidth: '760px',
          margin: '0 auto 36px',
          boxShadow: '0 8px 40px rgba(23,58,54,0.06)',
        }}>
          {corners.map((s, i) => <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />)}

          <h3 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1.7rem', fontWeight: 500, letterSpacing: '0.12em',
            color: 'var(--gold)', margin: '0 0 24px',
          }}>
            Add New Song
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div><label style={labelStyle}>Title *</label><VintageInput placeholder="Song title" value={newSong.title} onChange={(e) => setNewSong({ ...newSong, title: e.target.value })} /></div>
            <div><label style={labelStyle}>Artist *</label><VintageInput placeholder="Artist name" value={newSong.artist} onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })} /></div>
            <div><label style={labelStyle}>Chords</label><VintageInput placeholder="Am, F, Dm, Em" value={newSong.chords} onChange={(e) => setNewSong({ ...newSong, chords: e.target.value })} /></div>
            <div><label style={labelStyle}>Language *</label><LangToggle value={newSong.language} onChange={(v) => setNewSong({ ...newSong, language: v })} /></div>
            <div><label style={labelStyle}>Notes</label><VintageInput placeholder="Optional notes" value={newSong.notes} onChange={(e) => setNewSong({ ...newSong, notes: e.target.value })} /></div>
            <div><label style={labelStyle}>Lyrics</label><VintageTextarea placeholder="Optional lyrics..." value={newSong.lyrics} onChange={(e) => setNewSong({ ...newSong, lyrics: e.target.value })} /></div>
            <PrimaryBtn onClick={handleAddSong}>Save Song</PrimaryBtn>
          </div>
        </div>
      )}

      {/* ── Heading ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <h3 style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.8rem', fontWeight: 500, letterSpacing: '0.06em',
          color: 'var(--gold)', margin: 0,
        }}>
          {languageFilter === 'all' ? 'All Songs' : languageFilter === 'greek' ? 'Greek Songs' : 'English Songs'}
        </h3>
        <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--cream-muted)', textTransform: 'uppercase' }}>
          ({filteredSongs.length})
        </span>

        {/* Sort control */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="song-sort" style={{
            fontSize: '0.62rem', letterSpacing: '0.32em', textTransform: 'uppercase',
            color: 'var(--gold-dim)', fontFamily: 'var(--font-cormorant, Georgia, serif)',
          }}>
            Sort
          </label>
          <select
            id="song-sort"
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
            style={{
              padding: '8px 30px 8px 12px',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '0.88rem', letterSpacing: '0.06em',
              background: 'var(--bg-input)',
              border: '1px solid var(--gold-border-mid)',
              color: 'var(--cream)', cursor: 'pointer', outline: 'none',
              minHeight: '40px',
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--gold-dim) 50%), linear-gradient(135deg, var(--gold-dim) 50%, transparent 50%)',
              backgroundPosition: 'right 14px center, right 9px center',
              backgroundSize: '5px 5px, 5px 5px',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: 'var(--bg-surface)', color: 'var(--cream)' }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Song grid ── */}
      {visibleSongs.length === 0 ? (
        <div style={{
          border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
          padding: '48px 24px', textAlign: 'center',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.3rem', color: 'var(--cream-muted)', letterSpacing: '0.05em',
        }}>
          {songs.length === 0
            ? 'No songs yet. Add your first song above.'
            : `No songs match "${search}"`}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {visibleSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onClick={() => {
                // Optimistic bump so re-sorting feels instant; the song page logs the view.
                setPlayCounts((prev) => ({ ...prev, [song.id]: (prev[song.id] ?? 0) + 1 }));
                const params = new URLSearchParams();
                params.set('fromPage', String(safePage));
                if (languageFilter !== 'all') params.set('fromLang', languageFilter);
                if (sort !== 'newest') params.set('fromSort', sort);
                if (search.trim()) params.set('fromQ', search.trim());
                router.push(`/songs/${song.id}?${params.toString()}`);
              }}
              onArtistClick={() => router.push(`/artists/${encodeURIComponent(song.artist)}`)}
              onDelete={user && song.userId === user.id ? () => handleDeleteSong(song.id) : undefined}
              showRating
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '12px', marginTop: '40px',
        }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={paginationBtn(safePage === 1)}
          >
            ← Prev
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: '36px', height: '36px', cursor: 'pointer',
                  border: `1px solid ${p === safePage ? 'var(--gold)' : 'var(--gold-border)'}`,
                  background: p === safePage ? 'rgba(0,196,180,0.15)' : 'transparent',
                  color: p === safePage ? 'var(--gold-bright)' : 'var(--cream-muted)',
                  fontSize: '0.85rem', fontWeight: p === safePage ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={paginationBtn(safePage === totalPages)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const paginationBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 18px', minHeight: '36px', cursor: disabled ? 'not-allowed' : 'pointer',
  border: '1px solid var(--gold-border)',
  background: 'transparent',
  color: disabled ? 'var(--cream-muted)' : 'var(--cream-soft)',
  fontSize: '0.85rem', letterSpacing: '0.1em',
  opacity: disabled ? 0.4 : 1, transition: 'all 0.15s',
});

export function SongCard({ song, onClick, onDelete, showRating, onArtistClick }: {
  song: Song; onClick: () => void;
  onDelete?: () => void; showRating?: boolean; onArtistClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--gold-border-mid)' : 'var(--gold-border)'}`,
        padding: '20px', cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 28px rgba(23,58,54,0.055)' : '0 3px 12px rgba(23,58,54,0.035)',
        position: 'relative',
      }}
    >
      {/* Delete */}
      {onDelete && <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{
          position: 'absolute', top: '8px', right: '8px',
          padding: '8px 12px', fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1rem', cursor: 'pointer',
          border: '1px solid transparent', background: 'transparent',
          color: 'var(--cream-muted)', transition: 'all 0.15s',
          minHeight: '44px', minWidth: '44px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red-tuning)'; e.currentTarget.style.borderColor = 'rgba(224,72,72,0.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cream-muted)'; e.currentTarget.style.borderColor = 'transparent'; }}
      >
        ✕
      </button>}

      <h4 style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '1.4rem', fontWeight: 600,
        color: hovered ? 'var(--gold-bright)' : 'var(--gold)',
        margin: '0 0 4px', letterSpacing: '0.03em',
        paddingRight: '32px', transition: 'color 0.15s',
      }}>
        {song.title}
      </h4>
      <p style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '1rem', fontStyle: 'italic',
        color: 'var(--cream-muted)', margin: '0 0 10px',
      }}>
        {onArtistClick ? (
          <span
            onClick={(e) => { e.stopPropagation(); onArtistClick(); }}
            title={`See all songs by ${song.artist}`}
            style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--gold-border-mid)', textUnderlineOffset: '3px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold-bright)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
          >
            {song.artist}
          </span>
        ) : song.artist}
      </p>

      {showRating && <div style={{ marginBottom: '12px' }}>
        <RatingStars songId={song.id} size="sm" showSignIn={false} />
      </div>}

      {song.chords.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: song.notes ? '10px' : 0 }}>
          {song.chords.map((chord, idx) => (
            <span
              key={idx}
              style={{
                padding: '2px 10px',
                border: '1px solid var(--gold-border-mid)',
                background: 'rgba(0,196,180,0.08)',
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '0.85rem', fontWeight: 600,
                color: 'var(--gold)', letterSpacing: '0.04em',
              }}
            >
              {chord}
            </span>
          ))}
        </div>
      )}

      {song.notes && (
        <p style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.9rem', fontStyle: 'italic',
          color: 'var(--cream-muted)', margin: 0,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {song.notes}
        </p>
      )}
    </div>
  );
}
