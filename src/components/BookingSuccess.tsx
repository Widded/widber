import React from 'react';
import { Check } from 'lucide-react';
import { CancelLinkBox } from './CancelLinkBox';

type BookingSuccessProps = {
  link: string;
  onClose: () => void;
};

export const BookingSuccess: React.FC<BookingSuccessProps> = ({ link, onClose }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="booking-success-title"
    className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl"
  >
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
      <Check className="h-7 w-7 text-emerald-600" aria-hidden="true" />
    </div>

    <h2 id="booking-success-title" className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900">
      Randevun onaylandı
    </h2>
    <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
      Sizi bekliyoruz. Randevu detaylarını ve iptal işlemini aşağıdaki linkten yapabilirsin.
    </p>

    <CancelLinkBox url={link} />

    <button
      type="button"
      onClick={onClose}
      className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
    >
      Kapat
    </button>
  </div>
);
