import { cn } from '@/shared/cn';

/**
 * EditorialGlyph — the brand graphic system, generated rather than sourced.
 *
 * Every composition is drawn from the same vocabulary: brackets, thin rules,
 * index ticks and small nodes on a paper field. A deterministic seed means an
 * article always gets the same graphic, and no stock imagery is ever needed.
 */

/** Small deterministic PRNG so a given seed always yields the same drawing. */
function makeRandom(seed: number) {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

export function EditorialGlyph({
  seed,
  className,
  label,
}: {
  seed: number;
  className?: string;
  /** Index string shown in the corner, e.g. "IDX / 03". */
  label?: string;
}) {
  const random = makeRandom(seed + 3);
  const bars = Array.from({ length: 7 }, () => 0.25 + random() * 0.7);
  const nodeRow = Math.floor(random() * 7);
  const bracketTop = 18 + Math.floor(random() * 14);

  return (
    <svg
      viewBox="0 0 320 180"
      className={cn('h-auto w-full bg-paper-warm', className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* Index ticks along the top */}
      {Array.from({ length: 16 }, (_, i) => (
        <line
          key={`tick-${i}`}
          x1={20 + i * 18}
          x2={20 + i * 18}
          y1="0"
          y2={i % 4 === 0 ? 9 : 5}
          className="stroke-graphite"
          strokeWidth="1"
          opacity={i % 4 === 0 ? 0.4 : 0.18}
        />
      ))}

      {/* Bracket — the recurring structural mark */}
      <path
        d={`M 34 ${bracketTop} H 20 V ${162} H 34`}
        fill="none"
        className="stroke-forest"
        strokeWidth="1.5"
        opacity="0.75"
      />
      <path
        d={`M 286 ${bracketTop} H 300 V ${162} H 286`}
        fill="none"
        className="stroke-forest"
        strokeWidth="1.5"
        opacity="0.28"
      />

      {/* Indexed bars — structured signal blocks of varying weight */}
      {bars.map((width, i) => {
        const y = 42 + i * 16;
        const isNode = i === nodeRow;
        return (
          <g key={`bar-${i}`}>
            <line
              x1="48"
              x2={48 + width * 214}
              y1={y}
              y2={y}
              className={isNode ? 'stroke-forest' : 'stroke-graphite'}
              strokeWidth={isNode ? 2 : 1}
              opacity={isNode ? 0.9 : 0.26}
            />
            {isNode ? (
              <circle cx={48 + width * 214 + 8} cy={y} r="3" className="fill-signal" />
            ) : null}
          </g>
        );
      })}

      {label ? (
        <text
          x="48"
          y="26"
          className="fill-graphite"
          fontSize="8.5"
          letterSpacing="1.2"
          opacity="0.75"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
