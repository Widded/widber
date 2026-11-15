export const SLOT_CONFLICT_MESSAGE =
  'Bu saat az önce doldu. Lütfen başka bir saat seçin.';

type BookingError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export const isSlotConflictError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as BookingError;
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(' ');

  return (
    candidate.code === '23P01' ||
    /appointments_no_overlap|exclusion constraint|conflicting key/i.test(text)
  );
};
