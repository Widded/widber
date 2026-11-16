import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Barber } from '../context/BookingContext';

/**
 * Sadece seçilen gün ve personel için dolu saatleri getirir.
 * Hizmet süresi artık sonraki saatleri bloke etmez; her saat kendi başına dolu/boş.
 */
export const useAvailableTimes = (
  selectedDate: string,
  selectedBarber: Barber | null
) => {
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [fetchingTimes, setFetchingTimes] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!selectedDate || !selectedBarber) {
      setBookedTimes([]);
      return;
    }

    let active = true;

    const fetchBookedTimes = async () => {
      setFetchingTimes(true);

      try {
        const [appointmentsResult, blockedResult] = await Promise.all([
          supabase
            .from('appointments')
            .select('appointment_time')
            .eq('appointment_date', selectedDate)
            .eq('barber_id', selectedBarber.id)
            .in('status', ['pending', 'approved', 'completed']),
          supabase
            .from('barber_blocked_times')
            .select('blocked_time')
            .eq('blocked_date', selectedDate)
            .eq('barber_id', selectedBarber.id),
        ]);

        if (appointmentsResult.error) throw appointmentsResult.error;
        if (blockedResult.error) throw blockedResult.error;

        const blockedSlots = new Set<string>();

        (appointmentsResult.data ?? []).forEach((appointment) => {
          blockedSlots.add(appointment.appointment_time.slice(0, 5));
        });

        (blockedResult.data ?? []).forEach((slot) => {
          blockedSlots.add(slot.blocked_time.slice(0, 5));
        });

        if (!active) return;
        setBookedTimes(Array.from(blockedSlots));
      } catch (err) {
        console.error('Dolu saatler çekilirken hata:', err);
      } finally {
        if (active) setFetchingTimes(false);
      }
    };

    void fetchBookedTimes();

    return () => {
      active = false;
    };
  }, [selectedDate, selectedBarber, refreshKey]);

  return { bookedTimes, fetchingTimes, refresh };
};
