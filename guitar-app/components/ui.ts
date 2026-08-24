// Tiny shared style tokens used by the discovery pages (home, top, artists,
// song suggestions) so they stay visually consistent.

export const sectionLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.62rem',
  letterSpacing: '0.42em',
  textTransform: 'uppercase',
  color: 'var(--gold-dim)',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  marginBottom: '10px',
};

export const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
  fontWeight: 600,
  letterSpacing: '0.03em',
  color: 'var(--gold-bright)',
  margin: 0,
};

export const ghostLink: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', minHeight: '40px',
  fontSize: '0.74rem', letterSpacing: '0.18em', textTransform: 'uppercase',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  color: 'var(--gold-bright)', textDecoration: 'none',
  border: '1px solid var(--gold-border-mid)', borderRadius: '8px',
  background: 'rgba(13,148,136,0.06)', whiteSpace: 'nowrap',
};

/** Segmented control button (e.g. "7 days | 30 days | All time"). */
export const segBtn = (active: boolean): React.CSSProperties => ({
  padding: '9px 16px', minHeight: '40px', cursor: 'pointer',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase',
  border: 'none', borderRadius: 0,
  background: active ? 'linear-gradient(135deg, rgba(0,196,180,0.2), rgba(0,196,180,0.08))' : 'transparent',
  color: active ? 'var(--gold-bright)' : 'var(--cream-muted)',
  fontWeight: active ? 600 : 400,
  transition: 'all 0.15s', whiteSpace: 'nowrap',
});

export const segWrap: React.CSSProperties = {
  display: 'inline-flex', border: '1px solid var(--gold-border)', borderRadius: '8px', overflow: 'hidden',
  background: 'var(--bg-surface)',
};
