import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Loader2,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { QuickBookingWidget } from '../../components/QuickBookingWidget';
import { useBooking } from '../../context/BookingContext';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';

const REVIEWS = [
  {
    id: 1,
    name: 'Can Yılmaz',
    text: 'Minimalist tasarımı ve profesyonel hizmetiyle benzersiz bir deneyim. Kesinlikle tavsiye ederim.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Kaan Tekin',
    text: 'Sıra beklemeden, tam saatinde hizmet almak harika. Atmosfer inanılmaz derecede ferah ve temiz.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Emre Şahin',
    text: 'Sadece saç kesimi değil, tam bir bakım seansı. Yeni favori mekanım.',
    rating: 5,
  },
];

type MenuService = {
  id: string;
  name: string;
  duration: number;
  price: number | null;
  description: string;
};

const SERVICE_COPY: Record<string, string> = {
  'Saç Kesimi':
    'Yüz hatlarınıza ve saç yapınıza göre şekillenen, kolay yönetilebilir bir kesim.',
  'Sakal Tıraşı':
    'Sıcak havlu, hassas ustura ve cilt dostu bakım ürünleriyle klasik tıraş ritüeli.',
  'Saç & Sakal Kesimi':
    'Kesim ve tıraşın tek seansta buluştuğu, baştan sona planlanmış bakım.',
  'Cilt Bakımı':
    'Cildinizi arındıran, nemlendiren ve canlandıran kısa ama etkili bir bakım.',
  'Saç Yıkama ve Şekillendirme':
    'Doğru ürünlerle yıkama, masaj ve günün sonuna kadar kalıcı şekillendirme.',
};

const FALLBACK_SERVICES: MenuService[] = [
  {
    id: 'signature-cut',
    name: 'Saç Kesimi',
    duration: 30,
    price: null,
    description: SERVICE_COPY['Saç Kesimi'],
  },
  {
    id: 'beard-ritual',
    name: 'Sakal Tıraşı',
    duration: 20,
    price: null,
    description: SERVICE_COPY['Sakal Tıraşı'],
  },
  {
    id: 'full-grooming',
    name: 'Saç & Sakal Kesimi',
    duration: 45,
    price: null,
    description: SERVICE_COPY['Saç & Sakal Kesimi'],
  },
  {
    id: 'skin-care',
    name: 'Cilt Bakımı',
    duration: 30,
    price: null,
    description: SERVICE_COPY['Cilt Bakımı'],
  },
];

const FastBookingModal = ({ onClose }: { onClose: () => void }) => {
  const { appointment, resetAppointment } = useBooking();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalPrice = appointment.services.reduce((acc, curr) => acc + curr.price, 0);
      const totalDuration = appointment.services.reduce((acc, curr) => acc + curr.duration, 0);

      const { data: appData, error: appError } = await supabase
        .from('appointments')
        .insert([
          {
            customer_first_name: firstName,
            customer_last_name: lastName,
            phone,
            appointment_date: appointment.date,
            appointment_time: appointment.time,
            barber_id: appointment.barber?.id,
            total_price: totalPrice,
            total_duration: totalDuration,
          },
        ])
        .select('id')
        .single();

      if (appError) throw appError;

      if (appData) {
        const serviceMappings = appointment.services.map((s) => ({
          appointment_id: appData.id,
          service_id: s.id,
        }));
        const { error: mappingError } = await supabase
          .from('appointment_services')
          .insert(serviceMappings);
        if (mappingError) throw mappingError;
      }

      setSuccess(true);
      setTimeout(() => {
        resetAppointment();
        onClose();
      }, 3000);
    } catch (error) {
      console.error(error);
      alert('Bir hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fast-booking-title"
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-ink/10 bg-cream-soft p-8 text-center shadow-[0_30px_80px_-30px_rgba(23,19,16,0.45)]"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ink">
          <Check className="h-9 w-9 text-cream" aria-hidden="true" />
        </div>
        <h2 id="fast-booking-title" className="mt-6 font-display text-3xl text-ink">
          Harika!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-warm">
          Randevunuz başarıyla oluşturuldu. Sizi bekliyor olacağız.
        </p>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fast-booking-title"
      className="relative mx-auto w-full max-w-md rounded-[2rem] border border-ink/10 bg-cream-soft p-6 shadow-[0_30px_80px_-30px_rgba(23,19,16,0.45)] md:p-8"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-dark">
        Son adım
      </p>
      <h2 id="fast-booking-title" className="mt-2 font-display text-3xl text-ink">
        İletişim Bilgileri
      </h2>
      <p className="mt-2 text-sm text-muted-warm">
        Randevunuzu tamamlamak için bilgilerinizi girin.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="fast-first-name"
              className="block text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55"
            >
              Ad
            </label>
            <input
              id="fast-first-name"
              name="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Adınız"
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3.5 text-[15px] font-medium text-ink placeholder:text-ink/30 transition-colors focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="fast-last-name"
              className="block text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55"
            >
              Soyad
            </label>
            <input
              id="fast-last-name"
              name="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyadınız"
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3.5 text-[15px] font-medium text-ink placeholder:text-ink/30 transition-colors focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="fast-phone"
            className="block text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55"
          >
            Telefon
          </label>
          <input
            id="fast-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XX XXX XX XX"
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3.5 text-[15px] font-medium tracking-wider text-ink placeholder:text-ink/30 transition-colors focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
          />
        </div>

        <button
          disabled={loading}
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-4 text-sm font-semibold text-cream transition-all hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <>
              Randevuyu Onayla
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-[11px] text-muted-warm">Ödeme dükkanda yapılır.</p>
    </div>
  );
};

const Home = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const { services, loading: servicesLoading } = useSupabaseData();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isBookingOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsBookingOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isBookingOpen]);

  const displayServices: MenuService[] =
    services.length > 0
      ? services.slice(0, 4).map((service) => ({
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
          description:
            SERVICE_COPY[service.name] ??
            'Ustalarımızın dokunuşuyla, size ayrılan zamanda hazırlanan bakım.',
        }))
      : FALLBACK_SERVICES;

  const fadeUp = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6, delay },
  });

  return (
    <div className="flex flex-col overflow-x-clip bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-cream">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brass/10 blur-3xl" />
          <div className="absolute -left-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-sand/40 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-ink/5" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-10 md:pb-24 md:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-dark">
                Premium grooming · Randevu ile
              </p>
              <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.02em] text-ink sm:text-6xl lg:text-[5.1rem]">
                Kusursuz görünüm.
                <br />
                <span className="italic text-brass">Zahmetsiz</span> deneyim.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-warm md:text-lg">
                Modern erkeğin ritmine uygun, sıra beklemeden çalışan bir bakım ritüeli.
                Ustanızı seçin, saatini ayırın; gerisini bize bırakın.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#randevu"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-cream transition-all duration-300 hover:bg-ink-soft hover:shadow-[0_12px_30px_-12px_rgba(23,19,16,0.6)]"
                >
                  Randevu Al
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href="#hizmetler"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 px-7 py-4 text-sm font-semibold text-ink transition-colors duration-300 hover:border-ink/30 hover:bg-white/50"
                >
                  Hizmetleri Keşfet
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
                {[
                  { icon: ShieldCheck, label: 'Kişiye özel bakım' },
                  { icon: Clock, label: 'Sıra bekleme yok' },
                  { icon: Sparkles, label: 'Premium ürünler' },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/65"
                  >
                    <item.icon className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                    {item.label}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="relative"
            >
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-[2.5rem] border border-brass/25 sm:-inset-4"
              />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-ink shadow-[0_30px_80px_-40px_rgba(23,19,16,0.65)] sm:aspect-[5/6]">
                <img
                  src="/hero-barber.png"
                  alt="WidBer berber atölyesinde premium bakım ortamı"
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent"
                />
                <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-cream/15 bg-ink/40 p-5 backdrop-blur-md">
                  <p className="font-display text-xl leading-snug text-cream">
                    “Detaylar, farkı yaratır.”
                  </p>
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/65">
                    WidBer atölyesi
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-ink/10 bg-cream-soft px-4 py-3 shadow-[0_18px_40px_-24px_rgba(23,19,16,0.4)] sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-ink/40">
                    Aynı gün
                  </span>
                  <span className="block text-xs font-semibold text-ink">Müsait saatler</span>
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Booking */}
      <section id="randevu" className="relative scroll-mt-24 bg-ink py-20 text-cream md:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-brass/10 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-cream/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">
                Rezervasyon
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-cream md:text-5xl">
                Sıra beklemeden,
                <br />
                <span className="italic text-brass">size ayrılan</span> zaman.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-cream/65 lg:justify-self-end">
              Hizmetinizi seçin, ustanızı belirleyin ve size uygun saati ayırın. Onayınız
              anında oluşur; ödemenizi dükkanda yaparsınız.
            </p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-cream/10 bg-cream/[0.04] p-2 md:p-3">
            <QuickBookingWidget onComplete={() => setIsBookingOpen(true)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/50">
            <span>Ödeme dükkanda</span>
            <span className="h-1 w-1 self-center rounded-full bg-brass/50" aria-hidden="true" />
            <span>Anında onay</span>
            <span className="h-1 w-1 self-center rounded-full bg-brass/50" aria-hidden="true" />
            <span>Kişiye özel süre</span>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="hizmetler" className="scroll-mt-24 bg-cream-soft py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-dark">
                Hizmet menüsü
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">
                Her detay, <span className="italic text-brass">kendine özel.</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-warm">
              Klasik berberlik disiplinini modern bakım anlayışıyla birleştiriyoruz. Her
              seans, ihtiyacınıza göre planlanır.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {servicesLoading && services.length === 0
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-2xl border border-ink/10 bg-white/60"
                  />
                ))
              : displayServices.map((service, index) => (
                  <motion.a
                    key={service.id}
                    href="#randevu"
                    {...fadeUp(index * 0.06)}
                    className="group flex flex-col rounded-2xl border border-ink/10 bg-white p-6 transition-all duration-300 hover:border-brass/50 hover:shadow-[0_24px_50px_-30px_rgba(23,19,16,0.35)] motion-safe:hover:-translate-y-1"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">
                      0{index + 1}
                    </span>
                    <h3 className="mt-8 font-display text-2xl leading-snug text-ink">
                      {service.name}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-warm">
                      {service.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">
                        {service.duration} dk
                      </span>
                      {service.price != null ? (
                        <span className="text-sm font-semibold text-ink">₺{service.price}</span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brass-dark">
                          Fiyat randevuda
                        </span>
                      )}
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 transition-colors group-hover:text-brass-dark">
                      Randevu al
                      <ArrowUpRight
                        className="h-3.5 w-3.5 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </motion.a>
                ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              to="/booking"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink/30 hover:bg-white"
            >
              Tüm hizmetleri gör
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2">
          <motion.div {...fadeUp()} className="relative order-2 lg:order-1">
            <div className="overflow-hidden rounded-[2rem] border border-ink/10">
              <img
                src="/hero-barber.png"
                alt="WidBer atölyesinde bir ustanın müşteriyle ilgilenmesi"
                className="aspect-[4/3] h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="absolute -bottom-6 -right-4 max-w-[230px] rounded-2xl border border-ink/10 bg-cream-soft p-5 shadow-[0_24px_50px_-30px_rgba(23,19,16,0.5)] sm:-right-6">
              <p className="font-display text-3xl text-brass">01</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40">
                Randevu
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-warm">
                Hizmetini seç, ustanı belirle, saatini ayır.
              </p>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="order-1 lg:order-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-dark">
              Deneyim
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">
              Bir bakım değil,
              <br />
              <span className="italic text-brass">bir ritüel.</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-warm md:text-base">
              Her seans, sizinle başlar. Saçınızın yapısını, günlük ritminizi ve beklentinizi
              dinliyor; ardından size en uygun bakımı birlikte planlıyoruz.
            </p>

            <div className="mt-9 space-y-6">
              {[
                {
                  icon: Scissors,
                  title: 'Kişiye özel analiz',
                  description:
                    'Saç yapınız, yüz hatlarınız ve günlük ritminiz üzerinden planlanan bir kesim.',
                },
                {
                  icon: Sparkles,
                  title: 'Premium ürünler',
                  description:
                    'Cildinizi ve saçınızı yormayan, uzun ömürlü sonuç veren bakım ürünleri.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Sıra bekleme yok',
                  description:
                    'Randevunuz size ayrılır. Geldiğinizde doğrudan koltuğunuza geçersiniz.',
                },
              ].map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-brass-dark">
                    <feature.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-warm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-ink/10 bg-cream-soft py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-dark">
                Misafirlerimiz
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">
                Koltuğumuzdan <span className="italic text-brass">iyi hislerle</span> kalkanlar.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-warm">
              Her randevu, aynaya bakarken iyi hissetmeniz için. İşte misafirlerimizin
              deneyimi.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {REVIEWS.map((review, index) => (
              <motion.blockquote
                key={review.id}
                {...fadeUp(index * 0.08)}
                className="flex flex-col rounded-2xl border border-ink/10 bg-white p-7"
              >
                <div
                  className="flex gap-1"
                  role="img"
                  aria-label={`${review.rating} yıldız`}
                >
                  {Array.from({ length: review.rating }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="h-3.5 w-3.5 fill-brass text-brass"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="mt-6 flex-1 font-display text-xl leading-relaxed text-ink">
                  “{review.text}”
                </p>
                <footer className="mt-7 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-cream">
                    {review.name.charAt(0)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{review.name}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/50">
                      Misafirimiz
                    </span>
                  </span>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-cream py-20 md:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-dark">
            Son söz
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-6xl">
            Aynaya bakma zamanı.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-warm md:text-base">
            Bir sonraki randevunuz, kendinize ayırdığınız en iyi saat olsun.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#randevu"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-cream transition-all duration-300 hover:bg-ink-soft hover:shadow-[0_12px_30px_-12px_rgba(23,19,16,0.6)]"
            >
              Randevu Al
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              to="/booking"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 px-7 py-4 text-sm font-semibold text-ink transition-colors duration-300 hover:border-ink/30 hover:bg-white/50"
            >
              Hizmetleri Gör
            </Link>
          </div>
        </div>
      </section>

      {/* Contact modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
              onClick={() => setIsBookingOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 max-h-screen w-full overflow-y-auto px-4 py-10"
            >
              <button
                type="button"
                onClick={() => setIsBookingOpen(false)}
                aria-label="Randevu formunu kapat"
                className="absolute right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-cream-soft text-ink shadow-lg transition-transform hover:scale-105 active:scale-95 md:right-8 md:top-8"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="flex min-h-full items-center justify-center">
                <FastBookingModal onClose={() => setIsBookingOpen(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
