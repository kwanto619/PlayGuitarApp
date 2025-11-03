import { Chord } from '@/types';

interface ChordDiagramProps {
  chord: Chord;
}

export default function ChordDiagram({ chord }: ChordDiagramProps) {
  const width = 160;
  const height = 200;
  const startX = 30;
  const startY = 30;
  const stringSpacing = 20;
  const fretSpacing = 30;
  const numFrets = 5;
  const numStrings = 6;

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      {/* Draw strings */}
      {Array.from({ length: numStrings }).map((_, i) => {
        const x = startX + i * stringSpacing;
        return (
          <line
            key={`string-${i}`}
            className="stroke-gray-300"
            strokeWidth="2"
            x1={x}
            y1={startY}
            x2={x}
            y2={startY + numFrets * fretSpacing}
          />
        );
      })}

      {/* Draw frets */}
      {Array.from({ length: numFrets + 1 }).map((_, i) => {
        const y = startY + i * fretSpacing;
        const isNut = i === 0 && chord.baseFret === 1;
        return (
          <line
            key={`fret-${i}`}
            className={isNut ? 'stroke-gray-200' : 'stroke-gray-400'}
            strokeWidth={isNut ? '4' : '1.5'}
            x1={startX}
            y1={y}
            x2={startX + (numStrings - 1) * stringSpacing}
            y2={y}
          />
        );
      })}

      {/* Draw fret number */}
      {chord.baseFret > 1 && (
        <text
          className="fill-gray-400 text-xs"
          textAnchor="end"
          x={startX - 10}
          y={startY + fretSpacing / 2}
        >
          {chord.baseFret}
        </text>
      )}

      {/* Draw finger positions */}
      {chord.strings.map((stringValue, i) => {
        const x = startX + i * stringSpacing;

        if (stringValue === 'x') {
          return (
            <g key={`marker-${i}`}>
              <line
                className="stroke-gray-400"
                strokeWidth="2.5"
                x1={x - 5}
                y1={startY - 20}
                x2={x + 5}
                y2={startY - 10}
              />
              <line
                className="stroke-gray-400"
                strokeWidth="2.5"
                x1={x + 5}
                y1={startY - 20}
                x2={x - 5}
                y2={startY - 10}
              />
            </g>
          );
        } else if (stringValue === 'o') {
          return (
            <circle
              key={`marker-${i}`}
              className="fill-gray-800 stroke-gray-300"
              strokeWidth="2.5"
              cx={x}
              cy={startY - 15}
              r={6}
            />
          );
        } else {
          const fret = stringValue as number;
          const y = startY + (fret - 0.5) * fretSpacing;
          const fingerNum = chord.fingers[i];

          return (
            <g key={`marker-${i}`}>
              <circle
                fill="rgb(216, 86, 0)"
                stroke="rgb(186, 74, 0)"
                strokeWidth="2"
                cx={x}
                cy={y}
                r={8}
              />
              {fingerNum > 0 && (
                <text
                  className="fill-white text-sm font-bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  x={x}
                  y={y}
                >
                  {fingerNum}
                </text>
              )}
            </g>
          );
        }
      })}
    </svg>
  );
}
