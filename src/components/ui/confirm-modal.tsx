import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  return (
    <AnimatePresence>
      {isOpen && (
        <div key="modal-wrapper" className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Background Overlay */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          {/* Modal Box */}
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-md relative z-10 mx-4"
          >
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${
                    type === 'danger' ? 'bg-red-50 text-red-600' :
                    type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <button onClick={onClose} className="text-slate-500 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 font-medium mb-8">
                  {description}
                </p>
                
                <div className="flex justify-end space-x-3">
                  {cancelText !== '' && (
                    <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 bg-white font-semibold px-6 text-slate-500 hover:bg-slate-100">
                      {cancelText}
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className={`rounded-xl font-bold px-6 ${
                      type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      type === 'success' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {confirmText}
                  </Button>
                </div>
              </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
