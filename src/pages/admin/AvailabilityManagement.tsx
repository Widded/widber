import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { Loader2, Calendar as CalendarIcon, Clock, Lock, Unlock, Save, Settings2, CalendarClock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { addDays, format, isSameDay, parse, startOfDay, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface BlockedTime {
  id: string;
  barber_id: string;
  blocked_date: string;
  blocked_time: string;
}

const AvailabilityManagement = () => {
  const { staffBarber, isAdmin } = useAuth();
  const { barbers, loading: initialLoading } = useSupabaseData();
  
  const [activeTab, setActiveTab] = useState<'permanent' | 'exception'>('permanent');
  const [loading, setLoading] = useState(false);
  
  // States for 'exception' tab
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [localBlockedTimes, setLocalBlockedTimes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // States for 'permanent' tab
  const [permanentHours, setPermanentHours] = useState<string[]>([]);
  const [slotInterval, setSlotInterval] = useState<number>(30);
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'success'|'danger'|'warning', title: string, desc: string}>({
    isOpen: false, type: 'success', title: '', desc: ''
  });
  
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const activeBarberId = isAdmin ? selectedBarberId : staffBarber?.id;
  const activeBarber = barbers.find(b => b.id === activeBarberId);

  // Oluşturulabilecek tüm olası saatler
  const allTimeSlots = React.useMemo(() => {
    const slots = [];
    let currentMinutes = 8 * 60; // 08:00
    const endMinutes = 23 * 60 + 59; // 23:59
    while (currentMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      currentMinutes += slotInterval;
    }
    return slots;
  }, [slotInterval]);

  const availableDates = React.useMemo(() => {
    const dates = [];
    let currentDate = startOfDay(new Date());
    let daysAdded = 0;
    while (daysAdded < 18) {
      if (getDay(currentDate) !== 0) {
        dates.push(currentDate);
        daysAdded++;
      }
      currentDate = addDays(currentDate, 1);
    }
    return dates;
  }, []);

  useEffect(() => {
    if (isAdmin && barbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [isAdmin, barbers, selectedBarberId]);

  useEffect(() => {
    fetchPermanentHours();
  }, [activeBarberId]);

  useEffect(() => {
    if (activeTab === 'exception') {
      fetchBlockedTimes();
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
      setLocalBlockedTimes((data || []).map(b => b.blocked_time));
      setHasChanges(false);
    } catch (err) {
      console.error('Kapalı saatler çekilirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermanentSlot = (time: string) => {
    setPermanentHours(prev => {
      if (prev.includes(time)) return prev.filter(t => t !== time);
      return [...prev, time].sort();
    });
    setHasChanges(true);
  };

  const toggleExceptionSlot = (time: string) => {
    setLocalBlockedTimes(prev => {
      if (prev.includes(time)) return prev.filter(t => t !== time);
      return [...prev, time];
    });
    setHasChanges(true);
  };

  const savePermanentHours = async () => {
    if (!activeBarberId) return;
    setIsSaving(true);
    try {
      // Personel ortak Supabase hesabını kullandığı için doğrudan UPDATE yerine
      // yalnızca working_hours alanını güncelleyen RPC kullanıyoruz.
      const { error } = await supabase.rpc('update_barber_working_hours', {
        p_barber_id: activeBarberId,
        p_hours: permanentHours,
      });

      if (error) {
        // RPC henüz kurulmadıysa patron doğrudan UPDATE ile devam edebilsin.
        if (!isAdmin) throw error;

        const { error: directError } = await supabase
          .from('barbers')
          .update({ working_hours: permanentHours })
          .eq('id', activeBarberId);

        if (directError) throw directError;
      }
      
      setHasChanges(false);
      setModalConfig({ isOpen: true, type: 'success', title: 'Başarılı', desc: 'Kalıcı mesai saatleriniz güncellendi.' });
    } catch (err) {
      console.error(err);
      setModalConfig({ isOpen: true, type: 'danger', title: 'Hata', desc: 'İşlem sırasında bir hata oluştu.' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveExceptionHours = async () => {
    if (!activeBarberId) return;
    setIsSaving(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const originalTimes = blockedTimes.map(b => b.blocked_time);
    
    const toAdd = localBlockedTimes.filter(t => !originalTimes.includes(t));
    const toDeleteIds = blockedTimes.filter(b => !localBlockedTimes.includes(b.blocked_time)).map(b => b.id);

    try {
      if (toDeleteIds.length > 0) {
        const { error } = await supabase.from('barber_blocked_times').delete().in('id', toDeleteIds);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from('barber_blocked_times').insert(
          toAdd.map(time => ({ barber_id: activeBarberId, blocked_date: dateStr, blocked_time: time }))
        );
        if (error) throw error;
      }
      await fetchBlockedTimes();
      setModalConfig({ isOpen: true, type: 'success', title: 'Başarılı', desc: 'İstisnai mola saatleri güncellendi.' });
    } catch (err) {
      console.error(err);
      setModalConfig({ isOpen: true, type: 'danger', title: 'Hata', desc: 'İşlem sırasında bir hata oluştu.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brass-dark" /></div>;
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-normal tracking-tight text-ink md:text-4xl">Müsaitlik Yönetimi</h1>
          <p className="mt-1 text-sm text-ink/45">Kendi sabit mesai saatlerinizi veya istisnai gün izinlerinizi ayarlayın.</p>
        </div>
      </div>

      {isAdmin && (
        <Card className="bg-white border border-border/60 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-4">
            <Label className="mb-2 block text-sm font-semibold text-muted-foreground">İşlem Yapılacak Personel Seçin (Sadece Patrona Özel)</Label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {barbers.map(barber => (
                <Button
                  key={barber.id}
                  variant={selectedBarberId === barber.id ? 'default' : 'outline'}
                  onClick={() => { setSelectedBarberId(barber.id); setHasChanges(false); }}
                  className={cn("rounded-lg", selectedBarberId === barber.id ? "bg-ink hover:bg-ink-soft text-cream" : "")}
                >
                  {barber.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('permanent'); setHasChanges(false); }}
          className={cn("px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-all", activeTab === 'permanent' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <Settings2 className="w-4 h-4 mr-2" /> Kalıcı Saatler
        </button>
        <button
          onClick={() => { setActiveTab('exception'); setHasChanges(false); }}
          className={cn("px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-all", activeTab === 'exception' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <CalendarClock className="w-4 h-4 mr-2" /> Özel İzin/Mola
        </button>
      </div>

      {activeTab === 'permanent' && (
        <Card className="border border-border/60 shadow-sm rounded-2xl">
          <CardHeader className="bg-secondary/20 border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-brass-dark" />
                Sabit Mesai Saatlerim
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(Number(e.target.value))}
                  className="px-3 py-1 text-sm rounded-lg border border-border/50 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brass/50"
                >
                  <option value={15}>15 Dakika Aralık</option>
                  <option value={20}>20 Dakika Aralık</option>
                  <option value={30}>30 Dakika Aralık</option>
                  <option value={45}>45 Dakika Aralık</option>
                  <option value={60}>60 Dakika Aralık</option>
                </select>
                <span className="text-sm font-medium text-muted-foreground bg-white px-3 py-1 rounded-full border">
                  {activeBarber?.name || 'Seçim Bekleniyor'}
                </span>
              </div>
            </CardTitle>
            <CardDescription className="pt-2">Bu saatler sistemdeki TÜM GÜNLERİNİZ için geçerli olan varsayılan çalışma programınızdır. Aktif olarak çalışmak istediğiniz (yeşil) saatleri seçin.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brass-dark" /></div>
            ) : !activeBarberId ? (
              <div className="text-center py-12 text-muted-foreground">Lütfen personel seçimi yapın.</div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {permanentHours.length} saat seçili
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPermanentHours(allTimeSlots);
                        setHasChanges(true);
                      }}
                      className="h-8 rounded-lg text-xs"
                    >
                      Tümünü Seç
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPermanentHours([]);
                        setHasChanges(true);
                      }}
                      className="h-8 rounded-lg text-xs"
                    >
                      Temizle
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                  {allTimeSlots.map((time) => {
                    const isWorking = permanentHours.includes(time);
                    return (
                      <button
                        key={time}
                        onClick={() => togglePermanentSlot(time)}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all font-semibold text-sm group overflow-hidden",
                          isWorking 
                            ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" 
                            : "bg-white border-border text-muted-foreground opacity-60 hover:opacity-100"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button 
                    onClick={savePermanentHours} 
                    disabled={!hasChanges || isSaving}
                    className="bg-ink hover:bg-ink-soft text-cream font-semibold rounded-xl px-8"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    Mesai Programını Kaydet
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'exception' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 border border-border/60 shadow-sm rounded-2xl h-fit">
            <CardHeader className="bg-secondary/20 border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-brass-dark" />
                Tarih Seçin
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 overflow-y-auto max-h-[400px] pr-2">
                {availableDates.map((day, idx) => {
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedDate(day); setHasChanges(false); }}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer",
                        isSelected ? "border-ink bg-ink text-cream shadow-md" : "border-border bg-white hover:border-brass/40 hover:bg-secondary/20"
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase opacity-80 mb-1">{format(day, 'EEE', { locale: tr })}</span>
                      <span className="text-lg font-bold">{format(day, 'd')}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="bg-secondary/20 border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-brass-dark" />
                  {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                </div>
              </CardTitle>
              <CardDescription className="pt-2">Bu tarihte istisnai olarak kapatmak istediğiniz (Örn: Hastane, mola) saatleri kırmızı yapın. <br/>Not: Sadece kalıcı mesainize dahil olan saatler listelenir.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brass-dark" /></div>
              ) : !activeBarberId ? (
                <div className="text-center py-12 text-muted-foreground">Lütfen personel seçimi yapın.</div>
              ) : permanentHours.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Önce "Kalıcı Saatler" sekmesinden mesai saatlerinizi belirleyin.</div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span className="text-sm font-medium text-muted-foreground">Hızlı İşlemler:</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLocalBlockedTimes([]);
                          setHasChanges(true);
                        }}
                        className="text-xs h-8"
                      >
                        Tümünü Aç
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setLocalBlockedTimes([...permanentHours]);
                          setHasChanges(true);
                        }}
                        className="text-xs h-8 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200"
                      >
                        Tüm Günü Kapat
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {/* SADECE o personelin kalıcı çalışma saatlerini göster (Çünkü o gün sadece onlarda çalışacak) */}
                    {permanentHours.map((time) => {
                      const isBlocked = localBlockedTimes.includes(time);
                      return (
                        <button
                          key={time}
                          onClick={() => toggleExceptionSlot(time)}
                          className={cn(
                            "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all font-bold group overflow-hidden",
                            isBlocked 
                              ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                              : "bg-white border-border text-foreground hover:border-brass hover:shadow-sm"
                          )}
                        >
                          {time}
                          {isBlocked ? (
                            <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Unlock className="w-4 h-4 text-red-600" />
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-brass/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Lock className="w-4 h-4 text-brass-dark" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/50">
                    <Button 
                      onClick={saveExceptionHours} 
                      disabled={!hasChanges || isSaving}
                      className="bg-ink hover:bg-ink-soft text-cream font-semibold rounded-xl px-8"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                      Mola/İzinleri Kaydet
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {hasChanges && (
        <div className="fixed inset-x-4 bottom-20 z-40 md:hidden">
          <Button
            type="button"
            onClick={activeTab === 'permanent' ? savePermanentHours : saveExceptionHours}
            disabled={isSaving}
            className="h-12 w-full rounded-xl bg-ink font-semibold text-cream shadow-lg hover:bg-ink-soft"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Değişiklikleri Kaydet
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))}
        onConfirm={() => setModalConfig(prev => ({...prev, isOpen: false}))}
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
