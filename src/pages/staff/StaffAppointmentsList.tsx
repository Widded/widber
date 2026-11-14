import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarDays, ChevronRight, RefreshCw } from 'lucide-react';
import { useAdminAppointments, type AdminAppointment } from '../../hooks/useAdminAppointments';
import { formatTime } from '../../lib/appointmentUtils';
import { cn } from '../../lib/utils';

const StaffAppointmentsList = () => {
  const { appointments, loading, error, refresh } = useAdminAppointments();
  const navigate = useNavigate();

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
  const endDate = format(addDays(startOfDay(new Date()), 14), 'yyyy-MM-dd');

  const groups = useMemo(() => {
    const map = new Map<string, AdminAppointment[]>();

    appointments
      .filter(
        (appointment) =>
          appointment.appointment_date >= today && appointment.appointment_date <= endDate
      )
      .sort((a, b) =>
        `${a.appointment_date} ${a.appointment_time}`.localeCompare(
          `${b.appointment_date} ${b.appointment_time}`
        )
      )
      .forEach((appointment) => {
        const list = map.get(appointment.appointment_date) ?? [];
        list.push(appointment);
        map.set(appointment.appointment_date, list);
      });

    return Array.from(map.entries());
  }, [appointments, today, endDate]);

  const tomorrow = format(addDays(startOfDay(new Date()), 1), 'yyyy-MM-dd');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass-dark">
            Plan
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink md:text-4xl">
            Randevular
          </h1>
          <p className="mt-1 text-sm text-ink/45">Önümüzdeki 14 gün</p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Randevuları yenile"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/50 transition-colors hover:text-ink"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-ink/10 bg-white/60"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700">Randevular yüklenemedi.</p>
          <p className="mt-1 text-xs text-red-600/80">{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-red-600 px-4 text-xs font-semibold text-white"
          >
            Tekrar dene
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass-dark">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">Önümüzdeki 14 günde randevu yok.</p>
          <p className="mt-1 text-xs text-ink/45">
            Müsaitliğini güncelleyerek yeni randevulara hazır olabilirsin.
          </p>
          <Link
            to="/admin/availability"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-xs font-semibold text-cream"
          >
            Müsaitliğe git
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([date, items]) => {
            const dateObject = parseISO(date);
            const isToday = date === today;
            const isTomorrow = date === tomorrow;
            const label = isToday ? 'Bugün' : isTomorrow ? 'Yarın' : format(dateObject, 'EEEE', { locale: tr });
            const firstTime = formatTime(items[0]?.appointment_time);
            const lastTime = formatTime(items[items.length - 1]?.appointment_time);
            const pending = items.filter((appointment) => appointment.status === 'pending').length;
            const timeLabel = firstTime === lastTime ? firstTime : `${firstTime}–${lastTime}`;

            return (
              <button
                key={date}
                type="button"
                onClick={() => navigate(`/admin/appointments/${date}`)}
                className={cn(
                  'w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]',
                  isToday
                    ? 'border-ink/15 bg-ink text-cream'
                    : 'border-ink/10 bg-white text-ink hover:border-brass/40'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-[0.16em]',
                        isToday ? 'text-brass' : 'text-brass-dark'
                      )}
                    >
                      {label}
                    </p>
                    <p className="mt-0.5 font-display text-2xl leading-tight">
                      {format(dateObject, 'd MMMM', { locale: tr })}
                    </p>
                    <p className={cn('mt-1 text-xs', isToday ? 'text-cream/55' : 'text-ink/45')}>
                      {items.length} randevu · {timeLabel}
                    </p>
                    {pending > 0 && (
                      <span
                        className={cn(
                          'mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]',
                          isToday
                            ? 'bg-brass/20 text-brass'
                            : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        {pending} bekleyen
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isToday ? 'bg-cream/10 text-cream/70' : 'bg-ink/5 text-ink/45'
                    )}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaffAppointmentsList;
