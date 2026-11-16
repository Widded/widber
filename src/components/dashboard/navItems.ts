import {
  BarChart3,
  CalendarDays,
  LineChart,
  Scissors,
  Settings,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import type { DashboardNavItem } from './DashboardShell';

export const ownerNavItems: DashboardNavItem[] = [
  { icon: BarChart3, label: 'Rapor', path: '/admin/dashboard' },
  { icon: CalendarDays, label: 'Randevular', path: '/admin/appointments' },
  { icon: UserRound, label: 'Personeller', path: '/admin/barbers' },
  { icon: Scissors, label: 'Hizmetler', path: '/admin/services' },
  { icon: LineChart, label: 'Analiz', path: '/admin/reports' },
  { icon: Settings, label: 'Müsaitlik', path: '/admin/availability' },
  { icon: SlidersHorizontal, label: 'Site Ayarları', path: '/admin/settings' },
];

export const staffNavItems: DashboardNavItem[] = [
  { icon: BarChart3, label: 'Rapor', path: '/admin/staff' },
  { icon: CalendarDays, label: 'Randevular', path: '/admin/appointments' },
  { icon: LineChart, label: 'Analiz', path: '/admin/reports' },
  { icon: Settings, label: 'Müsaitlik', path: '/admin/availability' },
];
