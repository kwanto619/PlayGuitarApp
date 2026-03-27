'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Playlist, Song } from '@/types';
import {
  loadPlaylists,
  addPlaylist,
  renamePlaylist,
  updatePlaylistSongs,
  deletePlaylist,
  loadSongs,
} from '@/lib/storage';

// ── Small shared styles ───────────────────────────────────────────────────────
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

function GoldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; props.onFocus?.(e); }}
      onBlur={(e)  => { e.target.style.borderColor = 'var(--gold-border-mid)'; props.onBlur?.(e); }}
    />
  );
}

function GoldBtn({
  children, onClick, disabled, variant = 'primary', style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: '11px 24px',
    minHeight: '44px',
    fontFamily: 'var(--font-cormorant, Georgia, serif)',
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      borderColor: 'var(--gold-border-mid)',
      background: 'linear-gradient(135deg, rgba(122,92,16,0.6), rgba(90,68,24,0.4))',
      color: 'var(--gold-bright)',
    },
    ghost: {
      borderColor: 'var(--gold-border)',
      background: 'transparent',
      color: 'var(--cream-muted)',
    },
    danger: {
      borderColor: 'rgba(224,72,72,0.4)',
      background: 'rgba(224,72,72,0.07)',
      color: 'var(--red-tuning)',
    },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ── Create Playlist Modal ─────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a playlist name.'); return; }
    setSaving(true);
    try {
      await onCreate(trimmed);
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Failed to create playlist. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(8,5,2,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--gold-border-mid)',
          padding: '36px', width: '100%', maxWidth: '440px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'var(--gold-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)', marginBottom: '6px' }}>
          New Playlist
        </div>
        <h3 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.8rem', fontWeight: 500, color: 'var(--gold)', margin: '0 0 28px' }}>
          Create Playlist
        </h3>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)', marginBottom: '28px' }} />

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.62rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--gold-dim)', fontFamily: 'var(--font-cormorant, Georgia, serif)', marginBottom: '6px' }}>
            Playlist Name
          </label>
          <GoldInput
            autoFocus
            placeholder="e.g. Saturday Night Set"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', border: '1px solid rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.07)', color: 'var(--red-tuning)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <GoldBtn onClick={handleCreate} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Creating…' : 'Create →'}
          </GoldBtn>
          <GoldBtn variant="ghost" onClick={onClose}>Cancel</GoldBtn>
        </div>
      </div>
    </div>
  );
}

// ── Song Picker Modal ─────────────────────────────────────────────────────────
function SongPickerModal({
  songs, currentIds, onAdd, onClose,
}: {
  songs: Song[];
  currentIds: string[];
  onAdd: (songId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const currentSet = new Set(currentIds);

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(8,5,2,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--gold-border-mid)',
          padding: '36px', width: '100%', maxWidth: '560px',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'var(--gold-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
            Add Songs
          </div>
          <button onClick={onClose} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--cream-muted)', cursor: 'pointer', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.1rem' }}>✕</button>
        </div>
        <h3 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.7rem', fontWeight: 500, color: 'var(--gold)', margin: '0 0 20px' }}>
          Pick Songs
        </h3>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)', marginBottom: '20px', flexShrink: 0 }} />

        <GoldInput
          placeholder="Search title or artist…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: '16px', flexShrink: 0 }}
        />

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--cream-muted)', fontSize: '1.1rem', fontStyle: 'italic' }}>
              No songs found
            </div>
          )}
          {filtered.map((song) => {
            const already = currentSet.has(song.id);
            return (
              <div
                key={song.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: already ? 'rgba(200,152,32,0.06)' : 'var(--bg-card)',
                  border: `1px solid ${already ? 'rgba(200,152,32,0.25)' : 'var(--gold-border)'}`,
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.05rem', color: already ? 'var(--gold-dim)' : 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.85rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>
                    {song.artist}
                  </div>
                </div>
                {already ? (
                  <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>
                    ✓ Added
                  </span>
                ) : (
                  <button
                    onClick={() => onAdd(song.id)}
                    style={{
                      padding: '8px 16px', minHeight: '36px',
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.15em',
                      textTransform: 'uppercase', cursor: 'pointer',
                      border: '1px solid var(--gold-border-mid)',
                      background: 'linear-gradient(135deg, rgba(122,92,16,0.5), rgba(90,68,24,0.3))',
                      color: 'var(--gold-bright)', whiteSpace: 'nowrap',
                    }}
                  >
                    + Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Playlist Detail View ──────────────────────────────────────────────────────
function PlaylistDetail({
  playlist, songs, onBack, onUpdate, onDelete,
}: {
  playlist: Playlist;
  songs: Song[];
  onBack: () => void;
  onUpdate: (updated: Playlist) => void;
  onDelete: () => void;
}) {
  const [name, setName]           = useState(playlist.name);
  const [songIds, setSongIds]     = useState<string[]>(playlist.song_ids);
  const [nameEditing, setNameEditing] = useState(false);
  const [showPicker, setShowPicker]   = useState(false);
  const [confirmDel, setConfirmDel]   = useState(false);
  const [saving, setSaving]           = useState(false);

  const songMap = new Map(songs.map((s) => [s.id, s]));
  const playlistSongs = songIds.map((id) => songMap.get(id)).filter(Boolean) as Song[];

  const persistIds = useCallback(async (ids: string[]) => {
    setSongIds(ids);
    await updatePlaylistSongs(playlist.id, ids);
    onUpdate({ ...playlist, name, song_ids: ids });
  }, [playlist, name, onUpdate]);

  const handleAddSong = async (songId: string) => {
    if (songIds.includes(songId)) return;
    await persistIds([...songIds, songId]);
  };

  const handleRemoveSong = async (songId: string) => {
    await persistIds(songIds.filter((id) => id !== songId));
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === playlist.name) { setName(playlist.name); setNameEditing(false); return; }
    setSaving(true);
    await renamePlaylist(playlist.id, trimmed);
    onUpdate({ ...playlist, name: trimmed, song_ids: songIds });
    setSaving(false);
    setNameEditing(false);
  };

  const handleDelete = () => {
    onDelete();
  };

  return (
    <div>
      {/* Back + delete row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px', minHeight: '44px',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: 'pointer', border: '1px solid var(--gold-border)',
            background: 'transparent', color: 'var(--cream-muted)',
          }}
        >
          ← All Playlists
        </button>
        {confirmDel ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.9rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>Delete playlist?</span>
            <GoldBtn variant="danger" onClick={handleDelete}>Yes, Delete</GoldBtn>
            <GoldBtn variant="ghost" onClick={() => setConfirmDel(false)}>Cancel</GoldBtn>
          </div>
        ) : (
          <GoldBtn variant="danger" onClick={() => setConfirmDel(true)}>Delete Playlist</GoldBtn>
        )}
      </div>

      {/* Playlist name */}
      <div style={{ marginBottom: '36px' }}>
        {nameEditing ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <GoldInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setName(playlist.name); setNameEditing(false); } }}
              style={{ fontSize: '1.4rem', maxWidth: '400px' }}
            />
            <GoldBtn onClick={handleSaveName} disabled={saving}>{saving ? 'Saving…' : 'Save'}</GoldBtn>
            <GoldBtn variant="ghost" onClick={() => { setName(playlist.name); setNameEditing(false); }}>Cancel</GoldBtn>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h2
              style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 600, color: 'var(--gold)', margin: 0, letterSpacing: '0.04em',
              }}
            >
              {name}
            </h2>
            <button
              onClick={() => setNameEditing(true)}
              style={{
                padding: '5px 12px', background: 'transparent',
                border: '1px solid var(--gold-border)', color: 'var(--gold-dim)',
                cursor: 'pointer', fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              }}
            >
              Rename
            </button>
          </div>
        )}
        <div style={{ marginTop: '6px', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.9rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>
          {playlistSongs.length === 0 ? 'No songs yet' : `${playlistSongs.length} song${playlistSongs.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)', marginBottom: '28px' }} />

      {/* Add songs button */}
      <div style={{ marginBottom: '24px' }}>
        <GoldBtn onClick={() => setShowPicker(true)}>
          + Add Songs
        </GoldBtn>
      </div>

      {/* Song list */}
      {playlistSongs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.2rem', fontStyle: 'italic', color: 'var(--cream-muted)',
          border: '1px dashed var(--gold-border)', lineHeight: 1.7,
        }}>
          No songs in this playlist yet.<br />
          <span style={{ fontSize: '0.95rem' }}>Hit &ldquo;Add Songs&rdquo; to get started.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {playlistSongs.map((song, idx) => (
            <div
              key={song.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 18px',
                background: 'var(--bg-card)',
                border: '1px solid var(--gold-border)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.85rem', color: 'var(--gold-dim)', minWidth: '24px', textAlign: 'right' }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/songs/${song.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.1rem', color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.88rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>
                    {song.artist}
                  </div>
                </Link>
              </div>
              {song.chords.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '160px' }}>
                  {song.chords.slice(0, 4).map((c) => (
                    <span key={c} style={{ padding: '2px 7px', fontSize: '0.7rem', fontFamily: 'var(--font-cormorant, Georgia, serif)', letterSpacing: '0.08em', color: 'var(--gold-dim)', border: '1px solid var(--gold-border)', background: 'rgba(200,152,32,0.04)' }}>
                      {c}
                    </span>
                  ))}
                  {song.chords.length > 4 && (
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--cream-muted)' }}>+{song.chords.length - 4}</span>
                  )}
                </div>
              )}
              <button
                onClick={() => handleRemoveSong(song.id)}
                style={{
                  padding: '7px 12px', minHeight: '36px',
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                  cursor: 'pointer', border: '1px solid rgba(224,72,72,0.3)',
                  background: 'transparent', color: 'var(--red-tuning)',
                  flexShrink: 0,
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <SongPickerModal
          songs={songs}
          currentIds={songIds}
          onAdd={handleAddSong}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ── Playlist Card ─────────────────────────────────────────────────────────────
function PlaylistCard({ playlist, songCount, onClick }: { playlist: Playlist; songCount: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--gold-border-mid)' : 'var(--gold-border)'}`,
        padding: '28px 24px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered
          ? '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,152,32,0.08)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Icon */}
      <div style={{ color: hovered ? 'var(--gold-bright)' : 'var(--gold)', transition: 'color 0.2s' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <h3 style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '1.5rem', fontWeight: 600,
        color: hovered ? 'var(--gold-bright)' : 'var(--gold)',
        margin: 0, letterSpacing: '0.04em',
        textShadow: hovered ? '0 0 20px rgba(200,152,32,0.2)' : 'none',
        transition: 'color 0.2s, text-shadow 0.2s',
      }}>
        {playlist.name}
      </h3>

      <div style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--cream-muted)',
      }}>
        {songCount === 0 ? 'Empty playlist' : `${songCount} song${songCount !== 1 ? 's' : ''}`}
      </div>

      <div style={{
        marginTop: 'auto',
        fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase',
        color: hovered ? 'var(--gold)' : 'var(--cream-muted)',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        transition: 'color 0.2s',
        opacity: hovered ? 1 : 0.5,
      }}>
        Open →
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PlaylistsLibrary() {
  const [playlists,       setPlaylists]       = useState<Playlist[]>([]);
  const [songs,           setSongs]           = useState<Song[]>([]);
  const [activePlaylist,  setActivePlaylist]  = useState<Playlist | null>(null);
  const [showCreate,      setShowCreate]      = useState(false);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([loadPlaylists(), loadSongs()]).then(([pl, sg]) => {
      setPlaylists(pl);
      setSongs(sg);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (name: string) => {
    const updated = await addPlaylist(name);
    setPlaylists(updated);
    // Open the newly created playlist
    setActivePlaylist(updated[0]);
  };

  const handlePlaylistUpdate = (updated: Playlist) => {
    setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActivePlaylist(updated);
  };

  const handlePlaylistDelete = async () => {
    if (!activePlaylist) return;
    const updated = await deletePlaylist(activePlaylist.id);
    setPlaylists(updated);
    setActivePlaylist(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--cream-muted)', fontSize: '1.2rem', letterSpacing: '0.1em' }}>
        Loading…
      </div>
    );
  }

  // ── Detail view ──
  if (activePlaylist) {
    return (
      <>
        <PlaylistDetail
          playlist={activePlaylist}
          songs={songs}
          onBack={() => setActivePlaylist(null)}
          onUpdate={handlePlaylistUpdate}
          onDelete={handlePlaylistDelete}
        />
      </>
    );
  }

  // ── List view ──
  return (
    <>
      {/* New playlist button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
        <GoldBtn onClick={() => setShowCreate(true)} style={{ padding: '13px 40px' }}>
          + New Playlist
        </GoldBtn>
      </div>

      {playlists.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.5rem', fontStyle: 'italic', color: 'var(--cream-muted)',
          letterSpacing: '0.05em', lineHeight: 1.7,
        }}>
          No playlists yet.<br />
          <span style={{ fontSize: '1rem' }}>Create one to organise your songs.</span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {playlists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              playlist={pl}
              songCount={pl.song_ids.length}
              onClick={() => setActivePlaylist(pl)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}
