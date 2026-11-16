import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowRight, AtSign, MapPin, Phone } from 'lucide-react';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const Layout = () => {
  const location = useLocation();
  const { settings } = useSiteSettings();

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

  if (settings.maintenance_mode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
            Kısa bir ara
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {settings.business_name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Şu anda bakım çalışması yapıyoruz. Kısa süre içinde tekrar hizmetinizdeyiz.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {settings.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Telefonla ara
              </a>
            )}
            {settings.whatsapp && (
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <Link to="/" className="flex items-center gap-2" aria-label={`${settings.business_name} ana sayfa`}>
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.business_name}
                className="h-9 max-w-[160px] object-contain"
              />
            ) : (
              <>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  {settings.business_name}
                </span>
                <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
              </>
            )}
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-semibold text-slate-700">{settings.business_name}</span>
            {settings.working_hours_text && <span>{settings.working_hours_text}</span>}
            {settings.closed_days_text && <span>{settings.closed_days_text}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {settings.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {settings.phone}
              </a>
            )}
            {settings.address && (
              <span className="inline-flex max-w-[320px] items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{settings.address}</span>
              </span>
            )}
            {settings.instagram_url && (
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900"
              >
                <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                Instagram
              </a>
            )}
            {settings.maps_url && (
              <a
                href={settings.maps_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Yol tarifi
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
