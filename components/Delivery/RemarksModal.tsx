"use client";

import { useEffect, useState } from "react";
import { RiCloseLine, RiChat3Line, RiFlagLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";

interface Remark {
  id: number;
  remark: string;
  status_flag_id: number | null;
  created_at: string;
  user_id: number | null;
  username?: string;
  fullname?: string;
}

interface RemarksModalProps {
  visible: boolean;
  deliveryId: number | null;
  onClose: () => void;
}

const FLAG_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "No Flag", color: "text-gray-500", bg: "bg-gray-100" },
  2: { label: "Complete", color: "text-green-600", bg: "bg-green-50" },
  3: { label: "Incomplete Info", color: "text-yellow-600", bg: "bg-yellow-50" },
  4: { label: "Wrong Information", color: "text-red-600", bg: "bg-red-50" },
  5: { label: "Needs Revision", color: "text-orange-600", bg: "bg-orange-50" },
  6: { label: "On Hold", color: "text-blue-600", bg: "bg-blue-50" },
  7: { label: "Urgent", color: "text-purple-600", bg: "bg-purple-50" },
};

export default function RemarksModal({ visible, deliveryId, onClose }: RemarksModalProps) {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!visible || !deliveryId) return;
    setLoading(true);
    fetchRemarks();
  }, [visible, deliveryId]);

  const fetchRemarks = async () => {
    try {
      const { data: delivery } = await supabase
        .from("deliveries")
        .select("po_id")
        .eq("id", deliveryId)
        .single();

      if (!delivery?.po_id) {
        setRemarks([]);
        setLoading(false);
        return;
      }

      const { data: po } = await supabase
        .from("purchase_orders")
        .select("pr_id")
        .eq("id", delivery.po_id)
        .single();

      const { data: remarksData, error } = await supabase
        .from("remarks")
        .select(`
          *,
          profiles:user_id (fullname, username)
        `)
        .eq("po_id", delivery.po_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedRemarks = (remarksData || []).map((r: any) => ({
        ...r,
        fullname: r.profiles?.fullname || "Unknown",
        username: r.profiles?.username || "unknown",
      }));

      setRemarks(formattedRemarks);
    } catch (error) {
      console.error("Failed to fetch remarks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <RiChat3Line size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Remarks Timeline</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Stacked remarks across PR, PO, Delivery, and Payment phases
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <RiCloseLine size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading remarks...</p>
            </div>
          ) : remarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <RiChat3Line size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No remarks found.</p>
              <p className="text-xs mt-1">Remarks will appear here as the process progresses.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {remarks.map((remark) => {
                const flagConfig = remark.status_flag_id ? FLAG_CONFIG[remark.status_flag_id] : null;
                const phaseMatch = remark.remark.match(/\[(PR|PO|DELIVERY|PAYMENT)\]/);
                const phase = phaseMatch ? phaseMatch[1] : null;
                const cleanRemark = remark.remark.replace(/\[(PR|PO|DELIVERY|PAYMENT)\]\s*/, "");

                return (
                  <div key={remark.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {phase && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            phase === "PR" ? "bg-blue-100 text-blue-700" :
                            phase === "PO" ? "bg-purple-100 text-purple-700" :
                            phase === "DELIVERY" ? "bg-teal-100 text-teal-700" :
                            "bg-orange-100 text-orange-700"
                          }`}>
                            {phase}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-semibold">
                          {remark.fullname}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(remark.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">
                      {cleanRemark}
                    </p>
                    {flagConfig && (
                      <div className="flex items-center gap-1.5">
                        <RiFlagLine size={12} className={flagConfig.color} />
                        <span className={`text-xs font-semibold ${flagConfig.color}`}>
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

        {/* Footer */}
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
