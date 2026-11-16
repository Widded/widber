-- ============================================================================
-- WidBer — Dolu saat görünürlüğü
--
-- Müşteri ekranı dolu saatleri pending/approved/completed randevulardan
-- hesaplıyor, ama anon SELECT politikası 'completed' durumunu dışarıda
-- bırakıyordu. Bu yüzden tamamlanmış bir randevunun saati müşteriye boş
-- görünüyor, hata ancak randevu gönderilirken (unique index) çıkıyordu.
--
-- Kolon izinleri değişmiyor: anon yalnızca id/tarih/saat/personel/süre/status
-- görebilir, müşteri adı ve telefonu göremez.
-- ============================================================================

drop policy if exists appointments_select_anon_slots on public.appointments;
create policy appointments_select_anon_slots
  on public.appointments for select to anon
  using (status in ('pending', 'approved', 'completed'));
