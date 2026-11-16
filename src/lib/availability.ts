import { addDays, isToday, parse, parseISO } from 'date-fns';

/**
 * Bugün için geçmiş saatleri dolu kabul eder.
 * 00:00–05:59 arası saatler gece yarısını aşan mesai kabul edilerek ertesi güne taşınır.
 */
export const isTimeInPast = (
  time: string,
  date: string | null,
  minNoticeMinutes = 0
) => {
  if (!date) return false;

  const dateObject = parseISO(date);
  if (Number.isNaN(dateObject.getTime()) || !isToday(dateObject)) return false;

  let timeDate = parse(time, 'HH:mm', new Date());
  if (timeDate.getHours() < 6) timeDate = addDays(timeDate, 1);

  const threshold = new Date(Date.now() + Math.max(0, minNoticeMinutes) * 60_000);
  return timeDate < threshold;
};

/**
 * Çalışma saatlerini müsait / dolu olarak ikiye ayırır.
 * Dolu: randevu, manuel blok veya bugün için geçmiş/çok yakın saat.
 */
export const splitTimeSlots = (
  workingHours: string[] = [],
  blockedTimes: string[] = [],
  date: string | null = null,
  minNoticeMinutes = 0
) => {
  const available: string[] = [];
  const full: string[] = [];

  workingHours.forEach((time) => {
    if (
      blockedTimes.includes(time) ||
      isTimeInPast(time, date, minNoticeMinutes)
    ) {
      full.push(time);
    } else {
      available.push(time);
    }
  });

  return { available, full };
};
