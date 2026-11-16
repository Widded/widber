import { useCallback, useEffect, useRef, useState } from 'react';
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
  customer_id?: string | null;
  cancel_reason?: string | null;
  no_show?: boolean | null;
  is_demo?: boolean | null;
  barbers?: { name: string };
  appointment_services?: {
    services?: { name: string; category?: string | null };
  }[];
};

export type AppointmentRange = {
  from?: string;
  to?: string;
};

type CacheEntry = {
  data: AdminAppointment[];
  fetchedAt: number;
};

const CACHE_TTL = 30_000;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<AdminAppointment[]>>();

export const clearAppointmentsCache = () => {
  cache.clear();
};

const patchCachedAppointments = (
  id: string,
  patch: Partial<AdminAppointment>
) => {
  cache.forEach((entry, key) => {
    if (entry.data.some((appointment) => appointment.id === id)) {
      cache.set(key, {
        ...entry,
        data: entry.data.map((appointment) =>
          appointment.id === id ? { ...appointment, ...patch } : appointment
        ),
      });
    }
  });
};

const removeCachedAppointment = (id: string) => {
  cache.forEach((entry, key) => {
    if (entry.data.some((appointment) => appointment.id === id)) {
      cache.set(key, {
        ...entry,
        data: entry.data.filter((appointment) => appointment.id !== id),
      });
    }
  });
};

export const useAdminAppointments = (range?: AppointmentRange) => {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const userId = user?.id;
  const from = range?.from;
  const to = range?.to;
  const staffBarberId =
    typeof window !== 'undefined' ? localStorage.getItem('staff_barber_id') : null;
  const scopeKey = `${userId ?? 'guest'}:${isAdmin ? 'admin' : 'staff'}:${
    isAdmin ? '' : staffBarberId ?? ''
  }:${from ?? ''}:${to ?? ''}`;

  const [appointments, setAppointments] = useState<AdminAppointment[]>(
    () => cache.get(scopeKey)?.data ?? []
  );
  const [loading, setLoading] = useState(() => !cache.has(scopeKey));
  const [error, setError] = useState<string | null>(null);
  const currentScopeRef = useRef(scopeKey);
  currentScopeRef.current = scopeKey;

  useEffect(() => {
    const cached = cache.get(scopeKey);
    setAppointments(cached?.data ?? []);
    setLoading(!cached);
    setError(null);
  }, [scopeKey]);

  const fetchAppointments = useCallback(
    async (force = false) => {
      if (authLoading) return;

      if (!userId) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      const cached = cache.get(scopeKey);
      if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        setAppointments(cached.data);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      let requestPromise: Promise<AdminAppointment[]> | null = null;

      try {
        requestPromise = inFlight.get(scopeKey) ?? null;

        if (!requestPromise) {
          requestPromise = (async () => {
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

            if (from) query = query.gte('appointment_date', from);
            if (to) query = query.lte('appointment_date', to);

            if (!isAdmin) {
              if (!staffBarberId) return [];
              query = query.eq('barber_id', staffBarberId);
            }

            const { data, error: queryError } = await query;

            if (queryError) throw queryError;
            return (data ?? []) as AdminAppointment[];
          })();

          inFlight.set(scopeKey, requestPromise);
        }

        const data = await requestPromise;

        if (currentScopeRef.current !== scopeKey) return;

        cache.set(scopeKey, { data, fetchedAt: Date.now() });
        setAppointments(data);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        if (currentScopeRef.current === scopeKey) {
          setError('Randevular yüklenemedi. Lütfen tekrar deneyin.');
        }
      } finally {
        if (requestPromise && inFlight.get(scopeKey) === requestPromise) {
          inFlight.delete(scopeKey);
        }
        if (currentScopeRef.current === scopeKey) {
          setLoading(false);
        }
      }
    },
    [authLoading, from, isAdmin, scopeKey, staffBarberId, to, userId]
  );

  useEffect(() => {
    if (!authLoading) {
      void fetchAppointments(false);
    }
  }, [authLoading, fetchAppointments]);

  const refresh = useCallback(() => fetchAppointments(true), [fetchAppointments]);

  const updateStatus = async (
    id: string,
    newStatus: string,
    extra?: { cancel_reason?: string | null; no_show?: boolean }
  ): Promise<boolean> => {
    try {
      const update = { status: newStatus, ...extra };
      let applied: Partial<AdminAppointment> = update;

      const { error: updateError } = await supabase
        .from('appointments')
        .update(update)
        .eq('id', id);

      if (updateError && extra) {
        // Eski şemada cancel_reason/no_show yoksa sadece durumu güncelle.
        const { error: fallbackError } = await supabase
          .from('appointments')
          .update({ status: newStatus })
          .eq('id', id);

        if (fallbackError) throw fallbackError;
        applied = { status: newStatus };
      } else if (updateError) {
        throw updateError;
      }

      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === id ? { ...appointment, ...applied } : appointment
        )
      );
      patchCachedAppointments(id, applied);
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
      removeCachedAppointment(id);
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
    refresh,
  };
};
