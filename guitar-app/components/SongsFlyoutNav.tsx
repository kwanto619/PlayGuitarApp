'use client';

import { useState, Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { FiMenu, FiX, FiArrowRight, FiMusic, FiGrid, FiHeart, FiRss, FiSearch, FiHome, FiClock } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import UserMenu from './UserMenu';

type NavItem = { href: string; label: string; Icon: React.ElementType; desc?: string };

const ITEMS: NavItem[] = [
  { href: '/',             label: 'Home',       Icon: FiHome,   desc: 'Companion dashboard' },
  { href: '/songs',        label: 'Songs',      Icon: FiMusic,  desc: 'Community library' },
  { href: '/chords',       label: 'Chords',     Icon: FiGrid,   desc: 'Shapes & diagrams' },
  { href: '/playlists',    label: 'Playlists',  Icon: FiMusic,  desc: 'Your setlists' },
  { href: '/progressions', label: 'Progressions', Icon: FiClock, desc: 'Chord sequences' },
  { href: '/favorites',    label: 'Favorites',  Icon: FiHeart,  desc: 'Starred songs' },
  { href: '/feed',         label: 'Feed',       Icon: FiRss,    desc: 'People you follow' },
  { href: '/search',       label: 'Find members', Icon: FiSearch, desc: 'Discover players' },
];

export default function SongsFlyoutNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop vertical rail ── */}
      <aside className="songs-rail">
        <div style={{ padding: '20px 16px 16px' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            textDecoration: 'none', color: 'var(--gold-bright)',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase',
          }}>
            <FiMusic size={18} /> Songs
          </Link>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 10px', gap: '2px', flex: 1 }}>
          {ITEMS.map((item) => (
            <RailLink key={item.href} {...item} />
          ))}
        </nav>

        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--gold-border)',
          display: 'flex', justifyContent: 'center',
        }}>
          <UserMenu />
        </div>
      </aside>

      {/* ── Mobile trigger ── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="songs-rail-mobile-btn"
      >
        <FiMenu size={22} />
      </button>

      <MobileDrawer open={mobileOpen} setOpen={setMobileOpen} />

      <style>{`
        .songs-rail {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 260px; z-index: 20;
          display: flex; flex-direction: column;
          background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%);
          border-right: 1px solid var(--gold-border);
        }
        .songs-rail-mobile-btn {
          display: none;
          position: fixed; top: 12px; left: 12px; z-index: 25;
          width: 44px; height: 44px;
          border: 1px solid var(--gold-border-mid);
          background: var(--bg-base);
          color: var(--gold-bright);
          cursor: pointer;
          align-items: center; justify-content: center;
        }
        @media (max-width: 900px) {
          .songs-rail { display: none; }
          .songs-rail-mobile-btn { display: inline-flex; }
        }
      `}</style>
    </>
  );
}

function RailLink({ href, label, Icon, desc }: NavItem) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px',
        textDecoration: 'none',
        border: '1px solid transparent',
        borderColor: hovered ? 'var(--gold-border-mid)' : 'transparent',
        background: hovered ? 'rgba(0,196,180,0.08)' : 'transparent',
        color: hovered ? 'var(--gold-bright)' : 'var(--cream-soft)',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        transition: 'all 0.15s',
      }}
    >
      <Icon size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.85rem', fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>{label}</div>
        {desc && (
          <div style={{
            fontSize: '0.65rem', letterSpacing: '0.1em',
            color: 'var(--cream-muted)', marginTop: '2px',
          }}>{desc}</div>
        )}
      </div>
      <FiArrowRight size={14} style={{ opacity: hovered ? 1 : 0.3 }} />
    </Link>
  );
}

function MobileDrawer({
  open, setOpen,
}: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.65)',
          }}
        >
          <motion.nav
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: 'min(86vw, 320px)',
              background: 'var(--bg-base)',
              borderRight: '1px solid var(--gold-border)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderBottom: '1px solid var(--gold-border)',
            }}>
              <span style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '0.78rem', letterSpacing: '0.3em',
                textTransform: 'uppercase', color: 'var(--gold-bright)',
              }}>
                ♪ Navigate
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                style={{
                  width: 40, height: 40, border: '1px solid var(--gold-border)',
                  background: 'transparent', color: 'var(--cream-muted)',
                  cursor: 'pointer', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FiX size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
              {ITEMS.map((item) => (
                <div key={item.href} onClick={() => setOpen(false)}>
                  <RailLink {...item} />
                </div>
              ))}
            </div>
            <div style={{
              padding: '14px 16px',
              borderTop: '1px solid var(--gold-border)',
              display: 'flex', justifyContent: 'center',
            }}>
              <UserMenu />
            </div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
