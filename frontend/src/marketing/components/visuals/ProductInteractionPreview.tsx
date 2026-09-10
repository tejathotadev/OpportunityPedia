import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { OpportunityXUI, type UIState } from './OpportunityXUI';
import { useInView } from '@/marketing/hooks/useInView';
import { useReducedMotion } from '@/marketing/hooks/useReducedMotion';
import { track } from '@/marketing/lib/analytics';
import { cn } from '@/shared/cn';

/* ================================================================== *
 * PRODUCT INTERACTION PREVIEW
 *
 * Walks the complete OpportunityX value loop — discover, prioritize,
 * assign, outreach, track — in about fourteen seconds.
 *
 * It advances only while on screen, can be paused, and never auto-plays
 * for people who prefer reduced motion; those visitors get the finished
 * state plus manual stepping, so no information depends on the motion.
 * ================================================================== */

const SELECTED = '0247';
const STEP_MS = 2000;

const idleState: UIState = {
  selectedId: null,
  drawerOpen: false,
  owner: null,
  composerOpen: false,
  outreachSent: false,
  pressing: null,
};

type Step = { caption: string; state: UIState };

const steps: Step[] = [
  {
    caption: 'The dashboard opens on 36 opportunities classified Very Hot.',
    state: idleState,
  },
  {
    caption: 'The top item needs attention now — work it first.',
    state: { ...idleState, selectedId: SELECTED },
  },
  {
    caption: 'Opening it shows the source context behind the classification.',
    state: { ...idleState, selectedId: SELECTED, drawerOpen: true },
  },
  {
    caption: 'Temperature is explicit: Very Hot, on a stated submission window.',
    state: { ...idleState, selectedId: SELECTED, drawerOpen: true, pressing: 'assign' },
  },
  {
    caption: 'Assigning it puts a name on the work before anyone duplicates it.',
    state: {
      ...idleState,
      selectedId: SELECTED,
      drawerOpen: true,
      owner: 'You',
      pressing: 'outreach',
    },
  },
  {
    caption: 'Outreach is composed with the originating context still attached.',
    state: {
      ...idleState,
      selectedId: SELECTED,
      drawerOpen: true,
      owner: 'You',
      composerOpen: true,
      pressing: 'send',
    },
  },
  {
    caption: 'The activity log records it, so the team can see the work is done.',
    state: {
      ...idleState,
      selectedId: SELECTED,
      drawerOpen: true,
      owner: 'You',
      composerOpen: true,
      outreachSent: true,
    },
  },
];

export function ProductInteractionPreview({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, threshold: 0.35 });

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Reduced motion gets the completed state instead of a sequence.
  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setIndex(steps.length - 1);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !inView || reducedMotion) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % steps.length),
      STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, inView, index, reducedMotion]);

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      setPlaying(false);
      if (!hasInteracted) {
        setHasInteracted(true);
        track('product_demo_click', { step: next });
      }
    },
    [hasInteracted],
  );

  const step = steps[index];

  return (
    <div ref={ref} className={cn('relative', className)}>
      <OpportunityXUI state={step.state} />

      {/* Caption + transport */}
      <div className="mt-4 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[0.625rem] tracking-[0.12em] text-white/35">
            {String(index + 1).padStart(2, '0')}/{String(steps.length).padStart(2, '0')}
          </span>
          <p aria-live="polite" className="min-w-0 text-[0.875rem] leading-relaxed text-white/70">
            {step.caption}
          </p>
        </div>

        {/* Step targets stay at 44px, so on a 320px screen the row wraps
            rather than pushing the page into horizontal scroll. */}
        <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
          <button
            type="button"
            onClick={() => {
              if (index === steps.length - 1 && !playing) setIndex(0);
              setPlaying((current) => !current);
              if (!hasInteracted) {
                setHasInteracted(true);
                track('product_demo_click', { control: 'play' });
              }
            }}
            aria-label={playing ? 'Pause product walkthrough' : 'Play product walkthrough'}
            className="inline-flex size-11 items-center justify-center text-white/60 transition-colors hover:text-white"
          >
            {playing ? (
              <Pause aria-hidden="true" className="size-4" />
            ) : index === steps.length - 1 ? (
              <RotateCcw aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
          </button>

          <div
            className="flex flex-wrap items-center gap-1"
            role="tablist"
            aria-label="Walkthrough steps"
          >
            {steps.map((entry, i) => (
              <button
                key={entry.caption}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Step ${i + 1}: ${entry.caption}`}
                onClick={() => goTo(i)}
                className="inline-flex size-11 items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-[3px] w-4 transition-colors duration-200',
                    i === index ? 'bg-teal' : i < index ? 'bg-white/35' : 'bg-white/15',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
