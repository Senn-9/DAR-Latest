"use client";

import { useState, useEffect, useRef } from "react";
import { RiCloseLine, RiEyeLine, RiArrowLeftLine, RiArrowRightLine, RiCheckLine, RiFilePdf2Line, RiZoomInLine, RiZoomOutLine, RiRefreshLine, RiMoneyDollarCircleLine, RiFileListLine, RiCalculatorLine } from "react-icons/ri";
import { FlagButton, StatusFlagPicker, type StatusFlag, getFlagId } from "../StatusFlagPicker";

interface ProcessPaymentModalProps {
  visible: boolean;
  active: any;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  statusLabel: string;
  statusFlag: StatusFlag | null;
  onPressStatusFlag: () => void;
  flagPickerOpen: boolean;
  onCloseFlagPicker: () => void;
  onSelectStatusFlag: (flag: StatusFlag | null) => void;
  onPreviewDocument: (type: 'voucher' | 'ors' | 'dv') => void;
  voucher?: any;
  ors?: any;
  dv?: any;
  poData?: any;
}

export default function ProcessPaymentModal({
  visible,
  active,
  onClose,
  onSubmit,
  statusLabel,
  statusFlag,
  onPressStatusFlag,
  flagPickerOpen,
  onCloseFlagPicker,
  onSelectStatusFlag,
  onPreviewDocument,
  voucher,
  ors,
  dv,
  poData,
}: ProcessPaymentModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<"voucher" | "ors" | "dv">("voucher");
  const [voucherData, setVoucherData] = useState(voucher || {});
  const [orsData, setOrsData] = useState(ors || {});
  const [dvData, setDvData] = useState(dv || {});

  // Payment processing steps based on Phase 4 workflow
  const steps = [
    { id: 1, label: "Verify Voucher", icon: "1" },
    { id: 2, label: "Account Review", icon: "2" },
    { id: 3, label: "Budget Check", icon: "3" },
    { id: 4, label: "PARPO Approval", icon: "4" },
    { id: 5, label: "Cash Processing", icon: "5" },
    { id: 6, label: "Final Approval", icon: "6" },
  ];

  useEffect(() => {
    if (visible) {
      setNotes("");
      setVoucherData(voucher || {});
      setOrsData(ors || {});
      setDvData(dv || {});
      
      // Set current step based on delivery status
      switch (active?.status_id) {
        case 28: // Payment Pending
        case 29: // Payment Processing
          setCurrentStep(1); // Verify Voucher
          break;
        case 30: // Accounting Review
          setCurrentStep(2); // Account Review
          break;
        case 31: // Budget Review
          setCurrentStep(3); // Budget Check
          break;
        case 32: // Final Approval
          setCurrentStep(4); // PARPO Approval
          break;
        default:
          setCurrentStep(1);
      }
    }
  }, [visible, voucher, ors, dv, active?.status_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderFormContent = () => {
    switch (currentStep) {
      case 1: // Verify Voucher
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 1: Verify Voucher Completeness</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Voucher Number
                </label>
                <input
                  type="text"
                  value={voucherData.voucher_no || ""}
                  onChange={(e) => setVoucherData({ ...voucherData, voucher_no: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter voucher number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Voucher Amount
                </label>
                <input
                  type="number"
                  value={voucherData.amount || ""}
                  onChange={(e) => setVoucherData({ ...voucherData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Completeness Check
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={voucherData.supporting_docs || false}
                      onChange={(e) => setVoucherData({ ...voucherData, supporting_docs: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Supporting documents attached</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={voucherData.signatures_complete || false}
                      onChange={(e) => setVoucherData({ ...voucherData, signatures_complete: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">All required signatures complete</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={voucherData.amount_verified || false}
                      onChange={(e) => setVoucherData({ ...voucherData, amount_verified: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Amount matches ORS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Verification Status
                </label>
                <select
                  value={voucherData.verification_status || ""}
                  onChange={(e) => setVoucherData({ ...voucherData, verification_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">Select status</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete - Issue NORSA</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2: // Account Review
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 2: Account Review</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Accountant Name
                </label>
                <input
                  type="text"
                  value={voucherData.accountant_name || ""}
                  onChange={(e) => setVoucherData({ ...voucherData, accountant_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter accountant name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Account Review Date
                </label>
                <input
                  type="date"
                  value={voucherData.account_review_date || ""}
                  onChange={(e) => setVoucherData({ ...voucherData, account_review_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Account Review Notes
                </label>
                <textarea
                  value={voucherData.account_review_notes || ""}
                  onChange={(e) => setVoucherData({ ...voucherData, account_review_notes: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  placeholder="Enter account review notes..."
                />
              </div>
            </div>
          </div>
        );

      case 3: // Budget Check
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 3: Budget Review</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Budget Officer Name
                </label>
                <input
                  type="text"
                  value={orsData.budget_officer_name || ""}
                  onChange={(e) => setOrsData({ ...orsData, budget_officer_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter budget officer name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ORS Number
                </label>
                <input
                  type="text"
                  value={orsData.ors_no || ""}
                  onChange={(e) => setOrsData({ ...orsData, ors_no: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter ORS number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Budget Availability
                </label>
                <select
                  value={orsData.budget_status || ""}
                  onChange={(e) => setOrsData({ ...orsData, budget_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">Select status</option>
                  <option value="available">Budget Available</option>
                  <option value="insufficient">Insufficient Budget</option>
                  <option value="reallocated">Budget Reallocated</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4: // PARPO Approval
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 4: PARPO Approval</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  PARPO Name
                </label>
                <input
                  type="text"
                  value={dvData.parpo_name || ""}
                  onChange={(e) => setDvData({ ...dvData, parpo_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter PARPO name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  PARPO Approval Date
                </label>
                <input
                  type="date"
                  value={dvData.parpo_approval_date || ""}
                  onChange={(e) => setDvData({ ...dvData, parpo_approval_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  PARPO Remarks
                </label>
                <textarea
                  value={dvData.parpo_remarks || ""}
                  onChange={(e) => setDvData({ ...dvData, parpo_remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  placeholder="Enter PARPO remarks..."
                />
              </div>
            </div>
          </div>
        );

      case 5: // Cash Processing
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 5: Cash Processing</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Payment Type
                </label>
                <select
                  value={dvData.payment_type || ""}
                  onChange={(e) => setDvData({ ...dvData, payment_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">Select payment type</option>
                  <option value="check">Check</option>
                  <option value="lldap">LLDAP</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Check Number (if applicable)
                </label>
                <input
                  type="text"
                  value={dvData.check_no || ""}
                  onChange={(e) => setDvData({ ...dvData, check_no: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter check number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Release Date
                </label>
                <input
                  type="date"
                  value={dvData.release_date || ""}
                  onChange={(e) => setDvData({ ...dvData, release_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
          </div>
        );

      case 6: // Final Approval
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Step 6: Final Approval</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Final Approver Name
                </label>
                <input
                  type="text"
                  value={dvData.final_approver_name || ""}
                  onChange={(e) => setDvData({ ...dvData, final_approver_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Enter final approver name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Approval Date
                </label>
                <input
                  type="date"
                  value={dvData.final_approval_date || ""}
                  onChange={(e) => setDvData({ ...dvData, final_approval_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  EMDS Encoding Status
                </label>
                <select
                  value={dvData.emds_status || ""}
                  onChange={(e) => setDvData({ ...dvData, emds_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">Select status</option>
                  <option value="encoded">Encoded in EMDS</option>
                  <option value="pending">Pending Encoding</option>
                  <option value="error">Encoding Error</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPreviewContent = () => {
    switch (selectedDocument) {
      case "voucher":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Voucher Preview</h4>
            <div className="space-y-2">
              <p><strong>Voucher No:</strong> {voucherData.voucher_no || "N/A"}</p>
              <p><strong>Amount:</strong> ₱{voucherData.amount || "0.00"}</p>
              <p><strong>Status:</strong> {voucherData.verification_status || "Not Set"}</p>
              <p><strong>Accountant:</strong> {voucherData.accountant_name || "N/A"}</p>
            </div>
          </div>
        );
      case "ors":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">ORS Preview</h4>
            <div className="space-y-2">
              <p><strong>ORS No:</strong> {orsData.ors_no || "N/A"}</p>
              <p><strong>Budget Officer:</strong> {orsData.budget_officer_name || "N/A"}</p>
              <p><strong>Budget Status:</strong> {orsData.budget_status || "Not Set"}</p>
            </div>
          </div>
        );
      case "dv":
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">DV Preview</h4>
            <div className="space-y-2">
              <p><strong>PARPO:</strong> {dvData.parpo_name || "N/A"}</p>
              <p><strong>Payment Type:</strong> {dvData.payment_type || "Not Set"}</p>
              <p><strong>Check No:</strong> {dvData.check_no || "N/A"}</p>
              <p><strong>Release Date:</strong> {dvData.release_date || "N/A"}</p>
            </div>
          </div>
        );
      default:
        return <div>Select a document to preview</div>;
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-6 py-4 border-b border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{statusLabel}</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Delivery: {active?.delivery_no} | PO: {active?.po_no}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-100 hover:text-white transition-colors"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    currentStep === step.id
                      ? "bg-emerald-700 text-white"
                      : currentStep > step.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > step.id ? <RiCheckLine size={14} /> : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 transition-colors ${
                      currentStep > step.id ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
            <div className="ml-4">
              <p className="text-xs font-medium text-gray-700">
                Step {currentStep} of {steps.length}
              </p>
              <p className="text-xs text-gray-500">{steps[currentStep - 1]?.label}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Form Side */}
          <div className="flex-[2] overflow-y-auto bg-white p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Status Flag */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Status Flag</h3>
                <FlagButton selected={statusFlag} onPress={onPressStatusFlag} />
              </div>

              {/* Form Content */}
              {renderFormContent()}

              {/* Notes */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 pb-2 border-b border-emerald-100">Notes</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Processing Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes for this payment processing step…"
                      rows={3}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RiArrowLeftLine size={16} />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {currentStep < steps.length ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                    >
                      Next
                      <RiArrowRightLine size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                    >
                      <RiCheckLine size={16} />
                      Complete Processing
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Preview Side */}
          <div className="flex-[1] overflow-y-auto bg-gray-100 border-l border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">DOCUMENT PREVIEW</h3>
              </div>

              {/* Document Selection */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedDocument("voucher")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDocument === "voucher"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Voucher
                </button>
                <button
                  onClick={() => setSelectedDocument("ors")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDocument === "ors"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  ORS
                </button>
                <button
                  onClick={() => setSelectedDocument("dv")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDocument === "dv"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  DV
                </button>
              </div>

              {/* Preview Content */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                {renderPreviewContent()}
              </div>

              {/* Preview Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onPreviewDocument(selectedDocument)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <RiEyeLine size={14} />
                  View Full Document
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Flag Picker Modal */}
        {flagPickerOpen && (
          <StatusFlagPicker
            visible={flagPickerOpen}
            selected={statusFlag}
            onSelect={onSelectStatusFlag}
            onClose={onCloseFlagPicker}
          />
        )}
      </div>
    </div>
  );
}
