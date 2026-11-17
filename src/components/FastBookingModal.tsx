import React, { useState } from 'react';
import { ArrowRight, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '../lib/bookingErrors';
import { useBooking } from '../context/BookingContext';
import { getAppointmentLink } from '../lib/bookingLink';
import { BookingSuccess } from './BookingSuccess';

interface FastBookingModalProps {
  onClose: () => void;
}

export const FastBookingModal: React.FC<FastBookingModalProps> = ({ onClose }) => {
  const { appointment, resetAppointment } = useBooking();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cancelToken, setCancelToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slotConflict, setSlotConflict] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (
      !appointment.date ||
      !appointment.time ||
      !appointment.barber ||
      appointment.services.length === 0
    ) {
      setError('Lütfen hizmet, personel, tarih ve saat seçimlerini tamamlayın.');
      return;
    }

    setLoading(true);

    try {
      const totalPrice = appointment.services.reduce((sum, service) => sum + service.price, 0);
      const totalDuration = appointment.services.reduce(
        (sum, service) => sum + service.duration,
        0
      );
      const token = crypto.randomUUID();

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            customer_first_name: firstName,
            customer_last_name: lastName,
            phone,
            appointment_date: format(appointment.date, 'yyyy-MM-dd'),
            appointment_time: appointment.time,
            barber_id: appointment.barber.id,
            total_price: totalPrice,
            total_duration: totalDuration,
            status: 'approved',
            cancel_token: token,
          },
        ])
        .select('id')
        .single();

      if (appointmentError) throw appointmentError;

      if (appointmentData) {
        const mappings = appointment.services.map((service) => ({
          appointment_id: appointmentData.id,
          service_id: service.id,
        }));

        const { error: mappingError } = await supabase
          .from('appointment_services')
          .insert(mappings);

        if (mappingError) throw mappingError;
      }

      setCancelToken(token);
      setSuccess(true);
      resetAppointment();
    } catch (err) {
      console.error(err);

      if (isSlotConflictError(err)) {
        setSlotConflict(true);
        setError(SLOT_CONFLICT_MESSAGE);
        window.dispatchEvent(new Event('widber:booking-conflict'));
      } else {
        setError('Randevu oluşturulamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success && cancelToken) {
    return <BookingSuccess link={getAppointmentLink(cancelToken)} onClose={onClose} />;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fast-booking-title"
      className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl md:p-7"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <p className="text-xs font-semibold text-blue-600">Son adım</p>
      <h2 id="fast-booking-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">
        İletişim bilgileri
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Randevunuzu tamamlamak için bilgilerinizi girin.
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">
          {appointment.services.map((service) => service.name).join(', ')}
        </p>
        <p className="mt-1 text-slate-500">
          {appointment.date
            ? format(appointment.date, 'd MMMM yyyy, EEEE', { locale: tr })
            : 'Tarih seçilmedi'}
          {appointment.time ? ` · ${appointment.time}` : ''}
          {appointment.barber ? ` · ${appointment.barber.name}` : ''}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fast-first-name" className="text-xs font-medium text-slate-600">
              Ad
            </label>
            <input
              id="fast-first-name"
              name="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Adınız"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="fast-last-name" className="text-xs font-medium text-slate-600">
              Soyad
            </label>
            <input
              id="fast-last-name"
              name="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Soyadınız"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="fast-phone" className="text-xs font-medium text-slate-600">
            Telefon
          </label>
          <input
            id="fast-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="05XX XXX XX XX"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm tracking-wide text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        {slotConflict ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Farklı saat seç
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                Randevuyu onayla
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </form>

      <p className="mt-3 text-center text-xs text-slate-400">Ödeme dükkanda yapılır.</p>
    </div>
  );
};
