import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { QuickBookingWidget } from '../../components/QuickBookingWidget';

const FastBookingModal = lazy(() =>
  import('../../components/FastBookingModal').then((module) => ({
    default: module.FastBookingModal,
  }))
);

const Home = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

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
      <section className="relative bg-[linear-gradient(180deg,#EFF6FF_0%,#FFFFFF_45%,#FFFFFF_100%)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:min-h-[calc(100svh-80px)] lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              Online randevu
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Berber randevunu{' '}
              <span className="text-blue-600">saniyeler içinde</span> al.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Hizmetini seç, ustanı belirle, sana uygun saati ayır. Sıra beklemeden
              gel.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                Pzt–Cmt 10:00–22:00
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                Pazar kapalı
              </span>
            </div>
          </div>

          <div id="randevu" className="scroll-mt-24">
            <QuickBookingWidget onComplete={() => setIsBookingOpen(true)} />
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
