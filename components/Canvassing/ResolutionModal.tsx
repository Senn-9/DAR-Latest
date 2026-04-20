"use client";

import { useEffect, useState, useRef } from "react";
import { RiCloseLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import CanvassResolutionDetailsPanel from "./CanvassResolutionDetailsPanel";

type Props = {
  prId: number;
  prNo: string;
  onClose: () => void;
  onSubmitted?: (prId: number) => void;
};

export default function ResolutionModal({
  prId,
  prNo,
  onClose,
  onSubmitted,
}: Props) {
  const supabase = createClient();
  const [submitFn, setSubmitFn] = useState<(() => Promise<boolean | undefined>) | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasReceivedSubmitFn = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async () => {
    if (!submitFn) return;
    setSubmitting(true);
    try {
      // Get current user from localStorage
      let currentUserId: number | null = null;
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) {
          const u = JSON.parse(s) as { id?: number };
          if (typeof u.id === "number") currentUserId = u.id;
        }
      } catch {
        /* ignore */
      }

      const saved = await submitFn();
      if (saved) {
        // Insert remark with auto-generated text and status flag 2
        const { error: remarkError } = await supabase.from("remarks").insert({
          remark: "Bac Resolution Submitted",
          pr_id: prId,
          status_flag_id: 2,
          user_id: currentUserId,
        });
        if (remarkError) console.error("Failed to insert remark:", remarkError);

        // Update status to 8 (Canvassing Releasing)
        const { error } = await supabase
          .from("purchase_requests")
          .update({ status_id: 8, status: "Canvassing (Releasing)" })
          .eq("id", prId);
        if (error) throw error;
        onSubmitted?.(prId);
        onClose();
      }
    } catch (e) {
      console.error("Failed to submit resolution:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Only set submitFn once to prevent infinite re-render loop
  const handleSetSubmitFn = (fn: () => Promise<boolean | undefined>) => {
    if (!hasReceivedSubmitFn.current) {
      hasReceivedSubmitFn.current = true;
      setSubmitFn(() => fn);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[90] bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-purple-700">BAC Resolution</p>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1 truncate">PR {prNo}</h2>
            <p className="text-sm text-gray-500 mt-1">Resolution Details</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <RiCloseLine size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <CanvassResolutionDetailsPanel
            prId={prId}
            prNo={prNo}
            hideActions
            onSubmit={handleSetSubmitFn}
          />
        </div>

        {/* Footer with Submit Button */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || !submitFn}
            className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-extrabold transition-all disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}
