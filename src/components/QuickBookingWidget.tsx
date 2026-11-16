import React, { useEffect, useMemo, useState } from 'react';
import { format, isSameDay, isTomorrow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, Info, Loader2, X, Zap } from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useAvailableTimes } from '../hooks/useAvailableTimes';
import { useBooking } from '../context/BookingContext';
import { splitTimeSlots } from '../lib/availability';
import { getBookingDates } from '../lib/bookingDates';
import { getSpecialDate } from '../lib/specialDates';
import { formatPrice } from '../lib/appointmentUtils';
import { findEarliestSlot } from '../lib/earliestSlot';
import { cn } from '../lib/utils';

interface QuickBookingWidgetProps {
  onComplete: () => void;
}

const SUMMARY_PLACEHOLDER = '—';

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'P';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const handleChange = () => setIsMobile(query.matches);

    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
};

const selectClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400';

export const QuickBookingWidget: React.FC<QuickBookingWidgetProps> = ({ onComplete }) => {
  const { services, barbers, loading } = useSupabaseData();
  const { settings } = useSiteSettings();
  const { setServices, setBarber, setDateTime } = useBooking();
  const isMobile = useIsMobile();

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [time, setTime] = useState('');
  const [isFindingSlot, setIsFindingSlot] = useState(false);
  const [findMessage, setFindMessage] = useState<string | null>(null);

  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const selectedBarber = barbers.find((barber) => barber.id === barberId) ?? null;
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);

  const availableDates = useMemo(
    () =>
      getBookingDates({
        booking_window_days: settings.booking_window_days,
        closed_weekdays: settings.closed_weekdays,
        same_day_booking: settings.same_day_booking,
        special_dates: settings.special_dates,
      }),
    [
      settings.booking_window_days,
      settings.closed_weekdays,
      settings.same_day_booking,
      settings.special_dates,
    ]
  );

  const { bookedTimes, fetchingTimes } = useAvailableTimes(dateStr, selectedBarber);

  const { available: availableTimes, full: fullTimes } = splitTimeSlots(
    selectedBarber?.working_hours ?? [],
    bookedTimes,
    dateStr || null,
    settings.min_notice_minutes,
    getSpecialDate(settings.special_dates, dateStr)
  );

  const slotGroups = useMemo(() => {
    const hours = selectedBarber?.working_hours ?? [];

    const groups = {
      sabah: [] as string[],
      ogle: [] as string[],
      aksam: [] as string[],
    };

    hours.forEach((slot) => {
      const hour = Number(slot.slice(0, 2));
      if (hour < 12) groups.sabah.push(slot);
      else if (hour < 17) groups.ogle.push(slot);
      else groups.aksam.push(slot);
    });

    return [
      { key: 'sabah', label: 'Sabah', times: groups.sabah },
      { key: 'ogle', label: 'Öğle', times: groups.ogle },
      { key: 'aksam', label: 'Akşam', times: groups.aksam },
    ].filter((group) => group.times.length > 0);
  }, [selectedBarber]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const summaryRows = [
    {
      label: 'Hizmet',
      value:
        selectedServices.length === 0
          ? SUMMARY_PLACEHOLDER
          : selectedServices.map((service) => service.name).join(', '),
    },
    { label: 'Usta', value: selectedBarber?.name ?? SUMMARY_PLACEHOLDER },
    {
      label: 'Tarih',
      value: dateStr ? format(parseISO(dateStr), 'd MMMM', { locale: tr }) : SUMMARY_PLACEHOLDER,
      hint: dateStr && dateStr === todayStr ? 'Bugün' : undefined,
    },
    { label: 'Saat', value: time || SUMMARY_PLACEHOLDER },
  ];

  const dateOptionLabel = (date: Date) =>
    isSameDay(date, new Date())
      ? 'Bugün'
      : isTomorrow(date)
        ? 'Yarın'
        : format(date, 'd MMM', { locale: tr });

  const toggleService = (id: string) => {
    setFindMessage(null);
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const selectBarber = (id: string) => {
    setFindMessage(null);
    setBarberId(id);
    setTime('');
  };

  const selectDate = (value: string) => {
    setFindMessage(null);
    setDateStr(value);
    setTime('');
  };

  const selectTime = (value: string) => {
    setFindMessage(null);
    setTime(value);
  };

  const handleAddService = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    if (id) toggleService(id);
  };

  const handleFindEarliest = async () => {
    setIsFindingSlot(true);
    setFindMessage(null);

    try {
      const slot = await findEarliestSlot(barbers, settings);

      if (!slot) {
        setFindMessage('Yakın tarihlerde müsait saat yok. Lütfen bizimle iletişime geç.');
        return;
      }

      setBarberId(slot.barber.id);
      setDateStr(slot.date);
      setTime(slot.time);

      const dayLabel =
        slot.date === todayStr
          ? 'Bugün'
          : isTomorrow(parseISO(slot.date))
            ? 'Yarın'
            : format(parseISO(slot.date), 'd MMM', { locale: tr });

      setFindMessage(
        `En erken: ${dayLabel} ${slot.time} · ${slot.barber.name}${
          selectedServices.length === 0 ? ' — bir hizmet seç' : ''
        }`
      );
    } catch (error) {
      console.error('En erken saat bulunamadı:', error);
      setFindMessage('Saatler kontrol edilemedi, lütfen tekrar dene.');
    } finally {
      setIsFindingSlot(false);
    }
  };

  const canSubmit = Boolean(
    selectedServices.length > 0 &&
      selectedBarber &&
      dateStr &&
      time &&
      availableTimes.includes(time)
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !selectedBarber) return;

    setServices(selectedServices);
    setBarber(selectedBarber);
    setDateTime(parseISO(dateStr), time);
    onComplete();
  };

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_316px]">
        <div className="h-[520px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-[320px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-4">
            <div>
              <label htmlFor="m-hizmet" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Hizmet
              </label>
              <select
                id="m-hizmet"
                className={selectClass}
                value=""
                onChange={handleAddService}
              >
                <option value="">
                  {services.length === 0 ? 'Hizmet bulunamadı' : 'Hizmet ekle…'}
                </option>
                {services
                  .filter((service) => !serviceIds.includes(service.id))
                  .map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {formatPrice(service.price)}
                    </option>
                  ))}
              </select>

              {selectedServices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedServices.map((service) => (
                    <span
                      key={service.id}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100"
                    >
                      {service.name}
                      <button
                        type="button"
                        onClick={() => toggleService(service.id)}
                        aria-label={`${service.name} kaldır`}
                        className="rounded-full p-0.5 transition-colors hover:bg-blue-100"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="m-usta" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Usta
              </label>
              <select
                id="m-usta"
                className={selectClass}
                value={barberId}
                onChange={(event) => selectBarber(event.target.value)}
              >
                <option value="">Usta seçin</option>
                {barbers.map((barber) => {
                  const hasHours = Boolean(barber.working_hours?.length);
                  return (
                    <option key={barber.id} value={barber.id} disabled={!hasHours}>
                      {barber.name}
                      {hasHours ? '' : ' (mesai yok)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="m-tarih" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Tarih
                </label>
                <select
                  id="m-tarih"
                  className={selectClass}
                  value={dateStr}
                  disabled={availableDates.length === 0}
                  onChange={(event) => selectDate(event.target.value)}
                >
                  <option value="">
                    {availableDates.length === 0 ? 'Kapalı' : 'Seçin'}
                  </option>
                  {availableDates.map((date) => {
                    const value = format(date, 'yyyy-MM-dd');
                    return (
                      <option key={value} value={value}>
                        {dateOptionLabel(date)} {format(date, 'd')}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label htmlFor="m-saat" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Saat
                </label>
                <select
                  id="m-saat"
                  className={selectClass}
                  value={time}
                  disabled={
                    !selectedBarber || !dateStr || fetchingTimes || availableTimes.length === 0
                  }
                  onChange={(event) => selectTime(event.target.value)}
                >
                  <option value="">
                    {!selectedBarber
                      ? 'Önce usta'
                      : !dateStr
                        ? 'Önce tarih'
                        : fetchingTimes
                          ? 'Yükleniyor…'
                          : availableTimes.length === 0
                            ? 'Müsait yok'
                            : 'Seçin'}
                  </option>
                  {availableTimes.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {settings.min_notice_minutes > 0 && (
              <p className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-snug text-slate-500">
                <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                Randevu saatinden en az {settings.min_notice_minutes} dakika önce randevu
                almanız gerekir.
              </p>
            )}

            <button
              type="button"
              onClick={handleFindEarliest}
              disabled={isFindingSlot}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFindingSlot ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              En erken saati bul
            </button>

            {findMessage && (
              <p role="status" className="text-[11px] font-medium text-slate-500">
                {findMessage}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Randevu özeti
          </h2>
          <dl className="mt-2.5 space-y-2 text-xs">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0"
              >
                <dt className="shrink-0 text-slate-500">{row.label}</dt>
                <dd className="text-right font-semibold text-slate-900">
                  {row.value}
                  {row.hint && (
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                      {row.hint}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Toplam</span>
            <b className="text-xl tracking-tight text-slate-900">{formatPrice(totalPrice)}</b>
          </div>
        </div>

        <div className="sticky bottom-0 z-30 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur">
          <div className="shrink-0">
            <span className="block text-[10px] text-slate-400">Toplam</span>
            <b className="text-lg tracking-tight text-slate-900">{formatPrice(totalPrice)}</b>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Randevuyu onayla
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full items-start gap-4 lg:grid-cols-[1fr_316px]">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {/* Hizmet */}
        <section className="border-b border-slate-100 pb-5" aria-labelledby="hizmet-baslik">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="hizmet-baslik" className="text-sm font-semibold text-slate-900">
              Hizmet
            </h2>
            <span className="text-[11px] text-slate-400">Birden fazla seçebilirsin</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => {
              const selected = serviceIds.includes(service.id);

              return (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleService(service.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    selected
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                      selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                    )}
                    aria-hidden="true"
                  >
                    {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
                    {service.name}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-slate-900">
                    {formatPrice(service.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Usta */}
        <section className="border-b border-slate-100 py-5" aria-labelledby="usta-baslik">
          <h2 id="usta-baslik" className="mb-3 text-sm font-semibold text-slate-900">
            Usta
          </h2>

          <div className="grid gap-2 sm:grid-cols-2">
            {barbers.map((barber) => {
              const selected = barber.id === barberId;
              const hasHours = Boolean(barber.working_hours?.length);

              return (
                <button
                  key={barber.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={!hasHours}
                  onClick={() => selectBarber(barber.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    selected
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50',
                    !hasHours && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                    {getInitials(barber.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-800">
                      {barber.name}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {hasHours ? 'Randevu alabilir' : 'Mesai tanımlı değil'}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                    )}
                    aria-hidden="true"
                  >
                    {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tarih */}
        <section className="border-b border-slate-100 py-5" aria-labelledby="tarih-baslik">
          <h2 id="tarih-baslik" className="mb-3 text-sm font-semibold text-slate-900">
            Tarih
          </h2>

          {availableDates.length === 0 ? (
            <p className="text-xs text-slate-500">
              Şu anda randevu takvimi kapalı. Lütfen bizimle iletişime geç.
            </p>
          ) : (
            <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1">
              {availableDates.map((date) => {
                const value = format(date, 'yyyy-MM-dd');
                const selected = value === dateStr;
                const label = isSameDay(date, new Date())
                  ? 'Bugün'
                  : isTomorrow(date)
                    ? 'Yarın'
                    : format(date, 'EEE', { locale: tr });

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectDate(value)}
                    className={cn(
                      'flex min-w-[70px] flex-col items-center gap-0.5 rounded-xl border px-3 py-2 transition-colors',
                      selected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50'
                    )}
                  >
                    <span className={cn('text-[10px] font-semibold uppercase tracking-wide', selected ? 'text-blue-100' : 'text-slate-400')}>
                      {label}
                    </span>
                    <span className="text-base font-bold leading-none">{format(date, 'd')}</span>
                    <span className={cn('text-[9px] font-medium uppercase', selected ? 'text-blue-100' : 'text-slate-400')}>
                      {format(date, 'MMM', { locale: tr })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Saat */}
        <section className="pt-5" aria-labelledby="saat-baslik">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="saat-baslik" className="text-sm font-semibold text-slate-900">
              Saat
            </h2>
            {selectedBarber && !fetchingTimes && (
              <span className="text-[11px] text-slate-400">
                {availableTimes.length} müsait
              </span>
            )}
          </div>

          {!selectedBarber ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Saatleri görmek için önce usta seç.
            </p>
          ) : !selectedBarber.working_hours?.length ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Bu usta için çalışma saati tanımlı değil.
            </p>
          ) : !dateStr ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Saatleri görmek için tarih seç.
            </p>
          ) : fetchingTimes ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-6 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Müsait saatler yükleniyor
            </div>
          ) : availableTimes.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Bu gün için müsait saat kalmadı. Başka bir gün seçebilirsin.
            </p>
          ) : (
            <div className="space-y-3">
              {slotGroups.map((group) => (
                <div key={group.key}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {group.label}
                    </span>
                    <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {group.times.map((slot) => {
                      const isAvailable = availableTimes.includes(slot);
                      const selected = slot === time;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!isAvailable}
                          aria-pressed={selected}
                          onClick={() => selectTime(slot)}
                          className={cn(
                            'h-9 rounded-lg border text-xs font-semibold tabular-nums transition-colors',
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : isAvailable
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50'
                                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'
                          )}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {fullTimes.length > 0 && (
                <p className="text-[11px] text-slate-400">
                  {fullTimes.length} saat dolu veya geçmiş.
                </p>
              )}
            </div>
          )}

          {settings.min_notice_minutes > 0 && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-snug text-slate-500">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              Randevu saatinden en az {settings.min_notice_minutes} dakika önce randevu
              almanız gerekir.
            </p>
          )}
        </section>
      </div>

      {/* Özet */}
      <aside className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 lg:sticky lg:top-24">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Randevu özeti
        </h2>

        <dl className="mt-3 space-y-2.5 text-xs">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-200 pb-2.5"
            >
              <dt className="shrink-0 text-slate-500">{row.label}</dt>
              <dd className="text-right font-semibold text-slate-900">
                {row.value}
                {row.hint && (
                  <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                    {row.hint}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-xs text-slate-500">Toplam</span>
          <b className="text-2xl tracking-tight text-slate-900">{formatPrice(totalPrice)}</b>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="hidden h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 lg:inline-flex"
          >
            Randevuyu onayla
          </button>
          <button
            type="button"
            onClick={handleFindEarliest}
            disabled={isFindingSlot}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFindingSlot ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            En erken müsait saati bul
          </button>
        </div>

        {findMessage && (
          <p role="status" className="mt-2 text-[11px] font-medium text-slate-500">
            {findMessage}
          </p>
        )}

        <p className="mt-3 text-center text-[10px] text-slate-400">
          Anında onay · Ödeme dükkânda
        </p>
      </aside>

      {/* Mobil alt bar */}
      <div className="sticky bottom-0 z-30 mt-1 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="shrink-0">
          <span className="block text-[10px] text-slate-400">Toplam</span>
          <b className="text-lg tracking-tight text-slate-900">{formatPrice(totalPrice)}</b>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Randevuyu onayla
        </button>
      </div>
    </form>
  );
};
