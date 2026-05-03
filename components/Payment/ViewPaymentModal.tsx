"use client";

import { useEffect, useRef, useState } from "react";
import { RiCloseLine, RiFileListLine, RiMoneyDollarCircleLine, RiUserLine, RiCalendarLine, RiCheckLine, RiTimeLine, RiArrowRightLine } from "react-icons/ri";

interface ViewPaymentModalProps {
  visible: boolean;
  delivery: any;
  voucher?: any;
  ors?: any;
  dv?: any;
  poData?: any;
  onClose: () => void;
}

export default function ViewPaymentModal({
  visible,
  delivery,
  voucher,
  ors,
  dv,
  poData,
  onClose,
}: ViewPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "voucher" | "ors" | "dv" | "timeline">("overview");
  const contentRef = useRef<HTMLDivElement | null>(null);

  const paymentStatuses = [
    { id: 28, label: "Payment Pending", color: "bg-yellow-100 text-yellow-800" },
    { id: 29, label: "Voucher Verification", color: "bg-orange-100 text-orange-800" },
    { id: 30, label: "Accounting Review", color: "bg-purple-100 text-purple-800" },
    { id: 32, label: "PARPO Approval", color: "bg-cyan-100 text-cyan-800" },
    { id: 33, label: "Forward to Cash", color: "bg-indigo-100 text-indigo-800" },
    { id: 34, label: "Forward to PARPO office for signature", color: "bg-sky-100 text-sky-800" },
    { id: 35, label: "Forward to Accounting for Tax processing", color: "bg-amber-100 text-amber-900" },
    { id: 36, label: "Payment completed", color: "bg-emerald-100 text-emerald-800" },
  ];

  const currentStatus = paymentStatuses.find(s => s.id === delivery?.status_id) || paymentStatuses[0];

  const timeline = [
    { step: 1, title: "Voucher Verification", status: delivery?.status_id >= 29 ? "completed" : "pending", date: voucher?.verification_date },
    { step: 2, title: "Accounting Review", status: delivery?.status_id >= 30 ? "completed" : "pending", date: voucher?.account_review_date },
    { step: 3, title: "PARPO Approval", status: delivery?.status_id >= 32 ? "completed" : "pending", date: dv?.parpo_approval_date },
    { step: 4, title: "Forward to Cash", status: delivery?.status_id >= 33 ? "completed" : "pending", date: dv?.cash_processing_date },
    { step: 5, title: "PARPO office signature", status: delivery?.status_id >= 34 ? "completed" : "pending", date: dv?.parpo_approval_date },
    { step: 6, title: "Accounting — Tax processing", status: delivery?.status_id >= 35 ? "completed" : "pending", date: voucher?.account_review_date },
    { step: 7, title: "Cash release / completed", status: delivery?.status_id >= 36 ? "completed" : "pending", date: dv?.final_approval_date },
  ];

  useEffect(() => {
    if (visible) {
      contentRef.current?.focus();
    }
  }, [visible, activeTab]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-6 py-4 border-b border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Payment Details</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Delivery: {delivery?.delivery_no} | PO: {delivery?.po_no}
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

        {/* Tabs */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-4 min-w-max">
            {[
              { id: "overview", label: "Overview", icon: RiFileListLine },
              { id: "voucher", label: "Voucher", icon: RiMoneyDollarCircleLine },
              { id: "ors", label: "ORS", icon: RiFileListLine },
              { id: "dv", label: "DV", icon: RiFileListLine },
              { id: "timeline", label: "Timeline", icon: RiTimeLine },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? "border-emerald-700 text-emerald-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          tabIndex={0}
          className="flex-1 min-h-0 overflow-y-auto p-6 outline-none"
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
                  <p className="text-sm text-gray-500 mt-1">Payment processing stage</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${currentStatus.color}`}>
                  {currentStatus.label}
                </span>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Information</h4>
                  <div className="space-y-1">
                    <p className="text-sm"><strong>Delivery No:</strong> {delivery?.delivery_no}</p>
                    <p className="text-sm"><strong>PO Number:</strong> {delivery?.po_no}</p>
                    <p className="text-sm"><strong>Supplier:</strong> {delivery?.supplier}</p>
                    <p className="text-sm"><strong>Expected Date:</strong> {delivery?.expected_delivery_date}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Information</h4>
                  <div className="space-y-1">
                    <p className="text-sm"><strong>Total Amount:</strong> ₱{poData?.total_amount || "0.00"}</p>
                    <p className="text-sm"><strong>Payment Type:</strong> {dv?.payment_type || "Not Set"}</p>
                    <p className="text-sm"><strong>Check No:</strong> {dv?.check_no || "N/A"}</p>
                    <p className="text-sm"><strong>Release Date:</strong> {dv?.release_date || "Not Set"}</p>
                  </div>
                </div>
              </div>

              {/* Progress Overview */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Progress</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timeline.map((item) => (
                    <div key={item.step} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        item.status === "completed" ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
                      }`}>
                        {item.status === "completed" ? <RiCheckLine size={12} /> : item.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.status === "completed" ? `Completed on ${item.date || "N/A"}` : "Pending"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "voucher" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Voucher Details</h3>
              {voucher ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Voucher Number</label>
                      <p className="text-sm text-gray-900 mt-1">{voucher.voucher_no || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount</label>
                      <p className="text-sm text-gray-900 mt-1">₱{voucher.amount || "0.00"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verification Status</label>
                      <p className="text-sm text-gray-900 mt-1">{voucher.verification_status || "Not Set"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verification Date</label>
                      <p className="text-sm text-gray-900 mt-1">{voucher.verification_date || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Accountant Name</label>
                      <p className="text-sm text-gray-900 mt-1">{voucher.accountant_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Review Date</label>
                      <p className="text-sm text-gray-900 mt-1">{voucher.account_review_date || "N/A"}</p>
                    </div>
                  </div>
                  {voucher.account_review_notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Review Notes</label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">{voucher.account_review_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <RiMoneyDollarCircleLine size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No voucher information available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "ors" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Obligation Request (ORS)</h3>
              {ors ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ORS Number</label>
                      <p className="text-sm text-gray-900 mt-1">{ors.ors_no || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <RiFileListLine size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No ORS information available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "dv" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Disbursement Voucher (DV)</h3>
              {dv ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PARPO Name</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.parpo_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PARPO Approval Date</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.parpo_approval_date || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.payment_type || "Not Set"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Check Number</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.check_no || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Release Date</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.release_date || "Not Set"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Final Approver</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.final_approver_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Final Approval Date</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.final_approval_date || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">EMDS Status</label>
                      <p className="text-sm text-gray-900 mt-1">{dv.emds_status || "Not Set"}</p>
                    </div>
                  </div>
                  {dv.parpo_remarks && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PARPO Remarks</label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">{dv.parpo_remarks}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <RiFileListLine size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No DV information available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment Processing Timeline</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {timeline.map((item, index) => (
                  <div key={item.step} className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      item.status === "completed" ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                      {item.status === "completed" ? <RiCheckLine size={16} /> : item.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.status === "completed" ? (
                          <>
                            Completed on <span className="font-medium">{item.date || "N/A"}</span>
                          </>
                        ) : (
                          "Pending completion"
                        )}
                      </p>
                      {item.status === "completed" && (
                        <div className="mt-2 text-xs text-emerald-600 font-medium">
                          ✓ Step completed successfully
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Last updated: {delivery?.updated_at ? new Date(delivery.updated_at).toLocaleDateString() : "N/A"}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
