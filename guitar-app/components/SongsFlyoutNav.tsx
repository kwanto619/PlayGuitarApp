'use client';

import { useState, Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiMenu, FiX, FiArrowRight, FiMusic, FiGrid, FiHeart, FiRss, FiHome,
  FiTarget, FiTool, FiChevronDown, FiClock, FiActivity,
} from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import UserMenu from './UserMenu';

type Leaf = { kind: 'leaf'; href: string; label: string; Icon: React.ElementType; desc?: string };
type Group = { kind: 'group'; id: string; label: string; Icon: React.ElementType; children: Leaf[] };
type Item = Leaf | Group;

const ITEMS: Item[] = [
  { kind: 'leaf', href: '/',          label: 'Home',          Icon: FiHome,  desc: 'Companion dashboard' },
  { kind: 'leaf', href: '/songs',     label: 'Songs',         Icon: FiMusic, desc: 'Community library' },
  { kind: 'leaf', href: '/chords',    label: 'Chord Library', Icon: FiGrid,  desc: 'Shapes & diagrams' },
  { kind: 'leaf', href: '/playlists', label: 'Playlists',     Icon: FiMusic, desc: 'Your setlists' },
  { kind: 'leaf', href: '/favorites', label: 'Favorites',     Icon: FiHeart, desc: 'Starred songs' },
  {
    kind: 'group', id: 'tools', label: 'Tools', Icon: FiTool,
    children: [
      { kind: 'leaf', href: '/tuner',        label: 'Tuner',        Icon: FiTarget,   desc: 'Chromatic precision' },
      { kind: 'leaf', href: '/metronome',    label: 'Metronome',    Icon: FiClock,    desc: 'Keep the beat' },
      { kind: 'leaf', href: '/progressions', label: 'Progressions', Icon: FiMusic,    desc: 'Chord sequences' },
      { kind: 'leaf', href: '/scales',       label: 'Scales',       Icon: FiActivity, desc: 'Pentatonic & blues' },
    ],
  },
  { kind: 'leaf', href: '/feed', label: 'Feed', Icon: FiRss, desc: 'People you follow' },
];

export default function SongsFlyoutNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      {/* Desktop vertical rail */}
      <aside className="app-rail">
        <div style={{ padding: '16px 16px 12px' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            textDecoration: 'none', color: 'var(--gold-bright)',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.78rem', letterSpacing: '0.35em', textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            <FiMusic size={18} /> Songcord
          </Link>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', gap: '2px', flex: 1, overflow: 'auto' }}>
          {ITEMS.map((item, i) =>
            item.kind === 'leaf'
              ? <RailLink key={i} item={item} />
              : <RailGroup key={i} group={item} />
          )}
        </nav>

        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--gold-border)',
          display: 'flex', justifyContent: 'center',
        }}>
          <UserMenu />
        </div>
      </aside>

      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="app-rail-mobile-btn"
      >
        <FiMenu size={22} />
      </button>

      <MobileDrawer open={mobileOpen} setOpen={setMobileOpen} />

      <style>{`
        .app-rail {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 240px; z-index: 20;
          display: flex; flex-direction: column;
          background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%);
          border-right: 1px solid var(--gold-border);
        }
        .app-rail-mobile-btn {
          display: none;
          position: fixed; top: 12px; left: 12px; z-index: 25;
          width: 42px; height: 42px;
          border: 1px solid var(--gold-border-mid);
          background: var(--bg-base);
          color: var(--gold-bright);
          cursor: pointer;
          align-items: center; justify-content: center;
        }
        @media (max-width: 900px) {
          .app-rail { display: none; }
          .app-rail-mobile-btn { display: inline-flex; }
        }
      `}</style>
    </>
  );
}

function RailLink({ item, inDrawer }: { item: Leaf; inDrawer?: boolean }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const active = pathname === item.href;
  const hot = hovered || active;
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: inDrawer ? '11px 14px' : '10px 12px',
        textDecoration: 'none',
        border: '1px solid',
        borderColor: active ? 'var(--gold-border-mid)' : hot ? 'var(--gold-border-mid)' : 'transparent',
        background: active ? 'rgba(0,232,213,0.1)' : hot ? 'rgba(0,196,180,0.06)' : 'transparent',
        color: active ? 'var(--gold-bright)' : hot ? 'var(--gold-bright)' : 'var(--cream-soft)',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        transition: 'all 0.15s',
      }}
    >
      <Icon size={16} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.78rem', fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>{item.label}</div>
        {item.desc && (
          <div style={{
            fontSize: '0.7rem', letterSpacing: '0.08em',
            color: 'var(--cream-soft)', marginTop: '2px',
            opacity: 0.95,
          }}>{item.desc}</div>
        )}
      </div>
      <FiArrowRight size={13} style={{ opacity: hot ? 1 : 0.3 }} />
    </Link>
  );
}

function RailGroup({ group, inDrawer }: { group: Group; inDrawer?: boolean }) {
  const pathname = usePathname();
  const childActive = group.children.some((c) => c.href === pathname);
  const [open, setOpen] = useState<boolean>(childActive);
  const [hovered, setHovered] = useState(false);
  const hot = hovered || open || childActive;
  const { Icon } = group;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: inDrawer ? '11px 14px' : '10px 12px',
          border: '1px solid',
          borderColor: hot ? 'var(--gold-border-mid)' : 'transparent',
          background: hot ? 'rgba(0,196,180,0.06)' : 'transparent',
          color: hot ? 'var(--gold-bright)' : 'var(--cream-soft)',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          transition: 'all 0.15s',
        }}
      >
        <Icon size={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.78rem', fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>{group.label}</div>
        </div>
        <motion.span animate={{ rotate: open ? 0 : -90 }} style={{ display: 'inline-flex' }}>
          <FiChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}
          >
            {group.children.map((c, i) => (
              <RailLink key={i} item={c} inDrawer={inDrawer} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
              width: 'min(86vw, 300px)',
              background: 'var(--bg-base)',
              borderRight: '1px solid var(--gold-border)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px', borderBottom: '1px solid var(--gold-border)',
            }}>
              <span style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '0.75rem', letterSpacing: '0.3em',
                textTransform: 'uppercase', color: 'var(--gold-bright)', fontWeight: 700,
              }}>
                ♪ Songcord
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                style={{
                  width: 38, height: 38, border: '1px solid var(--gold-border)',
                  background: 'transparent', color: 'var(--cream-muted)',
                  cursor: 'pointer', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FiX size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {ITEMS.map((item, i) =>
                item.kind === 'leaf'
                  ? <div key={i} onClick={() => setOpen(false)}><RailLink item={item} inDrawer /></div>
                  : <RailGroup key={i} group={item} inDrawer />
              )}
            </div>
            <div style={{
              padding: '12px 14px',
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
