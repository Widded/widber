import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarPlus, Check, Clock3, Loader2, Phone, Scissors, UserRound } from 'lucide-react';
import { Modal } from '../ui/modal';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useAvailableTimes } from '../../hooks/useAvailableTimes';
import { splitTimeSlots } from '../../lib/availability';
import { getBookingDates } from '../../lib/bookingDates';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/appointmentUtils';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '../../lib/bookingErrors';
import { cn } from '../../lib/utils';

type ManualAppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate?: string;
};

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export const ManualAppointmentModal = ({
  isOpen,
  onClose,
  onCreated,
  initialDate,
}: ManualAppointmentModalProps) => {
  const { services, barbers, loading: dataLoading } = useSupabaseData();
  const availableDates = useMemo(() => getBookingDates(), []);
  const firstDateStr = availableDates[0]
    ? format(availableDates[0], 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState('');
  const [dateStr, setDateStr] = useState(firstDateStr);
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const selectedBarber = barbers.find((barber) => barber.id === barberId) ?? null;
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);

  const { bookedTimes, fetchingTimes, refresh: refreshTimes } = useAvailableTimes(
    dateStr,
    selectedBarber,
    totalDuration
  );

  const { available: availableTimes } = splitTimeSlots(
    selectedBarber?.working_hours ?? [],
    bookedTimes,
    dateStr || null
  );

  useEffect(() => {
    if (!isOpen) return;

    const initialDateStr = availableDates.some(
      (day) => format(day, 'yyyy-MM-dd') === initialDate
    )
      ? (initialDate as string)
      : firstDateStr;

    setFirstName('');
    setLastName('');
    setPhone('');
    setServiceIds([]);
    setBarberId('');
    setDateStr(initialDateStr);
    setTime('');
    setError(null);
    setSaving(false);
  }, [isOpen, initialDate, availableDates, firstDateStr]);

  useEffect(() => {
    if (isOpen && !barberId && barbers.length > 0) {
      setBarberId(barbers[0].id);
    }
  }, [isOpen, barberId, barbers]);

  const toggleService = (id: string) => {
    setServiceIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id]
    );
    setTime('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const digits = phone.replace(/\D/g, '');
    const normalizedPhone = digits.length === 10 ? `0${digits}` : digits;

    if (!firstName.trim() || !lastName.trim()) {
      setError('Müşteri adı ve soyadı gerekli.');
      return;
    }

    if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith('0')) {
      setError('Telefon numarasını 05XX XXX XX XX formatında girin.');
      return;
    }

    if (selectedServices.length === 0) {
      setError('En az bir hizmet seçin.');
      return;
    }

    if (!selectedBarber || !dateStr || !time) {
      setError('Personel, tarih ve saat seçin.');
      return;
    }

    if (!availableTimes.includes(time)) {
      setError(SLOT_CONFLICT_MESSAGE);
      refreshTimes();
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert([
          {
            customer_first_name: firstName.trim(),
            customer_last_name: lastName.trim(),
            phone: normalizedPhone,
            appointment_date: dateStr,
            appointment_time: time,
            barber_id: selectedBarber.id,
            total_price: totalPrice,
            total_duration: totalDuration,
            status: 'approved',
          },
        ])
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (data) {
        const mappings = selectedServices.map((service) => ({
          appointment_id: data.id,
          service_id: service.id,
        }));

        const { error: mappingError } = await supabase
          .from('appointment_services')
          .insert(mappings);

        if (mappingError) throw mappingError;
      }

      onCreated();
    } catch (err) {
      console.error('Manuel randevu oluşturulamadı:', err);

      if (isSlotConflictError(err)) {
        setError(SLOT_CONFLICT_MESSAGE);
        setTime('');
        refreshTimes();
      } else {
        setError('Randevu oluşturulamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni randevu"
      icon={<CalendarPlus className="h-4 w-4" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="manual-first-name" className="text-xs font-medium text-slate-600">
              Ad
            </label>
            <input
              id="manual-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Müşteri adı"
              className={cn(inputClass, 'mt-1.5')}
              required
            />
          </div>
          <div>
            <label htmlFor="manual-last-name" className="text-xs font-medium text-slate-600">
              Soyad
            </label>
            <input
              id="manual-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Müşteri soyadı"
              className={cn(inputClass, 'mt-1.5')}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="manual-phone" className="text-xs font-medium text-slate-600">
            Telefon
          </label>
          <div className="relative mt-1.5">
            <Phone
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="manual-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="05XX XXX XX XX"
              className={cn(inputClass, 'pl-9')}
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-600">Hizmetler</p>
            <span className="text-[10px] text-slate-400">
              {selectedServices.length} seçili · {totalDuration} dk
            </span>
          </div>

          <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5">
            {dataLoading ? (
              <p className="px-2 py-6 text-center text-xs text-slate-400">Hizmetler yükleniyor...</p>
            ) : services.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-400">Önce hizmet ekleyin.</p>
            ) : (
              services.map((service) => {
                const selected = serviceIds.includes(service.id);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                      selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-slate-900">
                          {service.name}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {service.duration} dk
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {formatPrice(service.price)}
                      </span>
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border',
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        )}
                      >
                        {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="manual-barber" className="text-xs font-medium text-slate-600">
              Personel
            </label>
            <div className="relative mt-1.5">
              <UserRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <select
                id="manual-barber"
                value={barberId}
                onChange={(event) => {
                  setBarberId(event.target.value);
                  setTime('');
                }}
                className={cn(inputClass, 'appearance-none pl-9')}
                required
              >
                <option value="">Personel seçin</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="manual-date" className="text-xs font-medium text-slate-600">
              Tarih
            </label>
            <select
              id="manual-date"
              value={dateStr}
              onChange={(event) => {
                setDateStr(event.target.value);
                setTime('');
              }}
              className={cn(inputClass, 'mt-1.5 appearance-none')}
              required
            >
              {availableDates.map((day) => {
                const value = format(day, 'yyyy-MM-dd');
                return (
                  <option key={value} value={value}>
                    {format(day, 'd MMMM, EEEE', { locale: tr })}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-600">Saat</p>
            {fetchingTimes && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" aria-hidden="true" />
            )}
          </div>

          {!selectedBarber || selectedServices.length === 0 ? (
            <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
              Saatleri görmek için hizmet ve personel seçin.
            </p>
          ) : (selectedBarber.working_hours?.length ?? 0) === 0 ? (
            <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-4 text-center text-xs text-amber-700">
              Bu personelin mesai saati tanımlı değil.
            </p>
          ) : availableTimes.length === 0 ? (
            <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-4 text-center text-xs text-amber-700">
              Bu gün için uygun saat yok.
            </p>
          ) : (
            <div className="mt-1.5 grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-1.5">
              {availableTimes.map((slot) => {
                const selected = time === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTime(slot)}
                    aria-pressed={selected}
                    className={cn(
                      'flex h-8 items-center justify-center rounded-lg border text-[11px] font-semibold transition-colors',
                      selected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                    )}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Toplam</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatPrice(totalPrice)} · {totalDuration} dk
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Clock3 className="h-4 w-4" aria-hidden="true" />
              )}
              Randevu oluştur
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};
