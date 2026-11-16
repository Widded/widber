import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useBooking, Service, Barber } from '../../context/BookingContext';
import { Check, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, User, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { cn } from '../../lib/utils';
import { getBookingDates } from '../../lib/bookingDates';
import { getSpecialDate } from '../../lib/specialDates';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { useAvailableTimes } from '../../hooks/useAvailableTimes';
import { splitTimeSlots } from '../../lib/availability';
import { supabase } from '../../lib/supabase';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '../../lib/bookingErrors';

const STEPS = [
  { id: 1, title: 'Hizmet Seçimi' },
  { id: 2, title: 'Personel' },
  { id: 3, title: 'Tarih & Saat' },
  { id: 4, title: 'Bilgiler' },
  { id: 5, title: 'Onay' },
];

const BookingWizard = () => {
  const { services: SERVICES, barbers: BARBERS, loading } = useSupabaseData();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { appointment, setServices, setBarber, setDateTime, setCustomerInfo, resetAppointment } = useBooking();
  const [currentStep, setCurrentStep] = useState(() => {
    // Auto-advance if previous steps are already filled
    if (appointment.services.length > 0 && appointment.barber && appointment.date && appointment.time) return 4;
    return 1;
  });
  const [selectedServices, setSelectedServices] = useState<Service[]>(appointment.services);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(appointment.barber);
  const [selectedDate, setSelectedDate] = useState<string>(appointment.date ? format(appointment.date, 'yyyy-MM-dd') : '');
  const [selectedTime, setSelectedTime] = useState<string | null>(appointment.time);
  const [showFullTimes, setShowFullTimes] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState(appointment.customerInfo?.firstName || '');
  const [lastName, setLastName] = useState(appointment.customerInfo?.lastName || '');
  const [phone, setPhone] = useState(appointment.customerInfo?.phone || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'danger' | 'warning' | 'success';
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    description: ''
  });

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (modalState.type === 'success') {
      navigate('/');
    }
  };


  // İhtiyaç duyulan toplam süre
  const totalDuration = selectedServices.reduce((acc, curr) => acc + curr.duration, 0);
  const totalPrice = selectedServices.reduce((acc, curr) => acc + curr.price, 0);

  const { bookedTimes, fetchingTimes, refresh: refreshTimes } = useAvailableTimes(selectedDate, selectedBarber);

  const workingHours = selectedBarber?.working_hours || [];
  const { available: availableTimes, full: fullTimes } = splitTimeSlots(
    workingHours,
    bookedTimes,
    selectedDate,
    settings.min_notice_minutes,
    getSpecialDate(settings.special_dates, selectedDate)
  );

  React.useEffect(() => {
    setShowFullTimes(false);
  }, [selectedDate, selectedBarber?.id]);

  // Scroll handling
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollDates = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Generate dates: today + 7 days, Sundays excluded
  const availableDates = React.useMemo(
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); // Sadece rakamlar
    if (val.startsWith('90')) val = val.substring(2); // 90 ile başlarsa at
    if (val.length > 0 && val[0] !== '0') val = '0' + val; // Her zaman 0 ile başla
    if (val.length > 11) val = val.substring(0, 11); // En fazla 11 hane
    setPhone(val);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setServices(selectedServices);
    } else if (currentStep === 2) {
      setBarber(selectedBarber);
    } else if (currentStep === 3) {
      if (selectedDate && selectedTime) {
        setDateTime(new Date(selectedDate), selectedTime);
      }
    } else if (currentStep === 4) {
      setCustomerInfo({ firstName, lastName, phone });
    }
    
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleService = (service: Service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // 1. Randevu ID'sini istemcide üret: insert sonrası anon SELECT izni gerekmiyor.
      const appointmentId = crypto.randomUUID();

      const { error: appError } = await supabase
        .from('appointments')
        .insert([{
          id: appointmentId,
          customer_first_name: firstName,
          customer_last_name: lastName,
          phone: phone,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          barber_id: selectedBarber?.id,
          total_price: totalPrice,
          total_duration: totalDuration,
          status: 'approved'
        }]);

      if (appError) throw appError;

      // 2. Hizmet eşleşmelerini aynı ID ile ekle.
      const serviceMappings = selectedServices.map(s => ({
        appointment_id: appointmentId,
        service_id: s.id
      }));

      const { error: mappingError } = await supabase
        .from('appointment_services')
        .insert(serviceMappings);

      if (mappingError) throw mappingError;

      setIsSubmitting(false);
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Randevu Onaylandı',
        description: 'Randevunuz başarıyla oluşturuldu! Sizi bekliyoruz.'
      });
      // Context'i temizle
      setSelectedServices([]);
      setSelectedBarber(null);
      setSelectedDate('');
      setSelectedTime(null);
      resetAppointment();
    } catch (err) {
      console.error("Randevu oluşturulurken hata:", err);
      const supabaseError = err as { code?: string; message?: string };

      if (isSlotConflictError(err)) {
        setSelectedTime(null);
        setCurrentStep(3);
        refreshTimes();
        window.dispatchEvent(new Event('widber:booking-conflict'));
        setModalState({
          isOpen: true,
          type: 'danger',
          title: 'Saat doldu',
          description: SLOT_CONFLICT_MESSAGE,
        });
      } else {
        setModalState({
          isOpen: true,
          type: 'danger',
          title: 'Hata',
          description:
            supabaseError?.code === '42501'
              ? 'Randevu oluşturulamadı: veritabanı izni eksik. Lütfen yönetici ile iletişime geçin.'
              : supabaseError?.message || 'Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.',
        });
      }
      setIsSubmitting(false);
    }
  };

  const isNextDisabled = () => {
    switch (currentStep) {
      case 1: return selectedServices.length === 0;
      case 2: return selectedBarber === null;
      case 3: return !selectedDate || !selectedTime || !availableTimes.includes(selectedTime);
      case 4: return !firstName || !lastName || phone.length !== 11 || !phone.startsWith('05');
      default: return false;
    }
  };

  if (settings.booking_paused) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Randevu alımı geçici olarak durduruldu
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Şu anda yeni randevu kabul edilmiyor. Lütfen daha sonra tekrar deneyin
            veya bizimle iletişime geçin.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {settings.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Telefonla ara
              </a>
            )}
            {settings.whatsapp && (
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {STEPS.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-2 transition-colors",
                  currentStep === step.id ? "bg-blue-600 text-white shadow-sm" : 
                  currentStep > step.id ? "bg-blue-50 text-blue-700" : "bg-white border border-slate-200 text-slate-400"
                )}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden min-h-[400px] flex flex-col relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}
          <div className="p-4 sm:p-6 md:p-8 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {/* STEP 1: Services */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-slate-900">Hizmet Seçimi</h2>
                    <div className="grid gap-4">
                      {SERVICES.map(service => {
                        const isSelected = selectedServices.some(s => s.id === service.id);
                        return (
                          <div 
                            key={service.id}
                            onClick={() => toggleService(service)}
                            className={cn(
                              "flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 transition-all sm:p-4",
                              isSelected ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                            )}
                          >
                            <div className="min-w-0">
                              <h3 className="text-base font-semibold leading-snug text-slate-900">{service.name}</h3>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <span className="text-sm font-bold text-slate-900">₺{service.price}</span>
                              <div className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2: Barber */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-slate-900">Personel Seçimi</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {BARBERS.map(barber => {
                        const isSelected = selectedBarber?.id === barber.id;
                        return (
                          <div 
                            key={barber.id}
                            onClick={() => setSelectedBarber(barber)}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all sm:p-4",
                              isSelected ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                            )}
                          >
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold text-slate-900">{barber.name}</h3>
                            </div>
                            <div className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: Date & Time */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-slate-900">Tarih ve Saat Seçimi</h2>
                    <div className="space-y-6">
                      <div>
                        <Label className="mb-3 block font-semibold text-slate-700 text-sm">Tarih Seçin</Label>
                        <div className="relative group">
                          {/* Left Gradient & Arrow */}
                          <div className="absolute left-0 top-0 bottom-2 hidden w-16 bg-gradient-to-r from-white to-transparent z-10 items-center justify-start pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity sm:flex">
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="w-10 h-10 rounded-full border border-slate-200 shadow-sm pointer-events-auto bg-white hover:bg-slate-50 text-slate-600"
                              onClick={(e) => { e.preventDefault(); scrollDates('left'); }}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div 
                            ref={scrollRef}
                            className="flex overflow-x-auto space-x-3 pb-2 [&::-webkit-scrollbar]:hidden scroll-smooth snap-x"
                          >
                            {availableDates.map(date => {
                              const dateStr = format(date, 'yyyy-MM-dd');
                              const isSelected = selectedDate === dateStr;
                              return (
                                <button
                                  key={dateStr}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedDate(dateStr);
                                    setSelectedTime(null);
                                  }}
                                  className={cn(
                                    "snap-center flex-shrink-0 flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all min-w-[76px] sm:min-w-[90px] sm:p-3",
                                    isSelected ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:shadow-sm"
                                  )}
                                >
                                  <span className={cn("text-xs font-medium uppercase mb-1", isSelected ? "text-white/90" : "text-muted-foreground")}>{format(date, 'EEEE', { locale: tr })}</span>
                                  <span className="text-2xl font-bold">{format(date, 'd')}</span>
                                  <span className={cn("text-[10px] font-semibold mt-1 uppercase", isSelected ? "text-white/90" : "text-muted-foreground")}>{format(date, 'MMMM', { locale: tr })}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Right Gradient & Arrow */}
                          <div className="absolute right-0 top-0 bottom-2 hidden w-16 bg-gradient-to-l from-white to-transparent z-10 items-center justify-end pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity sm:flex">
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="w-10 h-10 rounded-full border border-slate-200 shadow-sm pointer-events-auto bg-white hover:bg-slate-50 text-slate-600"
                              onClick={(e) => { e.preventDefault(); scrollDates('right'); }}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {selectedDate && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-4 border-t border-slate-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <Label className="block font-semibold text-slate-700 text-sm">Müsait Saatler</Label>
                            {fetchingTimes && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                          </div>
                          
                          {(!selectedBarber?.working_hours || selectedBarber.working_hours.length === 0) ? (
                            <div className="rounded-xl bg-slate-50 py-8 text-center text-slate-500">
                              Bu personelin çalışma saati tanımlanmamış.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>{availableTimes.length} müsait saat</span>
                                {fullTimes.length > 0 && <span>{fullTimes.length} dolu</span>}
                              </div>

                              {availableTimes.length === 0 ? (
                                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-5 text-center">
                                  <AlertCircle className="mx-auto h-6 w-6 text-red-500/80" />
                                  <p className="mt-2 text-sm font-semibold text-red-600">
                                    Personel bu tarihte tamamen dolu.
                                  </p>
                                  <p className="mt-1 text-xs text-red-500/80">
                                    Başka bir gün seçebilirsin.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                                  {availableTimes.map((time) => {
                                    const isSelected = selectedTime === time;
                                    return (
                                      <button
                                        key={time}
                                        type="button"
                                        onClick={() => setSelectedTime(time)}
                                        className={cn(
                                          'rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-all',
                                          isSelected
                                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:shadow-sm'
                                        )}
                                      >
                                        {time}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {showFullTimes && fullTimes.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                                  {fullTimes.map((time) => (
                                    <div
                                      key={time}
                                      aria-label={`${time} dolu`}
                                      className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-400 line-through"
                                    >
                                      {time}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {fullTimes.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setShowFullTimes((visible) => !visible)}
                                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                >
                                  {showFullTimes ? (
                                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                                  ) : (
                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                  )}
                                  {showFullTimes
                                    ? 'Sadece müsait saatleri göster'
                                    : `Dolu saatleri göster (${fullTimes.length})`}
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: Info */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-slate-900">İletişim Bilgileri</h2>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="font-semibold text-sm">Ad</Label>
                          <Input 
                            id="firstName" 
                            placeholder="Adınız" 
                            className="rounded-lg border-slate-200 py-5 focus-visible:ring-1 focus-visible:ring-blue-500"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="font-semibold text-sm">Soyad</Label>
                          <Input 
                            id="lastName" 
                            placeholder="Soyadınız" 
                            className="rounded-lg border-slate-200 py-5 focus-visible:ring-1 focus-visible:ring-blue-500"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-semibold text-sm">Telefon Numarası</Label>
                        <Input 
                          id="phone" 
                          type="tel"
                          placeholder="05XX XXX XX XX" 
                          className="rounded-lg border-slate-200 py-5 tracking-wider focus-visible:ring-1 focus-visible:ring-blue-500"
                          value={phone}
                          onChange={handlePhoneChange}
                        />
                        {phone.length > 0 && (phone.length !== 11 || !phone.startsWith('05')) && (
                          <p className="text-xs text-red-500 font-medium">Lütfen başında 0 ile birlikte 11 haneli (05...) numaranızı girin.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Summary */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-slate-900">Randevu Özeti</h2>
                    
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-5 sm:p-6">
                      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Müşteri</h4>
                          <p className="font-semibold text-lg">{firstName} {lastName}</p>
                          <p className="text-sm font-medium text-slate-500">{phone}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Personel</h4>
                          <p className="font-semibold text-lg">{selectedBarber?.name}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tarih & Saat</h4>
                          <p className="font-semibold text-lg flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2 text-blue-600" />
                            {selectedDate && new Date(selectedDate).toLocaleDateString('tr-TR')}
                          </p>
                          <p className="font-semibold text-lg flex items-center mt-1">
                            <Clock className="w-4 h-4 mr-2 text-blue-600" />
                            {selectedTime}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Hizmetler</h4>
                        <div className="space-y-2">
                          {selectedServices.map(s => (
                            <div key={s.id} className="flex justify-between text-sm font-medium">
                              <span>{s.name}</span>
                              <span>₺{s.price}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between font-bold text-xl border-t border-slate-200 mt-4 pt-4">
                          <span>Toplam</span>
                          <span className="text-slate-900">₺{totalPrice}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-slate-700">
                        <strong className="block mb-1 font-semibold">Ödeme Bilgisi</strong>
                        Sistem üzerinden herhangi bir ücret alınmamaktadır. Ödemenizi hizmet bitiminde dükkanda yapabilirsiniz.
                      </p>
                    </div>

                    {settings.cancellation_policy && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                        <strong className="mb-1 block font-semibold text-slate-900">
                          İptal Politikası
                        </strong>
                        <p className="whitespace-pre-line text-slate-600">
                          {settings.cancellation_policy}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50/60 flex flex-col gap-2 mt-auto sm:flex-row sm:items-center sm:justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={currentStep === 1}
              className={cn("w-full rounded-lg font-semibold border-slate-200 hover:bg-white transition-all sm:w-auto", currentStep === 1 ? 'hidden sm:inline-flex sm:invisible' : '')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Geri
            </Button>
            
            {currentStep < 5 ? (
              <Button 
                onClick={handleNext} 
                disabled={isNextDisabled()}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all px-7 disabled:opacity-40 sm:w-auto"
              >
                İleri
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all px-6 shadow-sm sm:w-auto sm:px-8"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Randevuyu Tamamla'}
                {!isSubmitting && <Check className="w-5 h-5 ml-2" />}
              </Button>
            )}
          </div>
        </Card>
      </div>
      
      <ConfirmModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={closeModal}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
        confirmText="Tamam"
        cancelText=""
      />
    </div>
  );
};

export default BookingWizard;
