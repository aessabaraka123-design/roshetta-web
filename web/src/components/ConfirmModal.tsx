"use client";

import { useStore } from "@/store";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isDestructive = true,
}: ConfirmModalProps) {
  const language = useStore((state: any) => state.language);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
        dir={language === 'en' ? 'ltr' : 'rtl'}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isDestructive ? 'bg-coral-pale text-coral' : 'bg-amber-pale text-amber'}`}>
              {isDestructive ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-ink">
              {title}
            </h3>
          </div>
          <p className="text-ink-soft text-[15px] leading-relaxed mb-8">
            {message}
          </p>
          <div className={`flex gap-3 ${language === 'en' ? 'justify-end' : 'justify-end'}`}>
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl font-bold text-ink-soft hover:bg-bg hover:text-ink transition-colors border border-transparent hover:border-mint-line"
            >
              {cancelText || (language === "en" ? "Cancel" : "إلغاء")}
            </button>
            <button
              onClick={onConfirm}
              className={`px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg ${
                isDestructive 
                  ? 'bg-coral hover:bg-opacity-90 shadow-coral/20' 
                  : 'bg-primary hover:bg-opacity-90 shadow-primary/20'
              }`}
            >
              {confirmText || (language === "en" ? "Confirm" : "تأكيد")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
