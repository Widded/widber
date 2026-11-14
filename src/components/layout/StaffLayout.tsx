import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarDays, CalendarRange, Clock, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const staffNav = [
  { label: 'Bugün', to: '/admin/staff', icon: CalendarCheck, exact: true },
  { label: 'Randevular', to: '/admin/appointments', icon: CalendarDays },
  { label: 'Müsaitlik', to: '/admin/availability', icon: Clock },
  { label: 'Takvim', to: '/admin/calendar', icon: CalendarRange },
];

const StaffLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { staffBarber, signOut } = useAuth();

  const initial = staffBarber?.name?.trim().charAt(0).toUpperCase() || 'P';

  const isActive = (item: (typeof staffNav)[number]) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream font-sans text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-20 md:px-6">
          <Link to="/admin/staff" className="flex items-baseline gap-1" aria-label="Personel paneli ana sayfa">
            <span className="font-display text-xl font-semibold tracking-tight text-ink md:text-2xl">
              WidBer
            </span>
            <span className="mb-1 h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Personel menüsü">
            {staffNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item) ? 'page' : undefined}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                  isActive(item)
                    ? 'bg-ink text-cream'
                    : 'text-ink/50 hover:bg-ink/5 hover:text-ink'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="max-w-[160px] truncate text-xs font-semibold text-ink">
                {staffBarber?.name || 'Personel'}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink/40">
                Personel
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-cream">
              {staffBarber?.name ? initial : <UserRound className="h-4 w-4" aria-hidden="true" />}
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Çıkış yap"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/45 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10 md:pt-8">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-cream/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Alt menü"
      >
        <div className="grid grid-cols-4">
          {staffNav.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
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
                  className={cn(
                    'h-5 w-5 transition-colors',
                    active ? 'text-brass-dark' : 'text-ink/40'
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold transition-colors',
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
  );
};

export default StaffLayout;
