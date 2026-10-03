import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/cn';

export type AccordionItem = {
  id: string;
  /** Row content inside the toggle button. Must not contain links or buttons. */
  header: ReactNode;
  panel: ReactNode;
};

type AccordionProps = {
  items: readonly AccordionItem[];
  /** Item open on first render. One item is open at a time. */
  defaultOpenId?: string;
  className?: string;
};

/**
 * Disclosure accordion following the WAI-ARIA pattern: each header is a
 * native button inside an h3, so Enter and Space work without extra handlers.
 * Collapsed panels are `inert` so their links leave the tab order.
 */
export function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const baseId = useId();

  return (
    <div className={cn('divide-y divide-mist border border-mist bg-white', className)}>
      {items.map((item) => {
        const open = openId === item.id;
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;

        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex min-h-[4.5rem] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:outline-offset-[-2px] md:px-7"
              >
                <span className="min-w-0 flex-1">{item.header}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-5 shrink-0 text-graphite transition-transform duration-300',
                    open && 'rotate-180',
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!open}
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">{item.panel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
