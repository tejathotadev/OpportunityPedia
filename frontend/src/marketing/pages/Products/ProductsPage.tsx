import { PageHero } from '@/marketing/components/sections/PageHero';
import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { ProductAccordion } from '@/marketing/components/sections/ProductAccordion';
import { HowItWorks } from '@/marketing/components/sections/HowItWorks';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { products } from '@/marketing/data/products';
import { useSeo } from '@/marketing/hooks/useSeo';

export default function ProductsPage() {
  useSeo({
    title: 'Products',
    description:
      'Products from OpportunityX. OpportunityPedia, our flagship product, helps teams find, prioritize and act on business opportunities.',
    path: '/products',
  });

  return (
    <>
      <PageHero
        eyebrow="OPPORTUNITYX PRODUCTS"
        headline="Products built around opportunity."
        lead="OpportunityX builds tools that help teams see what matters and act on it. OpportunityPedia is the first."
        index={[
          { key: 'Company', value: 'OpportunityX' },
          {
            key: 'Available',
            value: `${products.length} ${products.length === 1 ? 'product' : 'products'}`,
          },
        ]}
      />

      <Section divider surface="white" aria-labelledby="products-heading">
        <Reveal>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div>
              <SectionLabel>OUR PRODUCTS</SectionLabel>
              <EditorialHeading id="products-heading" size="display" className="mt-6 max-w-[18ch]">
                Find the right product for your team.
              </EditorialHeading>
            </div>
            <p className="max-w-[26rem] text-[1.0625rem] leading-relaxed text-graphite">
              Innovative solutions to help you find, analyze and act on opportunities.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 md:mt-12">
          <ProductAccordion />
        </div>
      </Section>

      <HowItWorks />

      <FinalCta />
    </>
  );
}
