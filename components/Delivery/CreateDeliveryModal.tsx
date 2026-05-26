"use client";

import { useState, useMemo } from "react";
import { RiCloseLine, RiSearchLine } from "react-icons/ri";

interface CreateDeliveryModalProps {
  visible: boolean;
  poOptions: any[];
  selectedPoId: number | null;
  setSelectedPoId: (v: number) => void;
  poActiveIds?: number[];
  poCompletedIds?: number[];
  onClose: () => void;
  onSubmit: () => void;
}

export default function CreateDeliveryModal({
  visible,
  poOptions,
  selectedPoId,
  setSelectedPoId,
  poActiveIds,
  poCompletedIds,
  onClose,
  onSubmit,
}: CreateDeliveryModalProps) {
  const [poSearch, setPoSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");

  const validateFields = () => {
    const errors = [];
    
    if (!selectedPoId) {
      errors.push("Please select a PO");
    }
    
    if (selectedPoId && Array.isArray(poActiveIds) && poActiveIds.includes(Number(selectedPoId))) {
      errors.push("Selected PO already has an active delivery process");
    }

    if (selectedPoId && Array.isArray(poCompletedIds) && poCompletedIds.includes(Number(selectedPoId))) {
      errors.push("Selected PO already has a completed delivery");
    }
    
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateFields();
    
    if (errors.length > 0) {
      alert("Please fix the following errors:\n\n" + errors.join("\n"));
      return;
    }
    
    onSubmit();
  };

  const selectedPo = useMemo(
    () => poOptions.find((p) => Number(p.id) === Number(selectedPoId)),
    [poOptions, selectedPoId],
  );

  // Normalize active/completed ID lists into Sets for reliable lookups
  const poActiveIdSet = useMemo(() => new Set((poActiveIds ?? []).map((id) => Number(id))), [poActiveIds]);
  const poCompletedIdSet = useMemo(() => new Set((poCompletedIds ?? []).map((id) => Number(id))), [poCompletedIds]);

  const sections = useMemo(() => {
    return [
      "All",
      ...new Set(
        (poOptions ?? [])
          .map((p) => String(p.office_section ?? ""))
          .filter(Boolean),
      ),
    ].sort();
  }, [poOptions]);

  const filteredPOs = useMemo(() => {
    const q = poSearch.trim().toLowerCase();
    return (poOptions ?? []).filter((p) => {
      // Exclude POs that already have a completed delivery
      if (poCompletedIdSet.has(Number(p.id))) return false;
      const section = String(p.office_section ?? "");
      if (sectionFilter !== "All" && section !== sectionFilter) return false;
      if (!q) return true;
      const hay = [
        p.po_no,
        p.pr_no,
        p.supplier,
        p.office_section,
        p.division_id,
      ]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [poOptions, poSearch, sectionFilter, poCompletedIdSet]);
  

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
                Phase 3 · Create Delivery
              </p>
              <h2 className="text-xl font-bold">Log Delivery</h2>
              <p className="text-sm text-white/80 mt-0.5">
                Choose a served PO to log delivery.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <RiCloseLine size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* PO Candidates */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              PO Candidates (Served)
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 mb-3">
              <p className="text-xs font-semibold text-emerald-800">
                Prior-phase rule: only POs marked{" "}
                <span className="font-extrabold">Completed (PO Phase)</span> are
                eligible for Delivery Log creation.
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Delivery entries are created manually from this eligible list,
                not auto-forwarded.
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <RiSearchLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                placeholder="Search PO No., PR No., supplier, section…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              {poSearch.length > 0 && (
                <button
                  onClick={() => setPoSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <RiCloseLine size={14} />
                </button>
              )}
            </div>

            {/* Section Filters */}
            <div className="flex flex-wrap gap-2 mb-3">
              {sections.map((s) => {
                const active = sectionFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSectionFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mb-2">
              <span className="font-semibold text-gray-500">{filteredPOs.length}</span> results
            </p>

            {/* PO List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredPOs.map((p) => {
                  const selected = Number(selectedPoId) === Number(p.id);
                  const hasActiveDelivery = poActiveIdSet.has(Number(p.id));
                  const hasCompletedDelivery = poCompletedIdSet.has(Number(p.id));
                  const disabled = hasActiveDelivery || hasCompletedDelivery;
                  const baseClass = `w-full p-3 rounded-xl border text-left transition-all `;
                  return (
                    <div key={p.id}>
                      <button
                        onClick={() => !disabled && setSelectedPoId(Number(p.id))}
                        disabled={disabled}
                        className={
                          baseClass +
                          (selected
                            ? "border-emerald-500 bg-emerald-50"
                            : hasCompletedDelivery
                            ? "border-red-200 bg-red-50 opacity-70 cursor-not-allowed"
                            : hasActiveDelivery
                            ? "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
                            : "border-gray-200 bg-white hover:bg-gray-50")
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-800">{p.po_no}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{p.supplier ?? "—"}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {p.office_section ?? "—"}
                              {p.pr_no ? ` · PR ${p.pr_no}` : ""}
                            </p>
                          </div>
                          {selected && !disabled && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <RiCloseLine size={12} className="text-white" />
                            </div>
                          )}
                          {hasCompletedDelivery && (
                            <div className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                              Completed
                            </div>
                          )}
                        </div>
                      </button>
                      {hasActiveDelivery && (
                        <div className="text-xs text-red-600 mt-1 ml-1">Active delivery in progress for this PO</div>
                      )}
                      {hasCompletedDelivery && (
                        <div className="text-xs text-red-600 mt-1 ml-1">Delivery already completed for this PO</div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* PO Preview */}
          {selectedPo && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                PO Preview
              </p>
              <p className="text-sm font-bold text-gray-800">PO {selectedPo.po_no}</p>
              {selectedPo.pr_no && (
                <p className="text-xs text-gray-600">PR {selectedPo.pr_no}</p>
              )}
              <p className="text-xs text-gray-600">Supplier: {selectedPo.supplier || "—"}</p>
              <p className="text-xs text-gray-600">
                Office/Section: {selectedPo.office_section || "—"}
              </p>
              {selectedPo && poActiveIdSet.has(Number(selectedPo.id)) && (
                <p className="text-xs text-red-600 mt-1">Note: This PO currently has an active delivery process and cannot be logged until the process completes.</p>
              )}
              {selectedPo && poCompletedIdSet.has(Number(selectedPo.id)) && (
                <p className="text-xs text-red-600 mt-1">Note: This PO already has a completed delivery and cannot be logged again.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedPoId ||
              Boolean(selectedPoId && poActiveIdSet.has(Number(selectedPoId))) ||
              Boolean(selectedPoId && poCompletedIdSet.has(Number(selectedPoId)))
            }
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold transition-colors ${
              !selectedPoId ||
              Boolean(selectedPoId && poActiveIdSet.has(Number(selectedPoId))) ||
              Boolean(selectedPoId && poCompletedIdSet.has(Number(selectedPoId)))
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
