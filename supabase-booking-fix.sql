-- ============================================================================
-- WidBer — Müşteri Randevu İzinleri
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.
--
-- Müşteri iletişim bilgilerini doldurduktan sonra randevu oluştururken
-- alınan 403 / "row-level security" hatasını düzeltir.
-- ============================================================================

alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;


-- ----------------------------------------------------------------------------
-- 1) Müşteri randevu oluşturabilsin
-- ----------------------------------------------------------------------------
drop policy if exists "appointments_insert_public" on public.appointments;
create policy "appointments_insert_public"
  on public.appointments for insert
  to anon, authenticated
  with check (true);


-- ----------------------------------------------------------------------------
-- 2) Müşteri dolu saatleri okuyabilsin
-- ----------------------------------------------------------------------------
drop policy if exists "appointments_select_anon_slots" on public.appointments;
create policy "appointments_select_anon_slots"
  on public.appointments for select
  to anon
  using (status in ('pending', 'approved'));


-- Eski isimli politikalar varsa kaldır (yeni politikalarla çakışmasın).
drop policy if exists "Müşteriler randevu ekleyebilir" on public.appointments;
drop policy if exists "Müşteriler randevu-hizmet ekleyebilir" on public.appointment_services;


-- ----------------------------------------------------------------------------
-- 3) Insert sonrası .select('id') dönüşü + müsaitlik sorgusu için kolon izinleri
-- ----------------------------------------------------------------------------
revoke all on public.appointments from anon;
grant insert on public.appointments to anon;
grant select (
  id,
  appointment_date,
  appointment_time,
  barber_id,
  total_duration,
  status
) on public.appointments to anon;

grant select, insert, update, delete on public.appointments to authenticated;


-- ----------------------------------------------------------------------------
-- 4) Randevu-hizmet eşleşmesi
-- ----------------------------------------------------------------------------
drop policy if exists "appointment_services_insert_public" on public.appointment_services;
create policy "appointment_services_insert_public"
  on public.appointment_services for insert
  to anon, authenticated
  with check (true);

revoke all on public.appointment_services from anon;
grant insert on public.appointment_services to anon;
grant select, insert, update, delete on public.appointment_services to authenticated;


-- ----------------------------------------------------------------------------
-- 5) Kontrol
-- ----------------------------------------------------------------------------
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where tablename in ('appointments', 'appointment_services')
-- order by tablename, policyname;
