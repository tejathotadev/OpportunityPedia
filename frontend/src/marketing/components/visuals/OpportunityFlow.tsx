import type { CSSProperties, ReactNode } from 'react';
import { SignalBadge } from '@/marketing/components/common/SignalBadge';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { useInView } from '@/marketing/hooks/useInView';
import { cn } from '@/shared/cn';

type Step = {
  key: string;
  label: string;
  meta?: string;
  headline: string;
  body?: string;
  render?: ReactNode;
};

const steps: Step[] = [
  {
    key: 'source',
    label: 'Source 0247',
    meta: '14:32',
    headline: 'Company announcement',
    body: 'An approved, publicly accessible source is read and timestamped.',
  },
  {
    key: 'signal',
    label: 'Signal',
    meta: 'Leadership',
    headline: 'New CTO appointed',
    body: 'The observation is extracted and typed into a structured signal.',
  },
  {
    key: 'context',
    label: 'Context',
    headline: 'Technology strategy may change',
    body: 'The signal is interpreted against what else is known about the organization.',
  },
  {
    key: 'class',
    label: 'Opportunity class',
    headline: 'Leadership',
    body: 'Classification determines which teams and playbooks are relevant.',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    headline: 'Very Hot',
    render: <SignalBadge temperature="very-hot" />,
    body: 'Urgency is made explicit so the queue can be worked in the right order.',
  },
];

/**
 * The opportunity intelligence engine, drawn as an indexed reference entry:
 * thin rules, numbered gutters, timestamps and small metadata.
 *
 * Everything here is marked as an illustrative workflow — the entry describes
 * how a signal is processed, not live data from a running system.
 */
export function OpportunityFlow({ className }: { className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const visible = inView ? 'true' : 'false';

  return (
    <div ref={ref} className={cn('border border-mist bg-white', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist px-4 py-3 md:px-6">
        <p className="label-meta text-ink">Opportunity intelligence engine</p>
        <SignalIndex
          entries={[
            { key: 'Mode', value: 'Illustrative workflow' },
            { key: 'Entry', value: '0247' },
          ]}
        />
      </div>

      <ol className="px-4 py-2 md:px-6">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;

          return (
            <li
              key={step.key}
              data-visible={visible}
              className="reveal grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 md:grid-cols-[8.5rem_1.25rem_minmax(0,1fr)] md:gap-x-5"
              style={{ '--reveal-delay': `${i * 120}ms` } as CSSProperties}
            >
              {/* Index gutter (desktop) */}
              <p className="label-meta hidden pt-6 md:block">{step.label}</p>

              {/* Connector rail */}
              <div aria-hidden="true" className="relative flex justify-center">
                <span
                  className={cn('absolute top-7 w-px bg-mist', isLast ? 'h-0' : 'bottom-0')}
                />
                <span
                  className={cn(
                    'absolute top-[1.5rem] size-2.5 rounded-full border-2',
                    isLast ? 'border-signal bg-signal' : 'border-forest bg-white',
                  )}
                />
              </div>

              <div className={cn('pt-5', isLast ? 'pb-5' : 'pb-7')}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="label-meta text-ink md:hidden">{step.label}</p>
                  {step.meta ? (
                    <p className="label-meta text-graphite/60">{step.meta}</p>
                  ) : null}
                </div>

                {step.render ? (
                  <div className="mt-2">{step.render}</div>
                ) : (
                  <p className="mt-1.5 text-[1.0625rem] leading-snug font-medium tracking-[-0.015em] text-ink md:mt-0">
                    {step.headline}
                  </p>
                )}

                {step.body ? (
                  <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-graphite">
                    {step.body}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
