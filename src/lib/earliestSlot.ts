import { format } from 'date-fns';
import { supabase } from './supabase';
import type { Barber } from '../context/BookingContext';
import { splitTimeSlots } from './availability';
import { getBookingDates, type BookingDateOptions } from './bookingDates';
import { getSpecialDate } from './specialDates';

export type EarliestSlot = {
  barber: Barber;
  time: string;
  date: string;
};

type EarliestSlotOptions = BookingDateOptions & {
  min_notice_minutes?: number;
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  // 00:00-05:59 arası saatler gece yarısını aşan mesai sayılır, günün sonuna yazılır.
  return (hours < 6 ? hours + 24 : hours) * 60 + minutes;
};

/**
 * Randevu alınabilen günleri sırayla tarar; ilk boş günün en erken saatini
 * ve o saati verebilecek ilk personeli döndürür.
 * Bugün kapalıysa (tatil, kapalı gün, ön süre) otomatik olarak sonraki güne geçer.
 */
export const findEarliestSlot = async (
  barbers: Barber[],
  options: EarliestSlotOptions = {}
): Promise<EarliestSlot | null> => {
  const dates = getBookingDates(options);
  if (dates.length === 0) return null;

  const dateStrings = dates.map((date) => format(date, 'yyyy-MM-dd'));

  const [appointmentsResult, blockedResult] = await Promise.all([
    supabase
      .from('appointments')
      .select('barber_id, appointment_date, appointment_time')
      .in('appointment_date', dateStrings)
      .in('status', ['pending', 'approved', 'completed']),
    supabase
      .from('barber_blocked_times')
      .select('barber_id, blocked_date, blocked_time')
      .in('blocked_date', dateStrings),
  ]);

  if (appointmentsResult.error) throw appointmentsResult.error;
  if (blockedResult.error) throw blockedResult.error;

  const busyBySlot = new Map<string, string[]>();
  const addBusy = (barberId: string | null, date: string, time: string) => {
    if (!barberId) return;
    const key = `${barberId}|${date}`;
    const times = busyBySlot.get(key) ?? [];
    times.push(time.slice(0, 5));
    busyBySlot.set(key, times);
  };

  (appointmentsResult.data ?? []).forEach((row) =>
    addBusy(row.barber_id, row.appointment_date, row.appointment_time)
  );
  (blockedResult.data ?? []).forEach((row) =>
    addBusy(row.barber_id, row.blocked_date, row.blocked_time)
  );

  for (const date of dates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const specialDate = getSpecialDate(options.special_dates, dateStr);
    const candidates: { barber: Barber; time: string }[] = [];

    barbers.forEach((barber) => {
      if (!barber.working_hours?.length) return;

      const { available } = splitTimeSlots(
        barber.working_hours,
        busyBySlot.get(`${barber.id}|${dateStr}`) ?? [],
        dateStr,
        options.min_notice_minutes ?? 0,
        specialDate
      );

      if (available[0]) candidates.push({ barber, time: available[0] });
    });

    if (candidates.length > 0) {
      const earliest = candidates.reduce((best, current) =>
        toMinutes(current.time) < toMinutes(best.time) ? current : best
      );

      return { ...earliest, date: dateStr };
    }
  }

  return null;
};
