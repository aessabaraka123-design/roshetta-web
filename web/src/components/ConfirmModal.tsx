"use client";

import type { ReactNode } from "react";
import { useStore } from "@/store";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
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
  isLoading = false,
  errorMessage = "",
}: ConfirmModalProps) {
  const language = useStore((state: any) => state.language);
  const isEn = language === "en";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm"
      onClick={() => !isLoading && onCancel()}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-mint-line transform transition-all"
        dir={isEn ? "ltr" : "rtl"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDestructive ? "bg-coral/10 text-coral" : "bg-primary/10 text-primary"
            }`}
          >
            {isDestructive ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          <h3 className="text-[20px] font-black text-ink mb-2">{title}</h3>
          <div className="text-ink-soft text-[14px] leading-relaxed mb-2">{message}</div>

          {errorMessage && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[13px] font-bold text-center flex items-center justify-center gap-1.5">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="flex border-t border-mint-line bg-bg/50">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="flex-1 py-4 text-[15px] font-bold text-ink-soft hover:bg-black/5 hover:text-ink transition-colors disabled:opacity-50"
          >
            {cancelText || (isEn ? "Cancel" : "تراجع")}
          </button>
          <div className="w-[1px] bg-mint-line" />
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 py-4 text-[15px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isDestructive
                ? "text-coral hover:bg-coral hover:text-white"
                : "text-primary hover:bg-primary hover:text-white"
            }`}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            <span>{confirmText || (isEn ? "Confirm" : "تأكيد")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
