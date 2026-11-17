import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarDays, Clock3, Loader2, Phone, Scissors, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { formatPrice } from '../../lib/appointmentUtils';

type AppointmentInfo = {
  id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  barber_name: string | null;
  total_price: number;
  total_duration: number;
  services: string[];
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'Onay bekliyor', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  approved: { label: 'Onaylandı', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  completed: { label: 'Tamamlandı', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  cancelled: { label: 'İptal edildi', className: 'bg-red-50 text-red-700 ring-red-100' },
  rejected: { label: 'Reddedildi', className: 'bg-red-50 text-red-700 ring-red-100' },
};

const AppointmentStatus = () => {
  const { token } = useParams<{ token: string }>();
  const { settings } = useSiteSettings();

  const [appointment, setAppointment] = useState<AppointmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Randevu linki geçersiz.');
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc('get_appointment_by_token', {
      p_token: token,
    });

    if (rpcError) {
      console.error('Randevu getirilemedi:', rpcError);
      setError('Randevu linki geçersiz veya süresi dolmuş.');
      setLoading(false);
      return;
    }

    if (!data) {
      setError('Bu linke ait bir randevu bulunamadı.');
    } else {
      setAppointment(data as AppointmentInfo);
      setError(null);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async () => {
    if (!token) return;

    setCancelling(true);
    const { data: result, error: rpcError } = await supabase.rpc(
      'cancel_appointment_by_token',
      { p_token: token }
    );
    setCancelling(false);
    setConfirmOpen(false);

    if (rpcError) {
      console.error('Randevu iptal edilemedi:', rpcError);
      setNotice('İptal işlemi yapılamadı. Lütfen bizimle iletişime geç.');
      return;
    }

    if (result === 'cancelled') {
      setNotice('Randevun iptal edildi.');
      await load();
    } else if (result === 'too_late') {
      setNotice('Randevu saati geçmiş. İptal için lütfen bizimle iletişime geç.');
    } else if (result === 'not_cancellable') {
      setNotice('Bu randevu artık iptal edilemez.');
      await load();
    } else {
      setNotice('Randevu bulunamadı.');
    }
  };

  const status = appointment ? STATUS_META[appointment.status] ?? STATUS_META.pending : null;
  const canCancel =
    appointment && ['pending', 'approved'].includes(appointment.status);

  return (
    <div className="min-h-[70vh] bg-[#f4f7fb] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        <Link
          to="/"
          className="mx-auto mb-6 flex w-fit items-center gap-2 text-sm font-bold tracking-tight text-slate-900"
        >
          {settings.business_name}
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500">Randevu yükleniyor…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-slate-900">Randevu bulunamadı</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{error}</p>
            <Link
              to="/"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ana sayfaya dön
            </Link>
          </div>
        ) : appointment && status ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Randevun
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  {format(parseISO(appointment.appointment_date), 'd MMMM yyyy, EEEE', {
                    locale: tr,
                  })}
                </h1>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${status.className}`}
              >
                {status.label}
              </span>
            </div>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500">
                  <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Saat
                </dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {appointment.appointment_time.slice(0, 5)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500">
                  <UserRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Usta
                </dt>
                <dd className="font-semibold text-slate-900">
                  {appointment.barber_name ?? 'Farketmez'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500">
                  <Scissors className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Hizmet
                </dt>
                <dd className="text-right font-semibold text-slate-900">
                  {appointment.services.length > 0
                    ? appointment.services.join(', ')
                    : 'Hizmet belirtilmemiş'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <dt className="text-slate-500">Toplam</dt>
                <dd className="text-lg font-bold text-slate-900">
                  {formatPrice(appointment.total_price)}
                </dd>
              </div>
            </dl>

            {notice && (
              <p
                role="status"
                className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
              >
                {notice}
              </p>
            )}

            {canCancel ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Randevuyu iptal et
              </button>
            ) : (
              <p className="mt-4 text-center text-xs text-slate-400">
                Bu randevu için işlem yapılamıyor.
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-slate-900"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {settings.phone}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {settings.address || 'Adres için bizimle iletişime geç'}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleCancel()}
        title="Randevuyu iptal et"
        description={
          cancelling
            ? 'İptal ediliyor…'
            : 'Bu işlem geri alınamaz. Randevunu iptal etmek istediğine emin misin?'
        }
        type="danger"
        confirmText={cancelling ? 'İptal ediliyor…' : 'Evet, iptal et'}
        cancelText="Vazgeç"
      />
    </div>
  );
};

export default AppointmentStatus;
