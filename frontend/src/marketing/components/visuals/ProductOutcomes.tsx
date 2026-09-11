import { productOutcomes } from '@/marketing/data/content';
import { cn } from '@/shared/cn';

/**
 * Product-stage panel used on public pages. Outcomes only — no product chrome,
 * no source names, no classification copy.
 */
export function ProductOutcomes({ className }: { className?: string }) {
  return (
    <ol className={cn('grid gap-px bg-white/10 md:grid-cols-3', className)}>
      {productOutcomes.map((outcome) => (
        <li key={outcome.index} className="bg-navy-deep px-5 py-7 md:px-7 md:py-8">
          <p className="label-meta text-white/40">{outcome.index}</p>
          <h3 className="mt-4 text-[1.125rem] leading-snug font-semibold tracking-[-0.02em] text-white">
            {outcome.title}
          </h3>
          <p className="mt-3 max-w-[28rem] text-[0.9375rem] leading-relaxed text-white/65">
            {outcome.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
