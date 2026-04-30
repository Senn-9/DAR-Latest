"use client";

import { useEffect, useRef, useState } from "react";
import { RiCloseLine, RiFileListLine, RiAlertLine, RiMailSendLine } from "react-icons/ri";

interface NORSAModalProps {
  visible: boolean;
  delivery: any;
  onClose: () => void;
  onSubmit: (norsaData: any) => Promise<void>;
}

export default function NORSAModal({
  visible,
  delivery,
  onClose,
  onSubmit,
}: NORSAModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [norsaData, setNorsaData] = useState({
    norsa_no: "",
    original_ors_no: "",
    adjustment_reason: "",
    original_amount: 0,
    adjusted_amount: 0,
    adjustment_details: "",
    budget_officer_name: "",
    division_chief_name: "",
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(norsaData);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      contentRef.current?.focus();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-orange-600 text-white px-6 py-4 border-b border-orange-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <RiAlertLine size={24} />
                Notice of Return Slip for Adjustment (NORSA)
              </h2>
              <p className="text-orange-100 text-sm mt-1">
                Delivery: {delivery?.delivery_no} | PO: {delivery?.po_no}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-orange-100 hover:text-white transition-colors"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          tabIndex={0}
          className="flex-1 min-h-0 overflow-y-auto p-6 outline-none"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* NORSA Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">NORSA Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    NORSA Number
                  </label>
                  <input
                    type="text"
                    value={norsaData.norsa_no}
                    onChange={(e) => setNorsaData({ ...norsaData, norsa_no: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Enter NORSA number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Original ORS Number
                  </label>
                  <input
                    type="text"
                    value={norsaData.original_ors_no}
                    onChange={(e) => setNorsaData({ ...norsaData, original_ors_no: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Enter original ORS number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Adjustment Reason
                </label>
                <select
                  value={norsaData.adjustment_reason}
                  onChange={(e) => setNorsaData({ ...norsaData, adjustment_reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  required
                >
                  <option value="">Select adjustment reason</option>
                  <option value="amount_mismatch">Amount Mismatch (DV vs ORS)</option>
                  <option value="missing_documents">Missing Supporting Documents</option>
                  <option value="incorrect_payee">Incorrect Payee Information</option>
                  <option value="budget_insufficient">Insufficient Budget Allocation</option>
                  <option value="other">Other Reasons</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Original Amount (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={norsaData.original_amount}
                    onChange={(e) => setNorsaData({ ...norsaData, original_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Adjusted Amount (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={norsaData.adjusted_amount}
                    onChange={(e) => setNorsaData({ ...norsaData, adjusted_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Adjustment Details
                </label>
                <textarea
                  value={norsaData.adjustment_details}
                  onChange={(e) => setNorsaData({ ...norsaData, adjustment_details: e.target.value })}
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  placeholder="Provide detailed explanation of the adjustments needed..."
                  required
                />
              </div>
            </div>

            {/* Approval Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Required Approvals</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Budget Officer Name
                  </label>
                  <input
                    type="text"
                    value={norsaData.budget_officer_name}
                    onChange={(e) => setNorsaData({ ...norsaData, budget_officer_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Enter budget officer name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Division Chief Name
                  </label>
                  <input
                    type="text"
                    value={norsaData.division_chief_name}
                    onChange={(e) => setNorsaData({ ...norsaData, division_chief_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Enter division chief name"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Remarks */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Remarks</h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Remarks / Instructions
                </label>
                <textarea
                  value={norsaData.remarks}
                  onChange={(e) => setNorsaData({ ...norsaData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  placeholder="Additional remarks or instructions for the adjustment..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
              >
                <RiMailSendLine size={16} />
                Issue NORSA
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
