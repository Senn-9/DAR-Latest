"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiSaveLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiUserLine,
  RiCalendarLine,
  RiFlagLine,
  RiTruckLine,
} from "react-icons/ri";
import { type PurchaseOrderRow } from "@/utils/supabase/po";
import { StatusFlagPicker, FlagButton, type StatusFlag, getFlagId } from "@/components/StatusFlagPicker";

interface POServingProcessModalProps {
  visible: boolean;
  po: PurchaseOrderRow | null;
  currentUser: { id?: number; username?: string; fullname?: string } | null;
  onClose: () => void;
  onSubmit: (statusId: number, remarks: string, statusFlagId?: number | null) => Promise<void>;
}

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-400";

export default function POServingProcessModal({
  visible,
  po,
  currentUser,
  onClose,
  onSubmit,
}: POServingProcessModalProps) {
  const supabase = createClient();

  const [processing, setProcessing] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [servingDate, setServingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [receivedBy, setReceivedBy] = useState("");
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [selectedFlag, setSelectedFlag] = useState<StatusFlag | null>(null);
  const [showFlagPicker, setShowFlagPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
      // Pre-fill receiver name if available
      if (currentUser?.fullname) {
        setReceivedBy(currentUser.fullname);
      }
    } else {
      setRemarks("");
      setReceivedBy(currentUser?.fullname || "");
      setServingDate(new Date().toISOString().split("T")[0]);
      setSelectedFlag(null);
      setShowFlagPicker(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible, currentUser]);

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      setErrorModal({ show: true, message: "Remarks are required!" });
      return;
    }

    setProcessing(true);

    try {
      // Combine Serving info with remarks
      const fullRemarks = `Serving Date: ${servingDate} | Received By: ${receivedBy || "N/A"}\n${remarks}`;
      
      const flagId = selectedFlag ? getFlagId(selectedFlag) : null;
      await onSubmit(34, fullRemarks, flagId); // Move to status 34 (Completed PO Phase)
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setErrorModal({ show: true, message: errorMsg });
      console.error("Serving processing error:", error);
    } finally {
      setProcessing(false);
    }
  };

  if (!visible || !po) return null;

  const fmtMoney = (val: number | null | undefined) =>
    val != null ? `₱${val.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₱0.00";

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

          {/* ── HEADER ── */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-bold">PO Serving Processing</h2>
              <p className="text-emerald-100 text-sm mt-0.5 font-mono">{po.po_no ?? "Unknown PO"}</p>
            </div>
            <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={22} />
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="px-6 py-6 space-y-5 overflow-y-auto max-h-[70vh]">

            {/* PO Info Banner */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">PR Number</p>
                <p className="font-semibold text-gray-900">{po.pr_no ?? "—"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Supplier</p>
                <p className="font-semibold text-gray-900 truncate">{po.supplier ?? "—"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-semibold text-emerald-700">{fmtMoney(po.total_amount)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Current Status</p>
                <p className="font-semibold text-emerald-700">PO (Serving)</p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RiTruckLine size={12} className="text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">PO Serving Completion</p>
                <p className="text-xs text-emerald-700 mt-1">
                  This PO is ready for serving/delivery. Confirm receipt details to complete the PO phase.
                </p>
              </div>
            </div>

            {/* Next Status Display */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Next Phase</p>
              <div className="flex items-center gap-2">
                <RiCheckboxCircleLine size={20} className="text-green-600" />
                <span className="font-bold text-green-800">Completed (PO Phase)</span>
              </div>
            </div>

            {/* Serving Date and Received By */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-2 flex items-center gap-1">
                  <RiCalendarLine size={14} />
                  Serving Date
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={servingDate}
                  onChange={(e) => setServingDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-2 flex items-center gap-1">
                  <RiUserLine size={14} />
                  Received By
                </label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Receiver name"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                />
              </div>
            </div>

            {/* Status Flag Picker */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2 flex items-center gap-1">
                <RiFlagLine size={14} />
                Status Flag
              </label>
              <FlagButton
                selected={selectedFlag}
                onPress={() => setShowFlagPicker(true)}
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                Remarks / Notes *
              </label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={4}
                placeholder="Add remarks about PO serving/delivery..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Remarks are required</p>
            </div>

          </div>

          {/* ── FOOTER ── */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={processing}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <RiCheckboxCircleLine size={18} />
                  Complete PO Phase
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status Flag Picker Modal */}
      <StatusFlagPicker
        visible={showFlagPicker}
        selected={selectedFlag}
        onSelect={(flag) => setSelectedFlag(flag)}
        onClose={() => setShowFlagPicker(false)}
      />

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-[70] bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <RiErrorWarningLine size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-6">{errorModal.message}</p>
            <button
              onClick={() => setErrorModal({ show: false, message: "" })}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </>
  );
}
