import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { Logo } from '@/shared/brand/Logo';
import { LinkButton } from '@/marketing/components/common/Button';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { primaryNav } from '@/marketing/data/site';
import { useLockBodyScroll } from '@/marketing/hooks/useLockBodyScroll';
import { track } from '@/marketing/lib/analytics';
import { cn } from '@/shared/cn';

type MobileNavigationProps = {
  open: boolean;
  onClose: () => void;
};

/** Full-screen mobile menu — no nested dropdowns, all targets ≥ 44px. */
export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      className="fixed inset-0 z-60 flex flex-col bg-paper lg:hidden"
    >
      <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-mist px-gutter">
        <Logo />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="-mr-2 inline-flex size-11 items-center justify-center text-ink"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-gutter py-6">
        <ul className="divide-y divide-mist border-b border-mist">
          {primaryNav.map((item, index) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[3.75rem] items-center gap-4 text-[1.6875rem] font-semibold tracking-[-0.025em] transition-colors',
                    isActive ? 'text-forest' : 'text-ink',
                  )
                }
              >
                <span className="label-meta w-8 shrink-0 text-graphite/50">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid gap-3">
          <LinkButton to="/login" variant="secondary" size="lg" onClick={onClose}>
            Sign in
          </LinkButton>
          <LinkButton
            to="/contact"
            variant="primary"
            size="lg"
            onClick={() => {
              track('cta_talk_to_us_click', { surface: 'mobile_menu' })
              onClose()
            }}
          >
            Talk to us
          </LinkButton>
        </div>
      </nav>

      <div className="shrink-0 border-t border-mist px-gutter py-4">
        <SignalIndex
          entries={[
            { key: 'Company', value: 'OpportunityX' },
            { key: 'Category', value: 'Opportunity Intelligence' },
          ]}
          layout="stack"
        />
      </div>
    </div>
  );
}
