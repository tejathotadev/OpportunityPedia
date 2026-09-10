import { cn } from '@/shared/cn';

export type Temperature = 'very-hot' | 'hot' | 'warm' | 'watch';

const config: Record<Temperature, { label: string; dot: string; text: string; bars: number }> = {
  'very-hot': { label: 'Very Hot', dot: 'bg-temp-very-hot', text: 'text-temp-very-hot', bars: 4 },
  hot: { label: 'Hot', dot: 'bg-temp-hot', text: 'text-temp-hot', bars: 3 },
  warm: { label: 'Warm', dot: 'bg-temp-warm', text: 'text-temp-warm', bars: 2 },
  watch: { label: 'Watch', dot: 'bg-temp-watch', text: 'text-temp-watch', bars: 1 },
};

type SignalBadgeProps = {
  temperature: Temperature;
  className?: string;
  tone?: 'default' | 'inverse';
};

/**
 * Temperature indicator. Colour is paired with a written label and a bar count
 * so the ranking never depends on colour perception alone.
 */
export function SignalBadge({ temperature, className, tone = 'default' }: SignalBadgeProps) {
  const { label, dot, text, bars } = config[temperature];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 border px-2 py-1 text-[0.6875rem] font-medium tracking-[0.08em] uppercase',
        tone === 'inverse' ? 'border-white/15 bg-white/[0.04]' : 'border-mist bg-white',
        text,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />
      {label}
      <span aria-hidden="true" className="flex items-end gap-[2px]">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'w-[2px] rounded-[1px]',
              step === 1 && 'h-1.5',
              step === 2 && 'h-2',
              step === 3 && 'h-2.5',
              step === 4 && 'h-3',
              step <= bars ? dot : tone === 'inverse' ? 'bg-white/15' : 'bg-mist',
            )}
          />
        ))}
      </span>
    </span>
  );
}
