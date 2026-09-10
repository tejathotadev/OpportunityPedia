import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu } from 'lucide-react';
import { Logo } from '@/shared/brand/Logo';
import { LinkButton } from '@/marketing/components/common/Button';
import { Container } from '@/marketing/components/layout/Container';
import { primaryNav } from '@/marketing/data/site';
import { useScrolled } from '@/marketing/hooks/useScrolled';
import { track } from '@/marketing/lib/analytics';
import { cn } from '@/shared/cn';
import { MobileNavigation } from './MobileNavigation';
import { ProductsMenu } from './ProductsMenu';

const MENU_ID = 'products-mega-menu';

export function Navbar() {
  const scrolled = useScrolled(8);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsWrapRef = useRef<HTMLLIElement>(null);
  const closeTimer = useRef<number>(0);
  const { pathname } = useLocation();

  useEffect(() => {
    setProductsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!productsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!productsWrapRef.current?.contains(event.target as Node)) setProductsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [productsOpen]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openProducts = () => {
    window.clearTimeout(closeTimer.current);
    setProductsOpen(true);
  };

  // Small grace period so the pointer can travel from trigger to panel.
  const scheduleCloseProducts = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setProductsOpen(false), 140);
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-70 focus:rounded-control focus:bg-forest focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-paper"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'sticky top-0 z-50 transition-colors duration-300',
          scrolled ? 'border-b border-mist bg-paper' : 'bg-transparent',
        )}
      >
        <Container width="wide">
          <div className="flex h-18 items-center justify-between gap-6 lg:h-20">
            <Logo />

            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {primaryNav.map((item) =>
                  item.label === 'Products' ? (
                    <li
                      key={item.to}
                      ref={productsWrapRef}
                      className="relative"
                      onPointerEnter={openProducts}
                      onPointerLeave={scheduleCloseProducts}
                    >
                      <NavLink
                        to={item.to}
                        aria-expanded={productsOpen}
                        aria-haspopup="true"
                        aria-controls={productsOpen ? MENU_ID : undefined}
                        onFocus={openProducts}
                        className={({ isActive }) =>
                          cn(
                            'inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-[0.9375rem] transition-colors',
                            isActive || productsOpen
                              ? 'text-ink'
                              : 'text-graphite hover:text-ink',
                          )
                        }
                      >
                        {item.label}
                        <ChevronDown
                          aria-hidden="true"
                          className={cn(
                            'size-3.5 transition-transform duration-200',
                            productsOpen && 'rotate-180',
                          )}
                        />
                      </NavLink>
                      {productsOpen ? (
                        <ProductsMenu id={MENU_ID} onDismiss={() => setProductsOpen(false)} />
                      ) : null}
                    </li>
                  ) : (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            'inline-flex h-11 items-center rounded-control px-3 text-[0.9375rem] transition-colors',
                            isActive ? 'text-ink' : 'text-graphite hover:text-ink',
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden items-center gap-3 lg:flex">
                <LinkButton to="/login" variant="secondary">
                  Sign in
                </LinkButton>
                <LinkButton
                  to="/contact"
                  variant="primary"
                  onClick={() => track('cta_talk_to_us_click', { surface: 'navbar' })}
                >
                  Talk to us
                </LinkButton>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                className="-mr-2 inline-flex size-11 items-center justify-center text-ink lg:hidden"
              >
                <Menu aria-hidden="true" className="size-6" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
