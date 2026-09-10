import { Hero } from '@/marketing/components/sections/Hero';
import { Thesis } from '@/marketing/components/sections/Thesis';
import { Problem } from '@/marketing/components/sections/Problem';
import { Approach } from '@/marketing/components/sections/Approach';
import { ProductShowcase } from '@/marketing/components/sections/ProductShowcase';
import { HowItWorks } from '@/marketing/components/sections/HowItWorks';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { useSeo } from '@/marketing/hooks/useSeo';

/**
 * Marketing homepage for OpportunityX (company).
 *
 * Kept short on purpose: who we are → the problem → how we think → the
 * product → what using it feels like → talk to us. Collection methods and
 * signal taxonomies stay inside OpportunityPedia, not on this page.
 */
export function HomePage() {
  useSeo({
    title: 'OpportunityX — We make opportunity easier to see',
    description:
      'OpportunityX builds OpportunityPedia, the platform that helps teams find, prioritize and act on business opportunities — without the noise.',
    path: '/',
  });

  return (
    <>
      <Hero />
      <Thesis />
      <Problem />
      <Approach />
      <ProductShowcase />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
