import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export type DashboardNavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

type DashboardShellProps = {
  items: DashboardNavItem[];
  homePath: string;
  children?: React.ReactNode;
};

const STORAGE_KEY = 'widber-dashboard-sidebar-collapsed';

const prefetchAdminRoute = (path: string) => {
  if (path.startsWith('/admin/appointments')) {
    void import('../../pages/admin/AppointmentsDayView');
    return;
  }

  if (path === '/admin/reports') {
    void import('../../pages/admin/Reports');
    return;
  }

  if (path === '/admin/availability') {
    void import('../../pages/admin/AvailabilityManagement');
    return;
  }

  if (path === '/admin/services') {
    void import('../../pages/admin/ServicesManagement');
    return;
  }

  if (path === '/admin/barbers') {
    void import('../../pages/admin/BarbersManagement');
    return;
  }

  if (path === '/admin/settings') {
    void import('../../pages/admin/SiteSettings');
  }
};

const DashboardShell = ({ items, homePath, children }: DashboardShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import('../../pages/admin/AppointmentsDayView');
      void import('../../pages/admin/AvailabilityManagement');
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const isActive = (path: string) => {
    if (path === homePath) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const primaryPaths = [homePath, '/admin/appointments', '/admin/reports', '/admin/availability'];
  const primaryItems = primaryPaths
    .map((path) => items.find((item) => item.path === path))
    .filter((item): item is DashboardNavItem => Boolean(item));

  items.forEach((item) => {
    if (primaryItems.length < 4 && !primaryItems.some((primary) => primary.path === item.path)) {
      primaryItems.push(item);
    }
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const renderSidebar = (mobile = false) => {
    const showLabels = mobile || !collapsed;

    return (
      <>
        <div
          className={cn(
            'flex h-16 items-center border-b border-slate-200',
            showLabels ? 'justify-between px-4' : 'justify-center px-2'
          )}
        >
          <Link to={homePath} className="flex items-center gap-2" aria-label="WidBer ana sayfa">
            {showLabels ? (
              <>
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  WidBer
                </span>
                <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
              </>
            ) : (
              <span className="text-lg font-bold text-blue-600">W</span>
            )}
          </Link>

          {mobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Menüyü kapat"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Yönetim menüsü">
          {showLabels && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Menü
            </p>
          )}
          <div className="space-y-1">
            {items.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={!showLabels ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => prefetchAdminRoute(item.path)}
                  onFocus={() => prefetchAdminRoute(item.path)}
                  onTouchStart={() => prefetchAdminRoute(item.path)}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                    showLabels ? 'px-3' : 'justify-center px-0',
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      active ? 'text-blue-600' : 'text-slate-400'
                    )}
                    aria-hidden="true"
                  />
                  {showLabels && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="space-y-1 border-t border-slate-200 p-3">
          {!mobile &&
            (showLabels ? (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Menüyü daralt
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="Menüyü genişlet"
                title="Menüyü genişlet"
                className="flex h-9 w-full items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}

          <button
            type="button"
            onClick={() => void handleLogout()}
            title={!showLabels ? 'Çıkış Yap' : undefined}
            className={cn(
              'flex h-10 w-full items-center gap-3 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600',
              showLabels ? 'px-3' : 'justify-center px-0'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            {showLabels && <span>Çıkış Yap</span>}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 lg:flex',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {renderSidebar()}
      </aside>

      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {renderSidebar(true)}
      </aside>

      <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>

      <nav
        aria-label="Alt menü"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
          {primaryItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => prefetchAdminRoute(item.path)}
                onFocus={() => prefetchAdminRoute(item.path)}
                onTouchStart={() => prefetchAdminRoute(item.path)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-semibold transition-colors',
                  active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-semibold transition-colors',
              primaryItems.some((item) => isActive(item.path))
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-blue-600'
            )}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span>Menü</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default DashboardShell;
