import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type AdminAppointment = {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  total_price: number;
  total_duration: number;
  barber_id: string | null;
  barbers?: { name: string };
  appointment_services?: {
    services?: { name: string };
  }[];
};

export const useAdminAppointments = () => {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          barbers ( name ),
          appointment_services (
            services ( name )
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      // Personel (admin olmayan) giriş yaptıysa, localStorage'dan barber_id'yi al
      if (!isAdmin) {
        const staffBarberId = localStorage.getItem('staff_barber_id');

        if (staffBarberId) {
          query = query.eq('barber_id', staffBarberId);
        } else {
          setAppointments([]);
          setLoading(false);
          return;
        }
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      if (data) setAppointments(data as AdminAppointment[]);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Randevular yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: string, newStatus: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw updateError;
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === id ? { ...appointment, status: newStatus } : appointment
        )
      );
      return true;
    } catch (err) {
      console.error('Error updating status:', err);
      return false;
    }
  };

  const deleteAppointment = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (deleteError) {
        if (deleteError.code === '42501') {
          alert('Yetkisiz işlem: Sadece patron (admin) randevu silebilir.');
        }
        throw deleteError;
      }
      setAppointments((prev) => prev.filter((appointment) => appointment.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting appointment:', err);
      return false;
    }
  };

  return {
    appointments,
    loading,
    error,
    updateStatus,
    deleteAppointment,
    refresh: fetchAppointments,
  };
};
