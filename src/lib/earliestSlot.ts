import { format } from 'date-fns';
import { supabase } from './supabase';
import type { Barber } from '../context/BookingContext';
import { splitTimeSlots } from './availability';
import { getBookingDates, type BookingDateOptions } from './bookingDates';
import { getSpecialDate } from './specialDates';

export type EarliestSlot = {
  barber: Barber;
  time: string;
};

type EarliestSlotOptions = BookingDateOptions & {
  min_notice_minutes?: number;
};

/**
 * Bugün için tüm personelin müsait saatlerini karşılaştırır,
 * en erken saati ve o saati verebilecek ilk personeli döndürür.
 * Bugün randevu alınamıyorsa veya boş saat yoksa null.
 */
export const findEarliestSlotToday = async (
  barbers: Barber[],
  options: EarliestSlotOptions = {}
): Promise<EarliestSlot | null> => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todayIsBookable = getBookingDates(options).some(
    (date) => format(date, 'yyyy-MM-dd') === todayStr
  );
  if (!todayIsBookable) return null;

  const [appointmentsResult, blockedResult] = await Promise.all([
    supabase
      .from('appointments')
      .select('barber_id, appointment_time')
      .eq('appointment_date', todayStr)
      .in('status', ['pending', 'approved', 'completed']),
    supabase
      .from('barber_blocked_times')
      .select('barber_id, blocked_time')
      .eq('blocked_date', todayStr),
  ]);

  if (appointmentsResult.error) throw appointmentsResult.error;
  if (blockedResult.error) throw blockedResult.error;

  const busyByBarber = new Map<string, string[]>();
  const addBusy = (barberId: string | null, time: string) => {
    if (!barberId) return;
    const times = busyByBarber.get(barberId) ?? [];
    times.push(time.slice(0, 5));
    busyByBarber.set(barberId, times);
  };

  (appointmentsResult.data ?? []).forEach((row) =>
    addBusy(row.barber_id, row.appointment_time)
  );
  (blockedResult.data ?? []).forEach((row) =>
    addBusy(row.barber_id, row.blocked_time)
  );

  const specialDate = getSpecialDate(options.special_dates, todayStr);
  const candidates: EarliestSlot[] = [];

  barbers.forEach((barber) => {
    if (!barber.working_hours?.length) return;

    const { available } = splitTimeSlots(
      barber.working_hours,
      busyByBarber.get(barber.id) ?? [],
      todayStr,
      options.min_notice_minutes ?? 0,
      specialDate
    );

    if (available[0]) candidates.push({ barber, time: available[0] });
  });

  if (candidates.length === 0) return null;

  // 00:00-05:59 arası saatler gece yarısını aşan mesai sayılır, günün sonuna yazılır.
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours < 6 ? hours + 24 : hours) * 60 + minutes;
  };

  return candidates.reduce((earliest, current) =>
    toMinutes(current.time) < toMinutes(earliest.time) ? current : earliest
  );
};
