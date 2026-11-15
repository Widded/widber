-- ============================================================================
-- WidBer — Çift Randevu Koruması
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.
--
-- Bu dosya:
--   1) Aynı müşterinin aynı berberde aynı tarih/saatteki birebir mükerrer
--      randevularından fazlasını iptal eder (en erken kayıt kalır).
--   2) Aynı berberde zaman aralıkları kesişen başka randevu varsa uyarı verir.
--   3) Veritabanı seviyesinde çakışma engelini (exclusion constraint) ekler.
--
-- NOT: 2. adımda uyarı alırsan aşağıdaki "TEŞHİS" sorgusu ile çakışanları
-- listeleyip manuel düzeltmen gerekir. Farklı müşterilere ait çakışan
-- randevular otomatik iptal edilmez.
-- ============================================================================

create extension if not exists btree_gist;

alter table public.appointments
  add column if not exists cancel_reason text;

-- ----------------------------------------------------------------------------
-- TEŞHİS — İstersen önce sadece bu sorguyu çalıştırıp çakışanları gör.
-- ----------------------------------------------------------------------------
-- select
--   a.id as randevu_1,
--   b.id as randevu_2,
--   a.barber_id,
--   a.appointment_date,
--   a.appointment_time as saat_1,
--   a.total_duration as sure_1,
--   b.appointment_time as saat_2,
--   b.total_duration as sure_2,
--   a.customer_first_name || ' ' || a.customer_last_name as musteri_1,
--   b.customer_first_name || ' ' || b.customer_last_name as musteri_2
-- from public.appointments a
-- join public.appointments b
--   on a.id < b.id
--  and a.barber_id = b.barber_id
--  and a.status in ('pending', 'approved', 'completed')
--  and b.status in ('pending', 'approved', 'completed')
--  and tsrange(
--        a.appointment_date + a.appointment_time,
--        a.appointment_date + a.appointment_time
--          + make_interval(mins => greatest(coalesce(a.total_duration, 30), 5)),
--        '[)'
--      )
--      && tsrange(
--        b.appointment_date + b.appointment_time,
--        b.appointment_date + b.appointment_time
--          + make_interval(mins => greatest(coalesce(b.total_duration, 30), 5)),
--        '[)'
--      );

-- ----------------------------------------------------------------------------
-- 1) Birebir mükerrer randevuları temizle
--    Aynı berber + tarih + saat + telefon kombinasyonunda en erken kayıt kalır.
-- ----------------------------------------------------------------------------
with ranked as (
  select
    id,
    row_number() over (
      partition by
        barber_id,
        appointment_date,
        appointment_time,
        regexp_replace(coalesce(phone, ''), '\D', '', 'g')
      order by
        case status
          when 'completed' then 0
          when 'approved' then 1
          else 2
        end,
        created_at asc,
        id asc
    ) as rn
  from public.appointments
  where status in ('pending', 'approved', 'completed')
    and regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> ''
)
update public.appointments appointment
set
  status = 'cancelled',
  cancel_reason = coalesce(
    appointment.cancel_reason,
    'Sistem: mükerrer randevu otomatik iptal edildi'
  )
from ranked
where appointment.id = ranked.id
  and ranked.rn > 1;

-- ----------------------------------------------------------------------------
-- 2) Kalan gerçek çakışmaları kontrol et
--    Farklı müşterilerin çakışan randevuları varsa burada durur.
-- ----------------------------------------------------------------------------
do $$
declare
  conflict_count integer;
begin
  select count(*) into conflict_count
  from public.appointments a
  join public.appointments b
    on a.id < b.id
   and a.barber_id = b.barber_id
   and a.status in ('pending', 'approved', 'completed')
   and b.status in ('pending', 'approved', 'completed')
   and tsrange(
         a.appointment_date + a.appointment_time,
         a.appointment_date + a.appointment_time
           + make_interval(mins => greatest(coalesce(a.total_duration, 30), 5)),
         '[)'
       )
       && tsrange(
         b.appointment_date + b.appointment_time,
         b.appointment_date + b.appointment_time
           + make_interval(mins => greatest(coalesce(b.total_duration, 30), 5)),
         '[)'
       );

  if conflict_count > 0 then
    raise exception
      'Hâlâ % çakışan randevu var. Lütfen yukarıdaki TEŞHİS sorgusuyla listeleyip manuel düzeltin; ardından bu dosyayı tekrar çalıştırın.',
      conflict_count;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) Veritabanı seviyesinde çakışma engeli
--    Aynı berberde zaman aralıkları kesişen iki aktif randevu olamaz.
--    İptal / red / gelmedi durumları kapsam dışıdır.
-- ----------------------------------------------------------------------------
alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    (
      tsrange(
        appointment_date + appointment_time,
        appointment_date + appointment_time
          + make_interval(mins => greatest(coalesce(total_duration, 30), 5)),
        '[)'
      )
    ) with &&
  )
  where (status in ('pending', 'approved', 'completed'));

-- ----------------------------------------------------------------------------
-- İsteğe bağlı: randevular arasında 5 dakika temizlik/mola payı bırakmak için
-- yukarıdaki iki tsrange bitişine + interval '5 minutes' ekleyebilirsin.
-- ----------------------------------------------------------------------------
