import type { CSSProperties } from 'react';
import { transformationStages } from '@/marketing/data/content';
import { useInView } from '@/marketing/hooks/useInView';
import { cn } from '@/shared/cn';

/**
 * AnimatedSignalPipeline — the transformation sequence.
 *
 * Sources → Signals → Intelligence → Opportunity → Action, worked through a
 * single concrete example. The connecting rule draws once as the block enters
 * the viewport and each stage fades up behind it, so the sequence is read in
 * order rather than all at once.
 *
 * Horizontal on desktop, vertical spine on mobile. Nothing is scroll-hijacked.
 */
export function AnimatedSignalPipeline() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '0px 0px -18% 0px' });
  const visible = inView ? 'true' : 'false';

  return (
    <div ref={ref}>
      {/* ---------- Desktop: horizontal ---------- */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* The rule the whole sequence hangs from */}
          <div className="absolute inset-x-0 top-[3.25rem] h-px bg-mist" aria-hidden="true">
            {/* Forest, not signal green: the rule is the structuring work.
                Only the final stage earns the signal colour. */}
            <div
              data-visible={visible}
              className="reveal-line h-px bg-forest"
              style={{ '--reveal-delay': '120ms' } as CSSProperties}
            />
          </div>

          <ol className="relative grid grid-cols-5">
            {transformationStages.map((stage, i) => (
              <li
                key={stage.index}
                data-visible={visible}
                className="reveal pr-6 last:pr-0"
                style={{ '--reveal-delay': `${200 + i * 130}ms` } as CSSProperties}
              >
                <p className="label-meta text-graphite/60">{stage.index}</p>
                <p className="mt-2 text-[0.8125rem] font-semibold tracking-[0.1em] text-forest uppercase">
                  {stage.stage}
                </p>

                <div className="relative mt-[1.6rem] h-6">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute top-[-0.35rem] left-0 size-2.5 rounded-full border-2',
                      i === transformationStages.length - 1
                        ? 'border-signal bg-signal'
                        : 'border-forest bg-white',
                    )}
                  />
                </div>

                {/* Reserved height keeps the detail rows on a shared baseline */}
                <h3 className="min-h-[3.25rem] text-[1.0625rem] leading-snug font-medium tracking-[-0.015em] text-ink">
                  {stage.headline}
                </h3>
                <p className="text-sm leading-relaxed text-graphite">{stage.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ---------- Mobile / tablet: vertical spine ---------- */}
      <ol className="relative lg:hidden">
        <div className="absolute top-2 bottom-2 left-[0.3125rem] w-px bg-mist" aria-hidden="true" />
        {transformationStages.map((stage, i) => (
          <li
            key={stage.index}
            data-visible={visible}
            className="reveal relative pb-9 pl-8 last:pb-0"
            style={{ '--reveal-delay': `${120 + i * 110}ms` } as CSSProperties}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1.5 left-0 size-2.5 rounded-full border-2',
                i === transformationStages.length - 1
                  ? 'border-signal bg-signal'
                  : 'border-forest bg-paper',
              )}
            />
            <div className="flex items-center gap-2.5">
              <span className="label-meta text-graphite/60">{stage.index}</span>
              <span className="text-[0.75rem] font-semibold tracking-[0.1em] text-forest uppercase">
                {stage.stage}
              </span>
            </div>
            <h3 className="mt-2 text-[1.0625rem] leading-snug font-medium tracking-[-0.015em]">
              {stage.headline}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-graphite">{stage.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
