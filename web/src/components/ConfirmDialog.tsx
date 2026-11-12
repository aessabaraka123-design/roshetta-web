"use client";

import React, { useEffect } from "react";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  loading = false,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const btnCls =
    tone === "danger"
      ? "bg-coral text-white hover:bg-coral/90"
      : "bg-primary text-white hover:bg-primary/90";

  return (
    <div
      className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-white rounded-[24px] w-full max-w-md border border-mint-line shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-mint-line flex items-center justify-between bg-bg/50">
          <h3 id="confirm-dialog-title" className="text-[15px] font-black text-ink">
            {title}
          </h3>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white border border-mint-line text-ink-soft hover:text-ink font-black disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 text-[13px] font-bold text-ink-soft leading-relaxed">
          {message}
        </div>

        <div className="px-5 py-3.5 border-t border-mint-line bg-bg/40 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            data-testid="confirm-dialog-cancel"
            className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-ink-soft hover:bg-bg disabled:opacity-50"
          >
            {cancelLabel || "إلغاء"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            data-testid="confirm-dialog-accept"
            className={`px-5 py-2 rounded-[12px] text-[13px] font-black disabled:opacity-50 shadow-sm ${btnCls}`}
          >
            {loading ? "..." : confirmLabel || "تأكيد"}
          </button>
        </div>
      </div>
    </div>
  );
}
