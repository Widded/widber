-- ============================================================================
-- WidBer — Demo / Test Verisini Temizle
-- Sadece is_demo = true olan kayıtları siler; gerçek randevular korunur.
-- ============================================================================

delete from public.appointments where is_demo = true;
delete from public.customers where is_demo = true;
delete from public.barbers where is_demo = true;

-- Not: supabase-demo-data.sql içinde eklenen hizmetler demo olarak
-- işaretlenmediği için silinmez. İsterseniz Hizmetler panelinden kaldırabilirsiniz.
