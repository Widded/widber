import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDays, format, isValid, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAdminAppointments } from '../../hooks/useAdminAppointments';
import { StaffAppointmentCard } from '../../components/staff/StaffAppointmentCard';
import { cn } from '../../lib/utils';

const StaffDayView = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { appointments, loading, error, updateStatus, refresh } = useAdminAppointments();

  const parsedDate = date ? parseISO(date) : new Date();
  const selectedDate = isValid(parsedDate) ? parsedDate : new Date();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.appointment_date === dateStr)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [appointments, dateStr]
  );

  const pendingCount = dayAppointments.filter((appointment) => appointment.status === 'pending').length;
  const approvedCount = dayAppointments.filter((appointment) => appointment.status === 'approved').length;
  const completedCount = dayAppointments.filter((appointment) => appointment.status === 'completed').length;

  const goToDay = (offset: number) => {
    navigate(`/admin/appointments/${format(addDays(selectedDate, offset), 'yyyy-MM-dd')}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Link
          to="/admin/appointments"
          aria-label="Randevular listesine dön"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/50 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass-dark">
            Gün görünümü
          </p>
          <h1 className="mt-1 font-display text-2xl leading-tight text-ink md:text-3xl">
            {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
          </h1>
          <p className="mt-1 text-xs text-ink/45">
            {dayAppointments.length} randevu · {pendingCount} bekleyen · {approvedCount} onaylı
          </p>
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

      <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white p-1.5">
        <button
          type="button"
          onClick={() => goToDay(-1)}
          className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl text-xs font-semibold text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Önceki
        </button>
        <button
          type="button"
          onClick={() => navigate(`/admin/appointments/${todayStr}`)}
          className={cn(
            'flex h-10 flex-1 items-center justify-center rounded-xl text-xs font-semibold transition-colors',
            dateStr === todayStr ? 'bg-ink text-cream' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
          )}
        >
          Bugün
        </button>
        <button
          type="button"
          onClick={() => goToDay(1)}
          className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl text-xs font-semibold text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          Sonraki
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Toplam', value: dayAppointments.length },
          { label: 'Bekleyen', value: pendingCount },
          { label: 'Tamamlanan', value: completedCount },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-ink/10 bg-white p-3 text-center">
            <p className="font-display text-xl leading-none text-ink">{item.value}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-ink/35">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-ink/10 bg-white/60"
            />
          ))
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
        ) : dayAppointments.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass-dark">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">Bu tarihte randevu yok.</p>
            <p className="mt-1 text-xs text-ink/45">
              Önceki veya sonraki güne geçebilir ya da müsaitliğini güncelleyebilirsin.
            </p>
            <Link
              to="/admin/availability"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-xs font-semibold text-cream"
            >
              Müsaitliğe git
            </Link>
          </div>
        ) : (
          dayAppointments.map((appointment) => (
            <StaffAppointmentCard
              key={appointment.id}
              appointment={appointment}
              onStatusChange={updateStatus}
            />
          ))
        )}
      </div>

      {completedCount > 0 && (
        <p className="text-center text-[11px] text-ink/35">
          {completedCount} randevu tamamlandı.
        </p>
      )}
    </div>
  );
};

export default StaffDayView;
