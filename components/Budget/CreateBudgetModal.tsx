"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiCloseLine } from "react-icons/ri";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetCreated: () => void;
  divisions: Array<{ division_id: number; division_name: string }>;
  currentUserId: number;
}

export default function CreateBudgetModal({
  isOpen,
  onClose,
  onBudgetCreated,
  divisions,
  currentUserId,
}: CreateBudgetModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [budgetNumber, setBudgetNumber] = useState("");
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [divisionId, setDivisionId] = useState("");
  const [totalAllocated, setTotalAllocated] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const { error: insertError } = await supabase.from("budgets").insert([
        {
          budget_number: budgetNumber,
          budget_year: budgetYear,
          division_id: parseInt(divisionId),
          total_allocated: allocatedAmount,
          total_earmarked: 0,
          total_spent: 0,
          total_remaining: allocatedAmount,
          budget_status: "Active",
          created_by_user_id: currentUserId,
        },
      ]);

      if (insertError) throw insertError;

      // Reset form
      setBudgetNumber("");
      setTotalAllocated("");
      setDivisionId("");
      onBudgetCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create Budget Allocation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
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
                <option value="">Select...</option>
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
              min="0"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              {loading ? "Creating..." : "Create Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiCloseLine } from "react-icons/ri";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetCreated: () => void;
  divisions: Array<{ division_id: number; division_name: string }>;
  currentUserId: number;
}

export default function CreateBudgetModal({
  isOpen,
  onClose,
  onBudgetCreated,
  divisions,
  currentUserId,
}: CreateBudgetModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [budgetNumber, setBudgetNumber] = useState("");
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [divisionId, setDivisionId] = useState("");
  const [totalAllocated, setTotalAllocated] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const { error: insertError } = await supabase.from("budgets").insert([
        {
          budget_number: budgetNumber,
          budget_year: budgetYear,
          division_id: parseInt(divisionId),
          total_allocated: allocatedAmount,
          total_earmarked: 0,
          total_spent: 0,
          total_remaining: allocatedAmount,
          budget_status: "Active",
          created_by_user_id: currentUserId,
        },
      ]);

      if (insertError) throw insertError;

      // Reset form
      setBudgetNumber("");
      setTotalAllocated("");
      setDivisionId("");
      onBudgetCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create Budget Allocation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
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
                <option value="">Select...</option>
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
              min="0"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              {loading ? "Creating..." : "Create Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
