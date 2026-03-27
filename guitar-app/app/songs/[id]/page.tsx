'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { Song } from '@/types';
import { loadSongs, updateSong, deleteSong } from '@/lib/storage';
import ChordTooltip, { parseLyrics } from '@/components/ChordTooltip';

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
            background: value === lang ? 'linear-gradient(135deg, rgba(200,152,32,0.2), rgba(200,152,32,0.08))' : 'transparent',
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

// ── Page component ──────────────────────────────────────────────────────────
export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [song,     setSong]     = useState<Song | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [edited,   setEdited]   = useState({
    title: '', artist: '', chords: '', lyrics: '', notes: '',
    language: 'english' as 'greek' | 'english',
  });

  useEffect(() => {
    loadSongs().then((songs) => {
      const found = songs.find((s) => s.id === id) ?? null;
      setSong(found);
      if (found) {
        setEdited({
          title: found.title, artist: found.artist,
          chords: found.chords.join(', '),
          lyrics: found.lyrics ?? '', notes: found.notes ?? '',
          language: found.language,
        });
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!song || !edited.title || !edited.artist) { alert('Title and artist are required.'); return; }
    const updated: Song = {
      ...song,
      title: edited.title, artist: edited.artist,
      chords: edited.chords.split(',').map((c) => c.trim()).filter(Boolean),
      lyrics: edited.lyrics || undefined, notes: edited.notes || undefined,
      language: edited.language,
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

  // ── Full page view / edit ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
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
        <button
          onClick={() => router.push('/songs')}
          style={backBtnStyle}
        >
          ← My Songs
        </button>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {editMode ? (
            <>
              <ActionBtn onClick={handleSave} gold>Save</ActionBtn>
              <ActionBtn onClick={() => setEditMode(false)}>Cancel</ActionBtn>
            </>
          ) : (
            <>
              <ActionBtn onClick={() => setEditMode(true)} gold>Edit</ActionBtn>
              <ActionBtn onClick={handleDelete} danger>Delete</ActionBtn>
            </>
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
            <div><label style={labelStyle}>Language</label><LangToggle value={edited.language} onChange={(v) => setEdited({ ...edited, language: v })} /></div>
            <div><label style={labelStyle}>Notes</label><VintageInput value={edited.notes} onChange={(e) => setEdited({ ...edited, notes: e.target.value })} /></div>
            <div><label style={labelStyle}>Lyrics</label><VintageTextarea value={edited.lyrics} onChange={(e) => setEdited({ ...edited, lyrics: e.target.value })} /></div>
          </div>
        ) : (
          /* ── View — two-column layout (collapses to one on mobile) ── */
          <div className="song-two-col">
            {/* ── LEFT: metadata ── */}
            <div className="song-sidebar">
              {/* Language badge */}
              <div style={{
                fontSize: '0.58rem', letterSpacing: '0.5em', color: 'var(--gold-dim)',
                textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)',
                marginBottom: '14px',
              }}>
                {song.language === 'greek' ? '🇬🇷 Greek' : '🇬🇧 English'}
              </div>

              {/* Title */}
              <h1 style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
                fontWeight: 600, letterSpacing: '0.03em',
                color: 'var(--gold-bright)', margin: '0 0 10px',
                textShadow: '0 0 60px rgba(232,192,64,0.15)',
                lineHeight: 1.1,
              }}>
                {song.title}
              </h1>

              {/* Artist */}
              <p style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                fontStyle: 'italic', color: 'var(--cream-soft)', margin: '0 0 32px',
              }}>
                {song.artist}
              </p>

              {/* Divider */}
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, var(--gold-border-mid), transparent)',
                marginBottom: '28px',
              }} />

              {/* Chords */}
              {song.chords.length > 0 && (
                <section style={{ marginBottom: '28px' }}>
                  <div style={labelStyle}>Chords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {song.chords.map((chord, idx) => (
                      <ChordTooltip key={idx} name={chord}>
                        <span style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          border: '1px solid var(--gold-border-mid)',
                          background: 'rgba(200,152,32,0.1)',
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
                  <div style={labelStyle}>Lyrics</div>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--font-ibm-mono, monospace)',
                    fontSize: 'clamp(0.88rem, 1.4vw, 1rem)',
                    color: 'var(--cream-soft)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--gold-border)',
                    padding: 'clamp(20px, 3vw, 36px)',
                    margin: 0, lineHeight: 1.9,
                    overflowX: 'auto',
                  }}>
                    {parseLyrics(song.lyrics).map((seg, i) =>
                      seg.type === 'chord' ? (
                        <ChordTooltip key={i} name={seg.content}>
                          <span style={{
                            color: 'var(--gold-bright)',
                            fontWeight: 600,
                            cursor: 'default',
                            borderBottom: '1px dashed rgba(200,152,32,0.45)',
                            paddingBottom: '1px',
                          }}>
                            {seg.content}
                          </span>
                        </ChordTooltip>
                      ) : (
                        <span key={i}>{seg.content}</span>
                      )
                    )}
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

function ActionBtn({ onClick, children, gold, danger }: {
  onClick: () => void; children: React.ReactNode; gold?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.2em',
        textTransform: 'uppercase', cursor: 'pointer',
        border: danger ? '1px solid rgba(224,72,72,0.45)'
               : gold  ? '1px solid var(--gold-border-mid)'
               :         '1px solid var(--gold-border)',
        background: danger ? 'rgba(224,72,72,0.08)'
                  : gold   ? 'linear-gradient(135deg, rgba(122,92,16,0.6), rgba(90,68,24,0.4))'
                  :          'transparent',
        color: danger ? 'var(--red-tuning)' : gold ? 'var(--gold-bright)' : 'var(--cream-muted)',
        transition: 'all 0.15s',
        minHeight: '44px',
      }}
    >
      {children}
    </button>
  );
}
