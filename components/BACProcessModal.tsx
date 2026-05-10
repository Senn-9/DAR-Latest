"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiSaveLine,
  RiAttachmentLine,
  RiFileLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiCloseCircleLine,
  RiPencilLine,
  RiPauseCircleLine,
  RiAlertLine,
  RiSubtractLine,
} from "react-icons/ri";
import { SuccessModal, ErrorModal } from "@/components/StatusModal";

interface BACProcessModalProps {
  prId: number;
  currentPrNo: string;
  onClose: () => void;
  onProcessed: (prId: number) => void;
}

type FlagOption = {
  id: number;
  label: string;
  slug: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const iconForSlug = (slug: string) => {
  if (slug === "complete") return <RiCheckboxCircleLine size={16} />;
  if (slug === "incomplete_info") return <RiInformationLine size={16} />;
  if (slug === "wrong_information") return <RiCloseCircleLine size={16} />;
  if (slug === "needs_revision") return <RiPencilLine size={16} />;
  if (slug === "on_hold") return <RiPauseCircleLine size={16} />;
  if (slug === "urgent") return <RiAlertLine size={16} />;
  return <RiSubtractLine size={16} />;
};

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
  const [flagOptions, setFlagOptions] = useState<FlagOption[]>([]);
  const [showFlagPicker, setShowFlagPicker] = useState(false);

  const [formData, setFormData] = useState({
    prNo: currentPrNo,
    remarks: "",
    attachment: null as File | null,
    flagId: 1,
  });

  useEffect(() => {
    const fetchFlags = async () => {
      const { data } = await supabase.from("status_flag").select("id, flag_name").order("id", { ascending: true });
      const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "_");
      const opts: FlagOption[] = (data || []).map((row: { id: number; flag_name: string }) => ({
        id: row.id,
        label: row.flag_name,
        slug: toSlug(row.flag_name),
        description:
          row.flag_name === "Complete" ? "All information is correct and complete." :
          row.flag_name === "Incomplete Info" ? "Required fields or attachments are missing." :
          row.flag_name === "Wrong Information" ? "Submitted data contains errors that must be corrected." :
          row.flag_name === "Needs Revision" ? "Minor corrections needed before forwarding." :
          row.flag_name === "On Hold" ? "Processing paused pending clarification." :
          row.flag_name === "Urgent" ? "Requires immediate attention." :
          "Leave flag unset",
        icon: iconForSlug(toSlug(row.flag_name)),
        iconBg: "bg-gray-100",
        iconColor: "text-gray-500",
      }));
      setFlagOptions(opts);
      const noFlag = opts.find((o) => o.slug === "no_flag")?.id ?? opts[0]?.id ?? 1;
      setFormData((prev) => ({ ...prev, flagId: noFlag }));
    };
    fetchFlags();
  }, [supabase]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, attachment: file }));
  };

  const selectedFlag = flagOptions.find((f) => f.id === formData.flagId) ?? {
    id: 1,
    label: "No Flag",
    description: "Leave flag unset",
    icon: iconForSlug("no_flag"),
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  };

  const handleSubmit = async () => {
    if (!formData.prNo.trim()) {
      setErrorModal({ show: true, message: "PR Number is required!" });
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

      // Update purchase_requests with new pr_no and new status to 4 (Processing Budget)
      const { error: updateErr } = await supabase
        .from("purchase_requests")
        .update({
          pr_no: formData.prNo,
          status_id: 4,
          status: "Processing (Budget)",
          updated_at: new Date().toISOString(),
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

      // Save remarks with selected status flag
      const statusFlagId = selectedFlag.id;
      if (remarkText || userId || statusFlagId) {
        const { error: remarksErr } = await supabase.from("remarks").insert({
          pr_id: prId,
          remark: remarkText || null,
          user_id: userId || null,
          status_flag_id: statusFlagId,
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

            {/* ── STATUS FLAG ── */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Processing Flag</label>

              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setShowFlagPicker(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedFlag.iconBg} ${selectedFlag.iconColor}`}>
                  {selectedFlag.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{selectedFlag.label}</p>
                  <p className="text-xs text-gray-400 truncate">{selectedFlag.description}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Flag picker MODAL */}
              {showFlagPicker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFlagPicker(false)} />
                  <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    {/* Modal header */}
                    <div className="px-5 py-4 bg-gray-800 text-white flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Processing Flag</p>
                        <p className="text-base font-bold mt-0.5">Select Status Flag</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFlagPicker(false)}
                        className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                      >
                        <RiCloseLine size={20} />
                      </button>
                    </div>
                    {/* Options */}
                    <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                      {flagOptions.map((flag) => {
                        const isSelected = formData.flagId === flag.id;
                        return (
                          <button
                            key={flag.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, flagId: flag.id });
                              setShowFlagPicker(false);
                            }}
                            className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"}`}
                          >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${flag.iconBg} ${flag.iconColor}`}>
                              {flag.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800">{flag.label}</p>
                              <p className="text-xs text-gray-400">{flag.description}</p>
                            </div>
                            {isSelected && (
                              <RiCheckboxCircleLine size={18} className="text-purple-600 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
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

      <SuccessModal
        visible={successModal}
        title="Processing Completed!"
        message={`BAC processing for PR ${formData.prNo} has been completed successfully.`}
        onConfirm={handleSuccessConfirm}
      />
      <ErrorModal
        visible={errorModal.show}
        message={errorModal.message}
        onDismiss={() => setErrorModal({ show: false, message: "" })}
      />
    </>
  );
}