"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiCloseLine, RiEditLine } from "react-icons/ri";
import { SuccessModal } from "@/components/StatusModal";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetCreated: () => void;
  divisions: Array<{ division_id: number; division_name: string }>;
  currentUserId: number;
  onEditExisting?: (divisionId: number, fiscalYear: number) => void;
}

export default function CreateBudgetModal({
  isOpen,
  onClose,
  onBudgetCreated,
  divisions,
  currentUserId,
  onEditExisting,
}: CreateBudgetModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [divisionId, setDivisionId] = useState("");
  const [totalAllocated, setTotalAllocated] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState<{
    exists: boolean;
    existingBudget: { id: string; allocated: number; utilized: number } | null;
  }>({ exists: false, existingBudget: null });

  // Check for existing budget when division or year changes
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!divisionId || !budgetYear) {
        setDuplicateCheck({ exists: false, existingBudget: null });
        return;
      }

      const { data, error } = await supabase
        .from("division_budgets")
        .select("id, allocated, utilized")
        .eq("division_id", parseInt(divisionId))
        .eq("fiscal_year", budgetYear)
        .single();

      if (data && !error) {
        setDuplicateCheck({ exists: true, existingBudget: data });
      } else {
        setDuplicateCheck({ exists: false, existingBudget: null });
      }
    };

    checkDuplicate();
  }, [divisionId, budgetYear, supabase]);

  const handleEditExisting = () => {
    if (duplicateCheck.exists && onEditExisting) {
      onEditExisting(parseInt(divisionId), budgetYear);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Prevent submission if duplicate exists
    if (duplicateCheck.exists) {
      setError(`A budget already exists for this division and fiscal year. Click "Edit Existing" to modify it.`);
      return;
    }

    setLoading(true);

    try {
      if (!divisionId || !totalAllocated) {
        throw new Error("Please fill in all fields");
      }

      const allocatedAmount = parseFloat(totalAllocated);
      if (isNaN(allocatedAmount) || allocatedAmount <= 0) {
        throw new Error("Budget amount must be a positive number");
      }

      const { error: insertError } = await supabase.from("division_budgets").insert([
        {
          division_id: parseInt(divisionId),
          fiscal_year: budgetYear,
          allocated: allocatedAmount,
          utilized: 0,
          notes: notes?.trim() || null,
        },
      ]);

      if (insertError) throw insertError;

      setTotalAllocated("");
      setDivisionId("");
      setNotes("");
      setDuplicateCheck({ exists: false, existingBudget: null });
      setSuccessMsg("Budget allocation has been created successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <SuccessModal
      visible={!!successMsg}
      title="Budget Created!"
      message={successMsg ?? ""}
      onConfirm={() => { setSuccessMsg(null); onBudgetCreated(); onClose(); }}
    />
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm text-gray-900 ${
                  duplicateCheck.exists ? "border-amber-400 bg-amber-50" : "border-gray-200"
                }`}
                disabled={loading}
              >
                <option value="">Select…</option>
                {divisions.map((d) => (
                  <option key={d.division_id} value={d.division_id}>
                    {d.division_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateCheck.exists && (
            <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-amber-800 font-semibold">Budget already exists for this division and year</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Allocated: ₱{duplicateCheck.existingBudget?.allocated.toLocaleString()} · Utilized: ₱{duplicateCheck.existingBudget?.utilized.toLocaleString()}
                </p>
              </div>
              {onEditExisting && (
                <button
                  type="button"
                  onClick={handleEditExisting}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                >
                  <RiEditLine size={13} />
                  Edit Existing
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Allocated Budget (₱)</label>
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
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. STOD's allocated budget for the year…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm text-gray-900 resize-none"
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
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
    </>
  );
}
