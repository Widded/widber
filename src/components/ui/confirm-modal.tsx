import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  type?: 'danger' | 'success' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'warning',
  confirmText = 'Onayla',
  cancelText = 'İptal',
  showCancelButton = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Background Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative z-10 mx-4 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div
              className={`rounded-xl p-3 ${
                type === 'danger'
                  ? 'bg-red-50 text-red-600'
                  : type === 'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-blue-50 text-blue-600'
              }`}
            >
              {type === 'success' ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <AlertCircle className="h-6 w-6" />
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mb-8 font-medium text-slate-500">{description}</p>

          <div className="flex justify-end space-x-3">
            {showCancelButton && cancelText !== '' && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl border-slate-200 bg-white px-6 font-semibold text-slate-500 hover:bg-slate-100"
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`rounded-xl px-6 font-bold ${
                type === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
