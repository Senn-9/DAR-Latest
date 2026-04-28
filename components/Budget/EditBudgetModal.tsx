"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiCloseLine, RiDeleteBinLine } from "react-icons/ri";

interface Budget {
  budget_id: number;
  budget_number: string;
  budget_year: number;
  division_id: number;
  division_name: string;
  total_allocated: number;
  total_earmarked: number;
  total_spent: number;
  total_remaining: number;
  budget_status: string;
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
  const [budgetNumber, setBudgetNumber] = useState("");
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [divisionId, setDivisionId] = useState("");
  const [totalAllocated, setTotalAllocated] = useState("");
  const [budgetStatus, setBudgetStatus] = useState("Active");
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when budget changes
  useEffect(() => {
    if (budget) {
      setBudgetNumber(budget.budget_number);
      setBudgetYear(budget.budget_year);
      setDivisionId(budget.division_id.toString());
      setTotalAllocated(budget.total_allocated.toString());
      setBudgetStatus(budget.budget_status);
      setError("");
    }
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget) return;

    setError("");
    setLoading(true);

    try {
      if (!budgetNumber || !divisionId || !totalAllocated) {
        throw new Error("Please fill in all fields");
      }

      const allocatedAmount = parseFloat(totalAllocated);
      if (isNaN(allocatedAmount) || allocatedAmount <= 0) {
        throw new Error("Budget amount must be a positive number");
      }

      // Check if spent + earmarked exceeds new allocated amount
      const utilized = budget.total_spent + budget.total_earmarked;
      if (allocatedAmount < utilized) {
        throw new Error(
          `Cannot reduce budget below current utilization (₱${(utilized / 1000).toFixed(0)}K)`
        );
      }

      const { error: updateError } = await supabase
        .from("budgets")
        .update({
          budget_number: budgetNumber,
          budget_year: budgetYear,
          division_id: parseInt(divisionId),
          total_allocated: allocatedAmount,
          total_remaining: allocatedAmount - utilized,
          budget_status: budgetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("budget_id", budget.budget_id);

      if (updateError) throw updateError;

      onBudgetUpdated();
      onClose();
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
        .from("budgets")
        .delete()
        .eq("budget_id", budget.budget_id);

      if (deleteError) throw deleteError;

      onBudgetUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete budget");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen || !budget) return null;

  const utilized = budget.total_spent + budget.total_earmarked;
  const canModifyStatus = isAdmin;

  return (
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Budget Usage Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <div className="font-semibold mb-1">Current Utilization</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Allocated: ₱{(budget.total_allocated / 1000).toFixed(0)}K</div>
              <div>Utilized: ₱{(utilized / 1000).toFixed(0)}K</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Budget Number
            </label>
            <input
              type="text"
              placeholder="e.g., BUD-2024-001"
              value={budgetNumber}
              onChange={(e) => setBudgetNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Budget Year
              </label>
              <input
                type="number"
                value={budgetYear}
                onChange={(e) => setBudgetYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Division
              </label>
              <select
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Total Allocated Budget (₱)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={totalAllocated}
              onChange={(e) => setTotalAllocated(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
              step="0.01"
              min={utilized}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum: ₱{(utilized / 1000).toFixed(0)}K (current utilization)
            </p>
          </div>

          {canModifyStatus && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Budget Status
              </label>
              <select
                value={budgetStatus}
                onChange={(e) => setBudgetStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                disabled={loading}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          )}

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
  );
}
