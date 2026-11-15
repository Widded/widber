import { addDays, getDay, startOfDay } from 'date-fns';

/**
 * Randevu alınabilecek günleri döndürür.
 * Varsayılan: bugün + 7 gün (8 günlük pencere), Pazar hariç.
 */
export const getBookingDates = (days = 8) =>
  Array.from({ length: days }, (_, index) => addDays(startOfDay(new Date()), index)).filter(
    (date) => getDay(date) !== 0
  );

export const getFirstBookingDate = () => getBookingDates()[0] ?? startOfDay(new Date());
