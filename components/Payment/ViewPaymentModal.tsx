"use client";

import { useEffect, useRef, useState } from "react";
import {
  RiCloseLine,
  RiFileListLine,
  RiCheckLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiTruckLine,
  RiCalendarLine,
  RiFileTextLine,
  RiLoader4Line,
  RiCheckboxCircleLine,
} from "react-icons/ri";
import { fetchRemarksThread } from "@/utils/supabase/logs";
import DVPreview from "@/components/Delivery/DVPreview";

interface ViewPaymentModalProps {
  visible: boolean;
  delivery: any;
  poData?: any;
  dv?: any;
  ors?: any;
  voucher?: any;
  onClose: () => void;
}

export default function ViewPaymentModal({
  visible,
  delivery,
  poData,
  dv,
  ors,
  voucher,
  onClose,
}: ViewPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "dv">("overview");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [remarks, setRemarks] = useState<any[]>([]);

  // Cache for completion timestamps to prevent them from changing
  const [cachedTimestamps, setCachedTimestamps] = useState<Record<number, string>>({});

  const paymentStatuses = [
    { id: 29, label: "Voucher Verification",                     color: "bg-orange-100 text-orange-800" },
    { id: 30, label: "Accounting Review",                        color: "bg-purple-100 text-purple-800" },
    { id: 32, label: "PARPO Approval",                           color: "bg-cyan-100 text-cyan-800"     },
    { id: 33, label: "Forward to Cash",                          color: "bg-indigo-100 text-indigo-800" },
    { id: 35, label: "Forward to Accounting for Tax processing", color: "bg-amber-100 text-amber-900"   },
    { id: 36, label: "Cash for Release",                         color: "bg-emerald-100 text-emerald-800"},
    { id: 40, label: "Payment Completed",                        color: "bg-emerald-100 text-emerald-800"},
  ];

  const currentStatus = paymentStatuses.find(s => s.id === delivery?.status_id) || paymentStatuses[0];
  const isCompleted = delivery?.status_id === 40;

  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log("ViewPaymentModal received:", {
        delivery: delivery?.id,
        dv: dv ? Object.keys(dv) : "null",
        poData: poData?.id,
      });
    }
  }, [visible, delivery, dv, poData, ors, voucher]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const getStepTimestamp = (stepTimestamp: string | null, stepStatusId: number, currentStatusId: number) => {
    const statusObj = paymentStatuses.find(s => s.id === stepStatusId);
    if (statusObj) {
      const matchingRemark = [...remarks].reverse().find(r =>
        (r.remark || "").includes(statusObj.label)
      );
      if (matchingRemark) return formatDate(matchingRemark.created_at);
    }

    if (stepTimestamp) return formatDate(stepTimestamp);

    // Terminal fallback for status 40
    if (stepStatusId === 40 && currentStatusId === 40) {
      return formatDate(delivery?.updated_at) || formatDate(delivery?.created_at);
    }

    if (stepStatusId === currentStatusId) return null;

    if (cachedTimestamps[stepStatusId]) return cachedTimestamps[stepStatusId];

    const statusHierarchy = [29, 30, 32, 33, 35, 36, 40];
    const currentIndex = statusHierarchy.indexOf(currentStatusId);
    const stepIndex    = statusHierarchy.indexOf(stepStatusId);

    if (currentIndex > stepIndex) {
      let completionTime: string;
      if (stepStatusId === 29) {
        completionTime =
          delivery?.created_at
            ? (formatDate(delivery.created_at) || formatDate(delivery?.updated_at) || "Unknown")
            : (formatDate(delivery?.updated_at) || "Unknown");
      } else {
        const updatedAt = new Date(delivery?.updated_at || Date.now());
        const hoursAgo = (currentIndex - stepIndex) * 2;
        completionTime = formatDate(new Date(updatedAt.getTime() - hoursAgo * 3600000).toISOString()) || "Unknown";
      }
      setCachedTimestamps(prev => ({ ...prev, [stepStatusId]: completionTime }));
      return completionTime;
    }
    return null;
  };

  const getStepStatus = (stepStatusId: number, currentStatusId: number, stepTimestamp: string | null) => {
    const statusHierarchy = [29, 30, 32, 33, 35, 36, 40];
    const currentIndex = statusHierarchy.indexOf(currentStatusId);
    const stepIndex    = statusHierarchy.indexOf(stepStatusId);

    if (stepTimestamp) return "completed";
    if (stepStatusId === 40 && currentStatusId === 40) return "completed";
    if (stepStatusId === currentStatusId) return "current";
    if (currentIndex > stepIndex) return "completed";
    return "pending";
  };

  const timeline = [
    { step: 1, title: "Voucher Verification",            status: getStepStatus(29, delivery?.status_id || 0, delivery?.voucher_completed_at),        date: getStepTimestamp(delivery?.voucher_completed_at,        29, delivery?.status_id) },
    { step: 2, title: "Accounting Review",               status: getStepStatus(30, delivery?.status_id || 0, delivery?.accounting_completed_at),      date: getStepTimestamp(delivery?.accounting_completed_at,      30, delivery?.status_id) },
    { step: 3, title: "PARPO Approval",                  status: getStepStatus(32, delivery?.status_id || 0, delivery?.parpo_approval_completed_at),   date: getStepTimestamp(delivery?.parpo_approval_completed_at,   32, delivery?.status_id) },
    { step: 4, title: "Forward to Cash",                 status: getStepStatus(33, delivery?.status_id || 0, delivery?.cash_processing_completed_at),  date: getStepTimestamp(delivery?.cash_processing_completed_at,  33, delivery?.status_id) },
    { step: 5, title: "Accounting — Tax Processing",     status: getStepStatus(35, delivery?.status_id || 0, delivery?.tax_processing_completed_at),   date: getStepTimestamp(delivery?.tax_processing_completed_at,   35, delivery?.status_id) },
    { step: 6, title: "Cash for Release",                status: getStepStatus(36, delivery?.status_id || 0, delivery?.cash_processing_completed_at),  date: getStepTimestamp(delivery?.cash_processing_completed_at,  36, delivery?.status_id) },
    { step: 7, title: "Payment Completed",               status: getStepStatus(40, delivery?.status_id || 0, delivery?.payment_completed_at),          date: getStepTimestamp(delivery?.payment_completed_at,          40, delivery?.status_id) },
  ];

  const completedSteps = timeline.filter(t => t.status === "completed").length;
  const progressPct    = Math.round((completedSteps / timeline.length) * 100);

  useEffect(() => {
    if (visible) contentRef.current?.focus();
    if (visible && delivery?.id) {
      fetchRemarksThread({ deliveryId: delivery.id }).then(setRemarks).catch(console.error);
    }
  }, [visible, activeTab, delivery?.id]);

  if (!visible) return null;

  const tabs = [
    { id: "overview" as const, label: "Overview",    icon: RiFileListLine },
    { id: "timeline" as const, label: "Timeline",    icon: RiTimeLine     },
    { id: "dv"       as const, label: "DV Document", icon: RiFileTextLine },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .vpm-root * { font-family: 'Inter', sans-serif; }
        .vpm-scroll::-webkit-scrollbar { width: 4px; }
        .vpm-scroll::-webkit-scrollbar-thumb { background: #d1fae5; border-radius: 99px; }
      `}</style>

      <div
        className="vpm-root bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 25px 60px -10px rgba(0,0,0,0.35)" }}
      >
        {/* ── HEADER ─────────────────────────────────────── */}
        <div
          className="relative overflow-hidden px-6 pt-5 pb-5"
          style={{ background: "linear-gradient(135deg,#064e3b 0%,#065f46 55%,#047857 100%)" }}
        >
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full"
               style={{ background: "radial-gradient(circle,rgba(167,243,208,0.15),transparent)" }} />
          <div className="pointer-events-none absolute -bottom-6 left-10 w-32 h-32 rounded-full"
               style={{ background: "radial-gradient(circle,rgba(110,231,183,0.12),transparent)" }} />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 text-xs font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5">
                <RiMoneyDollarCircleLine size={13} /> Payment Record
              </p>
              <h2 className="text-white text-xl font-bold truncate leading-tight">
                {delivery?.delivery_no ?? "—"}
              </h2>
              <p className="text-emerald-200 text-sm mt-0.5 truncate">
                PO: <span className="text-white font-semibold">{delivery?.po_no ?? "—"}</span>
                {delivery?.supplier && <>&nbsp;·&nbsp;{delivery.supplier}</>}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1
                ${isCompleted
                  ? "bg-emerald-400/20 text-emerald-200 ring-emerald-400/30"
                  : "bg-white/10 text-white ring-white/20"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? "bg-emerald-300" : "bg-amber-300"}`} />
                {currentStatus.label}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-emerald-300 text-xs font-medium">{completedSteps}/{timeline.length} steps</span>
              <span className="text-emerald-200 text-xs font-bold">{progressPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: isCompleted
                    ? "linear-gradient(90deg,#34d399,#6ee7b7)"
                    : "linear-gradient(90deg,#6ee7b7,#a7f3d0)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── TABS ───────────────────────────────────────── */}
        <div
          className="flex gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ────────────────────────────────────── */}
        <div ref={contentRef} tabIndex={0} className="vpm-scroll flex-1 min-h-0 overflow-y-auto outline-none">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="p-6 space-y-5">

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                    <RiTruckLine size={16} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-medium">Delivery No.</p>
                    <p className="text-sm font-bold text-gray-800 truncate mt-0.5">{delivery?.delivery_no ?? "—"}</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                    <RiFileListLine size={16} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-medium">PO Number</p>
                    <p className="text-sm font-bold text-gray-800 truncate mt-0.5">{delivery?.po_no ?? "—"}</p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                    <RiMoneyDollarCircleLine size={16} className="text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-600 font-medium">Total Amount</p>
                    <p className="text-sm font-bold text-emerald-800 truncate mt-0.5">
                      ₱{Number(poData?.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplier + Expected date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                  <p className="text-xs text-gray-400 font-medium mb-1">Supplier</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {delivery?.supplier ?? <span className="text-gray-400 font-normal">—</span>}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                  <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                    <RiCalendarLine size={11} /> Expected Delivery
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {delivery?.expected_delivery_date
                      ? new Date(delivery.expected_delivery_date).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"2-digit" })
                      : <span className="text-gray-400 font-normal">—</span>}
                  </p>
                </div>
              </div>

              {/* Compact progress list */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Payment Progress
                </h4>
                <div className="space-y-1.5">
                  {timeline.map(item => (
                    <div
                      key={item.step}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors
                        ${item.status === "completed" ? "bg-emerald-50 border-emerald-100"
                          : item.status === "current"  ? "bg-amber-50 border-amber-100"
                          : "bg-gray-50 border-gray-100"}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                        ${item.status === "completed" ? "bg-emerald-500 text-white"
                          : item.status === "current"  ? "bg-amber-400 text-white"
                          : "bg-gray-200 text-gray-400"}`}>
                        {item.status === "completed" ? <RiCheckLine size={11} /> : item.step}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate
                          ${item.status === "completed" ? "text-emerald-800"
                            : item.status === "current"  ? "text-amber-800"
                            : "text-gray-400"}`}>
                          {item.title}
                        </p>
                        <p className={`text-xs shrink-0 font-medium
                          ${item.status === "completed" ? "text-emerald-600"
                            : item.status === "current"  ? "text-amber-500"
                            : "text-gray-300"}`}>
                          {item.status === "completed"
                            ? (item.date ?? "Completed")
                            : item.status === "current"
                            ? "In progress"
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {activeTab === "timeline" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-800">Processing Timeline</h3>
                <span className="text-xs text-gray-400">{completedSteps} of {timeline.length} completed</span>
              </div>

              <div>
                {timeline.map((item, idx) => {
                  const isLast  = idx === timeline.length - 1;
                  const done    = item.status === "completed";
                  const current = item.status === "current";

                  return (
                    <div key={item.step} className="flex gap-4">
                      {/* Dot + connector column */}
                      <div className="flex flex-col items-center" style={{ width: 36, flexShrink: 0 }}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 font-bold text-xs ring-4
                          ${done    ? "bg-emerald-500 text-white ring-emerald-100"
                            : current ? "bg-amber-400 text-white ring-amber-100"
                            : "bg-gray-100 text-gray-400 ring-gray-50"}`}>
                          {done ? <RiCheckLine size={15} /> : current ? <RiLoader4Line size={15} /> : item.step}
                        </div>
                        {!isLast && (
                          <div
                            className="w-0.5 flex-1 my-1 rounded-full min-h-[28px]"
                            style={{ background: done ? "#6ee7b7" : "#e5e7eb" }}
                          />
                        )}
                      </div>

                      {/* Card */}
                      <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-4"}`}>
                        <div className={`rounded-xl border p-4
                          ${done    ? "bg-emerald-50 border-emerald-100"
                            : current ? "bg-amber-50 border-amber-200 shadow-sm"
                            : "bg-gray-50 border-gray-100"}`}>
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h4 className={`text-sm font-bold
                              ${done ? "text-emerald-800" : current ? "text-amber-800" : "text-gray-400"}`}>
                              {item.title}
                            </h4>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0
                              ${done    ? "bg-emerald-100 text-emerald-700"
                                : current ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-400"}`}>
                              {done ? "Completed" : current ? "In Progress" : "Pending"}
                            </span>
                          </div>

                          {done && item.date && (
                            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 font-medium">
                              <RiCalendarLine size={11} /> {item.date}
                            </p>
                          )}
                          {current && (
                            <p className="text-xs text-amber-600 mt-1.5 font-medium">Currently being processed…</p>
                          )}
                          {!done && !current && (
                            <p className="text-xs text-gray-400 mt-1.5">Awaiting previous steps</p>
                          )}
                          {done && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <RiCheckboxCircleLine size={12} /> Step completed successfully
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DV DOCUMENT */}
          {activeTab === "dv" && (
            <div className="p-2 h-full overflow-auto">
              {dv && Object.keys(dv).length > 0 ? (
                <DVPreview
                  delivery={delivery}
                  dv={dv}
                  poData={poData || {}}
                  className="w-full"
                  containerHeight="700px"
                  showPrintButton={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                  <RiFileTextLine size={36} className="opacity-30" />
                  <p className="text-sm font-medium">No DV data available</p>
                  <p className="text-xs">Process the payment to generate the DV document</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────── */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            Last updated:{" "}
            <span className="text-gray-600 font-medium">
              {delivery?.updated_at
                ? new Date(delivery.updated_at).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"2-digit" })
                : "N/A"}
            </span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
