-- ============================================================================
-- WidBer — Raporlar / Analiz Altyapısı
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Yeni alanlar
-- ----------------------------------------------------------------------------
alter table public.services add column if not exists category text;
alter table public.barbers add column if not exists is_demo boolean not null default false;
alter table public.appointments add column if not exists customer_id uuid;
alter table public.appointments add column if not exists cancel_reason text;
alter table public.appointments add column if not exists no_show boolean not null default false;
alter table public.appointments add column if not exists is_demo boolean not null default false;


-- ----------------------------------------------------------------------------
-- 2) Müşteriler tablosu
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_phone on public.customers (phone);
create index if not exists idx_appointments_customer on public.appointments (customer_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_customer_id_fkey'
  ) then
    alter table public.appointments
      add constraint appointments_customer_id_fkey
      foreign key (customer_id) references public.customers(id) on delete set null;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 3) Her randevuda müşteriyi bul / oluştur
-- ----------------------------------------------------------------------------
create or replace function public.link_appointment_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_customer_id uuid;
begin
  v_phone := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');

  if v_phone <> '' then
    insert into public.customers (first_name, last_name, phone, is_demo)
    values (
      coalesce(nullif(trim(new.customer_first_name), ''), 'Müşteri'),
      coalesce(nullif(trim(new.customer_last_name), ''), ''),
      v_phone,
      coalesce(new.is_demo, false)
    )
    on conflict (phone) do update
      set first_name = excluded.first_name,
          last_name = excluded.last_name
    returning id into v_customer_id;

    new.customer_id := v_customer_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_link_appointment_customer on public.appointments;
create trigger trg_link_appointment_customer
before insert on public.appointments
for each row execute function public.link_appointment_customer();


-- ----------------------------------------------------------------------------
-- 4) Eski randevuları müşterilere bağla
-- ----------------------------------------------------------------------------
insert into public.customers (first_name, last_name, phone)
select distinct on (regexp_replace(phone, '\D', '', 'g'))
  coalesce(nullif(trim(customer_first_name), ''), 'Müşteri'),
  coalesce(nullif(trim(customer_last_name), ''), ''),
  regexp_replace(phone, '\D', '', 'g')
from public.appointments
where regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> ''
  and customer_id is null
order by regexp_replace(phone, '\D', '', 'g'), created_at asc
on conflict (phone) do nothing;

update public.appointments a
set customer_id = c.id
from public.customers c
where a.customer_id is null
  and regexp_replace(coalesce(a.phone, ''), '\D', '', 'g') = c.phone;


-- ----------------------------------------------------------------------------
-- 5) Müşteriler için RLS
-- ----------------------------------------------------------------------------
alter table public.customers enable row level security;

drop policy if exists "customers_select_staff" on public.customers;
create policy "customers_select_staff"
  on public.customers for select
  to authenticated
  using (true);

grant select on public.customers to authenticated;


-- ----------------------------------------------------------------------------
-- 6) Canlı veri (Supabase Realtime)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
