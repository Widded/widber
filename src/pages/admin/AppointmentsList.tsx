import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAppointments } from '../../hooks/useAdminAppointments';
import { addDays, format, startOfDay, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StaffAppointmentsList from '../staff/StaffAppointmentsList';

const OwnerAppointmentsList = () => {
  const { appointments, loading, refresh } = useAdminAppointments();
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 21 günlük takvim (3 hafta)
  const availableDates = useMemo(() => {
    const dates = [];
    let currentDate = startOfDay(new Date());
    for (let i = 0; i < 21; i++) {
      dates.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }
    return dates;
  }, []);

  const getCount = (date: Date, statusTypes: string[]) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(
      (appointment) =>
        appointment.appointment_date === dateStr && statusTypes.includes(appointment.status)
    ).length;
  };

  const totalInRange = availableDates.reduce((sum, date) => {
    return (
      sum +
      getCount(date, ['approved', 'completed']) +
      getCount(date, ['pending']) +
      getCount(date, ['cancelled', 'rejected'])
    );
  }, 0);

  const pendingInRange = availableDates.reduce(
    (sum, date) => sum + getCount(date, ['pending']),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass-dark">
            Plan
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink md:text-4xl">
            Randevular
          </h1>
          <p className="mt-1 text-sm text-ink/45">
            Önümüzdeki 21 günün doluluk görünümü.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/admin/appointments/${todayStr}`)}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-5 text-xs font-semibold text-cream transition-colors hover:bg-ink-soft"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Bugün
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Randevuları yenile"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/50 transition-colors hover:text-ink"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-ink">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/35">
              21 günde toplam
            </p>
            <p className="mt-0.5 font-display text-xl leading-none text-ink">{totalInRange}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/35">
              Bekleyen
            </p>
            <p className="mt-0.5 font-display text-xl leading-none text-ink">{pendingInRange}</p>
          </div>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 md:col-span-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/35">
            Renkler
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Onaylı
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            Bekleyen
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
            İptal
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 21 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl border border-ink/10 bg-white/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
          {availableDates.map((date) => {
            const approvedCount = getCount(date, ['approved', 'completed']);
            const pendingCount = getCount(date, ['pending']);
            const rejectedCount = getCount(date, ['cancelled', 'rejected']);
            const totalCount = approvedCount + pendingCount + rejectedCount;
            const isToday = isSameDay(date, new Date());
            const dateStr = format(date, 'yyyy-MM-dd');

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => navigate(`/admin/appointments/${dateStr}`)}
                className={cn(
                  'flex flex-col rounded-2xl border p-4 text-left transition-all active:scale-[0.99]',
                  isToday
                    ? 'border-ink bg-ink text-cream shadow-[0_18px_40px_-24px_rgba(23,19,16,0.65)]'
                    : 'border-ink/10 bg-white text-ink hover:border-brass/40 hover:shadow-sm'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-[0.14em]',
                      isToday ? 'text-brass' : 'text-ink/35'
                    )}
                  >
                    {format(date, 'EEE', { locale: tr })}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-brass/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-brass">
                      Bugün
                    </span>
                  )}
                </div>

                <span className="mt-3 font-display text-3xl leading-none">
                  {format(date, 'd')}
                </span>
                <span
                  className={cn(
                    'mt-1 text-[9px] font-bold uppercase tracking-[0.1em]',
                    isToday ? 'text-cream/45' : 'text-ink/30'
                  )}
                >
                  {format(date, 'MMM', { locale: tr })}
                </span>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {approvedCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      {approvedCount}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                      {pendingCount}
                    </span>
                  )}
                  {rejectedCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                      {rejectedCount}
                    </span>
                  )}
                  {totalCount === 0 && (
                    <span
                      className={cn(
                        'text-[9px] font-semibold',
                        isToday ? 'text-cream/35' : 'text-ink/25'
                      )}
                    >
                      Randevu yok
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AppointmentsList = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <OwnerAppointmentsList /> : <StaffAppointmentsList />;
};

export default AppointmentsList;
