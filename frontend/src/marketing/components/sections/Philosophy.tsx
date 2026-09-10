import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading, SerifAccent } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { principles } from '@/marketing/data/content';

/**
 * The strategic centre of the page. Deep forest surface, one large statement
 * on the left, the five operating principles indexed on the right.
 */
export function Philosophy() {
  return (
    <Section surface="forest-deep" aria-labelledby="philosophy-heading">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel index="04" tone="inverse">
              HOW WE THINK
            </SectionLabel>
            <EditorialHeading
              id="philosophy-heading"
              size="display"
              className="mt-7 max-w-[16ch] text-white"
            >
              More data isn&rsquo;t the answer.{' '}
              <span className="text-white/55">
                Better <SerifAccent>context</SerifAccent> is.
              </span>
            </EditorialHeading>
            <p className="mt-7 max-w-[30rem] text-lead text-white/60">
              These are the trade-offs we make when a product decision could go either way.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <dl className="border-t border-white/12">
            {principles.map((principle, i) => (
              <Reveal
                key={principle.title}
                delay={i * 70}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-white/12 py-6"
              >
                <span className="label-meta pt-1 text-white">{principle.index}</span>
                <div>
                  <dt className="text-[1.125rem] leading-snug font-semibold tracking-[-0.015em] text-white">
                    {principle.title}
                  </dt>
                  <dd className="mt-2 text-[0.9375rem] leading-relaxed text-white/55">
                    {principle.body}
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}
