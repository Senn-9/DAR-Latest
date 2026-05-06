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
  RiInformationLine,
  RiCloseCircleLine,
  RiPencilLine,
  RiPauseCircleLine,
  RiAlertLine,
  RiSubtractLine,
} from "react-icons/ri";

interface BudgetModalProps {
  prId: number;
  currentPrNo: string;
  prData?: {
    office_section?: string;
    purpose?: string;
    total_cost?: number;
    status?: string;
    entity_name?: string;
    fund_cluster?: string;
    req_name?: string;
    app_name?: string;
    app_no?: string;
    resp_code?: string;
  };
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
  "w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-300";

export default function BudgetModal({
  prId,
  currentPrNo,
  prData,
  onClose,
  onProcessed,
}: BudgetModalProps) {
  const supabase = createClient();

  const [processing, setProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });

  const [flagOptions, setFlagOptions] = useState<FlagOption[]>([]);
  const [showFlagPicker, setShowFlagPicker] = useState(false);

  const [formData, setFormData] = useState({
    flagId: 1,
    remarks: "",
    attachment: null as File | null,
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchFlags = async () => {
      const { data } = await supabase
        .from("status_flag")
        .select("id, flag_name")
        .order("id", { ascending: true });
      const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "_");
      const opts: FlagOption[] = (data || []).map((row: { id: number; flag_name: string }) => ({
        id: row.id,
        label: row.flag_name,
        slug: toSlug(row.flag_name),
        description:
          row.flag_name === "Complete"
            ? "All information is correct and complete."
            : row.flag_name === "Incomplete Info"
            ? "Required fields or attachments are missing."
            : row.flag_name === "Wrong Information"
            ? "Submitted data contains errors that must be corrected."
            : row.flag_name === "Needs Revision"
            ? "Minor corrections needed before forwarding."
            : row.flag_name === "On Hold"
            ? "Processing paused pending clarification."
            : row.flag_name === "Urgent"
            ? "Requires immediate attention."
            : "Leave flag unset",
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

  const selectedFlag = flagOptions.find((f) => f.id === formData.flagId) ?? {
    id: 1,
    label: "No Flag",
    description: "Leave flag unset",
    icon: iconForSlug("no_flag"),
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, attachment: file }));
  };

  const handleSubmit = async () => {
    setProcessing(true);

    try {
      let remarkText = formData.remarks.trim();
      let attachmentPublicUrl: string | null = null;

      // ── Upload attachment if provided ──────────────────────────────────────
      if (formData.attachment) {
        const ext = formData.attachment.name.split(".").pop() || "bin";
        const path = `pr_attachments/${prId}_${Date.now()}.${ext}`;
        const uploadRes = await supabase.storage
          .from("attachments")
          .upload(path, formData.attachment);

        if (!uploadRes.error) {
          const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path);
          attachmentPublicUrl = pub.publicUrl;
          if (attachmentPublicUrl) {
            remarkText = remarkText
              ? `${remarkText} Attachment: ${attachmentPublicUrl}`
              : `Attachment: ${attachmentPublicUrl}`;
          }
        } else {
          setProcessing(false);
          setErrorModal({
            show: true,
            message: `Attachment upload failed: ${uploadRes.error.message}`,
          });
          return;
        }
      }

      // ── Get status flag ID ─────────────────────────────────────────────────
      const statusFlagId = selectedFlag.id;

      // ── Update purchase_requests → status_id: 5 (Processing PARPO) ───────
      const { error: updateErr } = await supabase
        .from("purchase_requests")
        .update({
          status_id: 5,
          status: "Processing (PARPO)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", prId);

      if (updateErr) {
        setProcessing(false);
        setErrorModal({ show: true, message: `Error updating PR: ${updateErr.message}` });
        return;
      }

      // ── Resolve user ID ────────────────────────────────────────────────────
      let userId: number | null = null;
      let storedUser: { id?: number; username?: string; email?: string } | null = null;

      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) storedUser = JSON.parse(s) as { id?: number; username?: string; email?: string };
        if (typeof storedUser?.id === "number") userId = storedUser.id;
      } catch {}

      if (userId === null && storedUser?.username) {
        const { data } = await supabase
          .from("users")
          .select("id")
          .eq("username", storedUser.username)
          .maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number")
          userId = (data as { id: number }).id;
      }

      if (userId === null && storedUser?.email) {
        const { data } = await supabase
          .from("users")
          .select("id")
          .eq("email", storedUser.email)
          .maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number")
          userId = (data as { id: number }).id;
      }

      // ── Insert remark (pr_id is always set — fixes the NULL bug) ──────────
      if (remarkText || statusFlagId !== null || userId !== null) {
        const { error: remarksErr } = await supabase.from("remarks").insert({
          pr_id: prId,            // ← always provide; was saving NULL before
          remark: remarkText || null,
          status_flag_id: statusFlagId,
          user_id: userId,
        });

        if (remarksErr) {
          console.error("Error saving remark:", remarksErr);
          // Non-fatal — don't block the flow
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
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatCurrency = (val?: number) =>
    val != null
      ? `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "—";

  const display = (v?: string) => v?.trim() || "—";

  return (
    <>
      {/* ================================================================
          MAIN MODAL
      ================================================================ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

          {/* HEADER */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-5 flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-bold">Budget Earmarking</h2>
              <p className="text-orange-100 text-sm mt-0.5 font-mono">
                {new Date().toLocaleDateString("en-PH")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-orange-500/50 p-2 rounded-lg transition-colors"
            >
              <RiCloseLine size={22} />
            </button>
          </div>

          {/* BODY */}
          <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-[70vh]">

            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-700">
              <span className="font-semibold">Selected Flag:</span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 rounded-full font-semibold">
                {selectedFlag.label}
              </span>
            </div>

            {/* ── PR SUMMARY ─────────────────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                PR Summary
              </h3>
              <div className=" bg-gray-100 rounded-xl p-4">

                <div className="flex justify-between items-center w-full mb-2">
                  <p className="text-xs text-gray-500 font-medium">PR No.</p>
                  <p className="text-sm font-light text-gray-900">{currentPrNo}</p>
                </div>

                {/* <div>
                  <p className="text-xs text-gray-400 font-medium">Resp. Code</p>
                  <p className="text-sm font-semibold text-gray-900">{display(prData?.resp_code)}</p>
                </div> */}

                <div className="flex justify-between items-center w-full mb-2">
                  <p className="text-xs text-gray-500 font-medium">Office / Section</p>
                  <p className="text-sm font-light text-gray-900">{display(prData?.office_section)}</p>
                </div>

                <div className="flex justify-between items-center w-full mb-2">
                  <p className="text-xs text-gray-500 font-medium">Purpose</p>
                  <p className="text-sm font-light text-gray-900">{display(prData?.purpose)}</p>
                </div>

                <div className="flex justify-between items-center w-full mb-2">
                  <p className="text-xs text-gray-500 font-medium">Total Cost</p>
                  <p className="text-sm font-light text-gray-900">{formatCurrency(prData?.total_cost)}</p>
                </div>

                {/* <div>
                  <p className="text-xs text-gray-400 font-medium">Fund Cluster</p>
                  <p className="text-sm font-semibold text-gray-900">{display(prData?.fund_cluster)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-medium">Entity Name</p>
                  <p className="text-sm font-semibold text-gray-900">{display(prData?.entity_name)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-medium">App No.</p>
                  <p className="text-sm font-semibold text-gray-900">{display(prData?.app_no)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-medium">Requested By</p>
                  <p className="text-sm font-semibold text-gray-900">{display(prData?.req_name)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-medium">Approved By</p>
                  <p className="text-sm font-semibold text-gray-900">{display(prData?.app_name)}</p>
                </div> */}

                <div className="flex justify-between items-center w-full mb-2">
                  <p className="text-xs text-gray-500 font-medium">Status</p>
                  <p className="text-sm font-light text-gray-900">{display(prData?.status)}</p>
                </div>

              </div>
            </div>

            {/* ── REMARKS ───────────────────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Remarks
              </h3>

              {/* Status Flag */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                  Status Flag
                </label>

                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setShowFlagPicker(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedFlag.iconBg} ${selectedFlag.iconColor}`}
                  >
                    {selectedFlag.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{selectedFlag.label}</p>
                    <p className="text-xs text-gray-400 truncate">{selectedFlag.description}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Flag picker MODAL */}
                {showFlagPicker && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                      onClick={() => setShowFlagPicker(false)}
                    />
                    <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                      {/* Modal header */}
                      <div className="px-5 py-4 bg-gray-800 text-white flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Processing Flag
                          </p>
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
                              className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                                isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${flag.iconBg} ${flag.iconColor}`}
                              >
                                {flag.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800">{flag.label}</p>
                                <p className="text-xs text-gray-400">{flag.description}</p>
                              </div>
                              {isSelected && (
                                <RiCheckboxCircleLine
                                  size={18}
                                  className="text-orange-600 flex-shrink-0"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Earmarking Notes */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                  Remarks
                </label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  placeholder="Add remarks for budget review before forwarding to PARPO."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
                  Attachment{" "}
                  <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <RiAttachmentLine
                      size={18}
                      className="text-gray-400 group-hover:text-orange-600 transition-colors"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {formData.attachment ? (
                      <div className="flex items-center gap-2">
                        <RiFileLine size={14} className="text-orange-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-orange-700 truncate">
                          {formData.attachment.name}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          ({(formData.attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-600">Tap to attach a file</p>
                        <p className="text-xs text-gray-400">PDF, DOCX, XLS up to 10MB</p>
                      </>
                    )}
                  </div>
                  {formData.attachment && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, attachment: null });
                      }}
                      className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <RiCloseLine size={16} />
                    </button>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={processing}
              className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  <RiSaveLine size={16} />Forward to PARPO
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================
          SUCCESS MODAL
      ================================================================ */}
      {successModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-[70] bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <RiCheckboxCircleLine size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Earmarking Completed!</h3>
            <p className="text-gray-600 mb-6">
              Budget earmarking for PR <strong>{currentPrNo}</strong> has been completed
              successfully. The page will reload automatically.
            </p>
            <button
              onClick={handleSuccessConfirm}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          ERROR MODAL
      ================================================================ */}
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
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </>
  );
}