import React from 'react';

type Lang = 'greek' | 'english';

export default function Flag({
  lang,
  withLabel = false,
  style,
}: {
  lang: Lang;
  withLabel?: boolean;
  style?: React.CSSProperties;
}) {
  const code = lang === 'greek' ? 'gr' : 'gb';
  const label = lang === 'greek' ? 'Greek' : 'English';
  const flag = (
    <span
      className={`fi fi-${code}`}
      style={{
        display: 'inline-block',
        width: '1.35em',
        height: '1em',
        verticalAlign: '-0.12em',
        borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
        ...style,
      }}
      aria-label={label}
    />
  );
  if (!withLabel) return flag;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55em' }}>
      {flag}
      <span>{label}</span>
    </span>
  );
}
