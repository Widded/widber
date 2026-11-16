import { format } from 'date-fns';

export type SpecialDate = {
  date: string;
  closed: boolean;
  open_time?: string;
  close_time?: string;
  note?: string;
};

export const parseSpecialDates = (value: unknown): SpecialDate[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      date: String(item.date ?? ''),
      closed: item.closed !== false,
      open_time: item.open_time ? String(item.open_time).slice(0, 5) : undefined,
      close_time: item.close_time ? String(item.close_time).slice(0, 5) : undefined,
      note: item.note ? String(item.note) : undefined,
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
};

export const getSpecialDate = (
  entries: SpecialDate[] | undefined,
  date: string
) => entries?.find((entry) => entry.date === date) ?? null;

export const isDateFullyClosed = (
  entries: SpecialDate[] | undefined,
  date: Date
) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return entries?.some((entry) => entry.date === dateStr && entry.closed) ?? false;
};

export const isTimeWithinSpecialHours = (
  time: string,
  specialDate: SpecialDate | null
) => {
  if (!specialDate) return true;
  if (specialDate.closed) return false;

  if (specialDate.open_time && time < specialDate.open_time) return false;
  if (specialDate.close_time && time >= specialDate.close_time) return false;

  return true;
};
