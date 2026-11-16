-- ============================================================================
-- WidBer — Saat Bazlı Randevu Koruması
--
-- Hizmet süresi artık sonraki saatleri bloke etmiyor.
-- Sadece aynı personelin aynı tarih/saatteki ikinci randevusu engellenir.
-- ============================================================================

-- Eski, hizmet süresine göre aralık kilidi koyan kısıtı kaldır.
alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add column if not exists cancel_reason text;

-- Aynı personel + tarih + saatte birebir mükerrer aktif kayıt varsa
-- en erken oluşturulanı bırak, sonrakileri iptal et.
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

-- Sadece aynı personelin aynı saatine ikinci aktif randevu engellenir.
-- 10:00 ve 10:30 gibi farklı saatler birlikte alınabilir.
drop index if exists public.appointments_unique_active_slot;

create unique index appointments_unique_active_slot
  on public.appointments (barber_id, appointment_date, appointment_time)
  where status in ('pending', 'approved', 'completed')
    and barber_id is not null;

analyze public.appointments;
