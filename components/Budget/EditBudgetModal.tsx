"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiCloseLine, RiDeleteBinLine } from "react-icons/ri";
import { SuccessModal } from "@/components/StatusModal";

interface Budget {
  id: string;
  budget_id: number; // alias for compatibility
  budget_number: string;
  budget_year: number; // alias for fiscal_year
  fiscal_year: number;
  division_id: number;
  division_name: string;
  total_allocated: number; // alias for allocated
  allocated: number;
  total_earmarked: number; // calculated from ORS
  total_spent: number; // alias for utilized
  utilized: number;
  total_remaining: number; // calculated
  budget_status: string;
  notes?: string | null;
}

interface EditBudgetModalProps {
  isOpen: boolean;
  budget: Budget | null;
  onClose: () => void;
  onBudgetUpdated: () => void;
  divisions: Array<{ division_id: number; division_name: string }>;
  isAdmin: boolean;
}

export default function EditBudgetModal({
  isOpen,
  budget,
  onClose,
  onBudgetUpdated,
  divisions,
  isAdmin,
}: EditBudgetModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [divisionId, setDivisionId] = useState("");
  const [totalAllocated, setTotalAllocated] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when budget changes
  useEffect(() => {
    if (budget) {
      setBudgetYear(budget.fiscal_year || budget.budget_year);
      setDivisionId(budget.division_id.toString());
      setTotalAllocated((budget.allocated || budget.total_allocated).toString());
      setNotes(budget.notes || "");
      setError("");
    }
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget) return;

    setError("");
    setLoading(true);

    try {
      if (!divisionId || !totalAllocated) {
        throw new Error("Please fill in all required fields");
      }

      const allocatedAmount = parseFloat(totalAllocated);
      if (isNaN(allocatedAmount) || allocatedAmount <= 0) {
        throw new Error("Budget amount must be a positive number");
      }

      // Check if spent + earmarked exceeds new allocated amount
      const utilized = (budget.utilized || budget.total_spent || 0) + (budget.total_earmarked || 0);
      if (allocatedAmount < utilized) {
        throw new Error(
          `Cannot reduce budget below current utilization (₱${utilized.toLocaleString()})`
        );
      }

      const { error: updateError } = await supabase
        .from("division_budgets")
        .update({
          fiscal_year: budgetYear,
          division_id: parseInt(divisionId),
          allocated: allocatedAmount,
          notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", budget.id);

      if (updateError) throw updateError;

      setSuccessMsg("Budget allocation has been updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update budget");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!budget || !isAdmin) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("division_budgets")
        .delete()
        .eq("id", budget.id);

      if (deleteError) throw deleteError;

      setSuccessMsg("Budget allocation has been deleted.");
    } catch (err: any) {
      setError(err.message || "Failed to delete budget");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen || !budget) return null;

  const utilized = (budget.utilized || budget.total_spent || 0) + (budget.total_earmarked || 0);

  return (
    <>
      <SuccessModal
        visible={!!successMsg}
        title="Done!"
        message={successMsg ?? ""}
        onConfirm={() => { setSuccessMsg(null); onBudgetUpdated(); onClose(); }}
      />
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Edit Budget Allocation</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RiCloseLine size={24} className="text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Current utilization summary */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs">
              <span className="text-gray-500 font-medium">Currently allocated</span>
              <span className="font-bold text-emerald-700">₱{budget.total_allocated.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 font-medium">Obligated (ORS)</span>
              <span className={`font-bold ${utilized > budget.total_allocated ? "text-red-600" : "text-gray-700"}`}>
                ₱{utilized.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Fiscal Year</label>
                <input
                  type="number"
                  value={budgetYear}
                  onChange={(e) => {
                    const val = e.target.value === "" ? new Date().getFullYear() : parseInt(e.target.value, 10);
                    setBudgetYear(isNaN(val) ? new Date().getFullYear() : val);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm text-gray-900"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Division</label>
                <select
                  value={divisionId}
                  onChange={(e) => setDivisionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm text-gray-900"
                  disabled={loading}
                >
                  {divisions.map((d) => (
                    <option key={d.division_id} value={d.division_id}>
                      {d.division_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                Allocated Budget (₱)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={totalAllocated}
                onChange={(e) => setTotalAllocated(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm text-gray-900"
                step="0.01"
                min="0"
                disabled={loading}
              />
              {utilized > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Must be ≥ ₱{utilized.toLocaleString("en-PH", { minimumFractionDigits: 2 })} (current ORS obligations)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. STOD's allocated budget for the year..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm text-gray-900 resize-none"
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Budget"}
              </button>
            </div>

            {/* Delete Section */}
            {isAdmin && (
              <div className="pt-4 border-t border-gray-100">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <RiDeleteBinLine size={16} />
                    Delete Budget
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 font-medium">
                      Delete this budget allocation? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={loading}
                        className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {loading ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
