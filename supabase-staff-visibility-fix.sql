-- ============================================================================
-- WidBer — Personel / Patron Randevu Görünürlüğü
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.
--
-- Anon müşteri randevuyu görüyor ancak personel/patron oturumu
-- randevuları göremiyorsa bu dosya eksik SELECT / UPDATE politikalarını ekler.
-- ============================================================================

alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;


-- ----------------------------------------------------------------------------
-- 1) Personel ve patron tüm randevuları okuyabilsin
-- ----------------------------------------------------------------------------
drop policy if exists "appointments_select_staff" on public.appointments;
create policy "appointments_select_staff"
  on public.appointments for select
  to authenticated
  using (true);

grant select on public.appointments to authenticated;


-- ----------------------------------------------------------------------------
-- 2) Personel ve patron randevu durumunu güncelleyebilsin
-- ----------------------------------------------------------------------------
drop policy if exists "appointments_update_staff" on public.appointments;
create policy "appointments_update_staff"
  on public.appointments for update
  to authenticated
  using (true)
  with check (true);

grant update on public.appointments to authenticated;


-- ----------------------------------------------------------------------------
-- 3) Randevu-hizmet eşleşmelerini okuyabilsin
-- ----------------------------------------------------------------------------
drop policy if exists "appointment_services_select_staff" on public.appointment_services;
create policy "appointment_services_select_staff"
  on public.appointment_services for select
  to authenticated
  using (true);

grant select on public.appointment_services to authenticated;


-- ----------------------------------------------------------------------------
-- 4) Join'lerde kullanılan personel ve hizmet okumaları
-- ----------------------------------------------------------------------------
drop policy if exists "barbers_select_all" on public.barbers;
create policy "barbers_select_all"
  on public.barbers for select
  using (true);

drop policy if exists "services_select_all" on public.services;
create policy "services_select_all"
  on public.services for select
  using (true);

grant select on public.barbers to authenticated;
grant select on public.services to authenticated;


-- ----------------------------------------------------------------------------
-- 5) Kontrol
-- ----------------------------------------------------------------------------
-- Personel hesabıyla giriş yapıp randevuların görünmesi gerekir.
-- SQL Editor'da politika kontrolü:
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where tablename in ('appointments', 'appointment_services', 'barbers', 'services')
-- order by tablename, policyname;
