export const getAppointmentLink = (token: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/randevu/${token}`;
};
