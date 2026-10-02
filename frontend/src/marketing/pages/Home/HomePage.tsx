import { Hero } from '@/marketing/components/sections/Hero';
import { Thesis } from '@/marketing/components/sections/Thesis';
import { Problem } from '@/marketing/components/sections/Problem';
import { Approach } from '@/marketing/components/sections/Approach';
import { ProductShowcase } from '@/marketing/components/sections/ProductShowcase';
import { HowItWorks } from '@/marketing/components/sections/HowItWorks';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { useSeo } from '@/marketing/hooks/useSeo';

/**
 * Homepage for OpportunityX, the company.
 *
 * Kept short on purpose: who we are → the problem → how we think → our
 * products → what using OpportunityPedia feels like → talk to us. Detailed
 * product capabilities live on the OpportunityPedia page, not here.
 */
export function HomePage() {
  useSeo({
    title: 'OpportunityX — We make opportunity easier to see',
    description:
      'OpportunityX is a technology company building products that help teams find and act on business opportunity. Its first product is OpportunityPedia.',
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
