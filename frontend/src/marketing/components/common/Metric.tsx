import { cn } from '@/shared/cn';
import type { Temperature } from './SignalBadge';

const accents: Record<Temperature | 'neutral', string> = {
  'very-hot': 'text-temp-very-hot',
  hot: 'text-temp-hot',
  warm: 'text-temp-warm',
  watch: 'text-temp-watch',
  neutral: 'text-teal',
};

type MetricProps = {
  label: string;
  value: string;
  note?: string;
  accent?: Temperature | 'neutral';
  className?: string;
};

/**
 * Product-stage metric tile. Values here are illustrative product-UI numbers,
 * never presented as company traction metrics.
 */
export function Metric({ label, value, note, accent = 'neutral', className }: MetricProps) {
  return (
    <div
      className={cn(
        'border border-white/10 bg-white/[0.03] px-4 py-3.5 md:px-5 md:py-4',
        className,
      )}
    >
      <p className="label-meta text-[0.625rem] text-white/45">{label}</p>
      <p className={cn('mt-2 text-2xl leading-none font-semibold md:text-[1.75rem]', accents[accent])}>
        {value}
      </p>
      {note ? <p className="mt-1.5 text-xs text-white/45">{note}</p> : null}
    </div>
  );
}
