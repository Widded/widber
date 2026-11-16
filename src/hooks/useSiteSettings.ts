import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SiteSettings = {
  id: number;
  business_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  maps_url: string;
  instagram_url: string;
  hero_badge: string;
  hero_title: string;
  hero_highlight: string;
  hero_subtitle: string;
  working_hours_text: string;
  closed_days_text: string;
  logo_url: string;
  hero_image_url: string;
  booking_window_days: number;
  closed_weekdays: number[];
  same_day_booking: boolean;
  min_notice_minutes: number;
  cancellation_policy: string;
  maintenance_mode: boolean;
  booking_paused: boolean;
  updated_at?: string;
  updated_by?: string | null;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  business_name: 'WidBer',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  maps_url: '',
  instagram_url: '',
  hero_badge: 'Online randevu',
  hero_title: 'Berber randevunu saniyeler içinde al.',
  hero_highlight: 'saniyeler içinde',
  hero_subtitle:
    'Hizmetini seç, ustanı belirle, sana uygun saati ayır. Sıra beklemeden gel.',
  working_hours_text: 'Pzt-Cmt 10:00-22:00',
  closed_days_text: 'Pazar kapalı',
  logo_url: '',
  hero_image_url: '',
  booking_window_days: 7,
  closed_weekdays: [0],
  same_day_booking: true,
  min_notice_minutes: 0,
  cancellation_policy: '',
  maintenance_mode: false,
  booking_paused: false,
};

const CACHE_TTL = 5 * 60 * 1000;
let cachedSettings: { data: SiteSettings; fetchedAt: number } | null = null;
let inFlightRequest: Promise<SiteSettings> | null = null;

export const invalidateSiteSettingsCache = () => {
  cachedSettings = null;
};

const getCachedSettings = () =>
  cachedSettings && Date.now() - cachedSettings.fetchedAt < CACHE_TTL
    ? cachedSettings.data
    : null;

const loadSiteSettings = (): Promise<SiteSettings> => {
  const cached = getCachedSettings();
  if (cached) return Promise.resolve(cached);
  if (inFlightRequest) return inFlightRequest;

  const request = (async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const settings: SiteSettings = {
      ...DEFAULT_SITE_SETTINGS,
      ...(data ?? {}),
      closed_weekdays: Array.isArray(data?.closed_weekdays)
        ? data.closed_weekdays.map(Number)
        : DEFAULT_SITE_SETTINGS.closed_weekdays,
    };

    cachedSettings = { data: settings, fetchedAt: Date.now() };
    return settings;
  })();

  inFlightRequest = request.finally(() => {
    inFlightRequest = null;
  });

  return inFlightRequest;
};

export const useSiteSettings = () => {
  const initial = getCachedSettings();
  const [settings, setSettings] = useState<SiteSettings>(
    initial ?? DEFAULT_SITE_SETTINGS
  );
  const [loading, setLoading] = useState(!initial);

  const fetchSettings = useCallback(async () => {
    setLoading(true);

    try {
      const data = await loadSiteSettings();
      setSettings(data);
    } catch (error) {
      console.error('Site ayarları yüklenemedi:', error);
      setSettings(DEFAULT_SITE_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();

    const handleSettingsUpdated = () => {
      invalidateSiteSettingsCache();
      void fetchSettings();
    };

    window.addEventListener('widber:settings-updated', handleSettingsUpdated);

    return () => {
      window.removeEventListener('widber:settings-updated', handleSettingsUpdated);
    };
  }, [fetchSettings]);

  return { settings, loading, refresh: fetchSettings };
};
