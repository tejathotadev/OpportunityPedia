import { Outlet } from 'react-router-dom';
import { Navbar } from '@/marketing/components/navigation/Navbar';
import { Footer } from './Footer';
import { ScrollToTop } from './ScrollToTop';

export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <ScrollToTop />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
