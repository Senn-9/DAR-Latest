"use client";

import { RiCheckboxCircleLine, RiErrorWarningLine } from "react-icons/ri";

/* ─────────────────────────────────────────────────────────────
   Shared success / error modal components.
   Used across all process, budget, and user-management modals.
───────────────────────────────────────────────────────────── */

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
}

interface ErrorModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
  dismissLabel?: string;
}

export function SuccessModal({
  visible,
  title = "Success!",
  message,
  onConfirm,
  confirmLabel = "Continue",
}: SuccessModalProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-[70] bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <RiCheckboxCircleLine size={32} className="text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function ErrorModal({
  visible,
  title = "Error",
  message,
  onDismiss,
  dismissLabel = "Okay",
}: ErrorModalProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-[70] bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <RiErrorWarningLine size={32} className="text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onDismiss}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
