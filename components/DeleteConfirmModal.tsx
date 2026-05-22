"use client";

import { useState } from "react";
import {
  RiDeleteBinLine,
  RiCloseLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiChat3Line,
  RiAlertLine,
} from "react-icons/ri";

export interface DeleteAffectedRow {
  label: string;
  count: number;
  refs?: string[];
}

export interface DeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  /** Modal header title, e.g. "Delete Purchase Request?" */
  title: string;
  /** Identifier shown beneath the title, e.g. the PR / PO number */
  subtitle: string;
  /** Affected record rows (already filtered to count > 0 by caller) */
  rows: DeleteAffectedRow[];
  totalCount?: number;
  loadingPreview: boolean;
  /** Current value of the editable remark textarea */
  remarkText: string;
  onRemarkChange: (v: string) => void;
  /** The exact string the user must type to unlock the delete button */
  confirmTarget: string;
  confirmInput: string;
  onConfirmInputChange: (v: string) => void;
  /** True while the cascade delete is in progress */
  confirming: boolean;
  onDelete: () => void;
  deleteButtonLabel?: string;
}

export default function DeleteConfirmModal({
  visible,
  onClose,
  title,
  subtitle,
  rows,
  totalCount,
  loadingPreview,
  remarkText,
  onRemarkChange,
  confirmTarget,
  confirmInput,
  onConfirmInputChange,
  confirming,
  onDelete,
  deleteButtonLabel = "Confirm Delete",
}: DeleteConfirmModalProps) {
  const [affectedOpen, setAffectedOpen] = useState(false);

  if (!visible) return null;

  const canDelete =
    !confirming &&
    !loadingPreview &&
    confirmInput.trim() === confirmTarget.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!confirming) onClose(); }}
      />

      {/* Dialog */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto flex flex-col max-h-[90vh]">

        {/* ── Header (sticky) ── */}
        <div className="shrink-0 bg-red-600 px-6 py-5 text-white rounded-t-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <RiDeleteBinLine size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold leading-tight">{title}</h3>
                <p className="text-red-200 text-sm font-mono truncate">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => { if (!confirming) onClose(); }}
              className="shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <RiCloseLine size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">

          {/* ── Affected records (collapsible) ── */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setAffectedOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-gray-800">
                Affected Records
                {totalCount != null && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    {totalCount} total
                  </span>
                )}
              </span>
              {affectedOpen
                ? <RiArrowUpSLine size={18} className="text-gray-500 shrink-0" />
                : <RiArrowDownSLine size={18} className="text-gray-500 shrink-0" />}
            </button>

            {affectedOpen && (
              <div>
                {loadingPreview ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm">Counting linked records…</span>
                  </div>
                ) : rows.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No connected records found.</p>
                ) : (
                  rows.map((row, i) => (
                    <div key={i} className="border-t border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm text-gray-700">{row.label}</span>
                        <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">
                          {row.count}
                        </span>
                      </div>
                      {row.refs && row.refs.length > 0 && (
                        <p className="px-4 pb-2 -mt-0.5 text-[11px] text-gray-400 font-mono leading-relaxed">
                          {row.refs.join(", ")}
                        </p>
                      )}
                    </div>
                  ))
                )}
                {totalCount != null && rows.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-t border-red-200">
                    <span className="text-sm font-bold text-red-800">Total Records</span>
                    <span className="text-sm font-extrabold text-red-800">{totalCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Deletion remark (editable) ── */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <RiChat3Line size={14} className="text-gray-500" />
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Deletion Remark
              </label>
            </div>
            <textarea
              value={remarkText}
              onChange={(e) => onRemarkChange(e.target.value)}
              disabled={confirming}
              rows={3}
              className="w-full resize-none px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 placeholder-gray-300 disabled:opacity-50"
              placeholder="Auto-generated deletion note — edit if needed"
            />
            <p className="text-[11px] text-gray-400">
              This note will be saved to the remarks log after deletion.
            </p>
          </div>

          {/* ── Warning ── */}
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <RiAlertLine size={15} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 font-semibold leading-relaxed">
              This action is permanent and cannot be undone.
            </p>
          </div>

          {/* ── Confirm input ── */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
              Type{" "}
              <span className="font-mono text-red-600 normal-case">{confirmTarget}</span>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => onConfirmInputChange(e.target.value)}
              placeholder={confirmTarget}
              disabled={confirming}
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 font-mono placeholder-gray-300 disabled:opacity-50"
            />
          </div>
        </div>

        {/* ── Footer (sticky) ── */}
        <div className="shrink-0 px-6 pb-5 pt-3 border-t border-gray-100 bg-white rounded-b-2xl flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={onDelete}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirming ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Deleting…
              </>
            ) : deleteButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
