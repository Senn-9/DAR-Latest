"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CanvassingReceptionModal from "@/components/Canvassing/CanvassingReceptionModal";
import ReleaseCanvassStepModal from "@/components/Canvassing/ReleaseCanvassStepModal";
import ReleasedCanvasserEntryButton from "@/components/Canvassing/ReleasedCanvasserEntryButton";
import CollectCanvassStepPanel from "@/components/Canvassing/CollectCanvassStepPanel";
import CanvassAAADetailsPanel from "@/components/Canvassing/CanvassAAADetailsPanel";
import { RiCloseLine, RiCheckboxCircleLine, RiArrowRightSLine } from "react-icons/ri";

type StepKey = "pr_received" | "release" | "collect" | "aaa";

const steps: { key: StepKey; label: string }[] = [
  { key: "pr_received", label: "PR Received" },
  { key: "release", label: "Release" },
  { key: "collect", label: "Collect" },
  { key: "aaa", label: "AAA" },
];

type Props = {
  /** When opening the modal (e.g. from View), land on this step instead of the status-derived step. */
  initialStep?: StepKey;
  pr: {
    id: number;
    pr_no: string;
    office_section: string;
    purpose: string;
    total_cost: number;
    status: string;
    status_id: number | null;
    entity_name: string;
    fund_cluster: string;
    req_name: string;
    app_name: string;
    app_no: string;
    resp_code: string;
  };
  onClose: () => void;
  onUpdated: (prId: number, patch: Partial<{ status_id: number | null; status: string }>) => void;
  /** Open full PR (RFQ) view; used from canvasser quotation modal */
  onViewRfq?: () => void;
};

const stepIndexForStatusId = (statusId: number | null): number => {
  if (statusId === 6) return 0;
  if (statusId === 8) return 1; // release
  if (statusId === 9) return 2; // collect
  if (statusId === 10) return 2; // resolution (mapped to collect for modal)
  if (statusId === 11) return 3; // aaa
  return 0;
};

const formatCurrency = (val?: number) =>
  val != null ? `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";

export default function CanvassProcessModal({ initialStep, pr, onClose, onUpdated, onViewRfq }: Props) {
  const [activeStep, setActiveStep] = useState<StepKey>(() => {
    return initialStep ?? steps[stepIndexForStatusId(pr.status_id)]?.key ?? "pr_received";
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const unlockedIdx = useMemo(() => stepIndexForStatusId(pr.status_id), [pr.status_id]);

  /** Only sync the active tab when PR status changes — not on mount — so Resolution clicks are not reset. */
  const prevStatusIdRef = useRef(pr.status_id);
  useEffect(() => {
    if (prevStatusIdRef.current === pr.status_id) return;
    prevStatusIdRef.current = pr.status_id;
    setActiveStep(steps[stepIndexForStatusId(pr.status_id)]?.key ?? "pr_received");
  }, [pr.status_id]);

  /**
   * Step tab gating. Index fallback in case key ever mismatches in builds.
   */
  const stepTabUnlocked = (idx: number, key: StepKey) => {
    return idx <= unlockedIdx;
  };

  const activeIdx = steps.findIndex((s) => s.key === activeStep);
  const isPastStep = activeIdx >= 0 && activeIdx < unlockedIdx;

  const prData = useMemo(
    () => ({
      office_section: pr.office_section,
      purpose: pr.purpose,
      total_cost: pr.total_cost,
      status: pr.status,
      status_id: pr.status_id,
      entity_name: pr.entity_name,
      fund_cluster: pr.fund_cluster,
      req_name: pr.req_name,
      app_name: pr.app_name,
      app_no: pr.app_no,
      resp_code: pr.resp_code,
    }),
    [pr]
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[90] bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">Canvass · Processing</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1 truncate">PR {pr.pr_no}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">{pr.purpose || "—"}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <RiCloseLine size={22} />
            </button>
          </div>

          {/* PR Summary (compact) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Office / Section</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{pr.office_section || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Amount</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(pr.total_cost)}</p>
            </div>
          </div>

          {/* Stepper tabs (like screenshot) */}
          <div className="mt-5 flex items-center gap-3 overflow-x-auto pb-1">
            {steps.map((s, idx) => {
              const active = activeStep === s.key;
              const unlocked = stepTabUnlocked(idx, s.key);
              const done = idx < unlockedIdx;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => (unlocked ? setActiveStep(s.key) : null)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap ${
                    active
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : unlocked
                      ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      : "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                  }`}
                  disabled={!unlocked}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      done
                        ? "bg-emerald-600 text-white"
                        : active
                          ? "bg-emerald-700 text-white"
                          : unlocked
                            ? "bg-gray-200 text-gray-700"
                            : "bg-gray-100 text-gray-300"
                    }`}
                  >
                    {done ? <RiCheckboxCircleLine size={16} /> : idx + 1}
                  </span>
                  <span className="text-xs font-extrabold">{s.label}</span>
                  {idx < steps.length - 1 && <RiArrowRightSLine className="text-gray-300" size={18} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
          {activeStep === "pr_received" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CanvassingReceptionModal
                embedded
                readonly={isPastStep}
                prId={pr.id}
                currentPrNo={pr.pr_no}
                prData={prData}
                onClose={() => {}}
                onProcessed={(prId) => {
                  onUpdated(prId, { status_id: 8, status: "Canvassing (Releasing)" });
                }}
              />
            </div>
          )}

          {activeStep === "release" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <ReleaseCanvassStepModal
                embedded
                readonly={isPastStep}
                prId={pr.id}
                prNo={pr.pr_no}
                onClose={() => {}}
                onAdvanced={(prId) => onUpdated(prId, { status_id: 9, status: "Canvassing (Collection)" })}
              />
            </div>
          )}

          {activeStep === "collect" && (
            <div className="space-y-4">
              <CollectCanvassStepPanel
                prId={pr.id}
                prNo={pr.pr_no}
                readonly={isPastStep}
                onViewRfq={onViewRfq}
                onPreviousStep={() => setActiveStep("release")}
                onNextStep={() => setActiveStep("aaa")}
                canGoNextStep={unlockedIdx >= 3}
                onAdvancedToResolution={(prId) => {
                  onUpdated(prId, { status_id: 10, status: "BAC Resolution" });
                }}
              />
              <ReleasedCanvasserEntryButton prId={pr.id} prNo={pr.pr_no} onViewRfq={onViewRfq} />
            </div>
          )}

          {activeStep === "aaa" && (
            <CanvassAAADetailsPanel prId={pr.id} prNo={pr.pr_no} />
          )}
        </div>
      </div>
    </div>
  );
}
