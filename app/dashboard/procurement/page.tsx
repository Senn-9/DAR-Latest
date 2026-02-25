"use client";

import { useState, useRef, useEffect } from "react";
import { RiAddLine, RiMoreFill, RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";

const tabs = [
  {
    id: "purchase-request",
    label: "Purchase Request",
    dropdown: ["Abstract of Awards", "Summary Report", "Export CSV"],
  },
  {
    id: "purchase-order",
    label: "Purchase Order",
    dropdown: ["View All Orders", "Pending Orders", "Export CSV"],
  },
  {
    id: "delivery-inspection",
    label: "Delivery & Inspection",
    dropdown: ["Inspection Reports", "Pending Delivery", "Export CSV"],
  },
  {
    id: "payment-closure",
    label: "Payment & Closure",
    dropdown: ["Payment History", "Closed Items", "Export CSV"],
  },
];

const statusColors: Record<string, string> = {
  "2 days": "bg-yellow-400",
  "4 days": "bg-red-500",
  "1 day": "bg-blue-500",
  "2 hours": "bg-green-500",
  "1 hour": "bg-green-600",
  "40 minutes": "bg-green-400",
};

type Row = {
  pr: string;
  item: string;
  office: string;
  qty: number;
  cost: string;
  date: string;
  status: string;
};

const allData: Record<string, Row[]> = {
  "purchase-request": [
    { pr: "2026-0201", item: "Cocomband and Engk", office: "STOD", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "2 days" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "LTSP", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "4 days" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "ARBDSP", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "1 day" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "Legal", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "2 hours" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "STOD", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "1 hour" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "PARPO", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "40 minutes" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "STOD", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "2 days" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "STOD", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "2 days" },
    { pr: "2026-0201", item: "Cocomband and Engk", office: "STOD", qty: 1, cost: "6,700.00", date: "02-01-2026", status: "2 days" },
  ],
  "purchase-order": [
    { pr: "2026-0301", item: "Office Supplies Bundle", office: "LTSP", qty: 5, cost: "12,000.00", date: "02-05-2026", status: "1 day" },
    { pr: "2026-0302", item: "Printer Ink Cartridges", office: "STOD", qty: 10, cost: "8,500.00", date: "02-06-2026", status: "2 days" },
    { pr: "2026-0303", item: "Whiteboard Markers", office: "Legal", qty: 20, cost: "1,200.00", date: "02-07-2026", status: "40 minutes" },
    { pr: "2026-0304", item: "Stapler Set", office: "PARPO", qty: 3, cost: "900.00", date: "02-08-2026", status: "1 hour" },
    { pr: "2026-0305", item: "Bond Paper (500 sheets)", office: "ARBDSP", qty: 50, cost: "22,500.00", date: "02-09-2026", status: "4 days" },
    { pr: "2026-0306", item: "Ballpen Box", office: "STOD", qty: 8, cost: "640.00", date: "02-10-2026", status: "2 hours" },
  ],
  "delivery-inspection": [
    { pr: "2026-0401", item: "Furniture Set", office: "Legal", qty: 2, cost: "35,000.00", date: "02-10-2026", status: "2 hours" },
    { pr: "2026-0402", item: "Office Chairs", office: "STOD", qty: 10, cost: "45,000.00", date: "02-11-2026", status: "1 day" },
    { pr: "2026-0403", item: "Filing Cabinets", office: "LTSP", qty: 4, cost: "18,000.00", date: "02-12-2026", status: "2 days" },
    { pr: "2026-0404", item: "Conference Table", office: "PARPO", qty: 1, cost: "25,000.00", date: "02-13-2026", status: "40 minutes" },
    { pr: "2026-0405", item: "Monitor Screens", office: "ARBDSP", qty: 6, cost: "54,000.00", date: "02-14-2026", status: "4 days" },
  ],
  "payment-closure": [
    { pr: "2026-0501", item: "IT Equipment", office: "PARPO", qty: 3, cost: "50,000.00", date: "02-15-2026", status: "1 hour" },
    { pr: "2026-0502", item: "Network Switch", office: "STOD", qty: 2, cost: "14,000.00", date: "02-16-2026", status: "2 days" },
    { pr: "2026-0503", item: "UPS Battery Backup", office: "Legal", qty: 5, cost: "30,000.00", date: "02-17-2026", status: "1 day" },
    { pr: "2026-0504", item: "CCTV System", office: "ARBDSP", qty: 1, cost: "75,000.00", date: "02-18-2026", status: "4 days" },
  ],
};

export default function Procurement() {
  const [activeTab, setActiveTab] = useState("purchase-request");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label;
  const rows = allData[activeTab] ?? [];

  return (
    <div className="flex flex-col gap-6">

      {/* Tabs + Create Button */}
      <div className="flex items-start justify-between flex-wrap gap-4">

        {/* Mobile: dropdown to select tab */}
        <div className="w-full md:hidden">
          <button
            onClick={() => setMobileTab(!mobileTab)}
            className="flex items-center justify-between w-full px-4 py-3 bg-emerald-700 text-white rounded-lg font-medium text-sm"
          >
            {activeTabLabel}
            {mobileTab ? <RiArrowUpSLine size={18} /> : <RiArrowDownSLine size={18} />}
          </button>

          {mobileTab && (
            <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
              {tabs.map((tab) => (
                <div key={tab.id}>
                  {/* Tab row */}
                  <div
                    className={`flex items-center justify-between text-sm font-medium transition-colors
                      ${activeTab === tab.id ? "bg-emerald-700 text-white" : "text-gray-700 hover:bg-emerald-50"}`}
                  >
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileTab(false);
                        setOpenDropdown(null);
                      }}
                      className="flex-1 text-left px-4 py-3"
                    >
                      {tab.label}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === tab.id ? null : tab.id);
                      }}
                      className={`px-4 py-3 ${activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-emerald-700"}`}
                    >
                      {openDropdown === tab.id
                        ? <RiArrowUpSLine size={16} />
                        : <RiArrowDownSLine size={16} />
                      }
                    </button>
                  </div>

                  {/* Dropdown items */}
                  {openDropdown === tab.id && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      {tab.dropdown.map((item) => (
                        <button
                          key={item}
                          onClick={() => setOpenDropdown(null)}
                          className="w-full text-left px-8 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
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

        {/* Desktop: tabs with dropdowns */}
        <div ref={dropdownRef} className="hidden md:flex items-center gap-0 border-b border-gray-200 relative">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative">
              <div className={`flex items-center border-b-2 -mb-px transition-colors duration-200
                ${activeTab === tab.id
                  ? "border-emerald-700 bg-emerald-700 rounded-t-md"
                  : "border-transparent hover:border-emerald-200"
                }`}
              >
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors duration-200
                    ${activeTab === tab.id ? "text-white" : "text-gray-600 hover:text-emerald-700"}`}
                >
                  {tab.label}
                </button>

                <button
                  onClick={() => setOpenDropdown(openDropdown === tab.id ? null : tab.id)}
                  className={`pr-3 py-3 transition-colors duration-200
                    ${activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-emerald-700"}`}
                >
                  {openDropdown === tab.id
                    ? <RiArrowUpSLine size={16} />
                    : <RiArrowDownSLine size={16} />
                  }
                </button>
              </div>

              {openDropdown === tab.id && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  {tab.dropdown.map((item) => (
                    <button
                      key={item}
                      onClick={() => setOpenDropdown(null)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create Button */}
        <button className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors duration-200 w-full md:w-auto justify-center">
          <RiAddLine size={18} />
          Create
        </button>
      </div>

      {/* Table - desktop */}
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No data available.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="px-4 py-3 text-gray-700">{row.pr}</td>
                  <td className="px-4 py-3 text-gray-700">{row.item}</td>
                  <td className="px-4 py-3 text-gray-700">{row.office}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.cost}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.date}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${statusColors[row.status] ?? "bg-gray-400"}`} />
                      <span className="text-gray-600 text-xs">{row.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                        View
                      </button>
                      <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                        Edit
                      </button>
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                        <RiMoreFill size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards - mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No data available.</p>
        ) : (
          rows.map((row, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800 text-sm">{row.pr}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusColors[row.status] ?? "bg-gray-400"}`} />
                  <span className="text-xs text-gray-500">{row.status}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-1">{row.item}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{row.office}</span>
                <span>{row.date}</span>
                <span>Qty: {row.qty}</span>
                <span>₱{row.cost}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                  View
                </button>
                <button className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white py-1.5 rounded-md text-xs font-medium transition-colors">
                  Edit
                </button>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                  <RiMoreFill size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}