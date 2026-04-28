"use client";

import { useEffect, useMemo, useState } from "react";
import { RiChat3Line, RiCloseLine, RiFlagLine } from "react-icons/ri";
import type { LogPhase, RemarkLogRow } from "@/utils/supabase/logs";
import { fetchRemarksThread } from "@/utils/supabase/logs";

const FLAG_CONFIG: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  1: { label: "No Flag", color: "text-gray-500", bg: "bg-gray-100" },
  2: { label: "Complete", color: "text-green-600", bg: "bg-green-50" },
  3: { label: "Incomplete Info", color: "text-yellow-600", bg: "bg-yellow-50" },
  4: { label: "Wrong Information", color: "text-red-600", bg: "bg-red-50" },
  5: { label: "Needs Revision", color: "text-orange-600", bg: "bg-orange-50" },
  6: { label: "On Hold", color: "text-blue-600", bg: "bg-blue-50" },
  7: { label: "Urgent", color: "text-purple-600", bg: "bg-purple-50" },
};

function inferPhase(r: Pick<RemarkLogRow, "phase" | "remark" | "pr_id" | "po_id" | "delivery_id">): LogPhase {
  if (r.phase) return r.phase;
  const raw = (r.remark ?? "").toUpperCase();
  const match = raw.match(/\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]/);
  if (match?.[1]) {
    const tag = match[1].toLowerCase();
    if (tag === "pr" || tag === "po" || tag === "delivery" || tag === "payment" || tag === "system") {
      return tag;
    }
  }
  if (r.delivery_id != null) return "delivery";
  if (r.po_id != null && r.pr_id == null) return "po";
  if (r.pr_id != null) return "pr";
  return "system";
}

function phaseBadge(phase: LogPhase) {
  if (phase === "pr") return "bg-blue-100 text-blue-700";
  if (phase === "po") return "bg-purple-100 text-purple-700";
  if (phase === "delivery") return "bg-teal-100 text-teal-700";
  if (phase === "payment") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
}

export default function RemarksTimelineModal(props: {
  visible: boolean;
  target: { poId?: number | null; prId?: number | null; deliveryId?: number | null };
  title?: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const { visible, target, onClose, title, subtitle } = props;
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState<RemarkLogRow[]>([]);
  const threadKey = useMemo(() => JSON.stringify(target ?? {}), [target]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchRemarksThread(target)
      .then((rows) => setRemarks(rows))
      .catch(() => setRemarks([]))
      .finally(() => setLoading(false));
  }, [visible, threadKey]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <RiChat3Line size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {title ?? "Remarks Timeline"}
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5 truncate">
                  {subtitle ?? "History across procurement phases"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              aria-label="Close"
            >
              <RiCloseLine size={18} className="text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading remarks...</p>
            </div>
          ) : remarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <RiChat3Line size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No remarks found.</p>
              <p className="text-xs mt-1">
                Remarks will appear here as the process progresses.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {remarks.map((r) => {
                const flagConfig = r.status_flag_id
                  ? FLAG_CONFIG[r.status_flag_id]
                  : null;
                const phase = inferPhase(r);
                const cleanRemark = (r.remark ?? "").replace(
                  /\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]\s*/i,
                  "",
                );

                return (
                  <div
                    key={r.id}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${phaseBadge(phase)}`}
                        >
                          {phase.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold truncate">
                          {r.fullname ?? r.username ?? "Unknown"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(r.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed mb-2 whitespace-pre-wrap">
                      {cleanRemark || "—"}
                    </p>

                    {flagConfig && (
                      <div className="flex items-center gap-1.5">
                        <RiFlagLine size={12} className={flagConfig.color} />
                        <span
                          className={`text-xs font-semibold ${flagConfig.color}`}
                        >
                          {flagConfig.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

