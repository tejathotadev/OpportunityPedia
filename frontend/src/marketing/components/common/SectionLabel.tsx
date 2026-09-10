import { cn } from '@/shared/cn';

type SectionLabelProps = {
  /** Numbered index, e.g. "02". Rendered before the label with a slash. */
  index?: string;
  children: string;
  className?: string;
  tone?: 'default' | 'inverse';
};

export function SectionLabel({ index, children, className, tone = 'default' }: SectionLabelProps) {
  return (
    <p
      className={cn(
        'label-meta flex items-center gap-2.5',
        tone === 'inverse' && 'text-white/55',
        className,
      )}
    >
      {index ? (
        <>
          {/* Neutral, not signal green: an index is structure, not a signal. */}
          <span className={tone === 'inverse' ? 'text-white' : 'text-ink'}>{index}</span>
          <span aria-hidden="true" className={tone === 'inverse' ? 'text-white/25' : 'text-mist'}>
            /
          </span>
        </>
      ) : null}
      <span>{children}</span>
    </p>
  );
}
