"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  RiAddLine,
  RiInboxLine,
  RiEditLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFileExcel2Line,
  RiFilePdf2Line,
} from "react-icons/ri";
import PRModal from "@/components/procurement/PRModal";
import type { PRRecord } from "@/components/procurement/types";
import { tabs, statusColors } from "@/components/procurement/types";
import { getGrandTotal, downloadPDF, downloadXLSX } from "@/components/procurement/utils";

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
      <RiInboxLine size={32} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default function Procurement() {
  const [activeTab, setActiveTab] = useState("purchase-request");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState(false);
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<PRRecord | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSavePR = useCallback((pr: PRRecord) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === pr.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = pr; return next; }
      return [pr, ...prev];
    });
    // TODO: await supabase.from("procurement").upsert({ ...pr, stage: activeTab });
  }, []);

  const handleCreate = () => { setEditData(null); setModalOpen(true); };
  const handleEdit = (pr: PRRecord) => { setEditData(pr); setModalOpen(true); };

  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label;
  const visibleRecords = activeTab === "purchase-request" ? records : [];

  return (
    <>
      <PRModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSavePR} editData={editData} />

      <div className="flex flex-col gap-6">

        {/* ── Tabs + Create ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">

          {/* Mobile tab selector */}
          <div className="w-full md:hidden">
            <button onClick={() => setMobileTab(!mobileTab)}
              className="flex items-center justify-between w-full px-4 py-3 bg-emerald-700 text-white rounded-lg font-medium text-sm">
              {activeTabLabel}
              {mobileTab ? <RiArrowUpSLine size={18} /> : <RiArrowDownSLine size={18} />}
            </button>
            {mobileTab && (
              <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                {tabs.map(tab => (
                  <div key={tab.id}>
                    <div className={`flex items-center justify-between text-sm font-medium transition-colors
                      ${activeTab === tab.id ? "bg-emerald-700 text-white" : "text-gray-700 hover:bg-emerald-50"}`}>
                      <button onClick={() => { setActiveTab(tab.id); setMobileTab(false); setOpenDropdown(null); }} className="flex-1 text-left px-4 py-3">
                        {tab.label}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === tab.id ? null : tab.id); }}
                        className={`px-4 py-3 ${activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-emerald-700"}`}>
                        {openDropdown === tab.id ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                      </button>
                    </div>
                    {openDropdown === tab.id && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        {tab.dropdown.map(item => (
                          <button key={item} onClick={() => setOpenDropdown(null)}
                            className="w-full text-left px-8 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop tabs */}
          <div ref={dropdownRef} className="hidden md:flex items-center gap-0 border-b border-gray-200 relative">
            {tabs.map(tab => (
              <div key={tab.id} className="relative">
                <div className={`flex items-center border-b-2 -mb-px transition-colors duration-200
                  ${activeTab === tab.id ? "border-emerald-700 bg-emerald-700 rounded-t-md" : "border-transparent hover:border-emerald-200"}`}>
                  <button onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-colors duration-200
                      ${activeTab === tab.id ? "text-white" : "text-gray-600 hover:text-emerald-700"}`}>
                    {tab.label}
                  </button>
                  <button onClick={() => setOpenDropdown(openDropdown === tab.id ? null : tab.id)}
                    className={`pr-3 py-3 transition-colors duration-200 ${activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-emerald-700"}`}>
                    {openDropdown === tab.id ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                  </button>
                </div>
                {openDropdown === tab.id && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    {tab.dropdown.map(item => (
                      <button key={item} onClick={() => setOpenDropdown(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create button */}
          <button onClick={handleCreate}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors duration-200 w-full md:w-auto justify-center">
            <RiAddLine size={18} /> Create
          </button>
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden md:block rounded-xl overflow-hidden shadow-sm border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-700 text-white">
                <th className="px-4 py-3 text-left font-semibold">PR No.</th>
                <th className="px-4 py-3 text-left font-semibold">Item Description</th>
                <th className="px-4 py-3 text-left font-semibold">Office Section</th>
                <th className="px-4 py-3 text-center font-semibold">Quantity</th>
                <th className="px-4 py-3 text-right font-semibold">Total Cost</th>
                <th className="px-4 py-3 text-center font-semibold">Date</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.length === 0 ? (
                <tr><td colSpan={8} className="py-12"><EmptyState label="No data available." /></td></tr>
              ) : (
                visibleRecords.map((pr, idx) => {
                  const totalCost = getGrandTotal(pr.items);
                  const totalQty = pr.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
                  const firstDesc = pr.items[0]?.description || "—";
                  return (
                    <tr key={pr.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-3 text-gray-800 font-medium">{pr.prNumber}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={firstDesc}>{firstDesc}</td>
                      <td className="px-4 py-3 text-gray-700">{pr.office}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{totalQty}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₱{totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{pr.date}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[pr.status] ?? "bg-gray-400"}`} />
                          <span className="text-gray-600 text-xs">{pr.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleEdit(pr)}
                            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors">
                            <RiEditLine size={12} /> Edit
                          </button>
                          <button onClick={() => downloadXLSX(pr)}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors">
                            <RiFileExcel2Line size={12} /> XLSX
                          </button>
                          <button onClick={() => downloadPDF(pr)}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors">
                            <RiFilePdf2Line size={12} /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards ── */}
        <div className="flex flex-col gap-3 md:hidden">
          {visibleRecords.length === 0 ? (
            <EmptyState label="No data available." />
          ) : (
            visibleRecords.map(pr => {
              const totalCost = getGrandTotal(pr.items);
              const totalQty = pr.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
              return (
                <div key={pr.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 text-sm">{pr.prNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusColors[pr.status] ?? "bg-gray-400"}`} />
                      <span className="text-xs text-gray-500">{pr.status}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-1 truncate">{pr.items[0]?.description || "—"}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{pr.office}</span>
                    <span>{pr.date}</span>
                    <span>Qty: {totalQty}</span>
                    <span>₱{totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(pr)}
                      className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                      <RiEditLine size={12} /> Edit
                    </button>
                    <button onClick={() => downloadXLSX(pr)}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                      <RiFileExcel2Line size={12} /> XLSX
                    </button>
                    <button onClick={() => downloadPDF(pr)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                      <RiFilePdf2Line size={12} /> PDF
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}
