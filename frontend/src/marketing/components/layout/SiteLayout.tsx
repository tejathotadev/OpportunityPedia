import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/marketing/components/navigation/Navbar';
import { RouteFallback } from '@/routes/RouteFallback';
import { Footer } from './Footer';
import { ScrollToTop } from './ScrollToTop';

/**
 * Public site shell: header, flexible main, footer — all in normal flow. The
 * shell is at least one small-viewport tall and `main` takes the remaining
 * space, so the footer sits at the bottom of short pages and after long ones.
 *
 * The Suspense boundary wraps main and footer together so the footer is not
 * rendered above the fold while a lazy page chunk loads.
 */
export function SiteLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <ScrollToTop />
      <Navbar />
      <Suspense
        fallback={
          <main id="main" className="flex-1">
            <RouteFallback />
          </main>
        }
      >
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </Suspense>
    </div>
  );
}
