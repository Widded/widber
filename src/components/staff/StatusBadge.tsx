import React from 'react';
import { cn } from '../../lib/utils';
import { getStatusMeta } from '../../lib/appointmentUtils';

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const meta = getStatusMeta(status);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]',
        meta.badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
};
