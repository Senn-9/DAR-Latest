"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiCloseLine, RiCheckboxCircleLine } from "react-icons/ri";

type Props = {
  prId: number;
  prNo: string;
  onClose: () => void;
  onAdvancedToResolution: (prId: number) => void;
};

export default function CollectCanvassModal({ prId, prNo, onClose, onAdvancedToResolution }: Props) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleCollected = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { error: prErr } = await supabase
        .from("purchase_requests")
        .update({ status_id: 10, status: "BAC Resolution" })
        .eq("id", prId);
      if (prErr) throw prErr;

      const { data: sess } = await supabase
        .from("canvass_sessions")
        .select("id")
        .eq("pr_id", prId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sess?.id) {
        const { error: sessErr } = await supabase
          .from("canvass_sessions")
          .update({ stage: "Resolution", status: "active" })
          .eq("id", sess.id);
        if (sessErr) throw sessErr;
      }

      onAdvancedToResolution(prId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to mark canvass as collected.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[90] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">Canvass · Collection</p>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1 truncate">PR {prNo}</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">Confirm the physical canvass form has been collected.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <RiCloseLine size={22} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
            Once collected, this PR will move directly to BAC Resolution.
          </div>

          <button
            type="button"
            onClick={handleCollected}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <RiCheckboxCircleLine size={18} />
            {submitting ? "Processing…" : "Collected and Proceed to BAC Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}