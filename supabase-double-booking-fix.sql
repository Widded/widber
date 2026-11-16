-- ============================================================================
-- WidBer — Çift Randevu Koruması (saat bazlı)
--
-- Not: Hizmet süresi artık sonraki saatleri bloke etmiyor.
-- Aynı personelin aynı tarih/saatteki ikinci aktif randevusu engellenir.
-- ============================================================================

alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add column if not exists cancel_reason text;

with ranked as (
  select
    id,
    row_number() over (
      partition by barber_id, appointment_date, appointment_time
      order by created_at asc, id asc
    ) as rn
  from public.appointments
  where status in ('pending', 'approved', 'completed')
    and barber_id is not null
)
update public.appointments appointment
set
  status = 'cancelled',
  cancel_reason = coalesce(
    appointment.cancel_reason,
    'Sistem: mükerrer saat randevusu otomatik iptal edildi'
  )
from ranked
where appointment.id = ranked.id
  and ranked.rn > 1;

drop index if exists public.appointments_unique_active_slot;

create unique index appointments_unique_active_slot
  on public.appointments (barber_id, appointment_date, appointment_time)
  where status in ('pending', 'approved', 'completed')
    and barber_id is not null;

analyze public.appointments;
