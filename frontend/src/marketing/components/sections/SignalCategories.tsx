import { Section } from '@/marketing/components/layout/Section';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { Reveal } from '@/marketing/components/common/Reveal';
import { signalCategories } from '@/marketing/data/content';

/** Signal types as a reference index — table discipline, no coloured pills. */
export function SignalCategories() {
  return (
    <Section divider surface="white" aria-labelledby="categories-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel>SIGNAL INDEX</SectionLabel>
            <EditorialHeading id="categories-heading" size="display" className="mt-6 max-w-[20ch]">
              Different signals. One opportunity layer.
            </EditorialHeading>
            <p className="mt-6 max-w-[32rem] text-lead text-graphite">
              Each type of signal means something different about where an organization is heading.
              Classifying them consistently is what lets a team compare one opportunity against
              another.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal delay={90}>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Signal types tracked by OpportunityPedia and what each one indicates
              </caption>
              <thead>
                <tr className="border-y border-mist">
                  <th scope="col" className="label-meta w-12 py-3 pr-3 font-normal">
                    #
                  </th>
                  <th scope="col" className="label-meta py-3 pr-4 font-normal">
                    Signal
                  </th>
                  <th scope="col" className="label-meta py-3 font-normal">
                    What it indicates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {signalCategories.map((category) => (
                  <tr key={category.index} className="align-baseline">
                    <td className="label-meta py-4 pr-3 text-graphite/55">{category.index}</td>
                    <td className="py-4 pr-4 text-[0.9375rem] font-medium text-ink">
                      {category.name}
                    </td>
                    <td className="py-4 text-[0.9375rem] text-graphite">{category.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
