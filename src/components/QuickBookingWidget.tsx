import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Scissors,
  UserRound,
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useAvailableTimes } from '../hooks/useAvailableTimes';
import { useBooking } from '../context/BookingContext';
import { splitTimeSlots } from '../lib/availability';
import { getBookingDates } from '../lib/bookingDates';
import { formatPrice } from '../lib/appointmentUtils';
import { cn } from '../lib/utils';

interface QuickBookingWidgetProps {
  onComplete: () => void;
}

type FieldKey = 'service' | 'barber' | 'date' | 'time';

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'P';

type PickerFieldProps = {
  field: FieldKey;
  label: string;
  icon: React.ElementType;
  value: string;
  placeholder: string;
  activeField: FieldKey | null;
  setActiveField: (field: FieldKey | null) => void;
  disabled?: boolean;
  panelClassName: string;
  children: React.ReactNode;
};

const PickerField = ({
  field,
  label,
  icon: Icon,
  value,
  placeholder,
  activeField,
  setActiveField,
  disabled,
  panelClassName,
  children,
}: PickerFieldProps) => {
  const open = activeField === field;

  return (
    <div className="relative">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <button
        type="button"
        onClick={() => !disabled && setActiveField(open ? null : field)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value || placeholder}`}
        className={cn(
          'mt-1.5 flex h-11 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm transition-all',
          open
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-slate-200 hover:border-slate-300',
          disabled && 'cursor-not-allowed bg-slate-50 text-slate-400'
        )}
      >
        <Icon
          className={cn('h-4 w-4 shrink-0', disabled ? 'text-slate-300' : 'text-slate-400')}
          aria-hidden="true"
        />
        <span
          className={cn(
            'flex-1 truncate',
            value ? 'font-medium text-slate-900' : 'text-slate-400'
          )}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70',
            panelClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const QuickBookingWidget: React.FC<QuickBookingWidgetProps> = ({ onComplete }) => {
  const { services, barbers, loading } = useSupabaseData();
  const { setServices, setBarber, setDateTime } = useBooking();
  const widgetRef = useRef<HTMLFormElement>(null);

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [time, setTime] = useState('');
  const [activeField, setActiveField] = useState<FieldKey | null>(null);

  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const selectedBarber = barbers.find((barber) => barber.id === barberId) ?? null;
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration,
    0
  );
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const serviceLabel =
    selectedServices.length === 0
      ? ''
      : selectedServices.length === 1
        ? selectedServices[0].name
        : `${selectedServices.length} hizmet`;

  const availableDates = useMemo(() => getBookingDates(), []);

  const { bookedTimes, fetchingTimes, refresh: refreshTimes } = useAvailableTimes(
    dateStr,
    selectedBarber,
    totalDuration
  );

  useEffect(() => {
    const handleBookingConflict = () => {
      setTime('');
      refreshTimes();
    };

    window.addEventListener('widber:booking-conflict', handleBookingConflict);
    return () =>
      window.removeEventListener('widber:booking-conflict', handleBookingConflict);
  }, [refreshTimes]);

  const { available: availableTimes } = splitTimeSlots(
    selectedBarber?.working_hours ?? [],
    bookedTimes,
    dateStr || null
  );

  const canSubmit =
    selectedServices.length > 0 &&
    Boolean(selectedBarber && dateStr && time) &&
    availableTimes.includes(time);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setActiveField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeField) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveField(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeField]);

  const toggleService = (id: string) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
    setTime('');
  };

  const selectBarber = (id: string) => {
    setBarberId(id);
    setTime('');
    setActiveField('date');
  };

  const selectDate = (value: string) => {
    setDateStr(value);
    setTime('');
    setActiveField('time');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedServices.length === 0 || !selectedBarber || !dateStr || !time) return;

    setServices(selectedServices);
    setBarber(selectedBarber);
    setDateTime(parseISO(dateStr), time);
    onComplete();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-50" />
          ))}
        </div>
        <div className="mt-4 h-11 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <form
      ref={widgetRef}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Hızlı randevu</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Hizmetini seç, saatini ayır.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
          Anında onay
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PickerField
          field="service"
          label="Hizmetler"
          icon={Scissors}
          value={serviceLabel}
          placeholder="Hizmet seçin"
          activeField={activeField}
          setActiveField={setActiveField}
          panelClassName="left-0 w-[320px] max-w-[calc(100vw-48px)]"
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-xs font-semibold text-slate-500">Hizmet seç</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Birden fazla hizmet seçebilirsin.
            </p>
          </div>
          <div className="max-h-[260px] space-y-1 overflow-y-auto">
            {services.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                Hizmet bulunamadı.
              </p>
            ) : (
              services.map((service) => {
                const selected = serviceIds.includes(service.id);

                return (
                  <button
                    key={service.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {service.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {service.duration} dk
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">
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
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 px-1 pt-2">
            <span className="text-[11px] text-slate-400">
              {selectedServices.length} seçili
            </span>
            <div className="flex items-center gap-2">
              {selectedServices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setServiceIds([])}
                  className="text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700"
                >
                  Temizle
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveField('barber')}
                disabled={selectedServices.length === 0}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Devam et
              </button>
            </div>
          </div>
        </PickerField>

        <PickerField
          field="barber"
          label="Personel"
          icon={UserRound}
          value={selectedBarber?.name ?? ''}
          placeholder="Personel seçin"
          activeField={activeField}
          setActiveField={setActiveField}
          panelClassName="right-0 w-[260px] max-w-[calc(100vw-48px)]"
        >
          <p className="px-2 pb-2 pt-1 text-xs font-semibold text-slate-500">
            Personel seç
          </p>
          <div className="space-y-1">
            {barbers.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                Personel bulunamadı.
              </p>
            ) : (
              barbers.map((barber) => {
                const selected = barber.id === barberId;

                return (
                  <button
                    key={barber.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectBarber(barber.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                      {getInitials(barber.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                      {barber.name}
                    </span>
                    {selected && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                );
              })
            )}
          </div>
        </PickerField>

        <PickerField
          field="date"
          label="Tarih"
          icon={CalendarDays}
          value={dateStr ? format(parseISO(dateStr), 'd MMM', { locale: tr }) : ''}
          placeholder="Tarih seçin"
          activeField={activeField}
          setActiveField={setActiveField}
          panelClassName="left-0 w-[300px] max-w-[calc(100vw-48px)]"
        >
          <p className="px-2 pb-2 pt-1 text-xs font-semibold text-slate-500">
            Tarih seç
          </p>
          <div className="grid grid-cols-3 gap-2">
            {availableDates.map((date) => {
              const value = format(date, 'yyyy-MM-dd');
              const selected = value === dateStr;
              const today = isSameDay(date, new Date());

              return (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectDate(value)}
                  className={cn(
                    'flex flex-col items-center rounded-lg border px-2 py-2.5 transition-colors',
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : today
                        ? 'border-blue-200 bg-blue-50 text-slate-900 hover:border-blue-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                  )}
                >
                  <span
                    className={cn(
                      'text-[9px] font-semibold uppercase tracking-[0.08em]',
                      selected ? 'text-blue-100' : 'text-slate-400'
                    )}
                  >
                    {format(date, 'EEE', { locale: tr })}
                  </span>
                  <span className="mt-0.5 text-lg font-bold leading-none">
                    {format(date, 'd')}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 text-[9px] font-medium uppercase',
                      selected ? 'text-blue-100' : 'text-slate-400'
                    )}
                  >
                    {format(date, 'MMM', { locale: tr })}
                  </span>
                </button>
              );
            })}
          </div>
        </PickerField>

        <PickerField
          field="time"
          label="Saat"
          icon={Clock3}
          value={time}
          placeholder={
            selectedServices.length === 0 || !selectedBarber || !dateStr
              ? 'Önce diğer alanları seçin'
              : 'Saat seçin'
          }
          activeField={activeField}
          setActiveField={setActiveField}
          disabled={selectedServices.length === 0 || !selectedBarber || !dateStr}
          panelClassName="right-0 w-[280px] max-w-[calc(100vw-48px)]"
        >
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <p className="text-xs font-semibold text-slate-500">Saat seç</p>
            {!fetchingTimes && (
              <span className="text-[10px] text-slate-400">
                {availableTimes.length} müsait
              </span>
            )}
          </div>

          {fetchingTimes ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : availableTimes.length === 0 ? (
            <p className="px-3 py-5 text-center text-xs text-slate-400">
              Bu tarihte müsait saat yok.
            </p>
          ) : (
            <div className="grid max-h-[240px] grid-cols-3 gap-2 overflow-y-auto">
              {availableTimes.map((availableTime) => {
                const selected = availableTime === time;

                return (
                  <button
                    key={availableTime}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setTime(availableTime);
                      setActiveField(null);
                    }}
                    className={cn(
                      'rounded-lg border py-2 text-center text-xs font-semibold transition-colors',
                      selected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                    )}
                  >
                    {availableTime}
                  </button>
                );
              })}
            </div>
          )}
        </PickerField>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {selectedServices.length > 0
            ? `${formatPrice(totalPrice)} · ${totalDuration} dk`
            : 'Randevu için seçim yapın'}
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
        >
          Randevu Al
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
};
