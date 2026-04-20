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
  const [tab,       setTab]       = useState<'none' | 'songs' | 'playlists'>('none');
  const [songPage,  setSongPage]  = useState(1);
  const SONGS_PER_PAGE = 12;

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
                <div style={{ display: 'flex', gap: '18px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--cream-muted)', letterSpacing: '0.1em', flexWrap: 'wrap' }}>
                  <span><strong style={{ color: 'var(--gold)' }}>{songs.length}</strong> songs</span>
                  <span><strong style={{ color: 'var(--gold)' }}>{playlists.length}</strong> playlists</span>
                  <Link href={`/u/${profile.username}/followers`} style={statLink}>
                    <strong style={{ color: 'var(--gold)' }}>{counts.followers}</strong> followers
                  </Link>
                  <Link href={`/u/${profile.username}/following`} style={statLink}>
                    <strong style={{ color: 'var(--gold)' }}>{counts.following}</strong> following
                  </Link>
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

            {/* Tab buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px', marginBottom: '28px',
            }}>
              <TabCard
                active={tab === 'songs'}
                label="Songs"
                count={songs.length}
                onClick={() => { setTab(tab === 'songs' ? 'none' : 'songs'); setSongPage(1); }}
              />
              <TabCard
                active={tab === 'playlists'}
                label="Playlists"
                count={playlists.length}
                onClick={() => setTab(tab === 'playlists' ? 'none' : 'playlists')}
              />
            </div>

            {/* Songs tab */}
            {tab === 'songs' && (
              <section>
                {songs.length === 0 ? (
                  <div style={{ color: 'var(--cream-muted)', fontStyle: 'italic' }}>No public songs.</div>
                ) : (() => {
                  const totalPages   = Math.max(1, Math.ceil(songs.length / SONGS_PER_PAGE));
                  const safePage     = Math.min(songPage, totalPages);
                  const visible      = songs.slice((safePage - 1) * SONGS_PER_PAGE, safePage * SONGS_PER_PAGE);
                  return (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '12px',
                      }}>
                        {visible.map((s) => (
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
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '28px' }}>
                          <PgBtn disabled={safePage === 1} onClick={() => setSongPage((p) => Math.max(1, p - 1))}>← Prev</PgBtn>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                              <button key={p} onClick={() => setSongPage(p)} style={{
                                width: '36px', height: '36px', cursor: 'pointer',
                                border: `1px solid ${p === safePage ? 'var(--gold)' : 'var(--gold-border)'}`,
                                background: p === safePage ? 'rgba(0,196,180,0.15)' : 'transparent',
                                color: p === safePage ? 'var(--gold-bright)' : 'var(--cream-muted)',
                                fontSize: '0.85rem', fontWeight: p === safePage ? 700 : 400,
                              }}>{p}</button>
                            ))}
                          </div>
                          <PgBtn disabled={safePage === totalPages} onClick={() => setSongPage((p) => Math.min(totalPages, p + 1))}>Next →</PgBtn>
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>
            )}

            {/* Playlists tab */}
            {tab === 'playlists' && (
              <section>
                {playlists.length === 0 ? (
                  <div style={{ color: 'var(--cream-muted)', fontStyle: 'italic' }}>No public playlists.</div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '12px',
                  }}>
                    {playlists.map((p) => (
                      <Link key={p.id} href={`/playlists/${p.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
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
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}
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

const statLink: React.CSSProperties = {
  color: 'var(--cream-muted)', textDecoration: 'none',
  borderBottom: '1px dotted var(--gold-border)', paddingBottom: '1px',
};

const centerBox: React.CSSProperties = {
  textAlign: 'center', padding: '80px 20px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  color: 'var(--cream-muted)', fontSize: '1.1rem', letterSpacing: '0.05em',
  border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
};

function TabCard({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '22px 24px', cursor: 'pointer',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--gold-border-mid)'}`,
        background: active ? 'linear-gradient(135deg, rgba(0,196,180,0.18), rgba(0,196,180,0.06))' : 'var(--bg-card)',
        color: active ? 'var(--gold-bright)' : 'var(--cream-soft)',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
      }}
    >
      <span style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.8rem', letterSpacing: '0.2em',
        color: active ? 'var(--gold-bright)' : 'var(--cream-muted)',
      }}>
        {count} · {active ? 'Close' : 'Open'}
      </span>
    </button>
  );
}

function PgBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        padding: '8px 18px', minHeight: '36px', cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid var(--gold-border)',
        background: 'transparent',
        color: disabled ? 'var(--cream-muted)' : 'var(--cream-soft)',
        fontSize: '0.85rem', letterSpacing: '0.1em',
        opacity: disabled ? 0.4 : 1, fontFamily: 'var(--font-cormorant, Georgia, serif)',
      }}
    >
      {children}
    </button>
  );
}
