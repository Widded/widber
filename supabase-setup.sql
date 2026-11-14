-- ============================================================================
-- WidBer / Berber Randevu — Supabase Kurulum Şeması
-- Supabase Dashboard > SQL Editor içinde tek seferde çalıştırın.
-- Yeni/boş bir Supabase projesi için tasarlandı, tekrar çalıştırılabilir.
-- ============================================================================

-- >>> PATRON E-POSTASI <<<
-- Uygulamadaki VITE_ADMIN_EMAIL ile BİREBİR AYNI olmalı.
-- (Aşağıdaki is_owner() fonksiyonunda kullanılıyor.)
-- Değiştirmek isterseniz sadece buradaki adresi değiştirin.

create extension if not exists pgcrypto;

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'harunwidded@gmail.com';
$$;

grant execute on function public.is_owner() to anon, authenticated;


-- ============================================================================
-- 1) TABLOLAR
-- ============================================================================

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration integer not null check (duration > 0),
  price numeric not null default 0 check (price >= 0),
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text,
  working_hours jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.barbers enable row level security;

-- Eski tablodan yükseltme yapılıyorsa eksik kolonları ekle:
alter table public.barbers add column if not exists pin text;
alter table public.barbers add column if not exists working_hours jsonb not null default '[]'::jsonb;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_first_name text not null,
  customer_last_name text not null,
  phone text not null,
  appointment_date date not null,
  appointment_time time not null,
  barber_id uuid references public.barbers(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'completed', 'cancelled', 'rejected')),
  total_price numeric not null default 0 check (total_price >= 0),
  total_duration integer not null default 0 check (total_duration >= 0),
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

-- Eski status constraint'i 'rejected' içermiyorsa güncelle:
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('pending', 'approved', 'completed', 'cancelled', 'rejected'));

create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  constraint appointment_services_unique unique (appointment_id, service_id)
);

alter table public.appointment_services enable row level security;

create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

alter table public.settings enable row level security;

create table if not exists public.barber_blocked_times (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  blocked_date date not null,
  blocked_time text not null,
  created_at timestamptz not null default now(),
  constraint barber_blocked_times_unique unique (barber_id, blocked_date, blocked_time)
);

alter table public.barber_blocked_times enable row level security;


-- ============================================================================
-- 2) INDEX'LER
-- ============================================================================

create index if not exists idx_services_created_at
  on public.services (created_at);

create unique index if not exists idx_services_name_unique
  on public.services (name);

create index if not exists idx_barbers_created_at
  on public.barbers (created_at);

-- Aynı PIN'in iki personele verilmesini engeller (boş PIN'lere karışmaz).
create unique index if not exists idx_barbers_pin_unique
  on public.barbers (pin)
  where pin is not null;

create index if not exists idx_appointments_date
  on public.appointments (appointment_date);

create index if not exists idx_appointments_barber_date
  on public.appointments (barber_id, appointment_date);

create index if not exists idx_appointments_status
  on public.appointments (status);

create index if not exists idx_appointment_services_appointment
  on public.appointment_services (appointment_id);

create index if not exists idx_appointment_services_service
  on public.appointment_services (service_id);

create index if not exists idx_blocked_barber_date
  on public.barber_blocked_times (barber_id, blocked_date);


-- ============================================================================
-- 3) ROW LEVEL SECURITY
-- ============================================================================

alter table public.services              enable row level security;
alter table public.barbers               enable row level security;
alter table public.appointments          enable row level security;
alter table public.appointment_services  enable row level security;
alter table public.settings              enable row level security;
alter table public.barber_blocked_times  enable row level security;

-- 3.1 Hizmetler: herkes okur, sadece patron yazar.
drop policy if exists "services_select_all" on public.services;
create policy "services_select_all"
  on public.services for select
  using (true);

drop policy if exists "services_write_owner" on public.services;
create policy "services_write_owner"
  on public.services for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- 3.2 Personeller: herkes okur, sadece patron yazar.
drop policy if exists "barbers_select_all" on public.barbers;
create policy "barbers_select_all"
  on public.barbers for select
  using (true);

drop policy if exists "barbers_write_owner" on public.barbers;
create policy "barbers_write_owner"
  on public.barbers for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- 3.3 Ayarlar: herkes okur, sadece patron yazar.
drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all"
  on public.settings for select
  using (true);

drop policy if exists "settings_write_owner" on public.settings;
create policy "settings_write_owner"
  on public.settings for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- 3.4 Randevular
-- Müşteriler (anon) randevu oluşturabilir.
drop policy if exists "appointments_insert_public" on public.appointments;
create policy "appointments_insert_public"
  on public.appointments for insert to anon, authenticated
  with check (true);

-- Personel ve patron tüm randevuları okuyabilir.
drop policy if exists "appointments_select_staff" on public.appointments;
create policy "appointments_select_staff"
  on public.appointments for select to authenticated
  using (true);

-- Anon yalnızca dolu saat hesabı için gerekli satırları okuyabilir.
-- Kolon kısıtı aşağıdaki GRANT bölümünde: müşteri adı/telefonu okunamaz.
drop policy if exists "appointments_select_anon_slots" on public.appointments;
create policy "appointments_select_anon_slots"
  on public.appointments for select to anon
  using (status in ('pending', 'approved'));

-- Personel ve patron randevu durumunu güncelleyebilir.
drop policy if exists "appointments_update_staff" on public.appointments;
create policy "appointments_update_staff"
  on public.appointments for update to authenticated
  using (true)
  with check (true);

-- Sadece patron silebilir.
drop policy if exists "appointments_delete_owner" on public.appointments;
create policy "appointments_delete_owner"
  on public.appointments for delete to authenticated
  using (public.is_owner());

-- 3.5 Randevu-Hizmet eşleşmeleri
drop policy if exists "appointment_services_insert_public" on public.appointment_services;
create policy "appointment_services_insert_public"
  on public.appointment_services for insert to anon, authenticated
  with check (true);

drop policy if exists "appointment_services_select_staff" on public.appointment_services;
create policy "appointment_services_select_staff"
  on public.appointment_services for select to authenticated
  using (true);

drop policy if exists "appointment_services_write_staff" on public.appointment_services;
create policy "appointment_services_write_staff"
  on public.appointment_services for all to authenticated
  using (true)
  with check (true);

-- 3.6 Kapalı saatler / izinler
drop policy if exists "blocked_select_all" on public.barber_blocked_times;
create policy "blocked_select_all"
  on public.barber_blocked_times for select
  using (true);

drop policy if exists "blocked_insert_staff" on public.barber_blocked_times;
create policy "blocked_insert_staff"
  on public.barber_blocked_times for insert to authenticated
  with check (true);

drop policy if exists "blocked_delete_staff" on public.barber_blocked_times;
create policy "blocked_delete_staff"
  on public.barber_blocked_times for delete to authenticated
  using (true);


-- ============================================================================
-- 4) İZİNLER (GRANT)
-- ============================================================================

-- ANON: sadece okuma + randevu oluşturma.
revoke all on public.appointments from anon;

grant insert on public.appointments to anon;

-- Müşteri adı, soyadı ve telefonu anon'a KAPALI.
-- Sadece dolu saat hesabı ve insert sonrası id dönüşü için gerekli kolonlar:
grant select (
  id,
  appointment_date,
  appointment_time,
  barber_id,
  total_duration,
  status
) on public.appointments to anon;

revoke all on public.appointment_services from anon;
grant insert on public.appointment_services to anon;

grant select on public.services             to anon;
grant select on public.barbers              to anon;
grant select on public.settings             to anon;
grant select on public.barber_blocked_times to anon;

-- AUTHENTICATED: personel + patron. Yazma yetkisini RLS politikaları sınırlar.
grant select, insert, update, delete on public.appointments         to authenticated;
grant select, insert, update, delete on public.appointment_services to authenticated;
grant select, insert, update, delete on public.services             to authenticated;
grant select, insert, update, delete on public.barbers              to authenticated;
grant select, insert, update, delete on public.settings             to authenticated;
grant select, insert, update, delete on public.barber_blocked_times to authenticated;


-- ============================================================================
-- 5) BAŞLANGIÇ VERİLERİ (OPSİYONEL — VARSAYILAN OLARAK KAPALI)
-- ============================================================================
-- Hizmetler, fiyatlar, süreler, personel isimleri ve PIN'ler artık SQL'e
-- gömülü DEĞİL. Kurulumdan sonra yönetim panelinden eklenir:
--   /admin/services    -> hizmet adı, fiyat, süre
--   /admin/barbers     -> personel adı, giriş PIN'i
--   /admin/availability -> personelin çalışma saatleri / izinleri
--
-- İlk kurulum sırası:
--   1) Supabase > Authentication > Users: patron kullanıcısını oluştur.
--   2) .env içindeki VITE_ADMIN_EMAIL, yukarıdaki is_owner() e-postasıyla aynı olsun.
--   3) /admin/login > "Yönetici Girişi" ile giriş yap.
--   4) /admin/services ve /admin/barbers üzerinden verileri gir.
--   5) /admin/availability üzerinden her personelin mesaisini belirle
--      (yeni personelin working_hours değeri boş gelir; bu adım atlanırsa
--      o personel randevu alamaz).
--
-- Sadece test/demo için örnek veri eklemek isterseniz aşağıdaki blokları açın:

-- insert into public.services (name, duration, price) values
--   ('Saç Kesimi', 30, 200),
--   ('Sakal Tıraşı', 20, 100),
--   ('Saç & Sakal Kesimi', 45, 280),
--   ('Cilt Bakımı', 30, 150),
--   ('Saç Yıkama ve Şekillendirme', 15, 80)
-- on conflict (name) do nothing;
--
-- insert into public.barbers (name, pin, working_hours) values
--   ('Ahmet Yılmaz', '100001', '["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00"]'::jsonb),
--   ('Mehmet Kaya',  '100002', '["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00"]'::jsonb)
-- on conflict do nothing;

-- Not: global "working_hours" ayarına da gerek yoktur. Uygulama, ayar yoksa
-- kendi içindeki yedek listeye düşer; asıl mesai personel bazında tutulur.


-- ============================================================================
-- 6) KONTROL SORGULARI (opsiyonel)
-- ============================================================================
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select * from public.services order by created_at;
-- select id, name, pin, working_hours from public.barbers order by created_at;
-- select * from public.settings;
