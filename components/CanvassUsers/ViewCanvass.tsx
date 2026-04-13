"use client";

import { useEffect, useMemo, useState } from "react";
import ReleasedCanvasserEntryButton from "@/components/Canvassing/ReleasedCanvasserEntryButton";
import {
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiFileList3Line,
  RiFileTextLine,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiArrowRightSLine,
} from "react-icons/ri";

export type ViewCanvassPR = {
  id: number;
  pr_no: string;
  office_section: string;
  purpose: string;
  total_cost: number;
  status_id: number | null;
  created_at?: string;
  purchase_request_items?: Array<{
    description: string;
    unit?: string | null;
    quantity?: number | string | null;
    unit_price?: number | string | null;
    subtotal?: number | string | null;
  }>;
};

type StepKey = "pr_received" | "release" | "collect" | "resolution" | "aaa";

const steps: { key: StepKey; label: string }[] = [
  { key: "pr_received", label: "PR Received" },
  { key: "release", label: "Release" },
  { key: "collect", label: "Collect" },
  { key: "resolution", label: "Resolution" },
  { key: "aaa", label: "AAA" },
];

const stepIndexForStatusId = (statusId: number | null): number => {
  if (statusId === 6) return 0;
  if (statusId === 8) return 1;
  if (statusId === 9) return 2;
  if (statusId === 10) return 3;
  if (statusId === 11) return 4;
  return 0;
};

const statusLabel = (statusId: number | null): string => {
  const map: Record<number, string> = {
    6: "PR Received",
    7: "Canvassing (Processing)",
    8: "Canvassing (Releasing)",
    9: "Canvassing (Collection)",
    10: "BAC Resolution",
    11: "Abstract of Awards",
  };
  return map[statusId ?? 0] || "—";
};

const formatCurrency = (val?: number) =>
  val != null && val > 0
    ? `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "—";

function parseNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const x = parseFloat(v.replace(/,/g, ""));
    return Number.isNaN(x) ? 0 : x;
  }
  return 0;
}

type Props = {
  pr: ViewCanvassPR;
  onClose: () => void;
  onViewRfq: () => void;
  /** Opens the process modal on BAC Resolution so the user can edit (stepper is otherwise non-interactive here). */
  onOpenResolutionProcess?: () => void;
};

const RESOLUTION_STEP_INDEX = steps.findIndex((s) => s.key === "resolution");

export default function ViewCanvass({ pr, onClose, onViewRfq, onOpenResolutionProcess }: Props) {
  const [lineItemsOpen, setLineItemsOpen] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const unlockedIdx = useMemo(() => stepIndexForStatusId(pr.status_id), [pr.status_id]);

  const items = pr.purchase_request_items ?? [];
  const itemCount = items.length;
  const total =
    pr.total_cost && pr.total_cost > 0
      ? pr.total_cost
      : items.reduce((sum, row) => {
          const st = row.subtotal;
          if (st == null) return sum;
          if (typeof st === "string" && st.trim() === "") return sum;
          return sum + parseNum(st);
        }, 0);

  const dateStr = pr.created_at
    ? new Date(pr.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[90] bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[min(92vh,900px)] flex flex-col">
        {/* Header — matches CanvassProcessModal */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                Canvass · Status
              </p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1 truncate">PR {pr.pr_no}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">{pr.purpose || "—"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onViewRfq}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-800 text-xs font-extrabold hover:bg-emerald-50 transition-all whitespace-nowrap"
              >
                <RiFileTextLine size={16} />
                View RFQ
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
                aria-label="Close"
              >
                <RiCloseLine size={22} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                Office / Section
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{pr.office_section || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Amount</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {total > 0
                  ? `₱${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                Status · Date
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1 leading-snug">
                {statusLabel(pr.status_id)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
            </div>
          </div>

          {/* Stepper — same visual language as CanvassProcessModal; Resolution can open the process modal when wired */}
          <div className="mt-5 flex items-center gap-3 overflow-x-auto pb-1">
            {steps.map((s, idx) => {
              const active = idx === unlockedIdx;
              const unlocked = idx <= unlockedIdx;
              const done = idx < unlockedIdx;
              const isResolution = s.key === "resolution" || idx === RESOLUTION_STEP_INDEX;
              const openProcess = isResolution && onOpenResolutionProcess;

              const shellCls = `flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                active
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : unlocked
                    ? openProcess
                      ? "bg-white border-emerald-200/70 text-emerald-900 hover:bg-emerald-50/80 cursor-pointer"
                      : "bg-white border-gray-200 text-gray-600"
                    : openProcess
                      ? "bg-white border-emerald-200/70 text-emerald-900 hover:bg-emerald-50/80 cursor-pointer"
                      : "bg-gray-50 border-gray-200 text-gray-300"
              }`;

              const circleCls = `w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                done
                  ? "bg-emerald-600 text-white"
                  : active
                    ? "bg-emerald-700 text-white"
                    : unlocked
                      ? openProcess
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-gray-200 text-gray-700"
                      : openProcess
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-gray-100 text-gray-300"
              }`;

              const inner = (
                <>
                  <span className={circleCls}>
                    {done ? <RiCheckboxCircleLine size={16} /> : idx + 1}
                  </span>
                  <span className="text-xs font-extrabold">{s.label}</span>
                  {idx < steps.length - 1 && <RiArrowRightSLine className="text-gray-300" size={18} />}
                </>
              );

              return openProcess ? (
                <button
                  key={s.key}
                  type="button"
                  onClick={onOpenResolutionProcess}
                  className={shellCls}
                  title="Open process workflow to edit BAC Resolution"
                >
                  {inner}
                </button>
              ) : (
                <div key={s.key} className={shellCls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto bg-gray-50">
          <div className="mb-4">
            <ReleasedCanvasserEntryButton
              prId={pr.id}
              prNo={pr.pr_no}
              onViewRfq={onViewRfq}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">
              Purchase request
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">
                  {pr.office_section || "—"} · {dateStr}
                </p>
                <p className="text-sm text-gray-800 mt-2 leading-relaxed">{pr.purpose?.trim() || "—"}</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Total</p>
                <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {total > 0
                    ? `₱${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setLineItemsOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-5 py-4 text-left hover:bg-gray-50/80 transition-colors border-b border-gray-100"
            >
              <RiFileList3Line className="text-emerald-700 text-lg shrink-0" />
              <span className="text-sm font-extrabold text-gray-800">Line Items</span>
              <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-700 text-xs font-extrabold text-white px-1.5">
                {itemCount}
              </span>
              <span className="ml-auto text-sm font-extrabold text-emerald-700 tabular-nums">
                {formatCurrency(total > 0 ? total : undefined)}
              </span>
              {lineItemsOpen ? (
                <RiArrowUpSLine className="text-gray-400 text-lg shrink-0" />
              ) : (
                <RiArrowDownSLine className="text-gray-400 text-lg shrink-0" />
              )}
            </button>

            {lineItemsOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                      <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest">
                        Description
                      </th>
                      <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-widest w-14">
                        Unit
                      </th>
                      <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-widest w-12">
                        Qty
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-widest w-24">
                        Cost
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-widest w-28">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                          No line items
                        </td>
                      </tr>
                    ) : (
                      items.map((row, i) => {
                        const qty = parseNum(row.quantity);
                        const cost = parseNum(row.unit_price);
                        const st = row.subtotal;
                        const hasSub =
                          st != null && !(typeof st === "string" && st.trim() === "");
                        const lineTotal = hasSub ? parseNum(st) : qty * cost;
                        return (
                          <tr
                            key={i}
                            className={`border-b border-gray-100 ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            }`}
                          >
                            <td className="px-4 py-3 text-gray-800 align-top">{row.description || "—"}</td>
                            <td className="px-3 py-3 text-center text-gray-600">{row.unit || "—"}</td>
                            <td className="px-3 py-3 text-center text-gray-700 font-semibold">
                              {qty || "—"}
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700 tabular-nums">
                              ₱{cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                              ₱{lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="bg-emerald-50/60 border-t border-emerald-100">
                        <td colSpan={4} className="px-4 py-3 text-sm font-extrabold text-emerald-900">
                          Total
                        </td>
                        <td className="px-4 py-3 text-sm font-extrabold text-emerald-900 text-right tabular-nums">
                          ₱{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
