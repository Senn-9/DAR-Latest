"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiSaveLine,
  RiAttachmentLine,
  RiFileLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
} from "react-icons/ri";

interface BACProcessModalProps {
  prId: number;
  currentPrNo: string;
  onClose: () => void;
  onProcessed: (prId: number) => void;
}

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-gray-300";

export default function BACProcessModal({
  prId,
  currentPrNo,
  onClose,
  onProcessed,
}: BACProcessModalProps) {
  const supabase = createClient();

  const [processing, setProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [formData, setFormData] = useState({
    prNo: currentPrNo,
    appNo: "",
    remarks: "",
    attachment: null as File | null,
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, attachment: file }));
  };

  const handleSubmit = async () => {
    if (!formData.prNo.trim()) {
      setErrorModal({ show: true, message: "PR Number is required!" });
      return;
    }
    if (!formData.appNo.trim()) {
      setErrorModal({ show: true, message: "App Number is required!" });
      return;
    }

    setProcessing(true);

    try {
      let remarkText = formData.remarks.trim();
      let attachmentPublicUrl: string | null = null;

      // Upload attachment if provided
      if (formData.attachment) {
        const ext = formData.attachment.name.split(".").pop() || "bin";
        const path = `pr_attachments/${prId}_${Date.now()}.${ext}`;
        const uploadRes = await supabase.storage.from("attachments").upload(path, formData.attachment);
        if (!uploadRes.error) {
          const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path);
          attachmentPublicUrl = pub.publicUrl;
          if (attachmentPublicUrl) {
            remarkText = remarkText ? `${remarkText} Attachment: ${attachmentPublicUrl}` : `Attachment: ${attachmentPublicUrl}`;
          }
        } else {
          setProcessing(false);
          setErrorModal({ show: true, message: `Attachment upload failed: ${uploadRes.error.message}` });
          return;
        }
      }

      // Update purchase_requests with new pr_no, app_no, and new status to 5 (Processing PARPO)
      const { error: updateErr } = await supabase
        .from("purchase_requests")
        .update({ 
          pr_no: formData.prNo,
          app_no: formData.appNo,
          status_id: 5,
          status: "Processing (PARPO)",
        })
        .eq("id", prId);

      if (updateErr) {
        setProcessing(false);
        setErrorModal({ show: true, message: `Error updating PR: ${updateErr.message}` });
        return;
      }

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

      // Save remarks if provided
      if (remarkText || userId) {
        const { error: remarksErr } = await supabase.from("remarks").insert({
          pr_id: prId,
          remark: remarkText || null,
          user_id: userId || null,
        });

        if (remarksErr) {
          console.error("Error saving remark:", remarksErr);
          // Don't fail completely if remarks fail
        }
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
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-bold">BAC Processing</h2>
              <p className="text-purple-100 text-sm mt-0.5 font-mono">PR {currentPrNo}</p>
            </div>
            <button onClick={onClose} className="hover:bg-purple-500/50 p-2 rounded-lg transition-colors">
              <RiCloseLine size={22} />
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="px-6 py-6 space-y-5 overflow-y-auto max-h-[70vh]">

            {/* PR Number */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">PR Number *</label>
              <input
                className={inputCls}
                placeholder="e.g. PR-2024-001"
                value={formData.prNo}
                onChange={(e) => setFormData({ ...formData, prNo: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Update the PR number if needed</p>
            </div>

            {/* App Number */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">App Number *</label>
              <input
                className={inputCls}
                placeholder="e.g. APP-2024-001"
                value={formData.appNo}
                onChange={(e) => setFormData({ ...formData, appNo: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">BAC assigned application number</p>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Remarks / Notes</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Add any remarks or notes about this BAC processing..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>

            {/* File Attachment */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                File Attachment <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <RiAttachmentLine size={18} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  {formData.attachment ? (
                    <div className="flex items-center gap-2">
                      <RiFileLine size={14} className="text-purple-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-purple-700 truncate">{formData.attachment.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        ({(formData.attachment.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-600">Click to upload a file</p>
                      <p className="text-xs text-gray-400">PDF, DOCX, PNG, JPG up to 10MB</p>
                    </>
                  )}
                </div>
                {formData.attachment && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setFormData({ ...formData, attachment: null }); }}
                    className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <RiCloseLine size={16} />
                  </button>
                )}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls" onChange={handleFileChange} />
              </label>
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
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                  <RiSaveLine size={16} /> Process BAC
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Completed!</h3>
            <p className="text-gray-600 mb-6">
              BAC processing for PR {formData.prNo} has been completed successfully. The page will reload automatically.
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