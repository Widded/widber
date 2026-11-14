import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CalendarRange,
  Clock3,
  Home,
  LayoutDashboard,
  LogOut,
  Scissors,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const navSections = [
  {
    label: 'Genel',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: CalendarDays, label: 'Randevular', path: '/admin/appointments' },
      { icon: CalendarRange, label: 'Takvim', path: '/admin/calendar' },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { icon: Scissors, label: 'Hizmetler', path: '/admin/services' },
      { icon: UserRound, label: 'Personeller', path: '/admin/barbers' },
      { icon: Clock3, label: 'Müsaitlik', path: '/admin/availability' },
    ],
  },
];

const mobileNav = [
  { icon: LayoutDashboard, label: 'Panel', path: '/admin/dashboard' },
  { icon: CalendarDays, label: 'Randevu', path: '/admin/appointments' },
  { icon: Scissors, label: 'Hizmet', path: '/admin/services' },
  { icon: Users, label: 'Personel', path: '/admin/barbers' },
  { icon: Clock3, label: 'Mesai', path: '/admin/availability' },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const email = user?.email || 'patron@widber.com';
  const initial = email.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="flex min-h-screen bg-cream font-sans text-ink">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-ink/10 bg-cream-soft px-5 py-6 lg:flex">
        <Link to="/admin/dashboard" className="flex items-baseline gap-1 px-2" aria-label="WidBer yönetim paneli">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">WidBer</span>
          <span className="mb-1 h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
        </Link>
        <p className="mt-1 px-2 text-[9px] font-bold uppercase tracking-[0.24em] text-ink/35">
          Yönetim
        </p>

        <div className="mt-7 rounded-2xl border border-ink/10 bg-white p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-base text-cream">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Patron</p>
              <p className="truncate text-[10px] text-ink/40">{email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-brass/10 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brass-dark">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Tam yetki
          </div>
        </div>

        <nav className="mt-7 flex-1 space-y-6" aria-label="Yönetim menüsü">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-ink/30">
                {section.label}
              </p>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        active
                          ? 'bg-ink text-cream shadow-[0_8px_20px_-12px_rgba(23,19,16,0.6)]'
                          : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
                      )}
                    >
                      <Icon
                        className={cn('h-4 w-4', active ? 'text-brass' : 'text-ink/40')}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6 space-y-1 border-t border-ink/10 pt-4">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Siteye Dön
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Link to="/admin/dashboard" className="flex items-baseline gap-1" aria-label="WidBer yönetim paneli">
              <span className="font-display text-xl font-semibold text-ink">WidBer</span>
              <span className="mb-1 h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-sm text-cream">
                {initial}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                aria-label="Çıkış yap"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/45 transition-colors hover:text-red-600"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 md:pt-7 lg:px-10 lg:pb-12 lg:pt-9">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-cream/95 backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Alt menü"
        >
          <div className="grid grid-cols-5">
            {mobileNav.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 pb-2 pt-2.5"
                >
                  <span
                    className={cn(
                      'absolute top-0 h-0.5 w-8 rounded-full bg-brass transition-opacity',
                      active ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden="true"
                  />
                  <Icon
                    className={cn('h-5 w-5', active ? 'text-brass-dark' : 'text-ink/40')}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'text-[9px] font-semibold',
                      active ? 'text-brass-dark' : 'text-ink/40'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AdminLayout;
