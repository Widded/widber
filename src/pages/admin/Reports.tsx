import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Download,
  PieChart as PieChartIcon,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useAdminAppointments } from '../../hooks/useAdminAppointments';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import {
  formatPrice,
  formatTime,
  getServiceNames,
  getStatusMeta,
} from '../../lib/appointmentUtils';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  DeltaChip,
  EmptyPanel,
  PageHeader,
  Panel,
  WarmStatusBadge,
  iconButton,
  primaryButton,
} from '../../components/admin/editorial';

type Period = 'thisMonth' | 'lastMonth' | 'thisYear' | 'last30';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'thisMonth', label: 'Bu ay' },
  { value: 'lastMonth', label: 'Geçen ay' },
  { value: 'thisYear', label: 'Bu yıl' },
  { value: 'last30', label: 'Son 30 gün' },
];

const CHART = {
  ink: '#0F172A',
  blue: '#2563EB',
  sand: '#E2E8F0',
  green: '#059669',
  amber: '#D97706',
  terracotta: '#DC2626',
  muted: '#475569',
};

const getPeriodRange = (period: Period) => {
  const now = new Date();

  if (period === 'thisMonth') {
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
      previousStart: startOfMonth(subMonths(now, 1)),
      previousEnd: endOfMonth(subMonths(now, 1)),
    };
  }

  if (period === 'lastMonth') {
    const month = subMonths(now, 1);
    return {
      start: startOfMonth(month),
      end: endOfMonth(month),
      previousStart: startOfMonth(subMonths(month, 1)),
      previousEnd: endOfMonth(subMonths(month, 1)),
    };
  }

  if (period === 'thisYear') {
    return {
      start: startOfYear(now),
      end: endOfYear(now),
      previousStart: startOfYear(subYears(now, 1)),
      previousEnd: endOfYear(subYears(now, 1)),
    };
  }

  return {
    start: startOfDay(subDays(now, 29)),
    end: endOfDay(now),
    previousStart: startOfDay(subDays(now, 59)),
    previousEnd: endOfDay(subDays(now, 30)),
  };
};

const inRange = (appointmentDate: string, start: Date, end: Date) => {
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');
  return appointmentDate >= startStr && appointmentDate <= endStr;
};

const getClientKey = (appointment: { customer_id?: string | null; phone: string }) =>
  appointment.customer_id || appointment.phone.replace(/\D/g, '');

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
};

type ReportStatProps = {
  label: string;
  value: string | number;
  note: string;
  delta?: number | null;
};

const ReportStat = ({ label, value, note, delta }: ReportStatProps) => (
  <div className="px-4 py-4 sm:px-5 md:px-6">
    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
      {label}
    </p>
    <p className="mt-2 font-bold text-3xl leading-none text-[#0F172A]">{value}</p>
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {delta !== undefined && <DeltaChip value={delta} />}
      <span className="text-[10px] text-[#64748B]">{note}</span>
    </div>
  </div>
);

const Reports = () => {
  const { isAdmin, user } = useAuth();
  const { appointments, loading, error, refresh } = useAdminAppointments();
  const { barbers } = useSupabaseData();
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [barberFilter, setBarberFilter] = useState('all');
  const [isLive, setIsLive] = useState(false);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? 'Bu ay';
  const selectedBarber = barbers.find((barber) => barber.id === barberFilter);

  const scopedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          barberFilter === 'all' || appointment.barber_id === barberFilter
      ),
    [appointments, barberFilter]
  );

  const periodAppointments = useMemo(
    () =>
      scopedAppointments.filter((appointment) =>
        inRange(appointment.appointment_date, range.start, range.end)
      ),
    [scopedAppointments, range]
  );

  const previousAppointments = useMemo(
    () =>
      scopedAppointments.filter((appointment) =>
        inRange(appointment.appointment_date, range.previousStart, range.previousEnd)
      ),
    [scopedAppointments, range]
  );

  const activeAppointments = periodAppointments.filter(
    (appointment) => appointment.status !== 'cancelled' && appointment.status !== 'rejected'
  );
  const previousActiveAppointments = previousAppointments.filter(
    (appointment) => appointment.status !== 'cancelled' && appointment.status !== 'rejected'
  );
  const completed = periodAppointments.filter(
    (appointment) => appointment.status === 'completed'
  );
  const previousCompleted = previousAppointments.filter(
    (appointment) => appointment.status === 'completed'
  );

  const totalClients = new Set(activeAppointments.map(getClientKey)).size;
  const previousClients = new Set(previousActiveAppointments.map(getClientKey)).size;
  const totalServicesSold = completed.reduce(
    (sum, appointment) => sum + (appointment.appointment_services?.length ?? 0),
    0
  );
  const previousServicesSold = previousCompleted.reduce(
    (sum, appointment) => sum + (appointment.appointment_services?.length ?? 0),
    0
  );

  const approved = periodAppointments.filter(
    (appointment) => appointment.status === 'approved'
  );
  const cancelled = periodAppointments.filter(
    (appointment) =>
      (appointment.status === 'cancelled' || appointment.status === 'rejected') &&
      !appointment.no_show
  );
  const noShow = periodAppointments.filter((appointment) => appointment.no_show);

  const completedRevenue = completed.reduce(
    (sum, appointment) => sum + Number(appointment.total_price || 0),
    0
  );
  const previousCompletedRevenue = previousCompleted.reduce(
    (sum, appointment) => sum + Number(appointment.total_price || 0),
    0
  );

  const statusData = [
    { name: 'Tamamlanan', value: completed.length, color: CHART.green },
    { name: 'Onaylı', value: approved.length, color: CHART.blue },
    { name: 'İptal', value: cancelled.length, color: CHART.terracotta },
    ...(noShow.length > 0
      ? [{ name: 'Gelmedi', value: noShow.length, color: CHART.muted }]
      : []),
  ].filter((item) => item.value > 0);
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);

  const barYear = range.end.getFullYear();
  const monthlyData = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, index) => {
        const currentYearCount = scopedAppointments.filter((appointment) => {
          const date = parseISO(appointment.appointment_date);
          return date.getFullYear() === barYear && date.getMonth() === index;
        }).length;
        const previousYearCount = scopedAppointments.filter((appointment) => {
          const date = parseISO(appointment.appointment_date);
          return date.getFullYear() === barYear - 1 && date.getMonth() === index;
        }).length;

        return {
          month: format(new Date(barYear, index, 1), 'MMM', { locale: tr }),
          current: currentYearCount,
          previous: previousYearCount,
        };
      }),
    [scopedAppointments, barYear]
  );

  const revenueData = useMemo(() => {
    const now = new Date();

    if (period === 'thisYear') {
      const latestCompletedMonth = completed.reduce((latest, appointment) => {
        const date = parseISO(appointment.appointment_date);
        return date.getFullYear() === barYear ? Math.max(latest, date.getMonth()) : latest;
      }, -1);
      const monthCount = Math.min(
        12,
        Math.max(
          barYear === now.getFullYear() ? now.getMonth() + 1 : 12,
          latestCompletedMonth + 1
        )
      );

      return Array.from({ length: monthCount }).map((_, index) => {
        const revenue = completed
          .filter((appointment) => {
            const date = parseISO(appointment.appointment_date);
            return date.getFullYear() === barYear && date.getMonth() === index;
          })
          .reduce((sum, appointment) => sum + Number(appointment.total_price || 0), 0);

        return {
          label: format(new Date(barYear, index, 1), 'MMM', { locale: tr }),
          revenue,
        };
      });
    }

    const lastRevenueDate = completed.reduce((latest, appointment) => {
      const date = parseISO(appointment.appointment_date);
      return date.getTime() > latest.getTime() ? date : latest;
    }, range.start);
    const revenueEnd = new Date(
      Math.min(
        range.end.getTime(),
        Math.max(now.getTime(), lastRevenueDate.getTime())
      )
    );
    const days = eachDayOfInterval({ start: range.start, end: revenueEnd });
    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const revenue = completed
        .filter((appointment) => appointment.appointment_date === dayStr)
        .reduce((sum, appointment) => sum + Number(appointment.total_price || 0), 0);

      return {
        label: format(day, days.length > 15 ? 'd MMM' : 'd', { locale: tr }),
        revenue,
      };
    });
  }, [completed, period, range, barYear]);

  const weekdayData = useMemo(
    () =>
      ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((label, index) => {
        const count = activeAppointments.filter((appointment) => {
          const day = parseISO(appointment.appointment_date).getDay();
          return (day + 6) % 7 === index;
        }).length;

        return { label, count };
      }),
    [activeAppointments]
  );
  const maxWeekdayCount = Math.max(1, ...weekdayData.map((item) => item.count));

  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 16 }, (_, index) => index + 8);
    const matrix = Array.from({ length: 7 }, () =>
      Array.from({ length: hours.length }, () => 0)
    );

    activeAppointments.forEach((appointment) => {
      const date = parseISO(appointment.appointment_date);
      const dayIndex = (date.getDay() + 6) % 7;
      const hour = Number(appointment.appointment_time.split(':')[0] ?? 0);
      const hourIndex = hours.indexOf(hour);

      if (hourIndex >= 0) matrix[dayIndex][hourIndex] += 1;
    });

    const max = Math.max(1, ...matrix.flat());
    return { hours, matrix, max };
  }, [activeAppointments]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcomingAppointments = useMemo(
    () =>
      scopedAppointments
        .filter(
          (appointment) =>
            appointment.status === 'approved' &&
            appointment.appointment_date >= todayStr
        )
        .sort((a, b) =>
          `${a.appointment_date} ${a.appointment_time}`.localeCompare(
            `${b.appointment_date} ${b.appointment_time}`
          )
        )
        .slice(0, 8),
    [scopedAppointments, todayStr]
  );

  useEffect(() => {
    const channel = supabase
      .channel(`widber-reports-${user?.id ?? 'staff'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          void refresh();
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, user?.id]);

  const downloadReport = () => {    const headers = [
      'Tarih',
      'Saat',
      'Müşteri',
      'Telefon',
      'Hizmetler',
      'Personel',
      'Durum',
      'Gelmedi',
      'İptal Nedeni',
      'Tutar',
      'Süre (dk)',
    ];
    const rows = periodAppointments.map((appointment) => [
      format(parseISO(appointment.appointment_date), 'dd.MM.yyyy'),
      formatTime(appointment.appointment_time),
      `${appointment.customer_first_name} ${appointment.customer_last_name}`,
      appointment.phone,
      getServiceNames(appointment),
      appointment.barbers?.name || '',
      appointment.no_show ? 'Gelmedi' : getStatusMeta(appointment.status).label,
      appointment.no_show ? 'Evet' : 'Hayır',
      appointment.cancel_reason || '',
      Number(appointment.total_price || 0).toString(),
      String(appointment.total_duration || 0),
    ]);

    const csv =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) =>
          row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')
        )
        .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `widber-analiz-${format(range.start, 'yyyy-MM-dd')}-${format(
      range.end,
      'yyyy-MM-dd'
    )}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="relative min-w-0 overflow-x-clip">
        <div className="min-w-0 space-y-5">
          <div className="h-24 w-80 animate-pulse rounded-2xl bg-[#FFFFFF]/70" />
          <div className="h-[132px] animate-pulse rounded-xl bg-[#FFFFFF]/70" />
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="h-[400px] animate-pulse rounded-xl bg-[#FFFFFF]/70 xl:col-span-8" />
            <div className="h-[400px] animate-pulse rounded-xl bg-[#FFFFFF]/70 xl:col-span-4" />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="h-[340px] animate-pulse rounded-xl bg-[#FFFFFF]/70 xl:col-span-7" />
            <div className="h-[340px] animate-pulse rounded-xl bg-[#FFFFFF]/70 xl:col-span-5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-w-0 overflow-x-clip">
      <div className="relative min-w-0 space-y-5">
        <PageHeader
          eyebrow="Performans"
          title="Analiz"
          subtitle={
            <>
              {periodLabel}
              <span className="mx-1 text-[#CBD5E1]">·</span>
              {isAdmin
                ? selectedBarber
                  ? selectedBarber.name
                  : 'Tüm personel'
                : 'Kendi verilerin'}
              <span className="mx-1 text-[#CBD5E1]">·</span>
              {format(range.start, 'd MMM', { locale: tr })} –{' '}
              {format(range.end, 'd MMM yyyy', { locale: tr })}
            </>
          }
          actions={
            <>
              <span
                aria-label={isLive ? 'Canlı' : 'Bağlanıyor'}
                title={isLive ? 'Canlı' : 'Bağlanıyor'}
                className={cn(
                  'hidden h-10 items-center gap-2 rounded-xl border px-2 text-[9px] font-bold uppercase tracking-[0.12em] sm:inline-flex sm:px-3',
                  isLive
                    ? 'border-[#D1FAE5] bg-[#ECFDF5] text-[#059669]'
                    : 'border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isLive ? 'animate-pulse bg-[#059669]' : 'bg-[#D97706]'
                  )}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{isLive ? 'Canlı' : 'Bağlanıyor'}</span>
              </span>

              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                aria-label="Analiz dönemi"
                className="h-10 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 text-xs font-semibold text-[#475569] outline-none transition-colors focus:border-[#2563EB]"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {isAdmin && (
                <select
                  value={barberFilter}
                  onChange={(event) => setBarberFilter(event.target.value)}
                  aria-label="Personel filtresi"
                  className="h-10 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 text-xs font-semibold text-[#475569] outline-none transition-colors focus:border-[#2563EB]"
                >
                  <option value="all">Tüm personel</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              )}

              <button type="button" onClick={downloadReport} className={cn(primaryButton, 'px-3 sm:px-4')}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Rapor indir
              </button>

              <button
                type="button"
                onClick={() => void refresh()}
                aria-label="Analizi yenile"
                className={iconButton}
              >
                <RefreshCw
                  className={cn('h-4 w-4', loading && 'animate-spin')}
                  aria-hidden="true"
                />
              </button>
            </>
          }
        />

        {error && (
          <div className="rounded-2xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-[#DC2626]">
            {error}
          </div>
        )}

        <section className="grid min-w-0 grid-cols-2 divide-y divide-[#F1F5F9] overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm md:grid-cols-4 md:divide-x md:divide-y-0">
          <ReportStat
            label="Toplam müşteri"
            value={totalClients}
            note="önceki döneme göre"
            delta={percentChange(totalClients, previousClients)}
          />
          <ReportStat
            label="Satılan hizmet"
            value={totalServicesSold}
            note="tamamlanan randevular"
            delta={percentChange(totalServicesSold, previousServicesSold)}
          />
          <ReportStat
            label="Ciro"
            value={formatPrice(completedRevenue)}
            note={`${completed.length} tamamlanan randevu`}
            delta={percentChange(completedRevenue, previousCompletedRevenue)}
          />
          <ReportStat
            label="Randevu"
            value={periodAppointments.length}
            note="önceki döneme göre"
            delta={percentChange(periodAppointments.length, previousAppointments.length)}
          />
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel
            title="Ciro trendi"
            subtitle={`${periodLabel} · ${formatPrice(completedRevenue)}`}
            icon={Wallet}
            className="xl:col-span-8"
          >
            {completedRevenue === 0 ? (
              <EmptyPanel
                icon={Wallet}
                title="Ciro verisi yok"
                text="Seçili dönemde tamamlanan randevu oluştuğunda ciro grafiği burada görünecek."
              />
            ) : (
              <div className="h-[220px] w-full sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      width={40}
                      tickFormatter={(value) =>
                        Number(value) >= 1000
                          ? `₺${Math.round(Number(value) / 1000)}k`
                          : `₺${Number(value)}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        fontSize: 12,
                        background: '#FFFFFF',
                      }}
                      formatter={(value) => formatPrice(Number(value))}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Ciro"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#reportRevenue)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel
            title="Durum dağılımı"
            subtitle={periodLabel}
            icon={PieChartIcon}
            className="xl:col-span-4"
          >
            {statusData.length === 0 ? (
              <EmptyPanel
                icon={PieChartIcon}
                title="Durum verisi yok"
                text="Seçili dönemde randevular oluştuğunda dağılım burada görünecek."
              />
            ) : (
              <>
                <div className="relative h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          fontSize: 12,
                          background: '#FFFFFF',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
                      Toplam
                    </span>
                    <span className="font-bold text-3xl leading-none text-[#0F172A]">
                      {statusTotal}
                    </span>
                  </div>
                </div>
                <div className="mt-2 space-y-2.5">
                  {statusData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="flex items-center gap-2 font-medium text-[#475569]">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden="true"
                        />
                        {entry.name}
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {entry.value}
                        <span className="ml-1.5 text-[9px] font-medium text-[#94A3B8]">
                          %{Math.round((entry.value / statusTotal) * 100)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel
            title="Aylık randevular"
            subtitle={`${barYear} / ${barYear - 1}`}
            icon={BarChart3}
            action={
              <div className="flex items-center gap-3 text-[9px] font-semibold text-[#64748B]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#0F172A]" aria-hidden="true" />
                  {barYear}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
                  {barYear - 1}
                </span>
              </div>
            }
            className="xl:col-span-7"
          >
            <div className="h-[220px] w-full sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      fontSize: 12,
                      background: '#FFFFFF',
                    }}
                  />
                  <Bar
                    dataKey="current"
                    name={String(barYear)}
                    fill="#0F172A"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="previous"
                    name={String(barYear - 1)}
                    fill="#E2E8F0"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Haftanın günleri"
            subtitle={`${periodLabel} · randevu dağılımı`}
            icon={CalendarDays}
            className="xl:col-span-5"
          >
            <div className="flex h-[210px] items-end gap-2 sm:h-[260px]">
              {weekdayData.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[9px] font-semibold text-[#64748B]">{item.count}</span>
                  <div className="flex h-[140px] w-full items-end overflow-hidden rounded-full bg-[#F8FAFC] sm:h-[180px]">
                    <div
                      className="w-full rounded-full bg-[#2563EB] transition-all"
                      style={{
                        height: `${Math.max(5, (item.count / maxWeekdayCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.06em] text-[#94A3B8]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel
            title="Yoğun saatler"
            subtitle={`Gün × saat · ${activeAppointments.length} randevu`}
            icon={Clock3}
            className="xl:col-span-12"
          >
            <div className="overflow-x-auto">
              <div className="min-w-[580px]">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: '42px repeat(16, minmax(0, 1fr))' }}
                >
                  <div />
                  {heatmapData.hours.map((hour) => (
                    <div
                      key={hour}
                      className="text-center text-[8px] font-semibold text-[#94A3B8]"
                    >
                      {String(hour).padStart(2, '0')}
                    </div>
                  ))}

                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(
                    (label, dayIndex) => (
                      <React.Fragment key={label}>
                        <div className="flex h-6 items-center text-[9px] font-semibold text-[#64748B]">
                          {label}
                        </div>
                        {heatmapData.hours.map((hour, hourIndex) => {
                          const count = heatmapData.matrix[dayIndex][hourIndex];
                          const ratio = count / heatmapData.max;

                          return (
                            <div
                              key={`${label}-${hour}`}
                              title={`${label} ${String(hour).padStart(2, '0')}:00 · ${count} randevu`}
                              className="h-6 rounded-[4px]"
                              style={{
                                backgroundColor: count
                                  ? `rgba(37, 99, 235, ${0.14 + ratio * 0.82})`
                                  : '#F8FAFC',
                              }}
                            />
                          );
                        })}
                      </React.Fragment>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] text-[#94A3B8]">
              Az
              <span className="h-2.5 w-5 rounded-sm bg-[#EFF6FF]" aria-hidden="true" />
              <span className="h-2.5 w-5 rounded-sm bg-[#BFDBFE]" aria-hidden="true" />
              <span className="h-2.5 w-5 rounded-sm bg-[#93C5FD]" aria-hidden="true" />
              <span className="h-2.5 w-5 rounded-sm bg-[#2563EB]" aria-hidden="true" />
              Çok
            </div>
          </Panel>
        </div>

        <Panel
          title="Yaklaşan randevular"
          subtitle={isAdmin ? 'Tüm personel' : 'Kendi randevuların'}
          icon={CalendarDays}
          action={
            <Link
              to="/admin/appointments"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] transition-colors hover:text-[#0F172A]"
            >
              Tümünü gör
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          }
        >
          {upcomingAppointments.length === 0 ? (
            <EmptyPanel
              icon={CalendarDays}
              title="Yaklaşan randevu yok"
              text="Yeni randevular oluştuğunda burada listelenecek."
              action={
                <Link
                  to="/admin/appointments"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Randevulara git
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {upcomingAppointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    to={`/admin/appointments/${appointment.appointment_date}`}
                    className="block rounded-xl border border-[#F1F5F9] p-3 transition-colors hover:bg-[#F8FAFC]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#0F172A]">
                          {appointment.customer_first_name} {appointment.customer_last_name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-[#64748B]">
                          {getServiceNames(appointment)}
                          {appointment.barbers?.name
                            ? ` · ${appointment.barbers.name}`
                            : ''}
                        </p>
                      </div>
                      {appointment.no_show ? (
                        <span className="shrink-0 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#475569]">
                          Gelmedi
                        </span>
                      ) : (
                        <WarmStatusBadge status={appointment.status} />
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2.5">
                      <span className="text-[10px] font-medium text-[#64748B]">
                        {format(parseISO(appointment.appointment_date), 'd MMM yyyy', {
                          locale: tr,
                        })}{' '}
                        · {formatTime(appointment.appointment_time)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#0F172A]">
                        {formatPrice(appointment.total_price)}
                        <ChevronRight className="h-3 w-3 text-[#94A3B8]" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-[#F1F5F9] text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                    <th className="px-3 py-3">Müşteri</th>
                    <th className="px-3 py-3">Hizmetler</th>
                    <th className="px-3 py-3">Tarih</th>
                    <th className="px-3 py-3">Saat</th>
                    <th className="px-3 py-3">Personel</th>
                    <th className="px-3 py-3">Tutar</th>
                    <th className="px-3 py-3">Durum</th>
                    <th className="px-3 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]/60"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F8FAFC] text-[9px] font-bold text-[#2563EB]">
                            {appointment.customer_first_name.charAt(0)}
                            {appointment.customer_last_name.charAt(0)}
                          </span>
                          <span className="text-xs font-semibold text-[#0F172A]">
                            {appointment.customer_first_name} {appointment.customer_last_name}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-xs text-[#64748B]">
                        {getServiceNames(appointment)}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#64748B]">
                        {format(parseISO(appointment.appointment_date), 'd MMM yyyy', {
                          locale: tr,
                        })}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-[#0F172A]">
                        {formatTime(appointment.appointment_time)}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#64748B]">
                        {appointment.barbers?.name || 'Belirtilmemiş'}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-[#0F172A]">
                        {formatPrice(appointment.total_price)}
                      </td>
                      <td className="px-3 py-3">
                        {appointment.no_show ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#475569]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                            Gelmedi
                          </span>
                        ) : (
                          <WarmStatusBadge status={appointment.status} />
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to={`/admin/appointments/${appointment.appointment_date}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] hover:text-[#0F172A]"
                        >
                          Detay
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Reports;
