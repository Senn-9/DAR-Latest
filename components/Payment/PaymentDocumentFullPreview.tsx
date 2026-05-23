"use client";

import React, { useState, useEffect } from "react";
import {
  RiCloseLine,
  RiPrinterLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiAddLine,
  RiDeleteBinLine,
  RiCheckLine,
} from "react-icons/ri";

import { buildIARHtml } from "../Delivery/IARPreview";
import { buildLOAHtml } from "../Delivery/LOAPreview";
import { buildDVHtml } from "../Delivery/DVPreview";
import { buildORSPrintHtml } from "@/utils/print/ORSPrintBuilder";

export type PaymentProcessDocType = "iar" | "loa" | "ors" | "dv";

interface PaymentDocumentFullPreviewProps {
  open: boolean;
  onClose: () => void;
  initialTab?: PaymentProcessDocType;
  docTabs: PaymentProcessDocType[];
  active: any;
  poData: any;
  iarData: any;
  setIarData: (data: any) => void;
  loaData: any;
  setLoaData: (data: any) => void;
  orsData: any;
  setOrsData: (data: any) => void;
  dvData: any;
  setDvData: (data: any) => void;
  accountingEntries: any[];
  setAccountingEntries: (entries: any[]) => void;
}

// Styling classes for dark form panel
const inputWrapperCls = "space-y-1";
const labelCls = "block text-[10px] font-bold text-neutral-400 uppercase tracking-wider";
const inputCls = "w-full rounded-xl border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all";
const selectCls = "w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all";
const textareaCls = "w-full rounded-xl border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-y";
const checkboxLabelCls = "flex items-start gap-2.5 text-xs text-neutral-300 cursor-pointer select-none hover:text-white transition-colors";
const checkboxCls = "rounded border-neutral-800 bg-neutral-900 text-emerald-600 focus:ring-emerald-500 size-4 mt-0.5 cursor-pointer";

export default function PaymentDocumentFullPreview({
  open,
  onClose,
  initialTab,
  docTabs,
  active,
  poData,
  iarData,
  setIarData,
  loaData,
  setLoaData,
  orsData,
  setOrsData,
  dvData,
  setDvData,
  accountingEntries,
  setAccountingEntries,
}: PaymentDocumentFullPreviewProps) {
  const [activeTab, setActiveTab] = useState<PaymentProcessDocType>("dv");
  const [zoomLevel, setZoomLevel] = useState(0.85);

  useEffect(() => {
    if (initialTab && docTabs.includes(initialTab)) {
      setActiveTab(initialTab);
    } else if (docTabs.length > 0) {
      setActiveTab(docTabs[0]);
    }
  }, [initialTab, docTabs, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const transformedPoData = poData
    ? {
        ...poData,
        po_items: poData.purchase_order_items || [],
        po_date: poData.date,
      }
    : {};

  // Form Field Update Handlers
  const updateDvField = (field: string, val: any) => {
    setDvData({ ...dvData, [field]: val });
  };

  const updateAccountingEntry = (index: number, field: string, value: string) => {
    const updated = [...accountingEntries];
    updated[index] = { ...updated[index], [field]: value };
    setAccountingEntries(updated);
  };

  const addAccountingEntry = () => {
    setAccountingEntries([
      ...accountingEntries,
      { account_title: "", uacs_code: "", debit: "", credit: "" },
    ]);
  };

  const removeAccountingEntry = (index: number) => {
    setAccountingEntries(accountingEntries.filter((_, i) => i !== index));
  };

  const updateIarField = (field: string, val: any) => {
    setIarData({ ...iarData, [field]: val });
  };

  const iarItems = iarData?.iar_po_items || transformedPoData.po_items || [];
  const updateIarItem = (index: number, field: string, value: any) => {
    const updatedItems = [...iarItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setIarData({ ...iarData, iar_po_items: updatedItems });
  };

  const addIarItem = () => {
    const updatedItems = [
      ...iarItems,
      { stock_no: "", unit: "", description: "", quantity: 0, unit_price: 0 },
    ];
    setIarData({ ...iarData, iar_po_items: updatedItems });
  };

  const removeIarItem = (index: number) => {
    const updatedItems = iarItems.filter((_: any, i: number) => i !== index);
    setIarData({ ...iarData, iar_po_items: updatedItems });
  };

  const updateLoaField = (field: string, val: any) => {
    setLoaData({ ...loaData, [field]: val });
  };

  const updateOrsField = (field: string, val: any) => {
    setOrsData({ ...orsData, [field]: val });
  };

  // Compile full A4 HTML structure dynamically based on tab state
  const getIframeHtml = () => {
    try {
      if (activeTab === "iar") {
        const mergedData = { ...active, ...transformedPoData, ...iarData };
        mergedData.po_items = iarItems;
        if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
        if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;
        return buildIARHtml(mergedData);
      }
      
      if (activeTab === "loa") {
        const mergedData = { ...active, ...transformedPoData, ...loaData };
        mergedData.po_items = transformedPoData.po_items;
        if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
        if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;
        return buildLOAHtml(mergedData);
      }
      
      if (activeTab === "dv") {
        const mergedData = { ...active, ...transformedPoData, ...dvData };
        mergedData.po_items = transformedPoData.po_items;
        if (transformedPoData.po_no) mergedData.po_no = transformedPoData.po_no;
        if (transformedPoData.po_date) mergedData.po_date = transformedPoData.po_date;
        mergedData.accounting_entries = accountingEntries;
        return buildDVHtml(mergedData);
      }
      
      if (activeTab === "ors") {
        const amt = Number(orsData.obligation_amount || orsData.amount || active?.amount || 0);
        return buildORSPrintHtml({
          orsNo: orsData.ors_no || null,
          orsDate: orsData.ors_date || null,
          entityName: orsData.entity_name || "Department of Agrarian Reform - Camarines Sur 1",
          payee: orsData.payee || active?.supplier_name || active?.supplier || null,
          payeeAddress: orsData.payee_address || active?.payee_address || null,
          office: orsData.office || active?.office_section || null,
          fundCluster: orsData.fund_cluster || "01",
          responsibilityCenter: orsData.responsibility_center || null,
          particulars: orsData.particulars || null,
          mfoPap: orsData.mfo_pap || null,
          uacsCode: orsData.uacs_code || null,
          amount: amt,
          referenceNo: orsData.reference_no || orsData.ors_no || null,
          obligationAmount: Number(orsData.obligation_amount || amt),
          payableAmount: Number(orsData.payable_amount || 0),
          paymentAmount: Number(orsData.payment_amount || 0),
          notYetDueBalance: Number(orsData.not_yet_due_balance || 0),
          dueDemandableBalance: Number(orsData.due_demandable_balance || 0),
          preparedByName: orsData.prepared_by_name || null,
          preparedByDesig: orsData.prepared_by_desig || null,
          certifiedByName: orsData.certified_by_name || null,
          certifiedByDesig: orsData.certified_by_desig || null,
          preparedByDate: orsData.prepared_by_date || null,
          certifiedByDate: orsData.certified_by_date || null,
          sectionCParticulars: orsData.section_c_particulars || null,
          blankStatusSection: orsData.blankStatusSection || false,
        });
      }
    } catch (err) {
      console.error("HTML Generation Error:", err);
    }
    return "";
  };

  const handlePrint = () => {
    try {
      const html = getIframeHtml();
      const printWindow = window.open("", "_blank", "height=800,width=1200");
      if (!printWindow) {
        alert("Please allow popups for this site to print the document.");
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.error("Print failed:", e);
          alert("Failed to print. Please check your browser settings.");
        }
      }, 250);
    } catch (err) {
      console.error("Error executing print:", err);
    }
  };

  const getDocTabLabel = (tab: PaymentProcessDocType) => {
    switch (tab) {
      case "iar":
        return "IAR (Appendix 62)";
      case "loa":
        return "LOA";
      case "ors":
        return "ORS (Appendix 11)";
      case "dv":
        return "DV (Appendix 32)";
      default:
        return tab.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 select-none text-white ppm-root">
      {/* ── TOP HEADER / TOOLBAR ────────────────────────────────────────── */}
      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-6 py-3.5 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-950/20">
            P
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide uppercase text-neutral-100">
              Live Preview & Editor
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              Payment Documents Workflow Editor
            </p>
          </div>
        </div>

        {/* Dynamic Document Select Tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          {docTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === tab
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/10 scale-[1.02]"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-855"
              }`}
            >
              {getDocTabLabel(tab)}
            </button>
          ))}
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.05, 0.3))}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
              title="Zoom Out"
            >
              <RiZoomOutLine className="size-4" />
            </button>
            <span className="text-xs font-mono font-bold text-neutral-300 min-w-[3.5rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.05, 1.4))}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
              title="Zoom In"
            >
              <RiZoomInLine className="size-4" />
            </button>
            <button
              onClick={() => setZoomLevel(0.85)}
              className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-neutral-500 hover:text-neutral-300 transition"
            >
              Reset
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-emerald-600/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-900/10"
          >
            <RiPrinterLine className="size-4" />
            Print Document
          </button>

          <div className="w-[1px] h-6 bg-neutral-850 mx-1" />

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            title="Close Live Editor"
          >
            <RiCloseLine className="size-5" />
          </button>
        </div>
      </header>

      {/* ── SPLIT PANEL VIEW AREA ────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-neutral-950">
        
        {/* LEFT COLUMN: INTERACTIVE FORM INPUTS */}
        <aside className="w-[360px] shrink-0 border-r border-neutral-850 bg-neutral-950 flex flex-col min-h-0 select-text">
          <div className="px-5 py-4 border-b border-neutral-850 bg-neutral-900/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Form Parameters
            </h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Live updates are synced to the parent modal.
            </p>
          </div>

          {/* Form scroll container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 vpm-scroll">
            
            {/* IAR DOCUMENT FIELDS */}
            {activeTab === "iar" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Supplier & Cluster
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Supplier Name</label>
                    <input
                      type="text"
                      value={iarData.supplier_name || active?.supplier_name || active?.supplier || ""}
                      onChange={(e) => updateIarField("supplier_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Fund Cluster</label>
                    <input
                      type="text"
                      value={iarData.fund_cluster || "01"}
                      onChange={(e) => updateIarField("fund_cluster", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Order Details
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>PO No.</label>
                      <input
                        type="text"
                        value={iarData.po_no || active?.po_no || ""}
                        onChange={(e) => updateIarField("po_no", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>PO Date</label>
                      <input
                        type="text"
                        value={iarData.po_date || active?.po_date || ""}
                        onChange={(e) => updateIarField("po_date", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Requisitioning Office</label>
                    <input
                      type="text"
                      value={iarData.office_section || active?.office_section || ""}
                      onChange={(e) => updateIarField("office_section", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Resp. Center Code</label>
                    <input
                      type="text"
                      value={iarData.responsibility_center_code || active?.responsibility_center_code || ""}
                      onChange={(e) => updateIarField("responsibility_center_code", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    IAR & Invoice References
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>IAR No.</label>
                      <input
                        type="text"
                        value={iarData.iar_no || active?.iar_no || ""}
                        onChange={(e) => updateIarField("iar_no", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>IAR Date</label>
                      <input
                        type="text"
                        value={iarData.iar_date || active?.iar_date || iarData.date || ""}
                        onChange={(e) => updateIarField("iar_date", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Invoice No.</label>
                      <input
                        type="text"
                        value={iarData.invoice_no || active?.invoice_no || ""}
                        onChange={(e) => updateIarField("invoice_no", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Invoice Date</label>
                      <input
                        type="text"
                        value={iarData.invoice_date || active?.invoice_date || ""}
                        onChange={(e) => updateIarField("invoice_date", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Verification & Acceptance
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Date Inspected</label>
                    <input
                      type="text"
                      value={iarData.inspected_at || ""}
                      onChange={(e) => updateIarField("inspected_at", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Inspection Officer</label>
                    <input
                      type="text"
                      value={iarData.inspection_officer || ""}
                      onChange={(e) => updateIarField("inspection_officer", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <label className={checkboxLabelCls}>
                    <input
                      type="checkbox"
                      checked={!!iarData.inspection_verified}
                      onChange={(e) => updateIarField("inspection_verified", e.target.checked)}
                      className={checkboxCls}
                    />
                    <span>Inspection verified & found in order</span>
                  </label>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Date Received</label>
                    <input
                      type="text"
                      value={iarData.received_at || ""}
                      onChange={(e) => updateIarField("received_at", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Supply Officer</label>
                    <input
                      type="text"
                      value={iarData.supply_officer || ""}
                      onChange={(e) => updateIarField("supply_officer", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
                    <span className="text-xs font-bold text-neutral-400 uppercase">
                      Line Items
                    </span>
                    <button
                      type="button"
                      onClick={addIarItem}
                      className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 rounded text-[9px] font-bold text-white flex items-center gap-1"
                    >
                      <RiAddLine className="size-2.5" /> Add
                    </button>
                  </div>
                  
                  {iarItems.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => removeIarItem(idx)}
                        className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition"
                      >
                        <RiDeleteBinLine className="size-3.5" />
                      </button>
                      <span className="text-[9px] font-bold text-neutral-500 uppercase">
                        Item #{idx + 1}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={inputWrapperCls}>
                          <label className={labelCls}>Stock No</label>
                          <input
                            type="text"
                            value={item.stock_no || ""}
                            onChange={(e) => updateIarItem(idx, "stock_no", e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div className={inputWrapperCls}>
                          <label className={labelCls}>Unit</label>
                          <input
                            type="text"
                            value={item.unit || ""}
                            onChange={(e) => updateIarItem(idx, "unit", e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className={inputWrapperCls}>
                        <label className={labelCls}>Description</label>
                        <textarea
                          rows={1}
                          value={item.description || ""}
                          onChange={(e) => updateIarItem(idx, "description", e.target.value)}
                          className={textareaCls}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={inputWrapperCls}>
                          <label className={labelCls}>Quantity</label>
                          <input
                            type="number"
                            value={item.quantity || 0}
                            onChange={(e) => updateIarItem(idx, "quantity", Number(e.target.value))}
                            className={inputCls}
                          />
                        </div>
                        <div className={inputWrapperCls}>
                          <label className={labelCls}>Unit Cost</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price || item.unit_cost || 0}
                            onChange={(e) => updateIarItem(idx, "unit_price", Number(e.target.value))}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOA DOCUMENT FIELDS */}
            {activeTab === "loa" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Delivery & Invoice Parameters
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Acceptance Date</label>
                    <input
                      type="text"
                      value={loaData.accepted_at || active?.accepted_at || ""}
                      onChange={(e) => updateLoaField("accepted_at", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. October 12, 2026"
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Supplier Name</label>
                    <input
                      type="text"
                      value={loaData.supplier_name || active?.supplier_name || active?.supplier || ""}
                      onChange={(e) => updateLoaField("supplier_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Invoice No.</label>
                      <input
                        type="text"
                        value={loaData.invoice_no || active?.invoice_no || ""}
                        onChange={(e) => updateLoaField("invoice_no", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Invoice Date</label>
                      <input
                        type="text"
                        value={loaData.invoice_date || active?.invoice_date || ""}
                        onChange={(e) => updateLoaField("invoice_date", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Reference Orders
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>PO Number</label>
                      <input
                        type="text"
                        value={loaData.po_no || active?.po_no || ""}
                        onChange={(e) => updateLoaField("po_no", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>PO Date</label>
                      <input
                        type="text"
                        value={loaData.po_date || active?.po_date || ""}
                        onChange={(e) => updateLoaField("po_date", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Signatory Representative
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Authorized Name</label>
                    <input
                      type="text"
                      value={loaData.accepted_by_name || active?.accepted_by_name || ""}
                      onChange={(e) => updateLoaField("accepted_by_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Official Title</label>
                    <input
                      type="text"
                      value={loaData.accepted_by_title || loaData.accepted_by_position || active?.accepted_by_title || ""}
                      onChange={(e) => updateLoaField("accepted_by_title", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ORS DOCUMENT FIELDS */}
            {activeTab === "ors" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Obligation Details
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>ORS/BURS No.</label>
                    <input
                      type="text"
                      value={orsData.ors_no || ""}
                      onChange={(e) => updateOrsField("ors_no", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. 01-101101-2026-10-1234"
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>ORS Date</label>
                    <input
                      type="text"
                      value={orsData.ors_date || ""}
                      onChange={(e) => updateOrsField("ors_date", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Fund Cluster</label>
                    <input
                      type="text"
                      value={orsData.fund_cluster || "01"}
                      onChange={(e) => updateOrsField("fund_cluster", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Entity Name</label>
                    <input
                      type="text"
                      value={orsData.entity_name || "Department of Agrarian Reform - Camarines Sur 1"}
                      onChange={(e) => updateOrsField("entity_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Payee Information
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Payee Name</label>
                    <input
                      type="text"
                      value={orsData.payee || active?.supplier_name || active?.supplier || ""}
                      onChange={(e) => updateOrsField("payee", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Office/Division</label>
                    <input
                      type="text"
                      value={orsData.office || active?.office_section || ""}
                      onChange={(e) => updateOrsField("office", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Address</label>
                    <textarea
                      rows={2}
                      value={orsData.payee_address || active?.payee_address || ""}
                      onChange={(e) => updateOrsField("payee_address", e.target.value)}
                      className={textareaCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Obligation Particulars
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Resp. Center</label>
                      <input
                        type="text"
                        value={orsData.responsibility_center || ""}
                        onChange={(e) => updateOrsField("responsibility_center", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>MFO/PAP</label>
                      <input
                        type="text"
                        value={orsData.mfo_pap || ""}
                        onChange={(e) => updateOrsField("mfo_pap", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>UACS Object Code</label>
                    <input
                      type="text"
                      value={orsData.uacs_code || ""}
                      onChange={(e) => updateOrsField("uacs_code", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Particulars Narrative</label>
                    <textarea
                      rows={3}
                      value={orsData.particulars || ""}
                      onChange={(e) => updateOrsField("particulars", e.target.value)}
                      className={textareaCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Obligation Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orsData.obligation_amount || orsData.amount || active?.amount || ""}
                      onChange={(e) => updateOrsField("obligation_amount", Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Section A Signatory
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Prepared By Name</label>
                    <input
                      type="text"
                      value={orsData.prepared_by_name || ""}
                      onChange={(e) => updateOrsField("prepared_by_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Designation</label>
                    <input
                      type="text"
                      value={orsData.prepared_by_desig || ""}
                      onChange={(e) => updateOrsField("prepared_by_desig", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Date Signed</label>
                    <input
                      type="text"
                      value={orsData.prepared_by_date || ""}
                      onChange={(e) => updateOrsField("prepared_by_date", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Section B Signatory
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Certified By Name</label>
                    <input
                      type="text"
                      value={orsData.certified_by_name || ""}
                      onChange={(e) => updateOrsField("certified_by_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Designation</label>
                    <input
                      type="text"
                      value={orsData.certified_by_desig || ""}
                      onChange={(e) => updateOrsField("certified_by_desig", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Date Signed</label>
                    <input
                      type="text"
                      value={orsData.certified_by_date || ""}
                      onChange={(e) => updateOrsField("certified_by_date", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Section C - Obligation Status Table
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Reference No / Check No</label>
                    <input
                      type="text"
                      value={orsData.reference_no || orsData.ors_no || ""}
                      onChange={(e) => updateOrsField("reference_no", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Section C Particulars</label>
                    <input
                      type="text"
                      value={orsData.section_c_particulars || orsData.particulars || ""}
                      onChange={(e) => updateOrsField("section_c_particulars", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Payable Amt</label>
                      <input
                        type="number"
                        value={orsData.payable_amount || ""}
                        onChange={(e) => updateOrsField("payable_amount", Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Payment Amt</label>
                      <input
                        type="number"
                        value={orsData.payment_amount || ""}
                        onChange={(e) => updateOrsField("payment_amount", Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Not Yet Due</label>
                      <input
                        type="number"
                        value={orsData.not_yet_due_balance || ""}
                        onChange={(e) => updateOrsField("not_yet_due_balance", Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Due / Demandable</label>
                      <input
                        type="number"
                        value={orsData.due_demandable_balance || ""}
                        onChange={(e) => updateOrsField("due_demandable_balance", Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DV DOCUMENT FIELDS */}
            {activeTab === "dv" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Disbursement Particulars
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>DV Number</label>
                    <input
                      type="text"
                      value={dvData.dv_no || ""}
                      onChange={(e) => updateDvField("dv_no", e.target.value)}
                      className={inputCls}
                      placeholder="DV-XXXX"
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>DV Date</label>
                    <input
                      type="text"
                      value={dvData.dv_date || ""}
                      onChange={(e) => updateDvField("dv_date", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Fund Cluster</label>
                    <input
                      type="text"
                      value={dvData.fund_cluster || "01"}
                      onChange={(e) => updateDvField("fund_cluster", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Mode of Payment
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className={checkboxLabelCls}>
                      <input
                        type="checkbox"
                        checked={!!dvData.mds_check}
                        onChange={(e) => updateDvField("mds_check", e.target.checked)}
                        className={checkboxCls}
                      />
                      <span>MDS Check</span>
                    </label>
                    <label className={checkboxLabelCls}>
                      <input
                        type="checkbox"
                        checked={!!dvData.commercial_check}
                        onChange={(e) => updateDvField("commercial_check", e.target.checked)}
                        className={checkboxCls}
                      />
                      <span>Commercial</span>
                    </label>
                    <label className={checkboxLabelCls}>
                      <input
                        type="checkbox"
                        checked={!!dvData.ada}
                        onChange={(e) => updateDvField("ada", e.target.checked)}
                        className={checkboxCls}
                      />
                      <span>ADA</span>
                    </label>
                    <label className={checkboxLabelCls}>
                      <input
                        type="checkbox"
                        checked={!!dvData.others}
                        onChange={(e) => updateDvField("others", e.target.checked)}
                        className={checkboxCls}
                      />
                      <span>Others</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Payee Information
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Payee Name</label>
                    <input
                      type="text"
                      value={dvData.payee || active?.supplier_name || active?.supplier || ""}
                      onChange={(e) => updateDvField("payee", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Address</label>
                    <textarea
                      rows={2}
                      value={dvData.address || active?.payee_address || active?.address || ""}
                      onChange={(e) => updateDvField("address", e.target.value)}
                      className={textareaCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>TIN / Employee No</label>
                    <input
                      type="text"
                      value={dvData.payee_tin || ""}
                      onChange={(e) => updateDvField("payee_tin", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Voucher Particulars
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>Resp. Center</label>
                      <input
                        type="text"
                        value={dvData.responsibility_center || ""}
                        onChange={(e) => updateDvField("responsibility_center", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className={inputWrapperCls}>
                      <label className={labelCls}>MFO / PAP</label>
                      <input
                        type="text"
                        value={dvData.mfo_pap || ""}
                        onChange={(e) => updateDvField("mfo_pap", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Description Particulars</label>
                    <textarea
                      rows={4}
                      value={dvData.particulars || ""}
                      onChange={(e) => updateDvField("particulars", e.target.value)}
                      className={textareaCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Amount Due</label>
                    <input
                      type="number"
                      step="0.01"
                      value={dvData.amount_due || active?.amount || ""}
                      onChange={(e) => updateDvField("amount_due", Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Section A Requesting Office
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Certified Officer</label>
                    <input
                      type="text"
                      value={dvData.certified_by_name || ""}
                      onChange={(e) => updateDvField("certified_by_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Designation Position</label>
                    <input
                      type="text"
                      value={dvData.certified_by_position || ""}
                      onChange={(e) => updateDvField("certified_by_position", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Section C Finance Certified
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Chief Accountant</label>
                    <input
                      type="text"
                      value={dvData.certified_printed_name || ""}
                      onChange={(e) => updateDvField("certified_printed_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Official Title</label>
                    <input
                      type="text"
                      value={dvData.certified_position || "Chief Accountant"}
                      onChange={(e) => updateDvField("certified_position", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Date Certified</label>
                    <input
                      type="text"
                      value={dvData.certified_date || ""}
                      onChange={(e) => updateDvField("certified_date", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400 border-b border-neutral-850 pb-1.5 uppercase">
                    Section D Approval
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Approving Officer</label>
                    <input
                      type="text"
                      value={dvData.approved_printed_name || ""}
                      onChange={(e) => updateDvField("approved_printed_name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Official Title</label>
                    <input
                      type="text"
                      value={dvData.approved_position || "PARPO II"}
                      onChange={(e) => updateDvField("approved_position", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className={inputWrapperCls}>
                    <label className={labelCls}>Date Approved</label>
                    <input
                      type="text"
                      value={dvData.approved_date || ""}
                      onChange={(e) => updateDvField("approved_date", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
                    <span className="text-xs font-bold text-neutral-400 uppercase">
                      Accounting Ledger Entries
                    </span>
                    <button
                      type="button"
                      onClick={addAccountingEntry}
                      className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 rounded text-[9px] font-bold text-white flex items-center gap-1"
                    >
                      <RiAddLine className="size-2.5" /> Add
                    </button>
                  </div>
                  
                  {accountingEntries.map((entry, idx) => (
                    <div key={idx} className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => removeAccountingEntry(idx)}
                        className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition"
                      >
                        <RiDeleteBinLine className="size-3.5" />
                      </button>
                      <span className="text-[9px] font-bold text-neutral-500 uppercase">
                        Ledger Entry #{idx + 1}
                      </span>
                      <div className={inputWrapperCls}>
                        <label className={labelCls}>Account Title</label>
                        <input
                          type="text"
                          value={entry.account_title || ""}
                          onChange={(e) => updateAccountingEntry(idx, "account_title", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className={inputWrapperCls}>
                        <label className={labelCls}>UACS Code</label>
                        <input
                          type="text"
                          value={entry.uacs_code || ""}
                          onChange={(e) => updateAccountingEntry(idx, "uacs_code", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={inputWrapperCls}>
                          <label className={labelCls}>Debit</label>
                          <input
                            type="text"
                            value={entry.debit || ""}
                            onChange={(e) => updateAccountingEntry(idx, "debit", e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div className={inputWrapperCls}>
                          <label className={labelCls}>Credit</label>
                          <input
                            type="text"
                            value={entry.credit || ""}
                            onChange={(e) => updateAccountingEntry(idx, "credit", e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: LIVE HIGH-FIDELITY CENTERED A4 PREVIEW */}
        <main className="flex-1 overflow-auto bg-neutral-950 p-6 flex justify-center items-start">
          <div
            className="transition-transform duration-200 ease-out origin-top shadow-[0_25px_70px_rgba(0,0,0,0.8)] border border-neutral-800 flex-shrink-0"
            style={{
              transform: `scale(${zoomLevel})`,
              width: "816px",
              height: "1056px",
            }}
          >
            <iframe
              title="Document Live Preview"
              srcDoc={getIframeHtml()}
              className="w-full h-full border-none bg-white"
              style={{
                pointerEvents: "auto",
              }}
            />
          </div>
        </main>

      </div>
    </div>
  );
}
