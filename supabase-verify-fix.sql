-- Dolu saat görünürlüğü testi: canlıya veri BIRAKMAZ (rollback).
begin;

insert into public.appointments (
  customer_first_name, customer_last_name, phone,
  appointment_date, appointment_time, barber_id, status,
  total_price, total_duration, is_demo
) values (
  'ZZTEST', 'ZZTEST', '05000000000',
  current_date + 1, '23:45', null, 'completed',
  0, 0, true
);

-- 1) Politika tanımı (postgres olarak)
select jsonb_build_object(
  'politika', (
    select qual from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'appointments_select_anon_slots'
  )
) as politika;

-- 2) Anon gözünden görünürlük (anon yalnızca saat/status/id kolonlarını okuyabilir)
set local role anon;
select jsonb_build_object(
  'anon_gordugu_completed', count(appointment_time)
) as anon_gorunumu
from public.appointments
where status = 'completed' and appointment_time = '23:45';
reset role;

rollback;
