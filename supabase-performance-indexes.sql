-- ============================================================================
-- WidBer — Performans İndeksleri
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.
-- ============================================================================

-- Tarih aralığı + durum filtreleri (randevu listesi, raporlar, dashboard)
create index if not exists idx_appointments_date_status
  on public.appointments (appointment_date, status);

-- Personel + tarih + durum (personel paneli, müsait saatler)
create index if not exists idx_appointments_barber_date_status
  on public.appointments (barber_id, appointment_date, status);

-- Kapalı saatler sorgusu (tarih + personel)
create index if not exists idx_barber_blocked_date_barber
  on public.barber_blocked_times (blocked_date, barber_id);

-- Sorgu planlayıcısının güncel istatistikleri kullanması için
analyze public.appointments;
analyze public.appointment_services;
analyze public.barbers;
analyze public.services;
analyze public.barber_blocked_times;
