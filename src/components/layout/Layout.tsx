import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBooking } from '../../context/BookingContext';
import { cn } from '../../lib/utils';

const navLinks = [
  { label: 'Ana Sayfa', to: '/' },
  { label: 'Hizmetler', to: '/#hizmetler' },
  { label: 'Randevu', to: '/booking' },
];

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { resetAppointment } = useBooking();

  useEffect(() => {
    setIsMobileMenuOpen(false);

    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace('#', '');
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBookingClick = () => {
    resetAppointment();
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream font-sans text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-cream"
      >
        İçeriğe geç
      </a>

      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-ink/10 bg-cream/95 py-3 backdrop-blur-xl'
            : 'bg-transparent py-5'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <Link to="/" className="group flex items-baseline gap-1" aria-label="WidBer ana sayfa">
            <span className="font-display text-2xl font-semibold tracking-tight text-ink">
              WidBer
            </span>
            <span
              className="mb-1 h-1.5 w-1.5 rounded-full bg-brass transition-transform duration-300 group-hover:scale-125"
              aria-hidden="true"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Ana menü">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={link.to === '/booking' ? handleBookingClick : undefined}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <Link
              to="/admin/login"
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55 transition-colors hover:text-ink/70"
            >
              Personel
            </Link>
            <Link
              to="/booking"
              onClick={handleBookingClick}
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-all duration-300 hover:bg-ink-soft hover:shadow-[0_10px_24px_-12px_rgba(23,19,16,0.6)]"
            >
              Randevu Al
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <button
            type="button"
            className="-mr-2 p-2 text-ink md:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-nav"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-0 top-full border-b border-ink/10 bg-cream/95 p-6 shadow-2xl backdrop-blur-xl md:hidden"
            >
              <nav className="flex flex-col gap-1" aria-label="Mobil menü">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={
                      link.to === '/booking'
                        ? handleBookingClick
                        : () => setIsMobileMenuOpen(false)
                    }
                    className="rounded-xl px-3 py-3 font-display text-2xl text-ink transition-colors hover:bg-ink/5"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-5 border-t border-ink/10 pt-5">
                <Link
                  to="/booking"
                  onClick={handleBookingClick}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-cream"
                >
                  Randevu Al
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <div className="mt-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                  <Link
                    to="/admin/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-ink"
                  >
                    Personel Girişi
                  </Link>
                  <Link
                    to="/admin/login/staff"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-ink"
                  >
                    Yönetici Girişi
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main" className="flex-1 pt-24">
        <Outlet />
      </main>

      <footer className="bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link to="/" className="inline-flex items-baseline gap-1" aria-label="WidBer ana sayfa">
                <span className="font-display text-3xl font-semibold tracking-tight">WidBer</span>
                <span className="mb-1 h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
              </Link>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/60">
                Modern erkeğin bakım ritüeli. Sıra beklemeden, size ayrılan zamanda.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/55">
                Keşfet
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <Link to="/" className="text-cream/70 transition-colors hover:text-cream">
                    Ana Sayfa
                  </Link>
                </li>
                <li>
                  <Link to="/#hizmetler" className="text-cream/70 transition-colors hover:text-cream">
                    Hizmetler
                  </Link>
                </li>
                <li>
                  <Link
                    to="/booking"
                    onClick={handleBookingClick}
                    className="text-cream/70 transition-colors hover:text-cream"
                  >
                    Randevu
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/55">
                Saatler
              </p>
              <ul className="mt-5 space-y-3 text-sm text-cream/70">
                <li>Pazartesi–Cumartesi</li>
                <li>10:00–22:00</li>
                <li className="text-cream/55">Pazar kapalı</li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/55">
                Giriş
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <Link
                    to="/admin/login"
                    className="text-cream/70 transition-colors hover:text-cream"
                  >
                    Personel Girişi
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/login/staff"
                    className="text-cream/70 transition-colors hover:text-cream"
                  >
                    Yönetici Girişi
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-cream/10 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/45 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} WidBer. Tüm hakları saklıdır.</p>
            <p>Premium grooming · Randevu ile</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
