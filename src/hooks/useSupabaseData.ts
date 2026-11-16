import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Service, Barber } from '../context/BookingContext';

type PublicData = {
  services: Service[];
  barbers: Barber[];
};

// Birden fazla bileşen aynı anda bu veriyi isterse tek istek paylaşılır.
let inFlightRequest: Promise<PublicData> | null = null;
let cachedData: PublicData | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

const getCachedData = () =>
  cachedData && Date.now() - cachedAt < CACHE_TTL ? cachedData : null;

export const invalidatePublicDataCache = () => {
  cachedData = null;
  cachedAt = 0;
};

const loadPublicData = () => {
  const cached = getCachedData();
  if (cached) return Promise.resolve(cached);
  if (inFlightRequest) return inFlightRequest;

  const request = (async (): Promise<PublicData> => {
    const [servicesResult, barbersResult] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('barbers')
        .select('*')
        .order('created_at', { ascending: true }),
    ]);

    if (servicesResult.error) throw servicesResult.error;
    if (barbersResult.error) throw barbersResult.error;

    const data = {
      services: (servicesResult.data as Service[]) ?? [],
      barbers: (barbersResult.data as Barber[]) ?? [],
    };

    cachedData = data;
    cachedAt = Date.now();

    return data;
  })();

  inFlightRequest = request.finally(() => {
    inFlightRequest = null;
  });

  return inFlightRequest;
};

export const useSupabaseData = () => {
  const { loading: authLoading, user } = useAuth();
  const initialData = getCachedData();
  const [services, setServices] = useState<Service[]>(initialData?.services ?? []);
  const [barbers, setBarbers] = useState<Barber[]>(initialData?.barbers ?? []);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (authLoading) return;

    const cached = getCachedData();
    if (cached) {
      setServices(cached.services);
      setBarbers(cached.barbers);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    loadPublicData()
      .then((data) => {
        if (!active) return;
        setServices(data.services);
        setBarbers(data.barbers);
      })
      .catch((error) => {
        console.error('Error fetching data from Supabase:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  return { services, barbers, loading };
};
