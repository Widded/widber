-- ============================================================================
-- WidBer — Randevu iptal linki
--
-- Her randevuya tahmin edilemez bir token ekler. Müşteri bu token ile
-- /randevu/<token> sayfasından randevusunu görüp iptal edebilir.
-- Müşteri adı/telefonu token sahibine gösterilmez.
-- ============================================================================

alter table public.appointments
  add column if not exists cancel_token uuid;

update public.appointments
set cancel_token = gen_random_uuid()
where cancel_token is null;

alter table public.appointments
  alter column cancel_token set default gen_random_uuid();

alter table public.appointments
  alter column cancel_token set not null;

create unique index if not exists appointments_cancel_token_key
  on public.appointments (cancel_token);

-- ---------------------------------------------------------------------------
-- Token ile randevu özeti (sadece güvenli alanlar)
-- ---------------------------------------------------------------------------
create or replace function public.get_appointment_by_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'appointment_date', a.appointment_date,
    'appointment_time', a.appointment_time,
    'barber_name', b.name,
    'total_price', a.total_price,
    'total_duration', a.total_duration,
    'services', coalesce(
      (
        select jsonb_agg(s.name order by s.name)
        from public.appointment_services aps
        join public.services s on s.id = aps.service_id
        where aps.appointment_id = a.id
      ),
      '[]'::jsonb
    )
  )
  from public.appointments a
  left join public.barbers b on b.id = a.barber_id
  where a.cancel_token = p_token
  limit 1;
$$;

revoke all on function public.get_appointment_by_token(uuid) from public;
grant execute on function public.get_appointment_by_token(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Token ile iptal
-- Dönüş: cancelled | not_found | not_cancellable | too_late
-- ---------------------------------------------------------------------------
create or replace function public.cancel_appointment_by_token(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  appt public.appointments%rowtype;
  appt_ts timestamptz;
begin
  select * into appt
  from public.appointments
  where cancel_token = p_token;

  if not found then
    return 'not_found';
  end if;

  if appt.status not in ('pending', 'approved') then
    return 'not_cancellable';
  end if;

  appt_ts := (appt.appointment_date + appt.appointment_time) at time zone 'Europe/Istanbul';

  if appt_ts < now() then
    return 'too_late';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancel_reason = 'Müşteri iptal etti (randevu linki)'
  where id = appt.id;

  return 'cancelled';
end;
$$;

revoke all on function public.cancel_appointment_by_token(uuid) from public;
grant execute on function public.cancel_appointment_by_token(uuid) to anon, authenticated;
