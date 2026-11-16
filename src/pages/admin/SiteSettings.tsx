import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Building2,
  CalendarClock,
  ImagePlus,
  Loader2,
  Megaphone,
  Palette,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { PageHeader, primaryButton, secondaryButton } from '../../components/admin/editorial';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/toast';
import {
  DEFAULT_SITE_SETTINGS,
  invalidateSiteSettingsCache,
  useSiteSettings,
  type SiteSettings,
} from '../../hooks/useSiteSettings';
import { supabase } from '../../lib/supabase';
import type { SpecialDate } from '../../lib/specialDates';
import { cn } from '../../lib/utils';

type Tab = 'business' | 'appearance' | 'booking' | 'system';

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const textareaClass =
  'min-h-[96px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const weekdayOptions = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Çar' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 0, label: 'Paz' },
];

const editableKeys: (keyof SiteSettings)[] = [
  'business_name',
  'phone',
  'whatsapp',
  'email',
  'address',
  'maps_url',
  'instagram_url',
  'hero_badge',
  'hero_title',
  'hero_highlight',
  'hero_subtitle',
  'working_hours_text',
  'closed_days_text',
  'logo_url',
  'hero_image_url',
  'booking_window_days',
  'closed_weekdays',
  'same_day_booking',
  'min_notice_minutes',
  'cancellation_policy',
  'special_dates',
  'announcement_enabled',
  'announcement_text',
  'announcement_link_label',
  'announcement_link_url',
  'maintenance_mode',
  'booking_paused',
];

const toDbPayload = (settings: SiteSettings) => ({
  business_name: settings.business_name,
  phone: settings.phone,
  whatsapp: settings.whatsapp,
  email: settings.email,
  address: settings.address,
  maps_url: settings.maps_url,
  instagram_url: settings.instagram_url,
  hero_badge: settings.hero_badge,
  hero_title: settings.hero_title,
  hero_highlight: settings.hero_highlight,
  hero_subtitle: settings.hero_subtitle,
  working_hours_text: settings.working_hours_text,
  closed_days_text: settings.closed_days_text,
  logo_url: settings.logo_url,
  hero_image_url: settings.hero_image_url,
  booking_window_days: settings.booking_window_days,
  closed_weekdays: settings.closed_weekdays,
  same_day_booking: settings.same_day_booking,
  min_notice_minutes: settings.min_notice_minutes,
  cancellation_policy: settings.cancellation_policy,
  special_dates: settings.special_dates,
  announcement_enabled: settings.announcement_enabled,
  announcement_text: settings.announcement_text,
  announcement_link_label: settings.announcement_link_label,
  announcement_link_url: settings.announcement_link_url,
  maintenance_mode: settings.maintenance_mode,
  booking_paused: settings.booking_paused,
});

const Field = ({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <p className="text-xs font-medium text-slate-600">{label}</p>
    {hint && <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{hint}</p>}
    <div className="mt-1.5">{children}</div>
  </div>
);

const Toggle = ({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3.5">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-blue-600' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  </div>
);

const SiteSettingsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { settings, loading, refresh } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<Tab>('business');
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [saved, setSaved] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo_url' | 'hero_image_url' | null>(null);
  const [newSpecial, setNewSpecial] = useState<{
    date: string;
    mode: 'closed' | 'custom';
    open_time: string;
    close_time: string;
    note: string;
  }>({
    date: '',
    mode: 'closed',
    open_time: '10:00',
    close_time: '18:00',
    note: '',
  });

  useEffect(() => {
    if (loading || initialized) return;
    setForm(settings);
    setSaved(settings);
    setInitialized(true);
  }, [loading, initialized, settings]);

  const isDirty = useMemo(
    () =>
      editableKeys.some(
        (key) => JSON.stringify(form[key]) !== JSON.stringify(saved[key])
      ),
    [form, saved]
  );

  const setField = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggleClosedDay = (day: number) => {
    setForm((previous) => {
      const exists = previous.closed_weekdays.includes(day);
      return {
        ...previous,
        closed_weekdays: exists
          ? previous.closed_weekdays.filter((value) => value !== day)
          : [...previous.closed_weekdays, day],
      };
    });
  };

  const addSpecialDate = () => {
    if (!newSpecial.date) {
      showToast({ message: 'Özel gün için tarih seçin.', variant: 'error' });
      return;
    }

    if (form.special_dates.some((entry) => entry.date === newSpecial.date)) {
      showToast({ message: 'Bu tarih zaten listede.', variant: 'error' });
      return;
    }

    if (
      newSpecial.mode === 'custom' &&
      (!newSpecial.open_time ||
        !newSpecial.close_time ||
        newSpecial.close_time <= newSpecial.open_time)
    ) {
      showToast({ message: 'Kapanış saati açılıştan sonra olmalı.', variant: 'error' });
      return;
    }

    const entry: SpecialDate = {
      date: newSpecial.date,
      closed: newSpecial.mode === 'closed',
      open_time: newSpecial.mode === 'custom' ? newSpecial.open_time : undefined,
      close_time: newSpecial.mode === 'custom' ? newSpecial.close_time : undefined,
      note: newSpecial.note.trim() || undefined,
    };

    setForm((previous) => ({
      ...previous,
      special_dates: [...previous.special_dates, entry].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    }));

    setNewSpecial((previous) => ({
      ...previous,
      date: '',
      note: '',
    }));
  };

  const removeSpecialDate = (date: string) => {
    setForm((previous) => ({
      ...previous,
      special_dates: previous.special_dates.filter((entry) => entry.date !== date),
    }));
  };

  const uploadImage = async (
    file: File,
    field: 'logo_url' | 'hero_image_url'
  ) => {
    if (!file.type.startsWith('image/')) {
      showToast({ message: 'Lütfen bir görsel dosyası seçin.', variant: 'error' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast({ message: 'Görsel en fazla 2 MB olabilir.', variant: 'error' });
      return;
    }

    setUploading(field);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${field}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;

      const { error } = await supabase.storage
        .from('site-assets')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
      setField(field, data.publicUrl);
      showToast({ message: 'Görsel yüklendi. Kaydetmeyi unutma.' });
    } catch (error) {
      console.error('Görsel yüklenemedi:', error);
      showToast({ message: 'Görsel yüklenemedi. Lütfen tekrar deneyin.', variant: 'error' });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      showToast({ message: 'İşletme adı boş olamaz.', variant: 'error' });
      return;
    }

    if (form.booking_window_days < 1 || form.booking_window_days > 60) {
      showToast({ message: 'Randevu penceresi 1–60 gün arasında olmalı.', variant: 'error' });
      return;
    }

    if (form.min_notice_minutes < 0 || form.min_notice_minutes > 1440) {
      showToast({ message: 'Minimum ön süre 0–1440 dakika arasında olmalı.', variant: 'error' });
      return;
    }

    if (form.closed_weekdays.length >= 7) {
      showToast({ message: 'En az bir gün açık olmalı.', variant: 'error' });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          ...toDbPayload(form),
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq('id', 1);

      if (error) throw error;

      invalidateSiteSettingsCache();
      setSaved(form);
      window.dispatchEvent(new Event('widber:settings-updated'));
      void refresh();
      showToast({ message: 'Site ayarları kaydedildi.' });
    } catch (error) {
      console.error('Site ayarları kaydedilemedi:', error);
      showToast({ message: 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'business', label: 'İşletme', icon: Building2 },
    { id: 'appearance', label: 'Anasayfa', icon: Palette },
    { id: 'booking', label: 'Randevu', icon: CalendarClock },
    { id: 'system', label: 'Sistem', icon: ShieldAlert },
  ];

  const imageUploader = (
    field: 'logo_url' | 'hero_image_url',
    label: string,
    previewClassName: string
  ) => (
    <Field label={label} hint="PNG / JPG / WEBP · en fazla 2 MB">
      <div className="flex flex-wrap items-center gap-3">
        {form[field] ? (
          <img
            src={form[field]}
            alt=""
            className={cn('rounded-lg border border-slate-200 bg-slate-50 object-contain p-1', previewClassName)}
          />
        ) : (
          <span className="flex h-12 w-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </span>
        )}

        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
          {uploading === field ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          )}
          Görsel yükle
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file, field);
              event.target.value = '';
            }}
          />
        </label>

        {form[field] && (
          <button
            type="button"
            onClick={() => setField(field, '')}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Kaldır
          </button>
        )}
      </div>

      <input
        value={form[field]}
        onChange={(event) => setField(field, event.target.value)}
        placeholder="veya görsel URL'si yapıştır"
        className={cn(inputClass, 'mt-2 text-xs')}
      />
    </Field>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Yönetim"
        title="Site Ayarları"
        subtitle="İşletme bilgilerini, anasayfayı ve randevu kurallarını buradan yönet."
        actions={
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className={primaryButton}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Kaydet
          </button>
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors',
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'business' && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="İşletme adı">
              <input
                value={form.business_name}
                onChange={(event) => setField('business_name', event.target.value)}
                className={inputClass}
                placeholder="WidBer"
              />
            </Field>
            <Field label="Telefon">
              <input
                value={form.phone}
                onChange={(event) => setField('phone', event.target.value)}
                className={inputClass}
                placeholder="05XX XXX XX XX"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={form.whatsapp}
                onChange={(event) => setField('whatsapp', event.target.value)}
                className={inputClass}
                placeholder="05XX XXX XX XX"
              />
            </Field>
            <Field label="E-posta">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
                className={inputClass}
                placeholder="ornek@isletme.com"
              />
            </Field>
          </div>

          <Field label="Adres">
            <input
              value={form.address}
              onChange={(event) => setField('address', event.target.value)}
              className={inputClass}
              placeholder="Mahalle, sokak, no, ilçe / şehir"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Google Maps linki">
              <input
                value={form.maps_url}
                onChange={(event) => setField('maps_url', event.target.value)}
                className={inputClass}
                placeholder="https://maps.google.com/..."
              />
            </Field>
            <Field label="Instagram linki">
              <input
                value={form.instagram_url}
                onChange={(event) => setField('instagram_url', event.target.value)}
                className={inputClass}
                placeholder="https://instagram.com/..."
              />
            </Field>
          </div>
        </section>
      )}

      {activeTab === 'appearance' && (
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Üst etiket" hint="Hero bölümündeki küçük mavi etiket">
              <input
                value={form.hero_badge}
                onChange={(event) => setField('hero_badge', event.target.value)}
                className={inputClass}
                placeholder="Online randevu"
              />
            </Field>
            <Field label="Vurgulu kelime" hint="Başlıkta mavi gösterilecek kısım">
              <input
                value={form.hero_highlight}
                onChange={(event) => setField('hero_highlight', event.target.value)}
                className={inputClass}
                placeholder="saniyeler içinde"
              />
            </Field>
          </div>

          <Field label="Anasayfa başlığı">
            <input
              value={form.hero_title}
              onChange={(event) => setField('hero_title', event.target.value)}
              className={inputClass}
              placeholder="Berber randevunu saniyeler içinde al."
            />
          </Field>

          <Field label="Anasayfa alt metni">
            <textarea
              value={form.hero_subtitle}
              onChange={(event) => setField('hero_subtitle', event.target.value)}
              className={textareaClass}
              placeholder="Hizmetini seç, ustanı belirle..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Çalışma saati metni">
              <input
                value={form.working_hours_text}
                onChange={(event) => setField('working_hours_text', event.target.value)}
                className={inputClass}
                placeholder="Pzt-Cmt 10:00-22:00"
              />
            </Field>
            <Field label="Kapalı gün metni">
              <input
                value={form.closed_days_text}
                onChange={(event) => setField('closed_days_text', event.target.value)}
                className={inputClass}
                placeholder="Pazar kapalı"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5">
            <Toggle
              checked={form.announcement_enabled}
              onChange={(checked) => setField('announcement_enabled', checked)}
              title="Anasayfa duyuru bandı"
              description="Anasayfanın en üstünde ince bir duyuru şeridi gösterir."
            />

            {form.announcement_enabled && (
              <div className="mt-4 space-y-3">
                <Field label="Duyuru metni">
                  <textarea
                    value={form.announcement_text}
                    onChange={(event) => setField('announcement_text', event.target.value)}
                    className={textareaClass}
                    placeholder="Bu hafta Salı günü kapalıyız."
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Bağlantı metni (opsiyonel)">
                    <input
                      value={form.announcement_link_label}
                      onChange={(event) =>
                        setField('announcement_link_label', event.target.value)
                      }
                      className={inputClass}
                      placeholder="Detay"
                    />
                  </Field>
                  <Field label="Bağlantı adresi (opsiyonel)">
                    <input
                      value={form.announcement_link_url}
                      onChange={(event) =>
                        setField('announcement_link_url', event.target.value)
                      }
                      className={inputClass}
                      placeholder="https://..."
                    />
                  </Field>
                </div>

                {form.announcement_text && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                    <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{form.announcement_text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {imageUploader('logo_url', 'Logo', 'h-12 w-20')}
            {imageUploader('hero_image_url', 'Kapak görseli', 'h-20 w-32')}
          </div>
        </section>
      )}

      {activeTab === 'booking' && (
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Kaç gün ileri randevu alınabilir?"
              hint="Bugün dahil, seçilen gün sayısı kadar ileri"
            >
              <input
                type="number"
                min={1}
                max={60}
                value={form.booking_window_days}
                onChange={(event) =>
                  setField('booking_window_days', Number(event.target.value))
                }
                className={inputClass}
              />
            </Field>
            <Field
              label="Minimum ön süre (dakika)"
              hint="Örn. 60: randevu en az 1 saat önceden alınabilir"
            >
              <input
                type="number"
                min={0}
                max={1440}
                value={form.min_notice_minutes}
                onChange={(event) =>
                  setField('min_notice_minutes', Number(event.target.value))
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Kapalı günler" hint="Randevu alınamayacak günleri işaretle">
            <div className="flex flex-wrap gap-2">
              {weekdayOptions.map((day) => {
                const closed = form.closed_weekdays.includes(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleClosedDay(day.value)}
                    aria-pressed={closed}
                    className={cn(
                      'inline-flex h-9 min-w-[54px] items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors',
                      closed
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Toggle
            checked={form.same_day_booking}
            onChange={(checked) => setField('same_day_booking', checked)}
            title="Aynı gün randevu"
            description="Kapalıysa bugün için randevu alınamaz; ilk gün yarın olur."
          />

          <div className="rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Özel kapanış / tatil günleri
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Belirli bir tarihte tüm günü kapat veya özel çalışma saati tanımla.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {form.special_dates.length}
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Field label="Tarih">
                <input
                  type="date"
                  value={newSpecial.date}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(event) =>
                    setNewSpecial((previous) => ({ ...previous, date: event.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Uygulama">
                <select
                  value={newSpecial.mode}
                  onChange={(event) =>
                    setNewSpecial((previous) => ({
                      ...previous,
                      mode: event.target.value as 'closed' | 'custom',
                    }))
                  }
                  className={cn(inputClass, 'appearance-none')}
                >
                  <option value="closed">Tüm gün kapalı</option>
                  <option value="custom">Özel saatler</option>
                </select>
              </Field>
            </div>

            {newSpecial.mode === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Açılış">
                  <input
                    type="time"
                    value={newSpecial.open_time}
                    onChange={(event) =>
                      setNewSpecial((previous) => ({
                        ...previous,
                        open_time: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Kapanış">
                  <input
                    type="time"
                    value={newSpecial.close_time}
                    onChange={(event) =>
                      setNewSpecial((previous) => ({
                        ...previous,
                        close_time: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={newSpecial.note}
                onChange={(event) =>
                  setNewSpecial((previous) => ({ ...previous, note: event.target.value }))
                }
                className={cn(inputClass, 'flex-1')}
                placeholder="Not (opsiyonel): Resmi tatil, bayram..."
              />
              <button
                type="button"
                onClick={addSpecialDate}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ekle
              </button>
            </div>

            {form.special_dates.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {form.special_dates.map((entry) => (
                  <div
                    key={entry.date}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {format(parseISO(entry.date), 'd MMM yyyy, EEEE', { locale: tr })}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {entry.closed
                          ? 'Tüm gün kapalı'
                          : `Özel saat: ${entry.open_time}–${entry.close_time}`}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpecialDate(entry.date)}
                      aria-label={`${entry.date} özel gününü kaldır`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="İptal politikası" hint="Randevu özetinde ve bilgilendirmede gösterilir">
            <textarea
              value={form.cancellation_policy}
              onChange={(event) => setField('cancellation_policy', event.target.value)}
              className={textareaClass}
              placeholder="Randevunuzu en az 2 saat önce iptal etmeniz rica olunur."
            />
          </Field>
        </section>
      )}

      {activeTab === 'system' && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <Toggle
            checked={form.maintenance_mode}
            onChange={(checked) => setField('maintenance_mode', checked)}
            title="Bakım modu"
            description="Site ziyaretçilere bakım ekranı gösterir. Patron paneli açık kalır."
          />
          <Toggle
            checked={form.booking_paused}
            onChange={(checked) => setField('booking_paused', checked)}
            title="Randevu alımını duraklat"
            description="Site açık kalır ama yeni randevu alınamaz. Mevcut randevular etkilenmez."
          />

          {form.maintenance_mode && (
            <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
              Bakım modu açık. Kaydettiğinde ziyaretçiler bakım ekranını görecek.
            </p>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="text-[11px] text-slate-400">
          {isDirty ? 'Kaydedilmemiş değişiklikler var.' : 'Tüm değişiklikler kaydedildi.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setForm(saved);
              showToast({ message: 'Değişiklikler geri alındı.', variant: 'info' });
            }}
            disabled={!isDirty || saving}
            className={secondaryButton}
          >
            Geri al
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className={primaryButton}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Kaydet
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="fixed inset-x-4 bottom-24 z-40 md:hidden">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Değişiklikleri kaydet
          </button>
        </div>
      )}
    </div>
  );
};

export default SiteSettingsPage;
