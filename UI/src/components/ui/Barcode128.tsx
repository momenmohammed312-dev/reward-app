import React from 'react';

// Standard Code 128 bar/space widths (indices 0..106)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

function encodeCode128B(value: string): { bars: Array<{ x: number; w: number }>; totalWidth: number } {
  const sanitized = value.replace(/[^\x20-\x7E]/g, '');
  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < sanitized.length; i++) {
    const val = sanitized.charCodeAt(i) - 32;
    codes.push(val);
    checksum += (i + 1) * val;
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop pattern

  const quietZone = 10;
  let x = quietZone;
  const bars: Array<{ x: number; w: number }> = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    for (let j = 0; j < pattern.length; j++) {
      const width = Number(pattern[j]);
      if (j % 2 === 0) {
        bars.push({ x, w: width });
      }
      x += width;
    }
  }

  return { bars, totalWidth: x + quietZone };
}

interface Barcode128Props {
  value: string;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Renders a scannable 1D Code 128B SVG barcode for standard supermarket USB laser scanners.
 */
export const Barcode128: React.FC<Barcode128Props> = ({
  value,
  height = 46,
  showLabel = true,
  className = '',
}) => {
  const cleanValue = value.trim();
  if (!cleanValue) return null;

  const { bars, totalWidth } = encodeCode128B(cleanValue);

  return (
    <div className={`flex flex-col items-center gap-1 select-all ${className}`} dir="ltr">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[240px] bg-white rounded-md p-1.5"
        style={{ height: `${height}px` }}
        role="img"
        aria-label={`Barcode ${cleanValue}`}
        shapeRendering="crispEdges"
      >
        <rect x={0} y={0} width={totalWidth} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={2}
            width={bar.w}
            height={height - 4}
            fill="#111827"
          />
        ))}
      </svg>
      {showLabel && (
        <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-stone-700">
          {cleanValue}
        </span>
      )}
    </div>
  );
};
