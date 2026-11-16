import { addDays, getDay, startOfDay } from 'date-fns';
import { isDateFullyClosed, type SpecialDate } from './specialDates';

export type BookingDateOptions = {
  booking_window_days?: number;
  closed_weekdays?: number[];
  same_day_booking?: boolean;
  special_dates?: SpecialDate[];
};

/**
 * Randevu alınabilecek günleri döndürür.
 * Varsayılan: bugün + 7 gün, Pazar hariç.
 */
export const getBookingDates = (options?: BookingDateOptions) => {
  const windowDays = Math.min(
    60,
    Math.max(1, options?.booking_window_days ?? 7)
  );
  const closedWeekdays = options?.closed_weekdays ?? [0];
  const startOffset = options?.same_day_booking === false ? 1 : 0;
  const dayCount = Math.max(1, windowDays + 1 - startOffset);

  return Array.from({ length: dayCount }, (_, index) =>
    addDays(startOfDay(new Date()), index + startOffset)
  ).filter(
    (date) =>
      !closedWeekdays.includes(getDay(date)) &&
      !isDateFullyClosed(options?.special_dates, date)
  );
};

export const getFirstBookingDate = (options?: BookingDateOptions) =>
  getBookingDates(options)[0] ?? startOfDay(new Date());
