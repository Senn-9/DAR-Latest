"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiArrowDownSLine, RiArrowUpSLine, RiChat3Line, RiAlertLine, RiDeleteBinLine, RiCloseLine } from "react-icons/ri";
import { fetchDeliveryDeletePreview, deleteDeliveryDeep, type DeleteDeliveryPreview } from "@/utils/supabase/delivery";

interface DeleteDeliveryModalProps {
  visible: boolean;
  deliveryId: string | number | null;
  deliveryNo: string | null;
  onClose: () => void;
  onDeleted: (deliveryId: string) => void;
  roleId?: number;
}

export default function DeleteDeliveryModal({
  visible,
  deliveryId,
  deliveryNo,
  onClose,
  onDeleted,
  roleId,
}: DeleteDeliveryModalProps) {
  const [preview, setPreview] = useState<DeleteDeliveryPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmNo, setConfirmNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [affectedOpen, setAffectedOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!visible || deliveryId == null) return;
    setConfirmNo("");
    setSaving(false);
    setAffectedOpen(false);
    setPreview(null);
    setLoadingPreview(true);
    fetchDeliveryDeletePreview(deliveryId)
      .then((p) => {
        setPreview(p);
        const no = p?.deliveryNo ?? deliveryNo ?? `DEL#${deliveryId}`;
        const stored = localStorage.getItem("currentUser");
        const actor = stored ? (JSON.parse(stored)?.fullname ?? "Admin") : "Admin";
        setRemarkText(`[DELETED by ${actor}] Delivery: ${no}`);
      })
      .catch((e) => console.error("Failed to load preview:", e))
      .finally(() => setLoadingPreview(false));
  }, [visible, deliveryId]);

  if (!visible || deliveryId == null) return null;
  if (roleId !== undefined && roleId !== 1) return null;

  const targetNo = preview?.deliveryNo ?? deliveryNo ?? `DEL#${deliveryId}`;
  const canConfirm = !saving && confirmNo.trim().toUpperCase() === targetNo.toUpperCase();

  const handleDelete = async () => {
    if (!canConfirm || saving) return;
    setSaving(true);
    try {
      const stored = localStorage.getItem("currentUser");
      const userId = stored ? (JSON.parse(stored)?.id ?? null) : null;
      await supabase.from("remarks").insert({
        remark: remarkText,
        user_id: userId,
        delivery_id: Number(deliveryId),
        phase: "system",
      });
      await deleteDeliveryDeep(deliveryId);
      onDeleted(String(deliveryId));
      onClose();
    } catch (e: any) {
      console.error("Failed to delete delivery:", e);
      alert(e?.message ?? "Could not delete delivery.");
    } finally {
      setSaving(false);
    }
  };

  const affectedRows = preview ? [
    { label: "IAR Documents", count: preview.iarCount ?? 0 },
    { label: "LOA Documents", count: preview.loaCount ?? 0 },
    { label: "DV Documents",  count: preview.dvCount  ?? 0 },
    { label: "Remarks",       count: preview.remarksCount ?? 0 },
  ].filter((r) => r.count > 0) : [];
  const totalAffected = affectedRows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) onClose(); }} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="shrink-0 bg-red-700 px-6 py-5 text-white rounded-t-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <RiDeleteBinLine size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-widest uppercase text-red-200">Admin · Delete Delivery</p>
                <h2 className="text-lg font-bold truncate">{targetNo || "—"}</h2>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <RiCloseLine size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">

          {/* Affected records (collapsible) */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <button type="button" onClick={() => setAffectedOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
              <span className="text-sm font-semibold text-gray-800">
                Affected Records
                {totalAffected > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">{totalAffected}</span>
                )}
              </span>
              {affectedOpen ? <RiArrowUpSLine size={18} className="text-gray-500 shrink-0" /> : <RiArrowDownSLine size={18} className="text-gray-500 shrink-0" />}
            </button>
            {affectedOpen && (
              <div>
                {loadingPreview ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    <span className="text-sm">Counting linked records…</span>
                  </div>
                ) : affectedRows.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No linked documents found.</p>
                ) : affectedRows.map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{row.label}</span>
                    <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deletion remark */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <RiChat3Line size={14} className="text-gray-500" />
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Deletion Remark</label>
            </div>
            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full resize-none px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 placeholder-gray-300 disabled:opacity-50"
              placeholder="Auto-generated deletion note — edit if needed"
            />
            <p className="text-[11px] text-gray-400">This note will be saved to the remarks log after deletion.</p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <RiAlertLine size={15} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 font-semibold leading-relaxed">This action is permanent and cannot be undone.</p>
          </div>

          {/* Confirm input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
              Type <span className="font-mono text-red-600 normal-case">{targetNo}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmNo}
              onChange={(e) => setConfirmNo(e.target.value)}
              placeholder={targetNo}
              disabled={saving}
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 font-mono placeholder-gray-300 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 pb-5 pt-3 border-t border-gray-100 bg-white rounded-b-2xl flex gap-3">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={!canConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${
              canConfirm ? "bg-red-700 text-white hover:bg-red-800" : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } flex items-center justify-center gap-2`}>
            {saving ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Deleting…</>
            ) : "Delete Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
