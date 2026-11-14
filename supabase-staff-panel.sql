-- ============================================================================
-- WidBer — Personel Paneli / Hizmet Yetkileri
-- Supabase Dashboard > SQL Editor içinde çalıştırın.
-- Bu dosya, personel panelinin ihtiyaç duyduğu okuma izinlerini ve
-- personelin kendi çalışma saatlerini kaydetmesini sağlayan RPC'yi ekler.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) HİZMETLER
-- Herkes okur; sadece patron yazar.
-- ----------------------------------------------------------------------------
alter table public.services enable row level security;

drop policy if exists "services_select_all" on public.services;
create policy "services_select_all"
  on public.services for select
  using (true);

drop policy if exists "services_write_owner" on public.services;
create policy "services_write_owner"
  on public.services for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;


-- ----------------------------------------------------------------------------
-- 2) PERSONEL LİSTESİ
-- Personel giriş ekranı anonim çalışır; ad listesini okuyabilmelidir.
-- ----------------------------------------------------------------------------
alter table public.barbers enable row level security;

drop policy if exists "barbers_select_all" on public.barbers;
create policy "barbers_select_all"
  on public.barbers for select
  using (true);

grant select on public.barbers to anon;


-- ----------------------------------------------------------------------------
-- 3) KAPALI SAATLER / İZİNLER
-- Müşteri müsaitlik ekranı ve personel okuyabilir.
-- ----------------------------------------------------------------------------
alter table public.barber_blocked_times enable row level security;

drop policy if exists "blocked_select_all" on public.barber_blocked_times;
create policy "blocked_select_all"
  on public.barber_blocked_times for select
  using (true);

drop policy if exists "blocked_insert_staff" on public.barber_blocked_times;
create policy "blocked_insert_staff"
  on public.barber_blocked_times for insert
  to authenticated
  with check (true);

drop policy if exists "blocked_delete_staff" on public.barber_blocked_times;
create policy "blocked_delete_staff"
  on public.barber_blocked_times for delete
  to authenticated
  using (true);

grant select on public.barber_blocked_times to anon;
grant select, insert, delete on public.barber_blocked_times to authenticated;


-- ----------------------------------------------------------------------------
-- 4) AYARLAR
-- Müşteri tarafındaki yedek çalışma saati okuması için.
-- ----------------------------------------------------------------------------
alter table public.settings enable row level security;

drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all"
  on public.settings for select
  using (true);

grant select on public.settings to anon;


-- ----------------------------------------------------------------------------
-- 5) PERSONELİN KENDİ MESAİSİNİ KAYDETMESİ
-- Ortak personel hesabı nedeniyle doğrudan UPDATE RLS'e takılır.
-- Bu fonksiyon yalnızca working_hours alanını günceller.
--
-- Not: Paylaşılan personel hesabı kullanıldığı için API üzerinden başka bir
-- personelin ID'si verilebilir. Personel başına ayrı auth hesabına geçilince
-- bu fonksiyon auth.uid() ile sınırlandırılmalıdır.
-- ----------------------------------------------------------------------------
create or replace function public.update_barber_working_hours(
  p_barber_id uuid,
  p_hours jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.barbers
  set working_hours = p_hours
  where id = p_barber_id;
$$;

revoke all on function public.update_barber_working_hours(uuid, jsonb) from public;
grant execute on function public.update_barber_working_hours(uuid, jsonb) to authenticated;


-- ----------------------------------------------------------------------------
-- 6) KONTROL
-- ----------------------------------------------------------------------------
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where tablename in ('services', 'barbers', 'barber_blocked_times', 'settings')
-- order by tablename, policyname;
