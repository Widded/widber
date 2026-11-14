import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, format, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminAppointments } from '../../hooks/useAdminAppointments';
import { StaffAppointmentCard } from '../../components/staff/StaffAppointmentCard';
import { StatusBadge } from '../../components/staff/StatusBadge';
import { formatPrice, formatTime, getServiceNames, getWhatsAppUrl } from '../../lib/appointmentUtils';
import { cn } from '../../lib/utils';

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone: string;
  valueClassName?: string;
};

const StatCard = ({ icon: Icon, label, value, tone, valueClassName }: StatCardProps) => (
  <div className="rounded-2xl border border-ink/10 bg-white p-4">
    <div className="flex items-center justify-between gap-2">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', tone)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-right text-[9px] font-bold uppercase leading-tight tracking-[0.12em] text-ink/35">
        {label}
      </span>
    </div>
    <p className={cn('mt-3 font-display text-2xl leading-none text-ink', valueClassName)}>
      {value}
    </p>
  </div>
);

const StaffDashboard = () => {
  const { staffBarber } = useAuth();
  const { appointments, loading, error, updateStatus, refresh } = useAdminAppointments();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroError, setHeroError] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  const currentTime = format(now, 'HH:mm');

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.appointment_date === today)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [appointments, today]
  );

  const nextAppointment = useMemo(
    () =>
      todayAppointments.find(
        (appointment) =>
          (appointment.status === 'pending' || appointment.status === 'approved') &&
          formatTime(appointment.appointment_time) >= currentTime
      ) || null,
    [todayAppointments, currentTime]
  );

  const pendingCount = todayAppointments.filter((appointment) => appointment.status === 'pending').length;
  const approvedCount = todayAppointments.filter((appointment) => appointment.status === 'approved').length;
  const completedCount = todayAppointments.filter((appointment) => appointment.status === 'completed').length;
  const todayRevenue = todayAppointments
    .filter((appointment) => appointment.status !== 'cancelled' && appointment.status !== 'rejected')
    .reduce((sum, appointment) => sum + Number(appointment.total_price || 0), 0);

  const days = useMemo(
    () => Array.from({ length: 7 }).map((_, index) => addDays(startOfDay(now), index)),
    [now]
  );

  const countForDate = (date: string) =>
    appointments.filter((appointment) => appointment.appointment_date === date).length;

  const firstName = staffBarber?.name?.trim().split(' ')[0] || 'Personel';
  const initial = staffBarber?.name?.trim().charAt(0).toUpperCase() || 'P';

  const handleHeroStatus = async (status: string) => {
    if (!nextAppointment) return;
    setHeroBusy(true);
    setHeroError(false);
    const ok = await updateStatus(nextAppointment.id, status);
    setHeroBusy(false);
    if (!ok) setHeroError(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass-dark">
            Personel paneli
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink md:text-4xl">
            Merhaba, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink/45">
            {format(now, 'd MMMM EEEE', { locale: tr })} · İşte günün akışı.
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg text-cream">
          {initial}
        </div>
      </div>

      {!staffBarber && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Personel oturumu bulunamadı. Çıkış yapıp tekrar giriş yapın.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Bugünkü randevu"
          value={todayAppointments.length}
          tone="bg-ink/5 text-ink"
        />
        <StatCard
          icon={Clock3}
          label="Bekleyen"
          value={pendingCount}
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Tamamlanan"
          value={completedCount}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Wallet}
          label="Bugünkü ciro"
          value={formatPrice(todayRevenue)}
          tone="bg-brass/10 text-brass-dark"
          valueClassName="text-xl"
        />
      </div>

      {nextAppointment ? (
        <div className="relative overflow-hidden rounded-[1.75rem] bg-ink p-5 text-cream shadow-[0_24px_60px_-32px_rgba(23,19,16,0.65)]">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-brass/20 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass">
                Sıradaki randevu
              </p>
              <StatusBadge status={nextAppointment.status} />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-4xl leading-none">
                  {formatTime(nextAppointment.appointment_time)}
                </p>
                <p className="mt-2 truncate text-base font-semibold">
                  {nextAppointment.customer_first_name} {nextAppointment.customer_last_name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-cream/55">
                  {getServiceNames(nextAppointment)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-brass">
                {formatPrice(nextAppointment.total_price)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {nextAppointment.status === 'pending' ? (
                <button
                  type="button"
                  onClick={() => void handleHeroStatus('approved')}
                  disabled={heroBusy}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-cream text-xs font-semibold text-ink transition-colors hover:bg-white disabled:opacity-60"
                >
                  {heroBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Onayla
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleHeroStatus('completed')}
                  disabled={heroBusy}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-cream text-xs font-semibold text-ink transition-colors hover:bg-white disabled:opacity-60"
                >
                  {heroBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Tamamla
                </button>
              )}

              <a
                href={`tel:${nextAppointment.phone}`}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-cream/20 text-xs font-semibold text-cream transition-colors hover:bg-cream/10"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Ara
              </a>
            </div>

            <a
              href={getWhatsAppUrl(
                nextAppointment.phone,
                `${nextAppointment.customer_first_name} ${nextAppointment.customer_last_name}`
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex h-9 items-center justify-center gap-1.5 rounded-xl text-[11px] font-semibold text-cream/50 transition-colors hover:text-cream"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp'tan yaz
            </a>

            {heroError && (
              <p className="mt-1 text-center text-[11px] font-medium text-red-300">
                Durum güncellenemedi. Lütfen tekrar deneyin.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass-dark">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-xl text-ink">Bugün için sıradaki randevu yok.</p>
          <p className="mt-1 text-xs leading-relaxed text-ink/45">
            {todayAppointments.length > 0
              ? 'Bugünkü randevuların tamamlandı veya iptal edildi.'
              : 'Yeni randevular geldiğinde burada görünecek.'}
          </p>
          <Link
            to="/admin/availability"
            className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/5"
          >
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Müsaitliğini güncelle
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">Önümüzdeki günler</h2>
          <Link
            to="/admin/appointments"
            className="text-xs font-semibold text-brass-dark transition-colors hover:text-ink"
          >
            Tümünü gör
          </Link>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = dateStr === today;
            const count = countForDate(dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => navigate(`/admin/appointments/${dateStr}`)}
                className={cn(
                  'min-w-[74px] snap-start rounded-2xl border p-3 text-center transition-all active:scale-[0.98]',
                  isToday
                    ? 'border-ink bg-ink text-cream'
                    : 'border-ink/10 bg-white text-ink hover:border-brass/50'
                )}
              >
                <span
                  className={cn(
                    'block text-[9px] font-bold uppercase tracking-[0.12em]',
                    isToday ? 'text-cream/60' : 'text-ink/40'
                  )}
                >
                  {format(day, 'EEE', { locale: tr })}
                </span>
                <span className="mt-1 block font-display text-xl leading-none">
                  {format(day, 'd')}
                </span>
                <span
                  className={cn(
                    'mt-1.5 block text-[9px] font-semibold',
                    isToday
                      ? 'text-brass'
                      : count > 0
                        ? 'text-brass-dark'
                        : 'text-ink/30'
                  )}
                >
                  {count > 0 ? `${count} randevu` : 'boş'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Bugünün akışı</h2>
            <p className="text-xs text-ink/45">
              {todayAppointments.length} randevu · {pendingCount} bekleyen · {approvedCount} onaylı
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Randevuları yenile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/50 transition-colors hover:text-ink"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 space-y-3">
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
            <div className="rounded-2xl border border-ink/10 bg-white p-6 text-center">
              <p className="text-sm font-semibold text-ink">Bugün için randevu yok.</p>
              <p className="mt-1 text-xs text-ink/45">
                Müsaitliğini güncelleyebilir veya önümüzdeki günlere bakabilirsin.
              </p>
              <Link
                to="/admin/appointments"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-xs font-semibold text-cream"
              >
                Randevulara git
              </Link>
            </div>
          ) : (
            todayAppointments.map((appointment) => (
              <StaffAppointmentCard
                key={appointment.id}
                appointment={appointment}
                onStatusChange={updateStatus}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
