import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ArrowRight, Check, Megaphone } from 'lucide-react';
import { QuickBookingWidget } from '../../components/QuickBookingWidget';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const FastBookingModal = lazy(() =>
  import('../../components/FastBookingModal').then((module) => ({
    default: module.FastBookingModal,
  }))
);

const Home = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const { settings } = useSiteSettings();
  const titleParts = settings.hero_highlight
    ? settings.hero_title.split(settings.hero_highlight)
    : [settings.hero_title];

  useEffect(() => {
    if (!isBookingOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsBookingOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isBookingOpen]);

  return (
    <div className="bg-white">
      {settings.announcement_enabled && settings.announcement_text && (
        <div className="px-4 pt-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/80 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
            <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="text-[13px] font-medium leading-snug text-blue-900">
                {settings.announcement_text}
              </p>
            </div>

            {settings.announcement_link_url && (
              <a
                href={settings.announcement_link_url}
                target="_blank"
                rel="noreferrer"
                className="ml-9 inline-flex h-8 shrink-0 items-center gap-1 self-start rounded-full bg-white px-3 text-[11px] font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 transition-colors hover:bg-blue-600 hover:text-white sm:ml-0 sm:self-auto"
              >
                {settings.announcement_link_label || 'Detay'}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}

      <section className="relative bg-[linear-gradient(180deg,#EFF6FF_0%,#FFFFFF_45%,#FFFFFF_100%)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:min-h-[calc(100svh-80px)] lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            {settings.hero_image_url && (
              <img
                src={settings.hero_image_url}
                alt=""
                className="mb-6 h-40 w-full max-w-lg rounded-xl object-cover shadow-sm sm:h-48"
              />
            )}

            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              {settings.hero_badge}
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {titleParts.length === 2 ? (
                <>
                  {titleParts[0]}
                  <span className="text-blue-600">{settings.hero_highlight}</span>
                  {titleParts[1]}
                </>
              ) : (
                settings.hero_title
              )}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              {settings.hero_subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {settings.working_hours_text && (
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  {settings.working_hours_text}
                </span>
              )}
              {settings.closed_days_text && (
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  {settings.closed_days_text}
                </span>
              )}
            </div>
          </div>

          <div id="randevu" className="scroll-mt-24">
            {settings.booking_paused ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Randevu alımı geçici olarak durduruldu
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Şu anda yeni randevu kabul edilmiyor. Dilersen bizimle iletişime geçebilirsin.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {settings.phone && (
                    <a
                      href={`tel:${settings.phone}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Telefonla ara
                    </a>
                  )}
                  {settings.whatsapp && (
                    <a
                      href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <QuickBookingWidget onComplete={() => setIsBookingOpen(true)} />
            )}
          </div>
        </div>
      </section>

      {isBookingOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsBookingOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white/80" />}>
              <FastBookingModal onClose={() => setIsBookingOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
