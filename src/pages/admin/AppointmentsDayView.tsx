import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, format, getDay, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAdminAppointments, type AdminAppointment } from '../../hooks/useAdminAppointments';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/toast';
import { ManualAppointmentModal } from '../../components/admin/ManualAppointmentModal';
import {
  formatPrice,
  formatTime,
  getServiceNames,
  getWhatsAppUrl,
} from '../../lib/appointmentUtils';
import { cn } from '../../lib/utils';
import { getBookingDates } from '../../lib/bookingDates';
import {
  PageHeader,
  WarmStatusBadge,
  iconButton,
  primaryButton,
  secondaryButton,
} from '../../components/admin/editorial';

type StatusFilter = 'all' | 'approved' | 'completed' | 'cancelled';

const getInitials = (firstName?: string, lastName?: string) => {
  const initials = `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase();
  return initials || 'M';
};

const getBarberInitials = (name?: string) =>
  (name || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'P';

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }

  if (digits.length === 10) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }

  return phone;
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

const formatMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const menuItemClass =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900';

const menuItemDangerClass =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50';

const AppointmentsDayView = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { appointments, loading, error, updateStatus, deleteAppointment, refresh } =
    useAdminAppointments();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  const selectedDate = useMemo(() => {
    if (!date) return new Date();
    const parsed = parseISO(date);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [date]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const bookingDates = useMemo(() => getBookingDates(), []);
  const firstBookingDate = bookingDates[0] ?? new Date();
  const lastBookingDate = bookingDates[bookingDates.length - 1] ?? new Date();
  const lastBookingDateStr = format(lastBookingDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayIsClosed = getDay(new Date()) === 0;
  const selectedIsInBookingRange = bookingDates.some((day) => isSameDay(day, selectedDate));
  const isLastBookingDate = dateStr >= lastBookingDateStr;

  const filteredAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.appointment_date === dateStr)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [appointments, dateStr]
  );

  const dayOptions = useMemo(
    () =>
      bookingDates.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayAppointments = appointments.filter(
          (appointment) => appointment.appointment_date === dayStr
        );

        return {
          date: day,
          total: dayAppointments.length,
          confirmed: dayAppointments.filter(
            (appointment) =>
              appointment.status === 'approved' || appointment.status === 'completed'
          ).length,
          cancelled: dayAppointments.filter(
            (appointment) =>
              appointment.status === 'cancelled' || appointment.status === 'rejected'
          ).length,
        };
      }),
    [appointments, bookingDates]
  );

  const approvedAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === 'approved'
  );
  const completedAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === 'completed'
  );
  const cancelledAppointments = filteredAppointments.filter(
    (appointment) =>
      (appointment.status === 'cancelled' || appointment.status === 'rejected') &&
      !appointment.no_show
  );
  const noShowAppointments = filteredAppointments.filter(
    (appointment) => appointment.no_show
  );
  const activeAppointments = filteredAppointments.filter(
    (appointment) =>
      appointment.status !== 'cancelled' && appointment.status !== 'rejected'
  );

  const completedRevenue = completedAppointments.reduce(
    (sum, appointment) => sum + Number(appointment.total_price || 0),
    0
  );
  const totalDuration = activeAppointments.reduce(
    (sum, appointment) => sum + Number(appointment.total_duration || 0),
    0
  );
  const occupancy = Math.min(100, Math.round((totalDuration / 720) * 100));
  const firstTime = activeAppointments.length
    ? formatTime(activeAppointments[0].appointment_time)
    : '--:--';
  const lastEndMinutes = activeAppointments.reduce(
    (max, appointment) =>
      Math.max(
        max,
        toMinutes(appointment.appointment_time) + Number(appointment.total_duration || 0)
      ),
    0
  );
  const lastEndTime = activeAppointments.length ? formatMinutes(lastEndMinutes) : '--:--';

  const barberCounts = filteredAppointments.reduce<Record<string, number>>(
    (acc, appointment) => {
      const name = appointment.barbers?.name || 'Belirtilmemiş Personel';
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const barberCount = Object.keys(barberCounts).length;
  const maxBarberCount = Math.max(1, ...Object.values(barberCounts));

  const nextAppointment = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    return (
      appointments
        .filter(
          (appointment) =>
            appointment.appointment_date >= todayStr &&
            appointment.status === 'approved'
        )
        .sort((a, b) =>
          `${a.appointment_date} ${a.appointment_time}`.localeCompare(
            `${b.appointment_date} ${b.appointment_time}`
          )
        )[0] ?? null
    );
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    if (statusFilter === 'all') return filteredAppointments;

    if (statusFilter === 'cancelled') {
      return filteredAppointments.filter(
        (appointment) =>
          appointment.status === 'cancelled' ||
          appointment.status === 'rejected' ||
          appointment.no_show
      );
    }

    return filteredAppointments.filter(
      (appointment) => appointment.status === statusFilter
    );
  }, [filteredAppointments, statusFilter]);

  const statusFilters: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Tümü', count: filteredAppointments.length },
    { value: 'approved', label: 'Onaylı', count: approvedAppointments.length },
    { value: 'completed', label: 'Tamamlanan', count: completedAppointments.length },
    {
      value: 'cancelled',
      label: 'İptal',
      count: cancelledAppointments.length + noShowAppointments.length,
    },
  ];

  const summaryRows = [
    { label: 'Onaylanan', value: approvedAppointments.length, color: '#10B981' },
    { label: 'Tamamlanan', value: completedAppointments.length, color: '#2563EB' },
    { label: 'İptal', value: cancelledAppointments.length, color: '#EF4444' },
    ...(noShowAppointments.length > 0
      ? [{ label: 'Gelmedi', value: noShowAppointments.length, color: '#64748B' }]
      : []),
  ];
  const summaryTotal = summaryRows.reduce((sum, row) => sum + row.value, 0);

  const goToDate = (target: Date) => {
    setOpenMenuId(null);
    navigate(`/admin/appointments/${format(target, 'yyyy-MM-dd')}`);
  };

  const handleStatusChange = async (id: string, status: string) => {
    setBusyId(id);
    setActionError(null);

    const ok = await updateStatus(id, status);

    setBusyId(null);
    if (!ok) {
      setActionError('Randevu durumu güncellenemedi. Lütfen tekrar deneyin.');
    }

    return ok;
  };

  const handleComplete = async (appointment: AdminAppointment) => {
    const ok = await handleStatusChange(appointment.id, 'completed');

    if (ok) {
      showToast({
        message: 'Randevu tamamlandı.',
        actionLabel: 'Geri al',
        onAction: async () => {
          const undone = await updateStatus(appointment.id, appointment.status);
          if (!undone) {
            showToast({ message: 'İşlem geri alınamadı.', variant: 'error' });
          }
        },
      });
    }
  };

  const handleRemoveFromSlot = async (appointment: AdminAppointment) => {
    if (
      !window.confirm(
        'Bu müşteriyi bu saatten kaldırmak istiyor musunuz? Saat yeniden müsait olacak.'
      )
    ) {
      return;
    }

    setBusyId(appointment.id);
    setActionError(null);

    const ok = await updateStatus(appointment.id, 'cancelled', {
      cancel_reason: 'Personel tarafından kaldırıldı',
    });

    setBusyId(null);
    if (!ok) {
      setActionError('Müşteri saatten kaldırılamadı. Lütfen tekrar deneyin.');
      return;
    }

    showToast({
      message: 'Randevu iptal edildi.',
      actionLabel: 'Geri al',
      onAction: async () => {
        const undone = await updateStatus(appointment.id, appointment.status, {
          cancel_reason: null,
        });
        if (!undone) {
          showToast({ message: 'İşlem geri alınamadı.', variant: 'error' });
        }
      },
    });
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Bu iptal edilmiş randevuyu tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
      )
    ) {
      return;
    }

    setBusyId(id);
    setActionError(null);

    const ok = await deleteAppointment(id);

    setBusyId(null);
    if (!ok) {
      setActionError('Randevu silinemedi. Lütfen tekrar deneyin.');
      return;
    }

    showToast({ message: 'Randevu silindi.' });
  };

  const handleManualCreated = () => {
    setIsManualOpen(false);
    void refresh();
    showToast({ message: 'Randevu oluşturuldu.' });
  };

  const renderRow = (appointment: AdminAppointment) => {
    const customerName =
      `${appointment.customer_first_name} ${appointment.customer_last_name}`.trim();
    const isApproved = appointment.status === 'approved';
    const isCancelled =
      appointment.status === 'cancelled' || appointment.status === 'rejected';
    const busy = busyId === appointment.id;
    const menuOpen = openMenuId === appointment.id;

    return (
      <div
        key={appointment.id}
        className="flex flex-wrap items-start gap-x-3 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:items-center"
      >
        <div className="flex w-12 shrink-0 flex-col items-start gap-0.5 pt-0.5">
          <p className="text-sm font-semibold text-slate-900">
            {formatTime(appointment.appointment_time)}
          </p>
          <p className="text-[10px] text-slate-400">{appointment.total_duration} dk</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[9px] font-bold text-blue-700">
            {getInitials(appointment.customer_first_name, appointment.customer_last_name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{customerName}</p>
              {isAdmin && appointment.barbers?.name && (
                <span className="truncate text-[10px] text-slate-400">
                  · {appointment.barbers.name}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {formatPhone(appointment.phone)} · {getServiceNames(appointment)}
            </p>
            {appointment.cancel_reason && (
              <p className="mt-0.5 text-[10px] font-medium text-red-500">
                İptal: {appointment.cancel_reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 pl-14 sm:w-auto sm:pl-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {formatPrice(appointment.total_price)}
            </span>

            {appointment.no_show ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                Gelmedi
              </span>
            ) : (
              <WarmStatusBadge status={appointment.status} />
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isApproved && (
              <button
                type="button"
                onClick={() => void handleComplete(appointment)}
                disabled={busy}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Tamamla
              </button>
            )}

            <div
              className="relative"
              ref={menuOpen ? menuRef : undefined}
            >
              <button
                type="button"
                onClick={() => setOpenMenuId(menuOpen ? null : appointment.id)}
                disabled={busy}
                aria-label="Diğer işlemler"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50',
                  menuOpen
                    ? 'border-slate-300 bg-slate-100 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/5"
                >
                  <a
                    role="menuitem"
                    href={`tel:${appointment.phone}`}
                    onClick={() => setOpenMenuId(null)}
                    className={menuItemClass}
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    Ara
                  </a>
                  <a
                    role="menuitem"
                    href={getWhatsAppUrl(appointment.phone, customerName)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpenMenuId(null)}
                    className={menuItemClass}
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    WhatsApp
                  </a>

                  {(isApproved || (isCancelled && isAdmin)) && (
                    <div className="my-1 h-px bg-slate-100" aria-hidden="true" />
                  )}

                  {isApproved && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenMenuId(null);
                        void handleRemoveFromSlot(appointment);
                      }}
                      className={menuItemDangerClass}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Kaldır
                    </button>
                  )}

                  {isCancelled && isAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenMenuId(null);
                        void handleDelete(appointment.id);
                      }}
                      className={menuItemDangerClass}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Sil
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Günlük plan"
        title="Randevular"
        subtitle={
          <>
            {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            <span className="mx-1.5 text-slate-300">·</span>
            {filteredAppointments.length} randevu
            {barberCount > 0 ? ` · ${barberCount} personel` : ''}
            {completedRevenue > 0 ? ` · ${formatPrice(completedRevenue)} ciro` : ''}
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className={primaryButton}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Yeni randevu
            </button>
            <button
              type="button"
              onClick={() => goToDate(firstBookingDate)}
              className={secondaryButton}
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {todayIsClosed ? 'İlk uygun gün' : 'Bugün'}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Randevuları yenile"
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

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedIsInBookingRange ? 'Bugün + 7 gün' : 'Geçmiş tarih'}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {selectedIsInBookingRange
                    ? `${format(bookingDates[0], 'd MMM', { locale: tr })} – ${format(
                        lastBookingDate,
                        'd MMM yyyy',
                        { locale: tr }
                      )} · Pazar kapalı`
                    : format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToDate(addDays(selectedDate, -1))}
                aria-label="Önceki gün"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                type="date"
                value={dateStr}
                min={format(addDays(new Date(), -365), 'yyyy-MM-dd')}
                max={lastBookingDateStr}
                onChange={(event) => {
                  if (event.target.value) {
                    goToDate(parseISO(event.target.value));
                  }
                }}
                aria-label="Randevu tarihi seç"
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => goToDate(addDays(selectedDate, 1))}
                disabled={isLastBookingDate}
                aria-label="Sonraki gün"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1.5 xl:min-w-[340px]">
            {dayOptions.map(({ date: day, total, confirmed, cancelled }) => {
              const active = isSameDay(day, selectedDate);
              const today = isSameDay(day, new Date());
              const dayLabel = format(day, 'd MMMM yyyy, EEEE', { locale: tr });

              return (
                <button
                  key={format(day, 'yyyy-MM-dd')}
                  type="button"
                  onClick={() => goToDate(day)}
                  aria-label={`${dayLabel} randevularını görüntüle`}
                  aria-current={active ? 'date' : undefined}
                  className={cn(
                    'flex min-w-0 flex-col items-center rounded-lg border px-1.5 py-1.5 transition-all',
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : today
                        ? 'border-blue-200 bg-blue-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'text-[8px] font-bold uppercase tracking-[0.08em]',
                      active ? 'text-blue-100' : 'text-slate-400'
                    )}
                  >
                    {format(day, 'EEE', { locale: tr })}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 text-base font-bold leading-none',
                      active ? 'text-white' : 'text-slate-900'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="mt-1 flex h-1.5 items-center gap-0.5">
                    {total === 0 ? (
                      <span
                        className={cn(
                          'h-1 w-1 rounded-full',
                          active ? 'bg-white/40' : 'bg-slate-200'
                        )}
                      />
                    ) : (
                      <>
                        {confirmed > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                        {cancelled > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!selectedIsInBookingRange && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2">
            <p className="text-[11px] font-medium text-blue-700">
              Geçmiş tarih görüntüleniyor: {format(selectedDate, 'd MMMM yyyy', { locale: tr })}
            </p>
            <button
              type="button"
              onClick={() => goToDate(new Date())}
              className="text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline"
            >
              Bugüne dön
            </button>
          </div>
        )}
      </section>

      {(error || actionError) && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError || error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">
            Bu tarihte randevu yok
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Başka bir gün seçebilir veya ilk uygun güne dönebilirsin.
          </p>

          {nextAppointment && (
            <button
              type="button"
              onClick={() => goToDate(parseISO(nextAppointment.appointment_date))}
              className="mx-auto mt-4 flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-600">
                  Sonraki randevu
                </span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">
                  {format(parseISO(nextAppointment.appointment_date), 'd MMMM yyyy, EEEE', {
                    locale: tr,
                  })}{' '}
                  · {formatTime(nextAppointment.appointment_time)}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => goToDate(addDays(selectedDate, -1))}
              className={secondaryButton}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Önceki gün
            </button>
            <button
              type="button"
              onClick={() => goToDate(addDays(selectedDate, 1))}
              className={secondaryButton}
            >
              Sonraki gün
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goToDate(firstBookingDate)}
              className={primaryButton}
            >
              {todayIsClosed ? 'İlk uygun gün' : 'Bugün'}
            </button>
          </div>
        </section>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 rounded-t-xl border-b border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Randevu akışı</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {visibleAppointments.length} randevu gösteriliyor
                </p>
              </div>

              <div className="flex max-w-full flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                {statusFilters.map((filter) => {
                  const active = statusFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(filter.value);
                        setOpenMenuId(null);
                      }}
                      className={cn(
                        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-semibold transition-colors',
                        active
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {filter.label}
                      <span
                        className={cn(
                          'hidden rounded-full px-1.5 py-0.5 text-[9px] sm:inline',
                          active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'
                        )}
                      >
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleAppointments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-600">
                  Bu filtreye uygun randevu yok.
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn('mt-3', secondaryButton)}
                >
                  Tümünü göster
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleAppointments.map(renderRow)}
              </div>
            )}
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Günün özeti</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Durum dağılımı ve doluluk</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                  {summaryTotal} randevu
                </span>
              </div>

              {summaryTotal === 0 ? (
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
                  Randevu oluştuğunda özet burada görünecek.
                </p>
              ) : (
                <>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100">
                    {summaryRows
                      .filter((row) => row.value > 0)
                      .map((row) => (
                        <div
                          key={row.label}
                          style={{
                            width: `${(row.value / summaryTotal) * 100}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      ))}
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {summaryRows
                      .filter((row) => row.value > 0)
                      .map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="flex items-center gap-2 font-medium text-slate-500">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: row.color }}
                              aria-hidden="true"
                            />
                            {row.label}
                          </span>
                          <span className="font-semibold text-slate-900">{row.value}</span>
                        </div>
                      ))}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-500">Doluluk</p>
                      <span className="text-xs font-semibold text-slate-900">
                        %{occupancy}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {firstTime} – {lastEndTime}
                      </span>
                      <span>{totalDuration} dk planlı</span>
                    </div>
                  </div>
                </>
              )}
            </section>

            {barberCount > 1 && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Personel</h2>
                    <p className="mt-0.5 text-xs text-slate-400">{barberCount} personel</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-blue-600">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {Object.entries(barberCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, count]) => (
                      <div key={name}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-2 font-medium text-slate-500">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-600">
                              {getBarberInitials(name)}
                            </span>
                            <span className="truncate">{name}</span>
                          </span>
                          <span className="font-semibold text-slate-900">{count}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${(count / maxBarberCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default AppointmentsDayView;
