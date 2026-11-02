// A lavender-dusk landscape drawn entirely in CSS/SVG: sky, a field of lavender rows receding
// to the horizon, and clouds made by warping soft white blobs with fractal noise.

// Puffs per layer, laid out by a seeded generator so server and client render the same.
// Each is [x, y, w, h] in % of the layer: many overlapping rounded puffs read as cumulus.
function puffs(seed: number, count: number, minW: number, maxW: number) {
  let t = seed;
  const rand = () => {
    t = (t * 16807) % 2147483647;
    return (t - 1) / 2147483646;
  };
  return Array.from({ length: count }, (_, i) => {
    const w = minW + rand() * (maxW - minW);
    const x = (i / count) * 104 - 6 + rand() * 4;
    const y = 18 + rand() * 34;
    return [x, y, w, w * (1.5 + rand() * 0.6)] as const;
  });
}

const BLOBS = {
  back: puffs(11, 14, 10, 18),
  mid: puffs(29, 16, 9, 16),
  front: puffs(47, 12, 12, 20),
};

type Layer = keyof typeof BLOBS;

// One filter per depth: far clouds are softer and more torn, near ones denser.
export function CloudFilters() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <filter id="cloud-back" x="-20%" y="-40%" width="140%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="4" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="90" />
      </filter>
      <filter id="cloud-mid" x="-20%" y="-40%" width="140%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="8" />
        <feDisplacementMap in="SourceGraphic" scale="80" />
      </filter>
      <filter id="cloud-front" x="-20%" y="-40%" width="140%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="12" />
        <feDisplacementMap in="SourceGraphic" scale="70" />
      </filter>
    </svg>
  );
}

export function Clouds({ layer, className = "" }: { layer: Layer; className?: string }) {
  return (
    <div aria-hidden className={`clouds clouds-${layer} pointer-events-none ${className}`}>
      <div className="clouds-inner" style={{ filter: `url(#cloud-${layer})` }}>
        {BLOBS[layer].map(([x, y, w, h], i) => (
          <span key={i} className="cloud-blob" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function Landscape({ children }: { children?: React.ReactNode }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="sky absolute inset-0" />
      <div className="sun absolute left-1/2 top-[52%] h-[38rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="field-wrap absolute inset-x-0 bottom-0 h-[48%]">
        <div className="field absolute -inset-x-1/2 bottom-0 top-0" />
        <div className="field-haze absolute inset-0" />
      </div>
      {children}
    </div>
  );
}
