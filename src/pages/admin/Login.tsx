import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { AlertCircle, ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Barber } from '../../context/BookingContext';

type LoginProps = {
  mode?: 'admin' | 'staff';
};

const Login = ({ mode = 'staff' }: LoginProps) => {
  const loginMode = mode;

  // Admin form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Staff form state
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [barbersLoading, setBarbersLoading] = useState(false);

  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const staffFormRef = useRef<HTMLFormElement>(null);
  const lastAutoSubmittedRef = useRef('');
  const navigate = useNavigate();

  const fetchBarbers = useCallback(async () => {
    setBarbersLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('barbers')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setBarbers(data || []);
    } catch (err) {
      console.error('Personeller çekilemedi', err);
      setError('Personel listesi yüklenemedi. Lütfen sayfayı yenileyin.');
    } finally {
      setBarbersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loginMode === 'staff') {
      void fetchBarbers();
    }
  }, [loginMode, fetchBarbers]);

  useEffect(() => {
    if (pin.length !== 6 || !selectedBarber || loading) return;

    const key = `${selectedBarber}:${pin}`;
    if (lastAutoSubmittedRef.current === key) return;

    lastAutoSubmittedRef.current = key;
    staffFormRef.current?.requestSubmit();
  }, [pin, selectedBarber, loading]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      localStorage.removeItem('staff_barber_id');
      navigate('/admin');
    } catch (err: any) {
      console.error('Giriş hatası:', err);
      setError(
        err?.message?.includes('Failed to fetch')
          ? 'Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.'
          : 'E-posta veya şifre hatalı.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarber || pin.length !== 6) {
      setError('Lütfen bir personel seçin ve 6 haneli PIN kodunuzu girin.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const barber = barbers.find((item) => item.id === selectedBarber);
      if (!barber) throw new Error('Personel bulunamadı.');

      if (!barber.pin || barber.pin !== pin) {
        throw new Error('PIN kodu hatalı veya bu personel için giriş yetkisi yok.');
      }

      const staffEmail = import.meta.env.VITE_STAFF_EMAIL;
      const staffPassword = import.meta.env.VITE_STAFF_PASSWORD;

      if (!staffEmail || !staffPassword) {
        throw new Error('Sistemde personel giriş ayarları yapılmamış (.env eksik).');
      }

      localStorage.setItem('staff_barber_id', selectedBarber);

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: staffEmail,
        password: staffPassword,
      });

      if (authError) {
        localStorage.removeItem('staff_barber_id');
        throw authError;
      }

      navigate('/admin/staff');
    } catch (err: any) {
      console.error('Personel giriş hatası:', err);
      setError(err.message || 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-blue-50 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-sand/50 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm">
        <CardHeader className="space-y-2 border-b border-slate-200 bg-white/40 px-8 pb-6 pt-8 text-center">
          <Link to="/" className="mx-auto inline-flex items-baseline gap-1" aria-label="WidBer ana sayfa">
            <span className="font-bold text-2xl font-semibold tracking-tight text-slate-900">
              WidBer
            </span>
            <span className="mb-1 h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
          </Link>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            {loginMode === 'admin' ? 'Yönetim' : 'Personel'}
          </p>
          <CardTitle className="font-bold text-3xl font-normal text-slate-900">
            {loginMode === 'admin' ? 'Yönetici Girişi' : 'Personel Girişi'}
          </CardTitle>
          <CardDescription className="text-sm text-slate-900/50">
            {loginMode === 'admin'
              ? 'Yönetim paneline erişmek için giriş yapın.'
              : 'Kendi randevularınızı görmek için PIN girin.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-6 md:px-8">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-600"
            >
              <AlertCircle className="mr-2.5 mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          {loginMode === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-900/60">
                  E-posta
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@ornek.com"
                    className="h-12 rounded-xl border-slate-200 bg-white pl-11 text-[15px] focus-visible:ring-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-900/60">
                  Şifre
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="password"
                    type="password"
                    className="h-12 rounded-xl border-slate-200 bg-white pl-11 text-[15px] focus-visible:ring-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Giriş Yap'}
              </Button>
            </form>
          ) : (
            <form ref={staffFormRef} onSubmit={handleStaffLogin} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="barber" className="text-xs font-semibold text-slate-900/60">
                    İsminizi Seçin
                  </Label>
                  <button
                    type="button"
                    onClick={() => void fetchBarbers()}
                    disabled={barbersLoading}
                    aria-label="Personel listesini yenile"
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/40 transition-colors hover:text-slate-900 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn('h-3 w-3', barbersLoading && 'animate-spin')}
                      aria-hidden="true"
                    />
                    Yenile
                  </button>
                </div>

                <div className="relative">
                  <select
                    id="barber"
                    value={selectedBarber}
                    onChange={(e) => {
                      setSelectedBarber(e.target.value);
                      setPin('');
                      lastAutoSubmittedRef.current = '';
                      setError(null);
                    }}
                    disabled={barbersLoading}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-10 text-[15px] font-medium text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                    required
                  >
                    <option value="" disabled>
                      {barbersLoading ? 'Yükleniyor...' : 'Lütfen personel seçin...'}
                    </option>
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                </div>

                {!barbersLoading && barbers.length === 0 && (
                  <p className="text-xs leading-relaxed text-slate-900/40">
                    Henüz personel eklenmemiş. Yönetici panelinden personel ekleyin.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-xs font-semibold text-slate-900/60">
                  6 Haneli PIN Kodu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="******"
                    className="h-14 rounded-xl border-slate-200 bg-white pl-11 pr-12 text-center font-mono text-2xl tracking-[0.4em] focus-visible:ring-blue-500"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    autoComplete="one-time-code"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((visible) => !visible)}
                    aria-label={showPin ? 'PIN kodunu gizle' : 'PIN kodunu göster'}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-900/40 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    {showPin ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-900/40">
                  PIN'inizi bilmiyorsanız yöneticinize başvurun.
                </p>
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                disabled={loading || barbersLoading || !selectedBarber || pin.length !== 6}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  'Sisteme Gir'
                )}
              </Button>
            </form>
          )}

          <div className="mt-7 border-t border-slate-200 pt-5 text-center">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
            >
              <span className="mr-1">&larr;</span> Müşteri Ekranına Dön
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
