"use client";

import { useState, useEffect } from "react";
import { RiDeleteBinLine, RiCloseLine, RiFileListLine, RiCheckboxCircleLine, RiReceiptLine } from "react-icons/ri";
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
  const [confirmWord, setConfirmWord] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || deliveryId == null) return;
    setConfirmNo("");
    setConfirmWord("");
    setSaving(false);
    setPreview(null);
    setLoadingPreview(true);
    fetchDeliveryDeletePreview(deliveryId)
      .then(setPreview)
      .catch((e) => {
        console.error("Failed to load preview:", e);
      })
      .finally(() => setLoadingPreview(false));
  }, [visible, deliveryId]);

  if (!visible || deliveryId == null) return null;
  if (roleId !== undefined && roleId !== 1 && roleId !== 8) return null;

  const targetNo = preview?.deliveryNo ?? deliveryNo ?? `DEL#${deliveryId}`;
  const canConfirm =
    confirmNo.trim().toUpperCase() === targetNo.toUpperCase() &&
    confirmWord.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!canConfirm || saving) return;
    setSaving(true);
    try {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform -translate-y-1/2 top-1/2">
        {/* Header */}
        <div className="px-6 py-4 bg-red-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-bold tracking-widest uppercase text-red-200">
                Admin · Delete Delivery
              </p>
              <h2 className="text-lg font-bold">{targetNo || "—"}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <RiCloseLine size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <RiDeleteBinLine size={18} className="text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">
                Permanent deletion
              </p>
              <p className="text-xs text-red-700 mt-1 leading-5">
                This will delete the delivery record and its linked IAR / LOA / DV documents and remarks. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-sm font-bold text-gray-900">
              Delete Scope
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-5">
              Deletion is scoped by primary keys. A Delivery delete removes Delivery-owned documents linked via delivery_id.
            </p>
            <div className="mt-2 rounded-xl bg-gray-50 px-3 py-2.5 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">
                Includes
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-5">
                This delivery log and its IAR/LOA/DV document rows and remarks.
              </p>
            </div>
            <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2.5 border border-amber-200">
              <p className="text-xs font-bold text-amber-800">
                Excludes
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-5">
                The connected PO (and its items/remarks) and any linked PR records. Only this Delivery record is removed.
              </p>
            </div>
          </div>

          {loadingPreview ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-semibold">Loading deletion impact…</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-teal-50 border border-teal-200 rounded-xl py-2.5 px-2 text-center">
                <RiFileListLine size={16} className="text-teal-700 mx-auto" />
                <p className="text-sm font-bold mt-1 text-teal-700">{preview?.iarCount ?? 0}</p>
                <p className="text-xs font-bold text-teal-600 mt-0.5">IAR</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl py-2.5 px-2 text-center">
                <RiCheckboxCircleLine size={16} className="text-purple-700 mx-auto" />
                <p className="text-sm font-bold mt-1 text-purple-700">{preview?.loaCount ?? 0}</p>
                <p className="text-xs font-bold text-purple-600 mt-0.5">LOA</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl py-2.5 px-2 text-center">
                <RiReceiptLine size={16} className="text-blue-700 mx-auto" />
                <p className="text-sm font-bold mt-1 text-blue-700">{preview?.dvCount ?? 0}</p>
                <p className="text-xs font-bold text-blue-600 mt-0.5">DV</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl py-2.5 px-2 text-center">
                <RiFileListLine size={16} className="text-orange-700 mx-auto" />
                <p className="text-sm font-bold mt-1 text-orange-700">{preview?.remarksCount ?? 0}</p>
                <p className="text-xs font-bold text-orange-600 mt-0.5">Remarks</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-bold text-gray-900">
              Confirm deletion
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Type the exact Delivery No. and then type DELETE to unlock the button.
            </p>

            <p className="text-xs font-bold text-gray-600 mt-4 mb-1">
              Delivery No.
            </p>
            <input
              type="text"
              value={confirmNo}
              onChange={(e) => setConfirmNo(e.target.value)}
              placeholder={targetNo}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
            />

            <p className="text-xs font-bold text-gray-600 mt-3 mb-1">
              Type DELETE
            </p>
            <input
              type="text"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (window.confirm("Delete delivery permanently? This cannot be undone. Continue?")) {
                handleDelete();
              }
            }}
            disabled={!canConfirm || saving}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors ${
              canConfirm && !saving
                ? "bg-red-700 text-white hover:bg-red-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? "Deleting…" : "Delete Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
