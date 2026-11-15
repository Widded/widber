import type { AdminAppointment } from '../hooks/useAdminAppointments';

export const formatTime = (time: string | null | undefined) => {
  if (!time) return '--:--';
  return time.slice(0, 5);
};

export const formatPrice = (price: number | string | null | undefined) => {
  const value = Number(price ?? 0);
  return `₺${value.toLocaleString('tr-TR')}`;
};

export const getServiceNames = (appointment: AdminAppointment) => {
  return (
    appointment.appointment_services
      ?.map((item) => item.services?.name)
      .filter(Boolean)
      .join(', ') || 'Hizmet belirtilmemiş'
  );
};

export const getStatusMeta = (status: string) => {
  switch (status) {
    case 'pending':
    case 'approved':
      return {
        label: 'Onaylandı',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        rail: 'border-l-emerald-400',
      };
    case 'completed':
      return {
        label: 'Tamamlandı',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        rail: 'border-l-blue-400',
      };
    case 'cancelled':
    case 'rejected':
      return {
        label: 'İptal',
        badge: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        rail: 'border-l-red-400',
      };
    default:
      return {
        label: status,
        badge: 'bg-gray-50 text-gray-600 border-gray-200',
        dot: 'bg-gray-400',
        rail: 'border-l-gray-300',
      };
  }
};

export const normalizePhoneForWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90')) return digits;
  if (digits.startsWith('0')) return `90${digits.slice(1)}`;
  return `90${digits}`;
};

export const getWhatsAppUrl = (phone: string, customerName: string) => {
  const message = encodeURIComponent(
    `Merhaba ${customerName}, WidBer randevunuz hakkında yazıyorum.`
  );
  return `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${message}`;
};
