'use client';

import { useEffect, useState } from 'react';
import { Playlist } from '@/types';
import { loadPlaylists, updatePlaylistSongs, addPlaylist } from '@/lib/storage';
import { useAuth } from '@/lib/auth';

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

export default function AddToPlaylistButton({ songId }: { songId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadPlaylists()
      .then(setPlaylists)
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('scroll-locked');
    return () => document.body.classList.remove('scroll-locked');
  }, [open]);

  const handleOpen = () => {
    if (!user) { alert('Sign in to add songs to a playlist.'); return; }
    setOpen(true);
  };

  const togglePlaylist = async (pl: Playlist) => {
    if (busyId) return;
    setBusyId(pl.id);
    try {
      const has = pl.song_ids.includes(songId);
      const nextIds = has
        ? pl.song_ids.filter((id) => id !== songId)
        : [...pl.song_ids, songId];
      await updatePlaylistSongs(pl.id, nextIds);
      setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? { ...p, song_ids: nextIds } : p)));
    } catch {
      alert('Could not update playlist.');
    }
    setBusyId(null);
  };

  const handleCreateAndAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setCreateError('Enter a playlist name.'); return; }
    setCreatingBusy(true);
    setCreateError('');
    try {
      const updated = await addPlaylist(trimmed);
      const fresh = updated[0];
      if (fresh) {
        await updatePlaylistSongs(fresh.id, [songId]);
        setPlaylists(updated.map((p) => (p.id === fresh.id ? { ...p, song_ids: [songId] } : p)));
      } else {
        setPlaylists(updated);
      }
      setNewName('');
      setCreating(false);
    } catch (e) {
      setCreateError((e as Error).message || 'Failed to create playlist.');
    }
    setCreatingBusy(false);
  };

  const filtered = search.trim()
    ? playlists.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : playlists;

  return (
    <>
      <button
        onClick={handleOpen}
        title="Add to playlist"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', minHeight: '44px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.2em',
          textTransform: 'uppercase', cursor: 'pointer',
          border: '1px solid var(--gold-border)',
          background: 'transparent', color: 'var(--cream-muted)',
          transition: 'all 0.15s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="16" y2="18" />
          <line x1="18" y1="15" x2="18" y2="21" />
          <line x1="15" y1="18" x2="21" y2="18" />
        </svg>
        Playlist
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--gold-border-mid)',
              padding: '32px', width: '100%', maxWidth: '480px',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'var(--gold-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                Add to Playlist
              </div>
              <button onClick={() => setOpen(false)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--cream-muted)', cursor: 'pointer', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.1rem' }}>✕</button>
            </div>
            <h3 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.7rem', fontWeight: 500, color: 'var(--gold)', margin: '0 0 18px' }}>
              Pick a Playlist
            </h3>

            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)', marginBottom: '18px', flexShrink: 0 }} />

            {playlists.length > 0 && !creating && (
              <input
                placeholder="Search playlists…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: '14px', flexShrink: 0 }}
              />
            )}

            <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: '32px 20px', fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--cream-muted)', fontStyle: 'italic' }}>
                  Loading…
                </div>
              )}
              {!loading && playlists.length === 0 && !creating && (
                <div style={{ textAlign: 'center', padding: '32px 20px', fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--cream-muted)', fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.6 }}>
                  No playlists yet.<br />
                  <span style={{ fontSize: '0.9rem' }}>Create one to get started.</span>
                </div>
              )}
              {!loading && filtered.map((pl) => {
                const has = pl.song_ids.includes(songId);
                const busy = busyId === pl.id;
                return (
                  <div
                    key={pl.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: has ? 'rgba(0,196,180,0.06)' : 'var(--bg-card)',
                      border: `1px solid ${has ? 'rgba(0,196,180,0.25)' : 'var(--gold-border)'}`,
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.05rem', color: has ? 'var(--gold-bright)' : 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pl.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.8rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>
                        {pl.song_ids.length === 0 ? 'Empty' : `${pl.song_ids.length} song${pl.song_ids.length !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <button
                      onClick={() => togglePlaylist(pl)}
                      disabled={busy}
                      style={{
                        padding: '8px 16px', minHeight: '36px',
                        fontFamily: 'var(--font-cormorant, Georgia, serif)',
                        fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        cursor: busy ? 'wait' : 'pointer',
                        opacity: busy ? 0.6 : 1,
                        border: `1px solid ${has ? 'rgba(0,196,180,0.4)' : 'var(--gold-border-mid)'}`,
                        background: has ? 'rgba(0,196,180,0.15)' : 'linear-gradient(135deg, rgba(0,130,120,0.5), rgba(0,90,83,0.3))',
                        color: 'var(--gold-bright)', whiteSpace: 'nowrap',
                      }}
                    >
                      {has ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)', margin: '18px 0', flexShrink: 0 }} />

            {creating ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                <input
                  autoFocus
                  placeholder="New playlist name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd(); if (e.key === 'Escape') { setCreating(false); setNewName(''); setCreateError(''); } }}
                  style={inputStyle}
                />
                {createError && (
                  <div style={{ padding: '8px 12px', border: '1px solid rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.07)', color: 'var(--red-tuning)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.85rem' }}>
                    {createError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCreateAndAdd}
                    disabled={creatingBusy}
                    style={{
                      flex: 1, padding: '10px 18px', minHeight: '40px',
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.18em',
                      textTransform: 'uppercase', cursor: creatingBusy ? 'wait' : 'pointer',
                      opacity: creatingBusy ? 0.6 : 1,
                      border: '1px solid var(--gold-border-mid)',
                      background: 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
                      color: 'var(--gold-bright)',
                    }}
                  >
                    {creatingBusy ? 'Creating…' : 'Create & Add'}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewName(''); setCreateError(''); }}
                    style={{
                      padding: '10px 18px', minHeight: '40px',
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '0.8rem', letterSpacing: '0.18em',
                      textTransform: 'uppercase', cursor: 'pointer',
                      border: '1px solid var(--gold-border)',
                      background: 'transparent', color: 'var(--cream-muted)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{
                  flexShrink: 0,
                  padding: '11px 20px', minHeight: '44px',
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.2em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  border: '1px dashed var(--gold-border-mid)',
                  background: 'transparent', color: 'var(--gold-bright)',
                }}
              >
                + New Playlist
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
