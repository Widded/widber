import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);

      if (element) {
        const top = element.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top, behavior: 'auto' });
      }

      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-slate-900 focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        İçeriğe geç
      </a>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2" aria-label="WidBer ana sayfa">
            <span className="text-xl font-bold tracking-tight text-slate-900">WidBer</span>
            <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/login"
              className="hidden text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 sm:block"
            >
              Personel
            </Link>
            <Link
              to="/#randevu"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Randevu Al
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
