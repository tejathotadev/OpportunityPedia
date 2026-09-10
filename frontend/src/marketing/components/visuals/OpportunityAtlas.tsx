import heroClarity from '@/marketing/assets/hero-clarity-at-work.png';

/**
 * HERO ILLUSTRATION — Clarity at work
 *
 * Editorial workplace illustration: a professional reviewing two briefs
 * at a calm desk. Human-first, static, no dashboard chrome and no source names.
 */
export function OpportunityAtlas() {
  return (
    <div className="relative overflow-hidden border border-mist bg-paper-warm">
      <img
        src={heroClarity}
        alt="A professional reviewing two opportunity briefs at a calm desk by the window."
        width={1600}
        height={1200}
        className="h-auto w-full object-cover object-center"
        decoding="async"
      />
    </div>
  );
}
