"use client";

import { useEffect, useState } from "react";
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiFilePdf2Line,
  RiFileExcel2Line,
  RiSaveLine,
} from "react-icons/ri";
import type { PRItem, PRRecord } from "./types";
import { STATUS_OPTIONS } from "./types";
import { emptyItem, emptyRecord, getGrandTotal, getItemTotal, downloadPDF, downloadXLSX } from "./utils";
import PRPreview from "./PRPreview";
import { Field, inputCls } from "./Field";

export default function PRModal({
  open,
  onClose,
  onSave,
  editData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (pr: PRRecord) => void;
  editData?: PRRecord | null;
}) {
  const [rec, setRec] = useState<PRRecord>(emptyRecord());
  const [tab, setTab] = useState<"form" | "preview">("form");

  useEffect(() => {
    if (open) {
      setRec(editData ? { ...editData } : emptyRecord());
      setTab("form");
    }
  }, [open, editData]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const set = (k: keyof PRRecord, v: any) => setRec((r) => ({ ...r, [k]: v }));
  const setItem = (id: string, k: keyof PRItem, v: string) =>
    setRec((r) => ({ ...r, items: r.items.map((i) => (i.id === id ? { ...i, [k]: v } : i)) }));
  const addItem = () => setRec((r) => ({ ...r, items: [...r.items, emptyItem()] }));
  const delItem = (id: string) =>
    setRec((r) => ({ ...r, items: r.items.length > 1 ? r.items.filter((i) => i.id !== id) : r.items }));

  const grandTotal = getGrandTotal(rec.items);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">
              {editData ? "Edit Purchase Request" : "New Purchase Request"}
            </h2>
            <p className="text-emerald-200 text-xs mt-0.5">Appendix 60 · Official Government Form</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-emerald-500 mr-2">
              <button
                onClick={() => setTab("form")}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${tab === "form" ? "bg-white text-emerald-700" : "text-emerald-200 hover:text-white"}`}
              >
                Form
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${tab === "preview" ? "bg-white text-emerald-700" : "text-emerald-200 hover:text-white"}`}
              >
                Preview
              </button>
            </div>
            <button onClick={onClose} className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
              <RiCloseLine size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className={`flex flex-col overflow-hidden ${tab === "form" ? "flex-1" : "hidden"} md:flex md:w-[420px] md:flex-none md:border-r border-gray-100`}>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Header Information</h3>
                <div className="space-y-3">
                  <Field label="Entity Name">
                    <input className={inputCls} value={rec.entityName} onChange={(e) => set("entityName", e.target.value)} placeholder="e.g. Department of Education" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fund Cluster">
                      <input className={inputCls} value={rec.fundCluster} onChange={(e) => set("fundCluster", e.target.value)} placeholder="e.g. 01" />
                    </Field>
                    <Field label="PR Number *">
                      <input className={inputCls} value={rec.prNumber} onChange={(e) => set("prNumber", e.target.value)} placeholder="PR-2024-001" />
                    </Field>
                    <Field label="Office / Section">
                      <input className={inputCls} value={rec.office} onChange={(e) => set("office", e.target.value)} placeholder="Procurement" />
                    </Field>
                    <Field label="Date *">
                      <input className={inputCls} type="date" value={rec.date} onChange={(e) => set("date", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Responsibility Center Code">
                    <input className={inputCls} value={rec.respCode} onChange={(e) => set("respCode", e.target.value)} placeholder="e.g. 10001" />
                  </Field>
                  <Field label="Status">
                    <select className={inputCls} value={rec.status} onChange={(e) => set("status", e.target.value)}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Items</h3>
                <div className="space-y-3">
                  {rec.items.map((item, idx) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Item {idx + 1}</span>
                        <button onClick={() => delItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <RiDeleteBinLine size={14} />
                        </button>
                      </div>
                      <Field label="Item Description">
                        <input className={inputCls} value={item.description} onChange={(e) => setItem(item.id, "description", e.target.value)} placeholder="Describe the item" />
                      </Field>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Field label="Stock/Prop No.">
                          <input className={inputCls} value={item.stockNo} onChange={(e) => setItem(item.id, "stockNo", e.target.value)} placeholder="—" />
                        </Field>
                        <Field label="Unit">
                          <input className={inputCls} value={item.unit} onChange={(e) => setItem(item.id, "unit", e.target.value)} placeholder="pcs" />
                        </Field>
                        <Field label="Qty">
                          <input className={inputCls} type="number" value={item.quantity} onChange={(e) => setItem(item.id, "quantity", e.target.value)} placeholder="0" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Field label="Unit Cost">
                          <input className={inputCls} type="number" value={item.unitCost} onChange={(e) => setItem(item.id, "unitCost", e.target.value)} placeholder="0.00" />
                        </Field>
                        <Field label="Total Cost">
                          <input className={inputCls} value={getItemTotal(item).toFixed(2)} readOnly style={{ background: "#f0fdf4", color: "#15803d", fontWeight: 600 }} />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem} className="w-full py-2.5 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 text-sm font-medium hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                    + Add Item Row
                  </button>
                  <div className="flex justify-between items-center px-3 py-2 bg-emerald-700 rounded-lg">
                    <span className="text-emerald-100 text-xs font-bold uppercase tracking-wide">Grand Total</span>
                    <span className="text-white font-bold text-sm">{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Signatures</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2">Requested By</p>
                    <div className="space-y-2">
                      <Field label="Printed Name">
                        <input className={inputCls} value={rec.reqName} onChange={(e) => set("reqName", e.target.value)} placeholder="Full name" />
                      </Field>
                      <Field label="Designation">
                        <input className={inputCls} value={rec.reqDesig} onChange={(e) => set("reqDesig", e.target.value)} placeholder="Position/Title" />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2">Approved By</p>
                    <div className="space-y-2">
                      <Field label="Printed Name">
                        <input className={inputCls} value={rec.appName} onChange={(e) => set("appName", e.target.value)} placeholder="Full name" />
                      </Field>
                      <Field label="Designation">
                        <input className={inputCls} value={rec.appDesig} onChange={(e) => set("appDesig", e.target.value)} placeholder="Position/Title" />
                      </Field>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3 pb-2 border-b border-emerald-100">Purpose</h3>
                <Field label="Purpose">
                  <textarea className={inputCls} rows={3} value={rec.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="State the purpose..." />
                </Field>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (!rec.prNumber) {
                    alert("PR Number is required.");
                    return;
                  }
                  const saved: PRRecord = { ...rec, savedAt: new Date().toISOString() };
                  onSave(saved);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RiSaveLine size={15} /> Save
              </button>
              <button
                onClick={() => {
                  if (!rec.prNumber) {
                    alert("PR Number is required.");
                    return;
                  }
                  downloadPDF(rec);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RiFilePdf2Line size={15} /> Download PDF
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto bg-gray-100 p-6 ${tab === "preview" ? "block" : "hidden"} md:block`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Live Preview</span>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadPDF(rec)}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RiFilePdf2Line size={13} /> Download PDF
                </button>
                <button
                  onClick={() => downloadXLSX(rec)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RiFileExcel2Line size={13} /> Export XLSX
                </button>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-lg p-6 overflow-x-auto text-black">
              <PRPreview pr={rec} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
