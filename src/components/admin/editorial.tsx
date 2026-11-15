import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const primaryButton =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40';

export const secondaryButton =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

export const iconButton =
  'flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
};

export const PageHeader = ({ eyebrow, title, subtitle, actions }: PageHeaderProps) => (
  <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
    <div>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
        {eyebrow}
      </span>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">{actions}</div>}
  </div>
);

type PanelProps = {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export const Panel = ({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: PanelProps) => (
  <section
    className={cn(
      'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5',
      className
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action ??
        (Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-blue-600">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ))}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

type EmptyPanelProps = {
  icon: React.ElementType;
  title: string;
  text: string;
  className?: string;
};

export const EmptyPanel = ({ icon: Icon, title, text, className }: EmptyPanelProps) => (
  <div
    className={cn(
      'flex min-h-[200px] flex-col items-center justify-center text-center',
      className
    )}
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <p className="mt-3 text-sm font-medium text-slate-600">{title}</p>
    <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-slate-400">{text}</p>
  </div>
);

export const WarmStatusBadge = ({ status }: { status: string }) => {
  const meta =
    status === 'pending' || status === 'approved'
      ? {
          label: 'Onaylandı',
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          dot: 'bg-emerald-500',
        }
      : status === 'completed'
        ? {
            label: 'Tamamlandı',
            className: 'border-blue-200 bg-blue-50 text-blue-700',
            dot: 'bg-blue-500',
          }
        : {
            label: 'İptal',
            className: 'border-red-200 bg-red-50 text-red-700',
            dot: 'bg-red-500',
          };

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold',
        meta.className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

export const DeltaChip = ({ value }: { value: number | null }) => {
  if (value === null) return null;

  const positive = value >= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-semibold',
        positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
      )}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
      )}
      {Math.abs(value)}%
    </span>
  );
};
