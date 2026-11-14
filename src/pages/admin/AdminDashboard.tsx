import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Scissors,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useAdminAppointments } from '../../hooks/useAdminAppointments';
import { StaffAppointmentCard } from '../../components/staff/StaffAppointmentCard';
import { StatusBadge } from '../../components/staff/StatusBadge';
import { formatPrice, formatTime } from '../../lib/appointmentUtils';
import { cn } from '../../lib/utils';

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  detail: string;
  tone: string;
  valueClassName?: string;
};

const StatCard = ({ icon: Icon, label, value, detail, tone, valueClassName }: StatCardProps) => (
  <div className="rounded-2xl border border-ink/10 bg-white p-5">
    <div className="flex items-center justify-between">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', tone)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink/35">{label}</span>
    </div>
    <p className={cn('mt-4 font-display text-3xl leading-none text-ink', valueClassName)}>
      {value}
    </p>
    <p className="mt-1.5 text-xs text-ink/40">{detail}</p>
  </div>
);

const AdminDashboard = () => {
  const { appointments, loading, error, updateStatus, refresh } = useAdminAppointments();

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.appointment_date === today)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [appointments, today]
  );

  const pendingUpcoming = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.status === 'pending' && appointment.appointment_date >= today
        )
        .sort((a, b) =>
          `${a.appointment_date} ${a.appointment_time}`.localeCompare(
            `${b.appointment_date} ${b.appointment_time}`
          )
        ),
    [appointments, today]
  );

  const todayPending = todayAppointments.filter((appointment) => appointment.status === 'pending').length;
  const todayCompleted = todayAppointments.filter((appointment) => appointment.status === 'completed').length;
  const todayRevenue = todayAppointments
    .filter((appointment) => appointment.status !== 'cancelled' && appointment.status !== 'rejected')
    .reduce((sum, appointment) => sum + Number(appointment.total_price || 0), 0);

  const days = useMemo(
    () => Array.from({ length: 7 }).map((_, index) => addDays(startOfDay(now), index)),
    [today]
  );

  const dayCounts = days.map(
    (day) =>
      appointments.filter((appointment) => appointment.appointment_date === format(day, 'yyyy-MM-dd'))
        .length
  );
  const maxDayCount = Math.max(...dayCounts, 1);
  const weekTotal = dayCounts.reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass-dark">
            Yönetim
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink/45">
            {format(now, 'd MMMM EEEE', { locale: tr })} · İşletmenin bugünkü nabzı.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/services"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-5 text-xs font-semibold text-cream transition-colors hover:bg-ink-soft"
          >
            <Scissors className="h-4 w-4" aria-hidden="true" />
            Yeni Hizmet
          </Link>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Verileri yenile"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/50 transition-colors hover:text-ink"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Bugünkü randevu"
          value={todayAppointments.length}
          detail={`${todayPending} bekleyen · ${todayCompleted} tamamlanan`}
          tone="bg-ink/5 text-ink"
        />
        <StatCard
          icon={Clock3}
          label="Bekleyen onay"
          value={pendingUpcoming.length}
          detail="Takvimde onay bekleyen"
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Bugün tamamlanan"
          value={todayCompleted}
          detail={`${todayAppointments.length} randevunun ${todayCompleted} tanesi`}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Wallet}
          label="Bugünkü ciro"
          value={formatPrice(todayRevenue)}
          detail="İptaller hariç beklenen tutar"
          tone="bg-brass/10 text-brass-dark"
          valueClassName="text-2xl"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-ink/10 bg-cream-soft p-4 md:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">Bugünün programı</h2>
              <p className="mt-0.5 text-xs text-ink/40">
                {todayAppointments.length} randevu · saat sırasına göre
              </p>
            </div>
            <Link
              to={`/admin/appointments/${today}`}
              className="text-xs font-semibold text-brass-dark transition-colors hover:text-ink"
            >
              Günü aç
            </Link>
          </div>

          <div className="mt-4 space-y-3">
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
            ) : todayAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass-dark">
                  <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">Bugün için randevu yok.</p>
                <p className="mt-1 text-xs text-ink/45">
                  Yeni randevular geldiğinde burada görünecek.
                </p>
              </div>
            ) : (
              todayAppointments.map((appointment) => (
                <StaffAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onStatusChange={updateStatus}
                  showBarber
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-ink/10 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">7 günlük yoğunluk</h2>
                <p className="mt-0.5 text-xs text-ink/40">{weekTotal} randevu</p>
              </div>
              <CalendarRange className="h-5 w-5 text-brass" aria-hidden="true" />
            </div>

            <div className="mt-5 flex h-36 items-end gap-2">
              {days.map((day, index) => {
                const count = dayCounts[index];
                const height = Math.max(8, (count / maxDayCount) * 100);
                const isToday = format(day, 'yyyy-MM-dd') === today;

                return (
                  <div key={format(day, 'yyyy-MM-dd')} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-ink/45">{count}</span>
                    <div className="flex h-24 w-full items-end">
                      <div
                        className={cn(
                          'w-full rounded-t-lg transition-all duration-300',
                          isToday ? 'bg-brass' : 'bg-ink/10'
                        )}
                        style={{ height: `${height}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className={cn('text-[9px] font-bold uppercase', isToday ? 'text-brass-dark' : 'text-ink/35')}>
                      {format(day, 'EEE', { locale: tr })}
                    </span>
                    <span className="text-[10px] font-semibold text-ink/55">{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">Bekleyen onaylar</h2>
                <p className="mt-0.5 text-xs text-ink/40">En yakın {Math.min(pendingUpcoming.length, 3)} kayıt</p>
              </div>
              <StatusBadge status="pending" />
            </div>

            <div className="mt-4 space-y-2">
              {pendingUpcoming.length === 0 ? (
                <p className="rounded-xl bg-ink/[0.03] px-3 py-4 text-center text-xs text-ink/40">
                  Bekleyen onay yok.
                </p>
              ) : (
                pendingUpcoming.slice(0, 3).map((appointment) => (
                  <Link
                    key={appointment.id}
                    to={`/admin/appointments/${appointment.appointment_date}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 px-3 py-3 transition-colors hover:border-brass/40 hover:bg-cream-soft"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {appointment.customer_first_name} {appointment.customer_last_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink/45">
                        {format(new Date(`${appointment.appointment_date}T00:00:00`), 'd MMM', { locale: tr })} ·{' '}
                        {formatTime(appointment.appointment_time)}
                        {appointment.barbers?.name ? ` · ${appointment.barbers.name}` : ''}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink/30" aria-hidden="true" />
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/admin/services', icon: Scissors, label: 'Hizmetler', detail: 'Menü & fiyat' },
              { to: '/admin/barbers', icon: UserRound, label: 'Personeller', detail: 'Ekip & PIN' },
              { to: '/admin/availability', icon: Clock3, label: 'Müsaitlik', detail: 'Mesai & izin' },
              { to: '/admin/calendar', icon: CalendarRange, label: 'Takvim', detail: 'Haftalık görünüm' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-2xl border border-ink/10 bg-white p-4 transition-all hover:border-brass/40 hover:shadow-sm"
              >
                <item.icon className="h-4 w-4 text-brass-dark" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">{item.label}</p>
                <p className="text-[11px] text-ink/40">{item.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
