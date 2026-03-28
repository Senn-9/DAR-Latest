"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiCloseLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiCloseCircleLine,
  RiPencilLine,
  RiPauseCircleLine,
  RiAlertLine,
  RiSubtractLine,
  RiAttachmentLine,
  RiFileLine,
} from "react-icons/ri";

interface ProcessPRModalProps {
  prId: number;
  prNum: string;
  currentStatusId: number | null;
  onClose: () => void;
  onProcessed: (prId: number, newStatusId: number) => void;
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

export default function ProcessPRModal({
  prId,
  prNum,
  currentStatusId,
  onClose,
  onProcessed,
}: ProcessPRModalProps) {
  const supabase = createClient();

  const [processing, setProcessing]   = useState(false);
  const [flagOptions, setFlagOptions] = useState<FlagOption[]>([]);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [formData, setFormData] = useState({
    flagId:     1,
    remarks:    "",
    attachment: null as File | null,
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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

  const doProcess = async (targetStatus: number, successText: string) => {
    setProcessing(true);
    let remarkText = formData.remarks.trim();
    let attachmentPublicUrl: string | null = null;
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
        alert("Attachment upload failed: " + uploadRes.error.message);
        return;
      }
    }
    const { error: updateErr } = await supabase.from("pr_form").update({ status_id: targetStatus }).eq("pr_id", prId);
    if (updateErr) {
      setProcessing(false);
      alert("Error updating PR status: " + updateErr.message);
      return;
    }
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
    if (userId === null) {
      setProcessing(false);
      alert("Cannot determine user id for remark.");
      return;
    }
    const statusFlagId = selectedFlag.id;
    const { error: remarksErr } = await supabase.from("remarks").insert({
      prform_id: prId,
      remark: remarkText || null,
      status_flag_id: statusFlagId,
      user_id: userId,
    });
    if (remarksErr) {
      setProcessing(false);
      alert("Error saving remark: " + remarksErr.message);
      return;
    }
    setProcessing(false);
    alert(successText);
    onProcessed(prId, targetStatus);
    onClose();
  };

  const handleSendToBAC = async () => {
    const k = selectedFlag.label.toLowerCase();
    const allowed = k === "complete" || k === "urgent";
    if (!allowed) {
      alert("Send to BAC is allowed only for Complete or Urgent flags.");
      return;
    }
    await doProcess(3, `PR ${prNum} sent to BAC`);
  };

  const handleReturnToEndUser = async () => {
    const k = selectedFlag.label.toLowerCase();
    const blocked = k === "complete" || k === "urgent";
    if (blocked) {
      alert("Return to End User is available for flags other than Complete or Urgent.");
      return;
    }
    await doProcess(1, `PR ${prNum} returned to End User (Pending)`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 flex items-center justify-between text-white">
          <div>
            <h2 className="text-lg font-bold">Process Purchase Request</h2>
            <p className="text-emerald-100 text-sm mt-0.5 font-mono">{prNum}</p>
          </div>
          <button onClick={onClose} className="hover:bg-emerald-500/50 p-2 rounded-lg transition-colors">
            <RiCloseLine size={22} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="px-6 py-6 space-y-5 overflow-y-auto max-h-[70vh]">

          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <span className="font-semibold">Selected Flag:</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full font-semibold">
              {selectedFlag.label}
            </span>
          </div>

          {/* ── STATUS FLAG ── */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Processing Flag</label>

            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setShowFlagPicker(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
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
                        <RiCheckboxCircleLine size={18} className="text-emerald-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
                </div>
              </div>
            )}
          </div>

          {/* ── REMARKS ── */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Remarks / Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Add any remarks or notes about this PR..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          {/* ── FILE ATTACHMENT ── */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
              File Attachment <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <RiAttachmentLine size={18} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                {formData.attachment ? (
                  <div className="flex items-center gap-2">
                    <RiFileLine size={14} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-emerald-700 truncate">{formData.attachment.name}</span>
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
            onClick={handleReturnToEndUser}
            disabled={processing || ["complete", "urgent"].includes(selectedFlag.label.toLowerCase())}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? "Processing…" : "Return to End User"}
          </button>
          <button
            onClick={handleSendToBAC}
            disabled={processing || !["complete", "urgent"].includes(selectedFlag.label.toLowerCase())}
            className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? "Processing…" : "Send to BAC"}
          </button>
        </div>

      </div>
    </div>
  );
}
