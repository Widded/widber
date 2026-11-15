-- ============================================================================
-- WidBer — Demo / Test Verisi
-- Önce supabase-reports.sql çalıştırılmış olmalı.
-- Demo verisini kaldırmak için supabase-demo-data-remove.sql kullanın.
--
-- Not: Bu dosya tek bir SQL cümlesiyle çalışır (dolar-tırnak bloğu yoktur).
-- Supabase SQL Editor'de tüm metni seçip "Run" demeniz yeterlidir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Gerçekçi hizmetler (demo değil, panelden düzenlenebilir)
-- ----------------------------------------------------------------------------
insert into public.services (name, duration, price, category) values
  ('Saç Kesimi', 30, 250, 'Saç'),
  ('Sakal Tıraşı', 20, 120, 'Sakal'),
  ('Saç & Sakal Kesimi', 45, 340, 'Komple'),
  ('Cilt Bakımı', 30, 180, 'Cilt'),
  ('Saç Yıkama ve Şekillendirme', 15, 90, 'Saç')
on conflict (name) do update set category = excluded.category;


-- ----------------------------------------------------------------------------
-- 2) Demo personel (is_demo = true)
-- ----------------------------------------------------------------------------
insert into public.barbers (name, working_hours, is_demo)
select v.name, v.working_hours, true
from (values
  ('Demo Usta 1', '["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00"]'::jsonb),
  ('Demo Usta 2', '["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00"]'::jsonb)
) as v(name, working_hours)
where not exists (select 1 from public.barbers where is_demo = true);


-- ----------------------------------------------------------------------------
-- 3) Demo randevular (2025–2026, son 2 ay ve yaklaşan günler ağırlıklı)
-- ----------------------------------------------------------------------------
with services_pool as materialized (
  select
    id,
    price,
    duration,
    row_number() over (order by name) as rn,
    count(*) over () as total
  from public.services
  where name <> '123'
),
base as materialized (
  select
    g.i,
    1 + ((g.i - 1) % 30) as customer_index,
    case
      when g.i <= 80 then current_date - floor(random() * 60)::int
      when g.i <= 130 then current_date - (60 + floor(random() * 120)::int)
      when g.i <= 180 then current_date - (180 + floor(random() * 360)::int)
      when g.i <= 205 then current_date - (540 + floor(random() * 190)::int)
      else current_date + (1 + floor(random() * 30)::int)
    end as appointment_date,
    (array[10, 11, 12, 12, 13, 13, 14, 14, 15, 15,
           16, 16, 17, 17, 18, 18, 19, 19, 20, 21])[1 + floor(random() * 20)::int] as hour,
    case when random() < 0.5 then 0 else 30 end as minute,
    random() as r
  from generate_series(1, 220) as g(i)
),
demo as materialized (
  select
    gen_random_uuid() as appointment_id,
    split_part((array[
      'Ahmet Yılmaz','Mehmet Kaya','Mustafa Demir','Ali Çelik','Hasan Şahin',
      'Emre Aydın','Burak Arslan','Kaan Koç','Serkan Yıldız','Murat Öztürk',
      'Can Yılmaz','Cem Arslan','Deniz Kaya','Efe Şahin','Furkan Demir',
      'Gökhan Çelik','Hakan Aydın','İbrahim Koç','Kerem Yıldız','Mert Öztürk',
      'Onur Kaya','Ömer Şahin','Sadık Demir','Tolga Çelik','Uğur Aydın',
      'Volkan Koç','Yusuf Yıldız','Zekeriya Öztürk','Barış Kaya','Cihan Şahin'
    ])[b.customer_index], ' ', 1) as first_name,
    split_part((array[
      'Ahmet Yılmaz','Mehmet Kaya','Mustafa Demir','Ali Çelik','Hasan Şahin',
      'Emre Aydın','Burak Arslan','Kaan Koç','Serkan Yıldız','Murat Öztürk',
      'Can Yılmaz','Cem Arslan','Deniz Kaya','Efe Şahin','Furkan Demir',
      'Gökhan Çelik','Hakan Aydın','İbrahim Koç','Kerem Yıldız','Mert Öztürk',
      'Onur Kaya','Ömer Şahin','Sadık Demir','Tolga Çelik','Uğur Aydın',
      'Volkan Koç','Yusuf Yıldız','Zekeriya Öztürk','Barış Kaya','Cihan Şahin'
    ])[b.customer_index], ' ', 2) as last_name,
    '05' || lpad((100000000 + b.customer_index * 7654321)::text, 9, '0') as phone,
    b.appointment_date,
    make_time(b.hour, b.minute, 0) as appointment_time,
    coalesce(
      case
        when b.i % 10 < 3 then
          (select id from public.barbers where not is_demo order by random() limit 1)
      end,
      (select id from public.barbers where is_demo order by random() limit 1),
      (select id from public.barbers order by random() limit 1)
    ) as barber_id,
    case
      when b.appointment_date > current_date then
        case
          when b.r < 0.55 then 'pending'
          when b.r < 0.95 then 'approved'
          else 'cancelled'
        end
      else
        case
          when b.r < 0.82 then 'completed'
          when b.r < 0.94 then 'cancelled'
          else 'approved'
        end
    end as status,
    s.service_id,
    s.service_price + coalesce(s2.second_price, 0) as total_price,
    s.service_duration + coalesce(s2.second_duration, 0) as total_duration,
    case
      when b.appointment_date > current_date and b.r >= 0.95 then
        (array['Müşteri iptal etti', 'Program değişikliği', 'Rahatsızlık'])[1 + floor(random() * 3)::int]
      when b.appointment_date <= current_date and b.r >= 0.82 and b.r < 0.94 then
        (array['Müşteri iptal etti', 'Program değişikliği', 'Rahatsızlık', 'Gelmedi'])[1 + floor(random() * 4)::int]
      else null
    end as cancel_reason,
    case
      when b.appointment_date <= current_date and b.r >= 0.82 and b.r < 0.94 then random() < 0.4
      else false
    end as no_show,
    s2.second_id
  from base b
  cross join lateral (
    select id as service_id, price as service_price, duration as service_duration
    from services_pool
    where rn = 1 + ((b.i * 7) % total)
  ) s
  left join lateral (
    select id as second_id, price as second_price, duration as second_duration
    from services_pool
    where b.i % 3 = 0
      and id <> s.service_id
    order by rn
    limit 1
  ) s2 on true
),
inserted as materialized (
  insert into public.appointments (
    id,
    customer_first_name,
    customer_last_name,
    phone,
    appointment_date,
    appointment_time,
    barber_id,
    status,
    total_price,
    total_duration,
    cancel_reason,
    no_show,
    is_demo
  )
  select
    appointment_id,
    first_name,
    last_name,
    phone,
    appointment_date,
    appointment_time,
    barber_id,
    status,
    total_price,
    total_duration,
    cancel_reason,
    no_show,
    true
  from demo
  where not exists (select 1 from public.appointments where is_demo = true)
  returning id
)
insert into public.appointment_services (appointment_id, service_id)
select d.appointment_id, d.service_id
from demo d
join inserted i on i.id = d.appointment_id
union all
select d.appointment_id, d.second_id
from demo d
join inserted i on i.id = d.appointment_id
where d.second_id is not null;
