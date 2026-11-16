-- ============================================================================
-- WidBer — Site Ayarları
-- Supabase CLI: npx supabase db query --remote=nryskkhdubzedecrgkqx \
--   --file=supabase-site-settings.sql --yes
-- ============================================================================

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'WidBer',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  address text not null default '',
  maps_url text not null default '',
  instagram_url text not null default '',
  hero_badge text not null default 'Online randevu',
  hero_title text not null default 'Berber randevunu saniyeler içinde al.',
  hero_highlight text not null default 'saniyeler içinde',
  hero_subtitle text not null default 'Hizmetini seç, ustanı belirle, sana uygun saati ayır. Sıra beklemeden gel.',
  working_hours_text text not null default 'Pzt-Cmt 10:00-22:00',
  closed_days_text text not null default 'Pazar kapalı',
  logo_url text not null default '',
  hero_image_url text not null default '',
  booking_window_days integer not null default 7 check (booking_window_days between 1 and 60),
  closed_weekdays smallint[] not null default '{0}',
  same_day_booking boolean not null default true,
  min_notice_minutes integer not null default 0 check (min_notice_minutes between 0 and 1440),
  cancellation_policy text not null default '',
  maintenance_mode boolean not null default false,
  booking_paused boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists site_settings_select_public on public.site_settings;
create policy site_settings_select_public
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists site_settings_update_owner on public.site_settings;
create policy site_settings_update_owner
  on public.site_settings for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists site_settings_insert_owner on public.site_settings;
create policy site_settings_insert_owner
  on public.site_settings for insert
  to authenticated
  with check (public.is_owner());

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Logo / kapak görselleri için public bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

drop policy if exists site_assets_public_read on storage.objects;
create policy site_assets_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'site-assets');

drop policy if exists site_assets_owner_insert on storage.objects;
create policy site_assets_owner_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-assets' and public.is_owner());

drop policy if exists site_assets_owner_update on storage.objects;
create policy site_assets_owner_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-assets' and public.is_owner())
  with check (bucket_id = 'site-assets' and public.is_owner());

drop policy if exists site_assets_owner_delete on storage.objects;
create policy site_assets_owner_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-assets' and public.is_owner());
