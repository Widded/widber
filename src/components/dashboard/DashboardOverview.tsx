import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { endOfMonth, format, isSameDay, parseISO, startOfMonth, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminAppointments } from '../../hooks/useAdminAppointments';
import { StatusBadge } from '../staff/StatusBadge';
import { formatPrice, formatTime, getServiceNames } from '../../lib/appointmentUtils';
import { cn } from '../../lib/utils';

const getClientKey = (appointment: {
  customer_id?: string | null;
  phone: string;
}) => appointment.customer_id || appointment.phone.replace(/\D/g, '');

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  note: string;
};

const StatCard = ({ icon: Icon, label, value, note }: StatCardProps) => (
  <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-medium leading-tight text-slate-500">{label}</p>
      <Icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
    </div>
    <p className="mt-2 text-xl font-bold tracking-tight text-slate-900">{value}</p>
    <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{note}</p>
  </div>
);

const DashboardOverview = () => {
  const { isAdmin } = useAuth();

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const upcomingEnd = format(addDays(now, 7), 'yyyy-MM-dd');
  const queryEnd = monthEnd > upcomingEnd ? monthEnd : upcomingEnd;
  const appointmentRange = useMemo(
    () => ({ from: monthStart, to: queryEnd }),
    [monthStart, queryEnd]
  );

  const { appointments, loading, error, refresh } =
    useAdminAppointments(appointmentRange);

  const todayAppointments = appointments
    .filter((appointment) => appointment.appointment_date === todayStr)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  const nextAppointment = appointments
    .filter(
      (appointment) =>
        appointment.status === 'approved' &&
        (appointment.appointment_date > todayStr ||
          (appointment.appointment_date === todayStr &&
            appointment.appointment_time.slice(0, 5) >= format(now, 'HH:mm')))
    )
    .sort((a, b) =>
      `${a.appointment_date} ${a.appointment_time}`.localeCompare(
        `${b.appointment_date} ${b.appointment_time}`
      )
    )[0] ?? null;
  const activeTodayAppointments = todayAppointments.filter(
    (appointment) =>
      appointment.status !== 'cancelled' && appointment.status !== 'rejected'
  );
  const monthAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date >= monthStart && appointment.appointment_date <= monthEnd
  );
  const activeMonthAppointments = monthAppointments.filter(
    (appointment) =>
      appointment.status !== 'cancelled' && appointment.status !== 'rejected'
  );
  const completedMonthAppointments = monthAppointments.filter(
    (appointment) => appointment.status === 'completed'
  );
  const monthRevenue = completedMonthAppointments.reduce(
    (sum, appointment) => sum + Number(appointment.total_price || 0),
    0
  );
  const monthCustomers = new Set(activeMonthAppointments.map(getClientKey)).size;

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        appointment.appointment_date >= todayStr &&
        appointment.status === 'approved'
    )
    .sort((a, b) =>
      `${a.appointment_date} ${a.appointment_time}`.localeCompare(
        `${b.appointment_date} ${b.appointment_time}`
      )
    )
    .slice(0, 5);

  const listAppointments =
    todayAppointments.length > 0 ? todayAppointments : upcomingAppointments;
  const listTitle =
    todayAppointments.length > 0 ? 'Bugünün randevuları' : 'Yaklaşan randevular';

  if (loading && appointments.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 pt-5 sm:pt-6 md:px-6 lg:px-8 lg:pt-8">
        <div className="space-y-5">
          <div className="h-16 w-64 animate-pulse rounded-xl bg-white" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pt-5 sm:pt-6 md:px-6 lg:px-8 lg:pt-8">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Rapor
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin ? 'İşletmenin genel durumu' : 'Kendi randevu özetin'}
              <span className="mx-1.5 text-slate-300">·</span>
              {format(now, 'd MMMM yyyy, EEEE', { locale: tr })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/appointments"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Randevular
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Raporu yenile"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900"
            >
              <RefreshCw
                className={cn('h-4 w-4', loading && 'animate-spin')}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {nextAppointment && (
          <Link
            to={`/admin/appointments/${nextAppointment.appointment_date}`}
            className="group flex items-center gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white p-4 shadow-sm transition-colors hover:border-blue-200"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
                Sıradaki randevu
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                {nextAppointment.customer_first_name} {nextAppointment.customer_last_name}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {getServiceNames(nextAppointment)}
                {isAdmin && nextAppointment.barbers?.name
                  ? ` · ${nextAppointment.barbers.name}`
                  : ''}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-base font-bold text-slate-900">
                {formatTime(nextAppointment.appointment_time)}
              </p>
              <p className="text-[10px] font-medium text-blue-600">
                {isSameDay(parseISO(nextAppointment.appointment_date), now)
                  ? 'Bugün'
                  : isSameDay(parseISO(nextAppointment.appointment_date), addDays(now, 1))
                    ? 'Yarın'
                    : format(parseISO(nextAppointment.appointment_date), 'd MMM', {
                        locale: tr,
                      })}
              </p>
            </div>

            <ChevronRight
              className="h-4 w-4 shrink-0 text-blue-300 transition-colors group-hover:text-blue-600"
              aria-hidden="true"
            />
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            icon={Clock3}
            label="Bugünkü randevu"
            value={todayAppointments.length}
            note={`${activeTodayAppointments.length} aktif`}
          />
          <StatCard
            icon={CalendarDays}
            label="Bu ay randevu"
            value={activeMonthAppointments.length}
            note={`${completedMonthAppointments.length} tamamlandı`}
          />
          <StatCard
            icon={Wallet}
            label={isAdmin ? 'Bu ay ciro' : 'Bu ay cirom'}
            value={formatPrice(monthRevenue)}
            note={`${completedMonthAppointments.length} tamamlanan randevu`}
          />
          <StatCard
            icon={Users}
            label="Bu ay müşteri"
            value={monthCustomers}
            note={`${activeMonthAppointments.length} randevu`}
          />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{listTitle}</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {listAppointments.length} randevu
              </p>
            </div>
            <Link
              to="/admin/appointments"
              className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              Tümünü gör
            </Link>
          </div>

          {listAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-600">Randevu yok</p>
              <p className="mt-1 text-xs text-slate-400">
                İlk randevuyu oluşturmak için randevular sayfasına git.
              </p>
              <Link
                to="/admin/appointments"
                className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Randevulara git
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 p-2">
              {listAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/admin/appointments/${appointment.appointment_date}`}
                  className="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="w-14 shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatTime(appointment.appointment_time)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {format(parseISO(appointment.appointment_date), 'd MMM', {
                        locale: tr,
                      })}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {appointment.customer_first_name} {appointment.customer_last_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {getServiceNames(appointment)}
                      {isAdmin && appointment.barbers?.name
                        ? ` · ${appointment.barbers.name}`
                        : ''}
                    </p>
                  </div>

                  <span className="hidden text-sm font-semibold text-slate-900 sm:block">
                    {formatPrice(appointment.total_price)}
                  </span>
                  <StatusBadge status={appointment.status} />
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-300"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardOverview;
