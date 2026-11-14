import React, { useState } from 'react';
import { Check, Loader2, MessageCircle, Phone, UserRound, X } from 'lucide-react';
import type { AdminAppointment } from '../../hooks/useAdminAppointments';
import { cn } from '../../lib/utils';
import {
  formatPrice,
  formatTime,
  getServiceNames,
  getStatusMeta,
  getWhatsAppUrl,
} from '../../lib/appointmentUtils';
import { StatusBadge } from './StatusBadge';

type StaffAppointmentCardProps = {
  appointment: AdminAppointment;
  onStatusChange: (id: string, status: string) => Promise<boolean>;
  className?: string;
  showBarber?: boolean;
};

export const StaffAppointmentCard = ({
  appointment,
  onStatusChange,
  className,
  showBarber = false,
}: StaffAppointmentCardProps) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const statusMeta = getStatusMeta(appointment.status);
  const customerName = `${appointment.customer_first_name} ${appointment.customer_last_name}`;
  const isPending = appointment.status === 'pending';
  const isApproved = appointment.status === 'approved';

  const handleStatus = async (status: string) => {
    setBusy(status);
    setError(false);
    const ok = await onStatusChange(appointment.id, status);
    setBusy(null);
    if (!ok) setError(true);
  };

  return (
    <article
      className={cn(
        'rounded-2xl border border-l-4 border-ink/10 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(23,19,16,0.4)]',
        statusMeta.rail,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ink/[0.04]">
          <span className="font-display text-lg leading-none text-ink">
            {formatTime(appointment.appointment_time)}
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink/40">
            {appointment.total_duration} dk
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-ink">{customerName}</h3>
              <a
                href={`tel:${appointment.phone}`}
                className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-ink/50 transition-colors hover:text-ink"
              >
                <Phone className="h-3 w-3" aria-hidden="true" />
                {appointment.phone}
              </a>
              {showBarber && appointment.barbers?.name && (
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brass-dark">
                  <UserRound className="h-3 w-3" aria-hidden="true" />
                  {appointment.barbers.name}
                </p>
              )}
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink/60">
            {getServiceNames(appointment)}
          </p>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">
              {formatPrice(appointment.total_price)}
            </span>

            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${appointment.phone}`}
                aria-label={`${customerName} kişisini ara`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.03] text-ink/55 transition-colors hover:bg-ink hover:text-cream"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={getWhatsAppUrl(appointment.phone, customerName)}
                target="_blank"
                rel="noreferrer"
                aria-label={`${customerName} kişisine WhatsApp mesajı gönder`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.03] text-ink/55 transition-colors hover:bg-[#25D366] hover:text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {(isPending || isApproved) && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/10 pt-3">
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => void handleStatus('approved')}
                disabled={busy !== null}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ink text-xs font-semibold text-cream transition-colors hover:bg-ink-soft disabled:opacity-60"
              >
                {busy === 'approved' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                Onayla
              </button>
              <button
                type="button"
                onClick={() => void handleStatus('cancelled')}
                disabled={busy !== null}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                {busy === 'cancelled' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <X className="h-4 w-4" aria-hidden="true" />
                )}
                Reddet
              </button>
            </>
          )}

          {isApproved && (
            <button
              type="button"
              onClick={() => void handleStatus('completed')}
              disabled={busy !== null}
              className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ink text-xs font-semibold text-cream transition-colors hover:bg-ink-soft disabled:opacity-60"
            >
              {busy === 'completed' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Tamamlandı olarak işaretle
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-[11px] font-medium text-red-600">
          Durum güncellenemedi. Lütfen tekrar deneyin.
        </p>
      )}
    </article>
  );
};
