"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiSaveLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
} from "react-icons/ri";

interface PARPOProcessModalProps {
  prId: number;
  currentPrNo: string;
  onClose: () => void;
  onProcessed: (prId: number) => void;
}

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

export default function PARPOProcessModal({
  prId,
  currentPrNo,
  onClose,
  onProcessed,
}: PARPOProcessModalProps) {
  const supabase = createClient();

  const [processing, setProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      setErrorModal({ show: true, message: "Remarks are required!" });
      return;
    }

    setProcessing(true);

    try {
      // Get user ID for remarks
      let userId: number | null = null;
      let storedUser: { id?: number; username?: string; email?: string } | null = null;
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) storedUser = JSON.parse(s) as { id?: number; username?: string; email?: string };
        if (typeof storedUser?.id === "number") userId = storedUser.id;
      } catch {}

      if (userId === null && storedUser?.username) {
        const { data } = await supabase.from("users").select("id").eq("username", storedUser.username).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      if (userId === null && storedUser?.email) {
        const { data } = await supabase.from("users").select("id").eq("email", storedUser.email).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      // Update purchase_requests status to 3 (Processing BAC)
      const { error: updateErr } = await supabase
        .from("purchase_requests")
        .update({
          status_id: 6,
          status: "Canvassing (Reception)",
        })
        .eq("id", prId);

      if (updateErr) {
        setProcessing(false);
        setErrorModal({ show: true, message: `Error updating PR: ${updateErr.message}` });
        return;
      }

      // Save remarks
      const { error: remarksErr } = await supabase.from("remarks").insert({
        pr_id: prId,
        remark: remarks.trim(),
        user_id: userId || null,
        status_flag_id: 2,
      });

      if (remarksErr) {
        console.error("Error saving remark:", remarksErr);
        // Don't fail completely if remarks fail
      }

      setProcessing(false);
      setSuccessModal(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setProcessing(false);
      setErrorModal({ show: true, message: errorMsg });
      console.error("Save error:", error);
    }
  };

  const handleSuccessConfirm = () => {
    setSuccessModal(false);
    onProcessed(prId);
    onClose();
    // Auto reload page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

          {/* ── HEADER ── */}
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-bold">PARPO Processing</h2>
              <p className="text-rose-100 text-sm mt-0.5 font-mono">PR {currentPrNo}</p>
            </div>
            <button onClick={onClose} className="hover:bg-rose-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={22} />
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="px-6 py-6 space-y-5 overflow-y-auto max-h-[70vh]">

            {/* Info Banner */}
            <div className="flex items-start gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-rose-700">!</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-900">Signed Return to BAC</p>
                <p className="text-xs text-rose-700 mt-1">After submitting, this PR will be returned to BAC for processing.</p>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Remarks / Notes *</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={5}
                placeholder="Add remarks before signing and returning to BAC..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Remarks are required</p>
            </div>

          </div>

          {/* ── FOOTER ── */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={processing}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  <RiSaveLine size={16} /> Sign & Return to BAC
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-[70] bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <RiCheckboxCircleLine size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Signed & Returned!</h3>
            <p className="text-gray-600 mb-6">
              PR {currentPrNo} has been signed and returned to BAC. The page will reload automatically.
            </p>
            <button
              onClick={handleSuccessConfirm}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-[70] bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <RiErrorWarningLine size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-6">
              {errorModal.message}
            </p>
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