import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = 'max-w-md'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-wrapper"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center"
        >
          {/* Background Overlay */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          {/* Modal Box */}
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative z-10 mx-0 flex h-[100dvh] max-h-[100dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:mx-4 sm:h-auto sm:max-h-[90dvh] sm:rounded-xl`}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    {icon}
                  </div>
                )}
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Kapat"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
