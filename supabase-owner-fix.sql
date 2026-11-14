-- ============================================================================
-- WidBer — Patron Yetki Düzeltmesi
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.
--
-- Arayüzde "Patron" görünmesi yalnızca VITE_ADMIN_EMAIL'e bağlıdır.
-- Veritabanındaki is_owner() ayrı çalışır. Bu dosya ikisini eşitler.
--
-- ÖNEMLİ: Aşağıdaki e-posta, .env içindeki VITE_ADMIN_EMAIL ile aynı olmalı.
-- Değiştirecekseniz sadece bu satırı değiştirin.
-- ============================================================================

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('harunwidded@gmail.com');
$$;

grant execute on function public.is_owner() to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1) HİZMETLER
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
-- 2) PERSONEL
-- ----------------------------------------------------------------------------
alter table public.barbers enable row level security;

drop policy if exists "barbers_select_all" on public.barbers;
create policy "barbers_select_all"
  on public.barbers for select
  using (true);

drop policy if exists "barbers_write_owner" on public.barbers;
create policy "barbers_write_owner"
  on public.barbers for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

grant select on public.barbers to anon;
grant select, insert, update, delete on public.barbers to authenticated;


-- ----------------------------------------------------------------------------
-- 3) AYARLAR
-- ----------------------------------------------------------------------------
alter table public.settings enable row level security;

drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all"
  on public.settings for select
  using (true);

drop policy if exists "settings_write_owner" on public.settings;
create policy "settings_write_owner"
  on public.settings for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

grant select on public.settings to anon;
grant select, insert, update, delete on public.settings to authenticated;


-- ----------------------------------------------------------------------------
-- 4) RANDEVU SİLME (sadece patron)
-- ----------------------------------------------------------------------------
alter table public.appointments enable row level security;

drop policy if exists "appointments_delete_owner" on public.appointments;
create policy "appointments_delete_owner"
  on public.appointments for delete
  to authenticated
  using (public.is_owner());


-- ----------------------------------------------------------------------------
-- 5) KAPALI SAATLER / İZİNLER
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
-- 6) PERSONELİN KENDİ MESAİSİNİ KAYDETMESİ
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
-- 7) KONTROL
-- ----------------------------------------------------------------------------
-- Uygulamada hizmet/personel eklemeyi tekrar dene.
-- Hâlâ 42501 alırsan tarayıcı konsolunda oturum e-postanı kontrol et:
--
-- const s = JSON.parse(localStorage.getItem('sb-nryskkhdubzedecrgkqx-auth-token'));
-- console.log(JSON.parse(atob(s.access_token.split('.')[1])).email);
--
-- Çıkan e-posta, yukarıdaki is_owner() e-postasıyla aynı olmalı.
