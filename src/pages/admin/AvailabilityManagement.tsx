import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Lock,
  Save,
  Settings2,
  Unlock,
  Users,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { format, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import {
  EmptyPanel,
  PageHeader,
  Panel,
  primaryButton,
  secondaryButton,
} from '../../components/admin/editorial';
import { getBookingDates, getFirstBookingDate } from '../../lib/bookingDates';
import { invalidatePublicDataCache } from '../../hooks/useSupabaseData';
import { useSiteSettings } from '../../hooks/useSiteSettings';

interface BlockedTime {
  id: string;
  barber_id: string;
  blocked_date: string;
  blocked_time: string;
}

const getInitials = (name?: string) =>
  (name || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'P';

const groupSlots = (slots: string[]) => ({
  morning: slots.filter((time) => Number(time.split(':')[0]) < 12),
  afternoon: slots.filter((time) => {
    const hour = Number(time.split(':')[0]);
    return hour >= 12 && hour < 17;
  }),
  evening: slots.filter((time) => Number(time.split(':')[0]) >= 17),
});

const AvailabilityManagement = () => {
  const { staffBarber, isAdmin } = useAuth();
  const { barbers, loading: initialLoading } = useSupabaseData();

  const [activeTab, setActiveTab] = useState<'permanent' | 'exception'>('permanent');
  const [loading, setLoading] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [localBlockedTimes, setLocalBlockedTimes] = useState<string[]>([]);
  const { settings } = useSiteSettings();
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    getFirstBookingDate({
      booking_window_days: settings.booking_window_days,
      closed_weekdays: settings.closed_weekdays,
      same_day_booking: settings.same_day_booking,
      special_dates: settings.special_dates,
    })
  );
  const [permanentHours, setPermanentHours] = useState<string[]>([]);
  const [slotInterval, setSlotInterval] = useState<number>(30);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'success' | 'danger' | 'warning';
    title: string;
    desc: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    desc: '',
  });

  const activeBarberId = isAdmin ? selectedBarberId : staffBarber?.id;
  const activeBarber = barbers.find((barber) => barber.id === activeBarberId);

  const allTimeSlots = useMemo(() => {
    const slots = [];
    let currentMinutes = 8 * 60;

    while (currentMinutes <= 23 * 60 + 59) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      currentMinutes += slotInterval;
    }

    return slots;
  }, [slotInterval]);

  const permanentGroups = groupSlots(allTimeSlots);
  const exceptionGroups = groupSlots(permanentHours);

  const availableDates = useMemo(
    () =>
      getBookingDates({
        booking_window_days: settings.booking_window_days,
        closed_weekdays: settings.closed_weekdays,
        same_day_booking: settings.same_day_booking,
        special_dates: settings.special_dates,
      }),
    [
      settings.booking_window_days,
      settings.closed_weekdays,
      settings.same_day_booking,
      settings.special_dates,
    ]
  );

  useEffect(() => {
    if (isAdmin && barbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [isAdmin, barbers, selectedBarberId]);

  useEffect(() => {
    if (availableDates.length === 0) return;

    if (!availableDates.some((day) => isSameDay(day, selectedDate))) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    void fetchPermanentHours();
  }, [activeBarberId]);

  useEffect(() => {
    if (activeTab === 'exception') {
      void fetchBlockedTimes();
    }
  }, [activeBarberId, selectedDate, activeTab]);

  const fetchPermanentHours = async () => {
    if (!activeBarberId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('working_hours')
        .eq('id', activeBarberId)
        .single();

      if (error) throw error;
      setPermanentHours(data.working_hours || []);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedTimes = async () => {
    if (!activeBarberId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('barber_blocked_times')
        .select('*')
        .eq('barber_id', activeBarberId)
        .eq('blocked_date', format(selectedDate, 'yyyy-MM-dd'));

      if (error) throw error;
      setBlockedTimes(data || []);
      setLocalBlockedTimes((data || []).map((item) => item.blocked_time));
      setHasChanges(false);
    } catch (err) {
      console.error('Kapalı saatler çekilirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermanentSlot = (time: string) => {
    setPermanentHours((prev) => {
      if (prev.includes(time)) return prev.filter((value) => value !== time);
      return [...prev, time].sort();
    });
    setHasChanges(true);
  };

  const toggleExceptionSlot = (time: string) => {
    setLocalBlockedTimes((prev) => {
      if (prev.includes(time)) return prev.filter((value) => value !== time);
      return [...prev, time];
    });
    setHasChanges(true);
  };

  const savePermanentHours = async () => {
    if (!activeBarberId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.rpc('update_barber_working_hours', {
        p_barber_id: activeBarberId,
        p_hours: permanentHours,
      });

      if (error) {
        if (!isAdmin) throw error;

        const { error: directError } = await supabase
          .from('barbers')
          .update({ working_hours: permanentHours })
          .eq('id', activeBarberId);

        if (directError) throw directError;
      }

      setHasChanges(false);
      invalidatePublicDataCache();
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Başarılı',
        desc: 'Kalıcı mesai saatleriniz güncellendi.',
      });
    } catch (err) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: 'danger',
        title: 'Hata',
        desc: 'İşlem sırasında bir hata oluştu.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveExceptionHours = async () => {
    if (!activeBarberId) return;
    setIsSaving(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const originalTimes = blockedTimes.map((item) => item.blocked_time);
    const toAdd = localBlockedTimes.filter((time) => !originalTimes.includes(time));
    const toDeleteIds = blockedTimes
      .filter((item) => !localBlockedTimes.includes(item.blocked_time))
      .map((item) => item.id);

    try {
      if (toDeleteIds.length > 0) {
        const { error } = await supabase
          .from('barber_blocked_times')
          .delete()
          .in('id', toDeleteIds);
        if (error) throw error;
      }

      if (toAdd.length > 0) {
        const { error } = await supabase.from('barber_blocked_times').insert(
          toAdd.map((time) => ({
            barber_id: activeBarberId,
            blocked_date: dateStr,
            blocked_time: time,
          }))
        );
        if (error) throw error;
      }

      await fetchBlockedTimes();
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Başarılı',
        desc: 'İstisnai mola saatleri güncellendi.',
      });
    } catch (err) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: 'danger',
        title: 'Hata',
        desc: 'İşlem sırasında bir hata oluştu.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSlotGroup = (
    label: string,
    slots: string[],
    selectedSlots: string[],
    onToggle: (time: string) => void,
    variant: 'permanent' | 'exception'
  ) => {
    if (slots.length === 0) return null;

    return (
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#2563EB]/80">
          {label}
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {slots.map((time) => {
            const selected = selectedSlots.includes(time);

            return (
              <button
                key={time}
                type="button"
                onClick={() => onToggle(time)}
                aria-pressed={selected}
                className={cn(
                  'flex h-9 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-all',
                  selected
                    ? variant === 'permanent'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-red-200 bg-red-50 text-red-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                )}
              >
                {selected && variant === 'permanent' && (
                  <Check className="h-3 w-3" aria-hidden="true" />
                )}
                {time}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="relative">
        <div className="space-y-4">
          <div className="h-20 w-72 animate-pulse rounded-2xl bg-[#FFFFFF]/70" />
          <div className="h-[420px] animate-pulse rounded-xl bg-[#FFFFFF]/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-16 md:pb-0">
      <div className="relative space-y-5">
        <PageHeader
          eyebrow="Ayarlar"
          title="Müsaitlik"
          subtitle="Sabit mesai saatlerini ve özel gün izinlerini tek ekrandan yönet."
          actions={
            <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 text-[10px] font-semibold text-[#475569]">
              <Clock3 className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
              {permanentHours.length} saat tanımlı
            </span>
          }
        />

        {isAdmin && (
          <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                <Users className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                Personel
              </span>
              <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => {
                      setSelectedBarberId(barber.id);
                      setHasChanges(false);
                    }}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors',
                      selectedBarberId === barber.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[8px]',
                        selectedBarberId === barber.id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {getInitials(barber.name)}
                    </span>
                    {barber.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('permanent');
              setHasChanges(false);
            }}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors',
              activeTab === 'permanent'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Kalıcı saatler
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('exception');
              setHasChanges(false);
            }}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors',
              activeTab === 'exception'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            Özel izin / mola
          </button>
        </div>

        {activeTab === 'permanent' && (
          <div className="grid gap-4 xl:grid-cols-12">
            <Panel
              title="Haftalık mesai"
              subtitle="Tüm günler için geçerli varsayılan çalışma saatleri"
              icon={Clock3}
              action={
                <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[9px] font-bold text-[#2563EB]">
                  {permanentHours.length} seçili
                </span>
              }
              className="xl:col-span-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#64748B]">Aralık</span>
                  <select
                    value={slotInterval}
                    onChange={(event) => setSlotInterval(Number(event.target.value))}
                    className="h-9 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 text-xs font-semibold text-[#475569] outline-none focus:border-[#2563EB]"
                  >
                    <option value={15}>15 dakika</option>
                    <option value={20}>20 dakika</option>
                    <option value={30}>30 dakika</option>
                    <option value={45}>45 dakika</option>
                    <option value={60}>60 dakika</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPermanentHours(allTimeSlots);
                      setHasChanges(true);
                    }}
                    className={secondaryButton}
                  >
                    Tümünü seç
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPermanentHours([]);
                      setHasChanges(true);
                    }}
                    className={secondaryButton}
                  >
                    Temizle
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-14">
                  <Loader2 className="h-7 w-7 animate-spin text-[#2563EB]" />
                </div>
              ) : !activeBarberId ? (
                <EmptyPanel
                  icon={Users}
                  title="Personel seçimi yok"
                  text="Mesai saatlerini düzenlemek için önce bir personel seçin."
                />
              ) : (
                <div className="mt-5 space-y-6">
                  {renderSlotGroup(
                    'Sabah',
                    permanentGroups.morning,
                    permanentHours,
                    togglePermanentSlot,
                    'permanent'
                  )}
                  {renderSlotGroup(
                    'Öğleden sonra',
                    permanentGroups.afternoon,
                    permanentHours,
                    togglePermanentSlot,
                    'permanent'
                  )}
                  {renderSlotGroup(
                    'Akşam',
                    permanentGroups.evening,
                    permanentHours,
                    togglePermanentSlot,
                    'permanent'
                  )}

                  <div className="flex justify-end border-t border-[#F1F5F9] pt-4">
                    <button
                      type="button"
                      onClick={() => void savePermanentHours()}
                      disabled={!hasChanges || isSaving}
                      className={primaryButton}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      Mesai programını kaydet
                    </button>
                  </div>
                </div>
              )}
            </Panel>

            <aside className="space-y-4 xl:col-span-4">
              <Panel title="Özet" subtitle="Seçili personel" icon={Users}>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8FAFC] font-bold text-lg text-[#2563EB]">
                    {getInitials(activeBarber?.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {activeBarber?.name || 'Seçim bekleniyor'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#64748B]">
                      {permanentHours.length} aktif saat · {slotInterval} dk aralık
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                    Çalışma penceresi
                  </p>
                  <p className="mt-1 font-bold text-2xl leading-none text-[#0F172A]">
                    {permanentHours.length > 0
                      ? `${permanentHours[0]} – ${
                          permanentHours[permanentHours.length - 1]
                        }`
                      : 'Tanımsız'}
                  </p>
                </div>

                <p className="mt-4 text-[10px] leading-relaxed text-[#64748B]">
                  Burada seçtiğin saatler tüm günler için geçerlidir. Özel izin veya
                  mola için “Özel izin / mola” sekmesini kullan.
                </p>
              </Panel>

              <Panel title="Nasıl çalışır?" icon={CalendarClock} className="hidden lg:block">
                <ol className="space-y-3 text-[10px] leading-relaxed text-[#64748B]">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]">
                      1
                    </span>
                    Çalışmak istediğin saatleri seç.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]">
                      2
                    </span>
                    Kaydet butonuyla programa işle.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]">
                      3
                    </span>
                    Belirli bir gün için mola vermek üzere diğer sekmeye geç.
                  </li>
                </ol>
              </Panel>
            </aside>
          </div>
        )}

        {activeTab === 'exception' && (
          <div className="space-y-4">
            <Panel
              title="Tarih seç"
              subtitle="Bugün + 7 gün · Pazar kapalı"
              icon={CalendarDays}
            >
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {availableDates.map((day) => {
                  const selected = isSameDay(day, selectedDate);
                  const today = isSameDay(day, new Date());

                  return (
                    <button
                      key={format(day, 'yyyy-MM-dd')}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day);
                        setHasChanges(false);
                      }}
                      className={cn(
                        'flex min-w-0 flex-col items-center rounded-xl border px-2 py-2.5 transition-colors',
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : today
                            ? 'border-blue-200 bg-blue-50 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[8px] font-bold uppercase tracking-[0.1em]',
                          selected ? 'text-blue-100' : 'text-slate-400'
                        )}
                      >
                        {format(day, 'EEE', { locale: tr })}
                      </span>
                      <span
                        className={cn(
                          'mt-1 text-2xl font-bold leading-none',
                          selected ? 'text-white' : 'text-slate-900'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 text-[8px] font-semibold uppercase',
                          selected ? 'text-blue-100' : 'text-slate-400'
                        )}
                      >
                        {format(day, 'MMM', { locale: tr })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-12">
              <Panel
                title={format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                subtitle="Kapalı saatleri kırmızı olarak işaretle"
                icon={Clock3}
                className="xl:col-span-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] text-[#64748B]">
                    {localBlockedTimes.length} saat kapalı
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLocalBlockedTimes([]);
                        setHasChanges(true);
                      }}
                      className={secondaryButton}
                    >
                      <Unlock className="h-4 w-4" aria-hidden="true" />
                      Tümünü aç
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalBlockedTimes([...permanentHours]);
                        setHasChanges(true);
                      }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 text-xs font-semibold text-[#DC2626] transition-colors hover:bg-[#FBE4DC]"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Tüm günü kapat
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-14">
                    <Loader2 className="h-7 w-7 animate-spin text-[#2563EB]" />
                  </div>
                ) : permanentHours.length === 0 ? (
                  <EmptyPanel
                    icon={Clock3}
                    title="Önce mesai saatleri gerekli"
                    text="Özel izin tanımlamak için önce Kalıcı saatler sekmesinden çalışma saatlerini belirle."
                    action={
                      <button
                        type="button"
                        onClick={() => setActiveTab('permanent')}
                        className={secondaryButton}
                      >
                        Kalıcı saatlere dön
                      </button>
                    }
                  />
                ) : (
                  <div className="mt-5 space-y-6">
                    {renderSlotGroup(
                      'Sabah',
                      exceptionGroups.morning,
                      localBlockedTimes,
                      toggleExceptionSlot,
                      'exception'
                    )}
                    {renderSlotGroup(
                      'Öğleden sonra',
                      exceptionGroups.afternoon,
                      localBlockedTimes,
                      toggleExceptionSlot,
                      'exception'
                    )}
                    {renderSlotGroup(
                      'Akşam',
                      exceptionGroups.evening,
                      localBlockedTimes,
                      toggleExceptionSlot,
                      'exception'
                    )}

                    <div className="flex justify-end border-t border-[#F1F5F9] pt-4">
                      <button
                        type="button"
                        onClick={() => void saveExceptionHours()}
                        disabled={!hasChanges || isSaving}
                        className={primaryButton}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="h-4 w-4" aria-hidden="true" />
                        )}
                        Mola / izinleri kaydet
                      </button>
                    </div>
                  </div>
                )}
              </Panel>

              <aside className="space-y-4 xl:col-span-4">
                <Panel title="Günün durumu" subtitle={format(selectedDate, 'd MMMM', { locale: tr })} icon={CalendarDays}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#ECFDF5] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#059669]/70">
                        Açık
                      </p>
                      <p className="mt-1 font-bold text-2xl leading-none text-[#059669]">
                        {Math.max(0, permanentHours.length - localBlockedTimes.length)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#FEF2F2] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#DC2626]/70">
                        Kapalı
                      </p>
                      <p className="mt-1 font-bold text-2xl leading-none text-[#DC2626]">
                        {localBlockedTimes.length}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] leading-relaxed text-[#64748B]">
                    Kırmızı işaretli saatler o gün için randevuya kapatılır. Kaydetmeyi
                    unutma.
                  </p>
                </Panel>

                <Panel title="Aktif personel" subtitle="Program sahibi" icon={Users}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8FAFC] font-bold text-base text-[#2563EB]">
                      {getInitials(activeBarber?.name)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {activeBarber?.name || 'Seçim bekleniyor'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#64748B]">
                        {permanentHours.length} saatlik program
                      </p>
                    </div>
                  </div>
                </Panel>
              </aside>
            </div>
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="fixed inset-x-4 bottom-24 z-40 md:hidden">
          <button
            type="button"
            onClick={
              activeTab === 'permanent'
                ? () => void savePermanentHours()
                : () => void saveExceptionHours()
            }
            disabled={isSaving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Değişiklikleri kaydet
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        description={modalConfig.desc}
        type={modalConfig.type}
        confirmText="Tamam"
        cancelText=""
      />
    </div>
  );
};

export default AvailabilityManagement;
