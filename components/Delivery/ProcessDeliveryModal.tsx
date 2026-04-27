"use client";

import { RiCloseLine, RiEyeLine } from "react-icons/ri";
import { FlagButton, StatusFlagPicker, type StatusFlag, getFlagId } from "../StatusFlagPicker";

interface ProcessDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  active: any;
  statusLabel: string;
  drNo: string;
  setDrNo: (v: string) => void;
  soaNo: string;
  setSoaNo: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  iar: any;
  setIar: (v: any) => void;
  loa: any;
  setLoa: (v: any) => void;
  dv: any;
  setDv: (v: any) => void;
  statusFlag: StatusFlag | null;
  onPressStatusFlag: () => void;
  flagPickerOpen: boolean;
  onCloseFlagPicker: () => void;
  onSelectStatusFlag: (flag: StatusFlag | null) => void;
  onPreviewIAR?: () => void;
  onPreviewLOA?: () => void;
  onPreviewDV?: () => void;
}

export default function ProcessDeliveryModal({
  visible,
  onClose,
  onSubmit,
  active,
  statusLabel,
  drNo,
  setDrNo,
  soaNo,
  setSoaNo,
  notes,
  setNotes,
  iar,
  setIar,
  loa,
  setLoa,
  dv,
  setDv,
  statusFlag,
  onPressStatusFlag,
  flagPickerOpen,
  onCloseFlagPicker,
  onSelectStatusFlag,
  onPreviewIAR,
  onPreviewLOA,
  onPreviewDV,
}: ProcessDeliveryModalProps) {
  const deliveryNo = active?.delivery_no ?? "—";

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
                Phase 3 · Delivery Process
              </p>
              <h2 className="text-xl font-bold">{deliveryNo}</h2>
              <p className="text-sm text-white/80 mt-0.5">{statusLabel}</p>
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
          {/* Status 18 & 19: Delivery Receipt */}
          {(active?.status_id === 18 || active?.status_id === 19) && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                Delivery Receipt
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Delivery Receipt No. (DR No.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={drNo}
                    onChange={(e) => setDrNo(e.target.value)}
                    placeholder="e.g. DR-2026-0012"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Statement of Account (SOA No.)
                  </label>
                  <input
                    type="text"
                    value={soaNo}
                    onChange={(e) => setSoaNo(e.target.value)}
                    placeholder="e.g. SOA-2026-0008"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status 20: IAR */}
          {active?.status_id === 20 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Inspection & Acceptance Report (IAR)
                </p>
                {onPreviewIAR && (
                  <button
                    onClick={onPreviewIAR}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <RiEyeLine size={14} />
                    Preview IAR
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      IAR No.
                    </label>
                    <input
                      type="text"
                      value={iar?.iar_no ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), iar_no: e.target.value }))}
                      placeholder="e.g. IAR-2026-0015"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Invoice No.
                    </label>
                    <input
                      type="text"
                      value={iar?.invoice_no ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), invoice_no: e.target.value }))}
                      placeholder="e.g. INV-2026-0042"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Requisitioning Office
                    </label>
                    <input
                      type="text"
                      value={iar?.requisitioning_office ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), requisitioning_office: e.target.value }))}
                      placeholder="Office / Section"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Responsibility Center
                    </label>
                    <input
                      type="text"
                      value={iar?.responsibility_center ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), responsibility_center: e.target.value }))}
                      placeholder="RC-XXXX"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={iar?.invoice_date ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), invoice_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Date Inspected
                    </label>
                    <input
                      type="date"
                      value={iar?.inspected_at ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), inspected_at: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Date Received
                    </label>
                    <input
                      type="date"
                      value={iar?.received_at ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), received_at: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Inspector (Name)
                    </label>
                    <input
                      type="text"
                      value={iar?.inspector_name ?? ""}
                      onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), inspector_name: e.target.value }))}
                      placeholder="Printed name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Supply Officer (Name)
                  </label>
                  <input
                    type="text"
                    value={iar?.supply_officer_name ?? ""}
                    onChange={(e) => setIar((p: any) => ({ ...(p ?? {}), supply_officer_name: e.target.value }))}
                    placeholder="Printed name"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status 22: LOA */}
          {active?.status_id === 22 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Acceptance (LOA)
                </p>
                {onPreviewLOA && (
                  <button
                    onClick={onPreviewLOA}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <RiEyeLine size={14} />
                    Preview LOA
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      LOA No.
                    </label>
                    <input
                      type="text"
                      value={loa?.loa_no ?? ""}
                      onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), loa_no: e.target.value }))}
                      placeholder="e.g. LOA-2026-0003"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Invoice No.
                    </label>
                    <input
                      type="text"
                      value={loa?.invoice_no ?? ""}
                      onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), invoice_no: e.target.value }))}
                      placeholder="e.g. INV-2026-0042"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={loa?.invoice_date ?? ""}
                      onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), invoice_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Acceptance Date
                    </label>
                    <input
                      type="date"
                      value={loa?.accepted_at ?? ""}
                      onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), accepted_at: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Accepted By (Name)
                    </label>
                    <input
                      type="text"
                      value={loa?.accepted_by_name ?? ""}
                      onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), accepted_by_name: e.target.value }))}
                      placeholder="Printed name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Accepted By (Title/Designation)
                    </label>
                    <input
                      type="text"
                      value={loa?.accepted_by_title ?? ""}
                      onChange={(e) => setLoa((p: any) => ({ ...(p ?? {}), accepted_by_title: e.target.value }))}
                      placeholder="Position title"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status 23: DV */}
          {active?.status_id === 23 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Disbursement Voucher (DV)
                </p>
                {onPreviewDV && (
                  <button
                    onClick={onPreviewDV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <RiEyeLine size={14} />
                    Preview DV
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      DV No.
                    </label>
                    <input
                      type="text"
                      value={dv?.dv_no ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), dv_no: e.target.value }))}
                      placeholder="e.g. DV-2026-0009"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Amount Due
                    </label>
                    <input
                      type="text"
                      value={dv?.amount_due ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), amount_due: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Fund Cluster
                    </label>
                    <input
                      type="text"
                      value={dv?.fund_cluster ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), fund_cluster: e.target.value }))}
                      placeholder="e.g. 01"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      ORS No.
                    </label>
                    <input
                      type="text"
                      value={dv?.ors_no ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), ors_no: e.target.value }))}
                      placeholder="e.g. ORS-2026-0007"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Payee
                    </label>
                    <input
                      type="text"
                      value={dv?.payee ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), payee: e.target.value }))}
                      placeholder="Supplier / Payee name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Payee TIN
                    </label>
                    <input
                      type="text"
                      value={dv?.payee_tin ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), payee_tin: e.target.value }))}
                      placeholder="XXX-XXX-XXX-XXX"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Address
                  </label>
                  <input
                    type="text"
                    value={dv?.address ?? ""}
                    onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), address: e.target.value }))}
                    placeholder="Payee address"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mode of Payment
                  </label>
                  <input
                    type="text"
                    value={dv?.mode_of_payment ?? ""}
                    onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), mode_of_payment: e.target.value }))}
                    placeholder="e.g. MDS Check / ADA / Cash"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Responsibility Center
                    </label>
                    <input
                      type="text"
                      value={dv?.responsibility_center ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), responsibility_center: e.target.value }))}
                      placeholder="RC-XXXX"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      MFO/PAP
                    </label>
                    <input
                      type="text"
                      value={dv?.mfo_pap ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), mfo_pap: e.target.value }))}
                      placeholder="MFO/PAP code"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Particulars
                  </label>
                  <textarea
                    value={dv?.particulars ?? ""}
                    onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), particulars: e.target.value }))}
                    placeholder="Brief description of payment"
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Certified By
                    </label>
                    <input
                      type="text"
                      value={dv?.certified_by ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), certified_by: e.target.value }))}
                      placeholder="Printed name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Approved By
                    </label>
                    <input
                      type="text"
                      value={dv?.approved_by ?? ""}
                      onChange={(e) => setDv((p: any) => ({ ...(p ?? {}), approved_by: e.target.value }))}
                      placeholder="Printed name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status 24: End-User Forward */}
          {active?.status_id === 24 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5">
              <p className="text-sm text-indigo-900 leading-5">
                Forward LOA and DV to Division Chief for signature. This step
                ensures the Division Chief reviews and approves the disbursement
                before final completion.
              </p>
            </div>
          )}

          {/* Status 25: Division Chief */}
          {active?.status_id === 25 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <p className="text-sm text-emerald-900 leading-5">
                Finalize inspection and acceptance for this delivery. Submitting
                marks the delivery phase as complete and moves the record to
                Payment and Closure.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Notes
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Status Flag
                </label>
                <FlagButton selected={statusFlag} onPress={onPressStatusFlag} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes / Remarks
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for this delivery record…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                />
              </div>
            </div>
          </div>
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
            onClick={onSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
          >
            {active?.status_id === 24 ? "Forward to Division Chief" : active?.status_id === 25 ? "Submit & Complete Delivery Phase" : "Save & Update"}
          </button>
        </div>
      </div>
      <StatusFlagPicker
        visible={flagPickerOpen}
        selected={statusFlag}
        onSelect={onSelectStatusFlag}
        onClose={onCloseFlagPicker}
      />
    </div>
  );
}
