'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Profile, Song, Playlist } from '@/types';
import {
  loadProfile, loadSongsByUser, loadPlaylistsByUser,
  loadFollowCounts, isFollowing, toggleFollow,
} from '@/lib/storage';
import { useAuth } from '@/lib/auth';

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user } = useAuth();
  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [songs,     setSongs]     = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [counts,    setCounts]    = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await loadProfile(username);
      setProfile(p);
      if (p) {
        const [s, pl, c, f] = await Promise.all([
          loadSongsByUser(p.id),
          loadPlaylistsByUser(p.id),
          loadFollowCounts(p.id),
          isFollowing(p.id),
        ]);
        setSongs(s); setPlaylists(pl); setCounts(c); setFollowing(f);
      }
      setLoading(false);
    })();
  }, [username]);

  const onFollow = async () => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      const now = await toggleFollow(profile.id);
      setFollowing(now);
      setCounts((c) => ({ ...c, followers: c.followers + (now ? 1 : -1) }));
    } catch (e) { alert((e as Error).message); }
    setBusy(false);
  };

  const isOwn = !!user && profile?.id === user.id;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px',
      }}>
        <Link href="/" style={topBtn}>← Home</Link>
        <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--cream-soft)' }}>
          Profile
        </span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
        {loading ? (
          <div style={centerBox}>Loading…</div>
        ) : !profile ? (
          <div style={centerBox}>Member not found.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: '28px 32px',
              border: '1px solid var(--gold-border)',
              background: 'var(--bg-surface)',
              marginBottom: '32px',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px',
              justifyContent: 'space-between',
            }}>
              <div>
                <h1 style={{
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 600,
                  color: 'var(--gold-bright)', margin: '0 0 6px',
                }}>
                  @{profile.username}
                </h1>
                {profile.displayName && profile.displayName !== profile.username && (
                  <div style={{ fontStyle: 'italic', color: 'var(--cream-soft)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem' }}>
                    {profile.displayName}
                  </div>
                )}
                {profile.bio && (
                  <div style={{ color: 'var(--cream-muted)', fontSize: '0.92rem', marginTop: '8px', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                    {profile.bio}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '18px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--cream-muted)', letterSpacing: '0.1em' }}>
                  <span><strong style={{ color: 'var(--gold)' }}>{songs.length}</strong> songs</span>
                  <span><strong style={{ color: 'var(--gold)' }}>{playlists.length}</strong> playlists</span>
                  <span><strong style={{ color: 'var(--gold)' }}>{counts.followers}</strong> followers</span>
                  <span><strong style={{ color: 'var(--gold)' }}>{counts.following}</strong> following</span>
                </div>
              </div>
              {!isOwn && user && (
                <button
                  onClick={onFollow} disabled={busy}
                  style={{
                    padding: '10px 22px',
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '0.88rem', fontWeight: 600, letterSpacing: '0.2em',
                    textTransform: 'uppercase', cursor: busy ? 'wait' : 'pointer',
                    border: `1px solid ${following ? 'var(--gold-border)' : 'var(--gold-border-mid)'}`,
                    background: following ? 'transparent' : 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
                    color: following ? 'var(--cream-muted)' : 'var(--gold-bright)',
                    transition: 'all 0.15s',
                  }}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* Songs */}
            <section style={{ marginBottom: '40px' }}>
              <h2 style={sectionH}>Songs</h2>
              {songs.length === 0 ? (
                <div style={{ color: 'var(--cream-muted)', fontStyle: 'italic' }}>No public songs.</div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '12px',
                }}>
                  {songs.map((s) => (
                    <Link key={s.id} href={`/songs/${s.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '14px 18px',
                        border: '1px solid var(--gold-border)',
                        background: 'var(--bg-card)',
                      }}>
                        <div style={{
                          fontFamily: 'var(--font-cormorant, Georgia, serif)',
                          fontSize: '1.1rem', fontWeight: 600, color: 'var(--gold)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{s.title}</div>
                        <div style={{
                          fontFamily: 'var(--font-cormorant, Georgia, serif)',
                          fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--cream-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{s.artist}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Playlists */}
            <section>
              <h2 style={sectionH}>Playlists</h2>
              {playlists.length === 0 ? (
                <div style={{ color: 'var(--cream-muted)', fontStyle: 'italic' }}>No public playlists.</div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '12px',
                }}>
                  {playlists.map((p) => (
                    <div key={p.id} style={{
                      padding: '14px 18px',
                      border: '1px solid var(--gold-border)',
                      background: 'var(--bg-card)',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-cormorant, Georgia, serif)',
                        fontSize: '1.1rem', fontWeight: 600, color: 'var(--gold)',
                      }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cream-muted)', letterSpacing: '0.1em', marginTop: '4px' }}>
                        {p.song_ids.length} {p.song_ids.length === 1 ? 'song' : 'songs'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const topBtn: React.CSSProperties = {
  padding: '8px 18px', fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
  textTransform: 'uppercase', cursor: 'pointer',
  border: '1px solid var(--gold-border-mid)',
  background: 'transparent', color: 'var(--cream-muted)',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
};

const centerBox: React.CSSProperties = {
  textAlign: 'center', padding: '80px 20px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  color: 'var(--cream-muted)', fontSize: '1.1rem', letterSpacing: '0.05em',
  border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
};

const sectionH: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '1.4rem', fontWeight: 500, letterSpacing: '0.1em',
  color: 'var(--gold)', margin: '0 0 14px',
};
