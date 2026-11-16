-- ============================================================================
-- WidBer — Güvenlik ve RLS Performans Düzeltmeleri
-- Supabase SQL Editor veya Supabase CLI ile bir kez çalıştırın.
-- ============================================================================

-- 1) is_owner() fonksiyonunun arama yolunu sabitle
alter function public.is_owner() set search_path = public;

-- 2) Trigger fonksiyonu RPC olarak çağrılamasın
revoke all on function public.link_appointment_customer()
  from public, anon, authenticated;

-- 3) Anon kullanıcı personel mesai saatlerini güncelleyemesin
revoke execute on function public.update_barber_working_hours(uuid, jsonb)
  from anon;

-- 4) Aynı tabloda SELECT için birden fazla permissive policy olmasın.
--    Patron yazma yetkileri INSERT / UPDATE / DELETE olarak ayrıldı.
drop policy if exists barbers_write_owner on public.barbers;
create policy barbers_insert_owner
  on public.barbers for insert to authenticated
  with check (public.is_owner());
create policy barbers_update_owner
  on public.barbers for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());
create policy barbers_delete_owner
  on public.barbers for delete to authenticated
  using (public.is_owner());

drop policy if exists services_write_owner on public.services;
create policy services_insert_owner
  on public.services for insert to authenticated
  with check (public.is_owner());
create policy services_update_owner
  on public.services for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());
create policy services_delete_owner
  on public.services for delete to authenticated
  using (public.is_owner());

drop policy if exists settings_write_owner on public.settings;
create policy settings_insert_owner
  on public.settings for insert to authenticated
  with check (public.is_owner());
create policy settings_update_owner
  on public.settings for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());
create policy settings_delete_owner
  on public.settings for delete to authenticated
  using (public.is_owner());
