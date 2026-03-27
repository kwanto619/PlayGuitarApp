'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Song } from '@/types';
import { loadSongs, addSong, deleteSong, exportSongs, importSongs } from '@/lib/storage';
import GeneralImport from './GeneralImport';

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
          {lang === 'greek' ? '🇬🇷 Greek' : '🇬🇧 English'}
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
          : 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
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
  const [songs,          setSongs]          = useState<Song[]>([]);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [languageFilter, setLanguageFilter] = useState<'all' | 'greek' | 'english'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blankForm = { title: '', artist: '', chords: '', lyrics: '', notes: '', language: 'english' as 'greek' | 'english' };
  const [newSong, setNewSong] = useState(blankForm);

  useEffect(() => { loadSongs().then(setSongs); }, []);

  const handleAddSong = async () => {
    if (!newSong.title || !newSong.artist) { alert('Title and artist are required!'); return; }
    try {
      const updated = await addSong({
        title: newSong.title, artist: newSong.artist,
        chords: newSong.chords.split(',').map((c) => c.trim()).filter(Boolean),
        lyrics: newSong.lyrics || undefined,
        notes:  newSong.notes  || undefined,
        language: newSong.language,
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

  const handleExportSongs = async () => {
    try { await exportSongs(); } catch { alert('Failed to export songs.'); }
  };

  const handleImportSongs = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importSongs(file);
      setSongs(imported);
      alert(`Imported ${imported.length} songs.`);
    } catch { alert('Failed to import songs. Check the file format.'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const visibleSongs = songs.filter((s) => languageFilter === 'all' || s.language === languageFilter);

  return (
    <div>
      {/* ── Kithara import ── */}
      <GeneralImport onImported={(song) => setSongs((prev) => [song, ...prev])} />

      {/* ── Action bar ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '36px', flexWrap: 'wrap' }}>
        <PrimaryBtn onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '✕ Cancel' : '+ Add Song'}
        </PrimaryBtn>

        <button
          onClick={handleExportSongs}
          style={{
            padding: '12px 24px',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
            textTransform: 'uppercase', cursor: 'pointer',
            border: '1px solid rgba(68,136,204,0.4)',
            background: 'rgba(68,136,204,0.08)', color: 'var(--blue-tuning)',
            transition: 'all 0.18s',
          }}
        >
          ⬇ Export
        </button>

        <label style={{
          padding: '12px 24px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
          textTransform: 'uppercase', cursor: 'pointer',
          border: '1px solid rgba(80,232,128,0.3)',
          background: 'rgba(80,232,128,0.07)', color: 'var(--phosphor)',
          transition: 'all 0.18s',
        }}>
          ⬆ Import
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportSongs} style={{ display: 'none' }} />
        </label>
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
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
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

      {/* ── Language filter ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', border: '1px solid var(--gold-border)', overflow: 'hidden' }}>
          {([['all', 'All Songs'], ['greek', '🇬🇷 Greek'], ['english', '🇬🇧 English']] as const).map(([val, label], i) => {
            const isActive = languageFilter === val;
            return (
              <button
                key={val}
                onClick={() => setLanguageFilter(val)}
                style={{
                  padding: '12px 20px',
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: '0.88rem', letterSpacing: '0.16em', textTransform: 'uppercase',
                  cursor: 'pointer', border: 'none',
                  borderRight: i < 2 ? '1px solid var(--gold-border)' : 'none',
                  transition: 'all 0.15s',
                  background: isActive ? 'linear-gradient(135deg, rgba(0,196,180,0.2), rgba(0,196,180,0.08))' : 'transparent',
                  color: isActive ? 'var(--gold-bright)' : 'var(--cream-muted)',
                  fontWeight: isActive ? 600 : 400,
                  minHeight: '44px',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Heading ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
        <h3 style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.8rem', fontWeight: 500, letterSpacing: '0.06em',
          color: 'var(--gold)', margin: 0,
        }}>
          {languageFilter === 'all' ? 'All Songs' : languageFilter === 'greek' ? 'Greek Songs' : 'English Songs'}
        </h3>
        <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--cream-muted)', textTransform: 'uppercase' }}>
          ({visibleSongs.length})
        </span>
      </div>

      {/* ── Song grid ── */}
      {songs.length === 0 ? (
        <div style={{
          border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
          padding: '48px 24px', textAlign: 'center',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.3rem', color: 'var(--cream-muted)', letterSpacing: '0.05em',
        }}>
          No songs yet. Add your first song above.
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
              onClick={() => router.push(`/songs/${song.id}`)}
              onDelete={() => handleDeleteSong(song.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SongCard({ song, onClick, onDelete }: { song: Song; onClick: () => void; onDelete: () => void }) {
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
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.55)' : '0 3px 12px rgba(0,0,0,0.35)',
        position: 'relative',
      }}
    >
      {/* Delete */}
      <button
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
      </button>

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
        color: 'var(--cream-muted)', margin: '0 0 12px',
      }}>
        {song.artist}
      </p>

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
