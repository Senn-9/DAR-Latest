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

type PRStatus = { id: number; status_name: string };

interface ProcessPRModalProps {
  prId: number;
  prNum: string;
  currentStatusId: number | null;
  onClose: () => void;
  onProcessed: (prId: number, newStatusId: number) => void;
}

type FlagOption = {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const FLAG_OPTIONS: FlagOption[] = [
  {
    value: "no_flag",
    label: "No flag",
    description: "Leave flag unset",
    icon: <RiSubtractLine size={16} />,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  {
    value: "complete",
    label: "Complete",
    description: "All information is correct and complete.",
    icon: <RiCheckboxCircleLine size={16} />,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  {
    value: "incomplete_info",
    label: "Incomplete Info",
    description: "Required fields or attachments are missing.",
    icon: <RiInformationLine size={16} />,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  {
    value: "wrong_information",
    label: "Wrong Information",
    description: "Submitted data contains errors that must be corrected.",
    icon: <RiCloseCircleLine size={16} />,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  {
    value: "needs_revision",
    label: "Needs Revision",
    description: "Minor corrections needed before forwarding.",
    icon: <RiPencilLine size={16} />,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  {
    value: "on_hold",
    label: "On Hold",
    description: "Processing paused pending clarification.",
    icon: <RiPauseCircleLine size={16} />,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Requires immediate attention.",
    icon: <RiAlertLine size={16} />,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
];

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

  const [prStatuses, setPRStatuses]   = useState<PRStatus[]>([]);
  const [processing, setProcessing]   = useState(false);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [formData, setFormData] = useState({
    new_status_id: "" as string | number,
    flag:          "no_flag",
    remarks:       "",
    attachment:    null as File | null,
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    supabase.from("pr_status").select("id, status_name").then(({ data, error }) => {
      if (!error) setPRStatuses((data || []) as PRStatus[]);
    });
  }, [supabase]);

  const selectedFlag = FLAG_OPTIONS.find((f) => f.value === formData.flag) ?? FLAG_OPTIONS[0];
  const currentStatus = prStatuses.find((s) => s.id === currentStatusId)?.status_name || "Unknown";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, attachment: file }));
  };

  const handleProcess = async () => {
    if (!formData.new_status_id) {
      alert("Please select a new status.");
      return;
    }
    setProcessing(true);

    const updatePayload: Record<string, any> = {
      status_id: Number(formData.new_status_id),
      flag:      formData.flag !== "no_flag" ? formData.flag : null,
      remarks:   formData.remarks.trim() || null,
    };

    // If there's an attachment, upload it first
    if (formData.attachment) {
      const ext  = formData.attachment.name.split(".").pop();
      const path = `pr_attachments/${prId}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("attachments")
        .upload(path, formData.attachment);
      if (!uploadErr) updatePayload.attachment_path = path;
    }

    const { error } = await supabase
      .from("pr_form")
      .update(updatePayload)
      .eq("pr_id", prId);

    setProcessing(false);

    if (error) {
      console.error("Error processing PR:", error);
      alert("Error processing PR: " + error.message);
      return;
    }

    onProcessed(prId, Number(formData.new_status_id));
    onClose();
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

          {/* Current status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
            <span className="font-semibold">Current Status:</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-semibold">
              {currentStatus}
            </span>
          </div>

          {/* Update Status */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
              Update Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.new_status_id}
              onChange={(e) => setFormData({ ...formData, new_status_id: e.target.value })}
              className={inputCls}
            >
              <option value="">— Select new status —</option>
              {prStatuses
                .filter((s) => s.id !== currentStatusId)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.status_name}</option>
                ))}
            </select>
          </div>

          {/* ── STATUS FLAG ── */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Processing Flag</label>

            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setShowFlagPicker((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedFlag.iconBg} ${selectedFlag.iconColor}`}>
                {selectedFlag.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{selectedFlag.label}</p>
                <p className="text-xs text-gray-400 truncate">{selectedFlag.description}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showFlagPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Flag picker dropdown */}
            {showFlagPicker && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
                {/* Picker header */}
                <div className="px-4 py-3 bg-gray-800 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Processing Flag</p>
                  <p className="text-base font-bold mt-0.5">Select Status Flag</p>
                </div>
                {/* Options */}
                <div className="divide-y divide-gray-100">
                  {FLAG_OPTIONS.map((flag) => {
                    const isSelected = formData.flag === flag.value;
                    return (
                      <button
                        key={flag.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, flag: flag.value });
                          setShowFlagPicker(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"}`}
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
            onClick={handleProcess}
            disabled={processing || !formData.new_status_id}
            className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                <RiCheckboxCircleLine size={16} />
                Confirm Process
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}