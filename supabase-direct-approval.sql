-- ============================================================================
-- WidBer — Randevuları Doğrudan Onayla
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.
-- ============================================================================

-- Yeni randevular doğrudan "approved" olarak oluşsun.
alter table public.appointments
  alter column status set default 'approved';

-- Mevcut bekleyen randevuları da onaylı duruma al.
update public.appointments
set status = 'approved'
where status = 'pending';
