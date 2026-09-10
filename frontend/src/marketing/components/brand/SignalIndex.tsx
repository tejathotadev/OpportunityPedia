import { cn } from '@/shared/cn';

export type SignalIndexEntry = {
  /** Short uppercase key, e.g. "IDX", "TYPE", "STATUS". */
  key: string;
  value: string;
};

type SignalIndexProps = {
  entries: SignalIndexEntry[];
  className?: string;
  tone?: 'default' | 'inverse';
  layout?: 'row' | 'stack';
};

/**
 * SIGNAL INDEX — the house metadata motif.
 *
 * Renders `KEY / VALUE` pairs as small structured metadata. Used sparingly to
 * give visuals the feel of an indexed reference system rather than decoration.
 */
export function SignalIndex({
  entries,
  className,
  tone = 'default',
  layout = 'row',
}: SignalIndexProps) {
  return (
    <dl
      className={cn(
        'label-meta',
        layout === 'row' ? 'flex flex-wrap items-center gap-x-5 gap-y-2' : 'grid gap-1.5',
        tone === 'inverse' && 'text-white/50',
        className,
      )}
    >
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center gap-1.5">
          <dt className={tone === 'inverse' ? 'text-white/35' : 'text-graphite/60'}>
            {entry.key}
          </dt>
          <span aria-hidden="true" className={tone === 'inverse' ? 'text-white/20' : 'text-mist'}>
            /
          </span>
          <dd className={tone === 'inverse' ? 'text-white/75' : 'text-ink/70'}>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
