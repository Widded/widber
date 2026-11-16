import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

type ToastOptions = {
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantMeta: Record<
  ToastVariant,
  { icon: React.ElementType; wrapper: string; iconWrapper: string }
> = {
  success: {
    icon: CheckCircle2,
    wrapper: 'border-emerald-100',
    iconWrapper: 'bg-emerald-50 text-emerald-600',
  },
  error: {
    icon: AlertCircle,
    wrapper: 'border-red-100',
    iconWrapper: 'bg-red-50 text-red-600',
  },
  info: {
    icon: Info,
    wrapper: 'border-blue-100',
    iconWrapper: 'bg-blue-50 text-blue-600',
  },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      clearTimer();
      const item: ToastItem = {
        ...options,
        id: Date.now(),
        variant: options.variant ?? 'success',
      };

      setToast(item);
      timeoutRef.current = window.setTimeout(
        () => setToast((current) => (current?.id === item.id ? null : current)),
        options.duration ?? 5000
      );
    },
    [clearTimer]
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleAction = async () => {
    if (!toast) return;

    const current = toast;
    hideToast();

    try {
      await current.onAction?.();
    } catch (error) {
      console.error('Toast action failed:', error);
    }
  };

  const meta = toast ? variantMeta[toast.variant ?? 'success'] : variantMeta.success;
  const Icon = meta.icon;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[150] mx-auto flex max-w-md justify-center sm:bottom-6 sm:inset-x-auto sm:right-6 sm:mx-0 lg:bottom-6">
        {toast && (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={cn(
              'toast-enter pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white p-3.5 shadow-xl shadow-slate-900/10',
              meta.wrapper
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                meta.iconWrapper
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>

            <p className="min-w-0 flex-1 pt-1 text-sm font-medium text-slate-700">
              {toast.message}
            </p>

            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => void handleAction()}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
              >
                {toast.actionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={hideToast}
              aria-label="Bildirimi kapat"
              className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};
