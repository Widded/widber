import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Service, Barber } from '../context/BookingContext';

type PublicData = {
  services: Service[];
  barbers: Barber[];
  workingHours: string[];
};

const FALLBACK_WORKING_HOURS = [
  '10:00',
  '10:45',
  '11:30',
  '12:15',
  '13:00',
  '13:45',
  '14:30',
  '15:15',
  '16:00',
  '16:45',
  '17:30',
  '18:15',
  '19:00',
  '19:45',
  '20:30',
  '21:15',
  '22:00',
  '22:45',
  '23:30',
  '00:00',
];

// Birden fazla bileşen aynı anda bu veriyi isterse tek istek paylaşılır.
let inFlightRequest: Promise<PublicData> | null = null;
let cachedData: PublicData | null = null;
let cachedAt = 0;
const CACHE_TTL = 15000;

const getCachedData = () =>
  cachedData && Date.now() - cachedAt < CACHE_TTL ? cachedData : null;

const loadPublicData = () => {
  const cached = getCachedData();
  if (cached) return Promise.resolve(cached);
  if (inFlightRequest) return inFlightRequest;

  const request = (async (): Promise<PublicData> => {
    const [servicesResult, barbersResult, settingsResult] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('barbers')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('settings')
        .select('*')
        .eq('key', 'working_hours')
        .maybeSingle(),
    ]);

    if (servicesResult.error) throw servicesResult.error;
    if (barbersResult.error) throw barbersResult.error;
    if (
      settingsResult.error &&
      settingsResult.error.code !== 'PGRST116'
    ) {
      throw settingsResult.error;
    }

    const data = {
      services: (servicesResult.data as Service[]) ?? [],
      barbers: (barbersResult.data as Barber[]) ?? [],
      workingHours:
        (settingsResult.data?.value as string[] | undefined) ??
        FALLBACK_WORKING_HOURS,
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
  const [workingHours, setWorkingHours] = useState<string[]>(
    initialData?.workingHours ?? []
  );
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (authLoading) return;

    const cached = getCachedData();
    if (cached) {
      setServices(cached.services);
      setBarbers(cached.barbers);
      setWorkingHours(cached.workingHours);
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
        setWorkingHours(data.workingHours);
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

  return { services, barbers, workingHours, loading };
};
