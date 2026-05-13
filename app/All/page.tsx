"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import {
  RiFileListLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiSearchLine,
} from "react-icons/ri";
import LivePreview from "@/components/test/livePreview";

export default function AllPage() {
  const supabase = createClient();

  type PRItem = { description: string; subtotal: number };
  type PRListRow = {
    id: number;
    entity_name: string;
    pr_no: string;
    office_section: string;
    status: string;
    status_id: number | null;
    created_at?: string;
    total_cost: number;
    purchase_request_items?: PRItem[];
  };

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<PRListRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"pr_no" | "office_section" | "total_cost" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const [selectedPrNo, setSelectedPrNo] = useState("");
  const PAGE_SIZE = 10;
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all purchase requests without filtering
        const { data: prData, error: prError } = await supabase
          .from("purchase_requests")
          .select("id, entity_name, pr_no, office_section, status, status_id, created_at, total_cost, purchase_request_items (*)")
          .eq("status_id", 10)
          .order("created_at", { ascending: false });

        if (prError) throw prError;

        const processedPRs = (prData || []).map((pr) => ({
          id: pr.id,
          entity_name: pr.entity_name || "Unknown",
          pr_no: pr.pr_no,
          office_section: pr.office_section,
          status: pr.status,
          status_id: pr.status_id,
          created_at: pr.created_at,
          total_cost: pr.total_cost || 0,
          purchase_request_items: pr.purchase_request_items || [],
        }));

        setList(processedPRs);
      } catch (error) {
        console.error("Error fetching PRs:", error);
        setList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const getStatusInfo = (status: string | null, statusId?: number | null) => {
    const statusById: Record<number, { name: string; color: string }> = {
      1: { name: "Pending", color: "pending" },
      2: { name: "Processing (Division Head)", color: "processing" },
      3: { name: "Processing (BAC)", color: "processing" },
      4: { name: "Processing (Budget)", color: "processing" },
      5: { name: "Processing (PARPO)", color: "processing" },
      6: { name: "Canvassing (Reception)", color: "canvassing" },
      7: { name: "Canvassing (Releasing)", color: "canvassing" },
      8: { name: "Canvassing (Releasing)", color: "canvassing" },
      9: { name: "Canvassing (Collection)", color: "canvassing" },
      10: { name: "Abstract of Awards", color: "aaa" },
      11: { name: "PO (Creation)", color: "po" },
      12: { name: "PO (Allocation)", color: "po" },
      13: { name: "ORS (Creation)", color: "po" },
      14: { name: "ORS (Processing)", color: "po" },
      15: { name: "PO (Accounting)", color: "po" },
      16: { name: "PO (PARPO)", color: "po" },
      17: { name: "PO (Serving)", color: "po" },
      18: { name: "Delivery (Waiting)", color: "delivery" },
      19: { name: "Delivery (Received)", color: "delivery" },
      20: { name: "Delivery (IAR)", color: "delivery" },
      21: { name: "Delivery (IAR Processing)", color: "delivery" },
      22: { name: "Delivery (LOA)", color: "delivery" },
      25: { name: "Delivery (Division Chief)", color: "delivery" },
      26: { name: "Payment", color: "payment" },
      27: { name: "Cancelled", color: "rejected" },
      28: { name: "Payment Pending", color: "payment" },
      29: { name: "Voucher Verification", color: "payment" },
      30: { name: "Accounting Review", color: "payment" },
      32: { name: "PARPO Approval", color: "payment" },
      33: { name: "Forward to Cash", color: "payment" },
      34: { name: "PARPO signature", color: "payment" },
      35: { name: "Tax processing", color: "payment" },
      36: { name: "Payment completed", color: "payment" },
    };

    if (statusId != null && statusById[statusId]) {
      return statusById[statusId];
    }

    const k = (status || "unknown").toLowerCase();
    if (k.includes("pending")) return { name: status || "Unknown", color: "pending" };
    if (k.includes("processing")) return { name: status || "Unknown", color: "processing" };
    if (k.includes("canvassing")) return { name: status || "Unknown", color: "canvassing" };
    if (k.includes("bac resolution")) return { name: status || "Unknown", color: "bac" };
    if (k.includes("aaa issuance")) return { name: status || "Unknown", color: "aaa" };
    if (k.includes("delivery")) return { name: status || "Unknown", color: "delivery" };
    if (k.includes("payment")) return { name: status || "Unknown", color: "payment" };
    if (k.includes("po")) return { name: status || "Unknown", color: "po" };
    if (k.includes("approve")) return { name: status || "Unknown", color: "approved" };
    if (k.includes("reject")) return { name: status || "Unknown", color: "rejected" };
    return { name: status || "Unknown", color: "default" };
  };

  const BADGE_CLASS: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 border border-amber-200",
    processing: "bg-blue-50 text-blue-800 border border-blue-200",
    canvassing: "bg-violet-50 text-violet-800 border border-violet-200",
    bac: "bg-purple-50 text-purple-800 border border-purple-200",
    aaa: "bg-rose-50 text-rose-800 border border-rose-200",
    delivery: "bg-cyan-50 text-cyan-800 border border-cyan-200",
    payment: "bg-orange-50 text-orange-800 border border-orange-200",
    po: "bg-teal-50 text-teal-800 border border-teal-200",
    approved: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    rejected: "bg-red-50 text-red-800 border border-red-200",
    default: "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const totalBudget = list.reduce((s, pr) => s + (pr.total_cost || 0), 0);

  const countByColor = (color: string) =>
    list.reduce((n, i) => (getStatusInfo(i.status, i.status_id).color === color ? n + 1 : n), 0);

  const pendingCount = countByColor("pending");
  const processingCount = countByColor("processing");
  const canvassingCount = countByColor("canvassing");
  const approvedCount = countByColor("approved");
  const rejectedCount = countByColor("rejected");

  const handleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setSortDir(f === "created_at" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const filteredList = list
    .filter((pr) => {
      const matchSearch =
        pr.pr_no.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (pr.office_section || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (pr.entity_name || "").toLowerCase().includes(debouncedSearch.toLowerCase());
      const { color } = getStatusInfo(pr.status, pr.status_id);
      return matchSearch && (statusFilter === "all" || color === statusFilter);
    })
    .sort((a, b) => {
      let aVal: number | string = "";
      let bVal: number | string = "";
      if (sortField === "total_cost") {
        aVal = a.total_cost || 0;
        bVal = b.total_cost || 0;
      } else if (sortField === "created_at") {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        aVal = at;
        bVal = bt;
      } else {
        aVal = a[sortField] || "";
        bVal = b[sortField] || "";
      }
      return aVal < bVal ? (sortDir === "asc" ? -1 : 1) : aVal > bVal ? (sortDir === "asc" ? 1 : -1) : 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const pagedList = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className={`inline-flex ml-1 ${sortField === field ? "opacity-100" : "opacity-30"}`}>
      {sortField === field && sortDir === "desc" ? (
        <RiArrowDownLine size={12} />
      ) : (
        <RiArrowUpLine size={12} />
      )}
    </span>
  );

  const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "canvassing", label: "Canvassing" },
    { value: "bac", label: "BAC Resolution" },
    { value: "aaa", label: "AAA Issuance" },
    { value: "delivery", label: "Delivery" },
    { value: "payment", label: "Payment" },
    { value: "po", label: "PO" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const STAT_CARDS = [
    { label: "Total", value: list.length, icon: <RiFileListLine size={20} />, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", numColor: "text-emerald-600", cardBg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Pending", value: pendingCount, icon: <RiTimeLine size={20} />, iconBg: "bg-amber-100", iconColor: "text-amber-600", numColor: "text-amber-600", cardBg: "bg-amber-50", border: "border-amber-100" },
    { label: "Processing", value: processingCount, icon: <RiFileListLine size={20} />, iconBg: "bg-blue-100", iconColor: "text-blue-600", numColor: "text-blue-600", cardBg: "bg-blue-50", border: "border-blue-100" },
    { label: "Canvassing", value: canvassingCount, icon: <RiFileListLine size={20} />, iconBg: "bg-violet-100", iconColor: "text-violet-600", numColor: "text-violet-600", cardBg: "bg-violet-50", border: "border-violet-100" },
    { label: "Approved", value: approvedCount, icon: <RiCheckboxCircleLine size={20} />, iconBg: "bg-green-100", iconColor: "text-green-600", numColor: "text-green-600", cardBg: "bg-green-50", border: "border-green-100" },
    { label: "Rejected", value: rejectedCount, icon: <RiCloseCircleLine size={20} />, iconBg: "bg-red-100", iconColor: "text-red-500", numColor: "text-red-500", cardBg: "bg-red-50", border: "border-red-100" },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-6">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { font-family: 'Sora', sans-serif; }
          @keyframes spin-slow { to { transform: rotate(360deg); } }
          .spin-slow { animation: spin-slow 1.4s linear infinite; }
          @keyframes pulse-dot { 0%,80%,100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
          .dot { width: 8px; height: 8px; border-radius: 9999px; background: #059669; animation: pulse-dot 1.2s infinite ease-in-out; }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }
        `}</style>
        <div className="relative">
          <svg className="spin-slow w-16 h-16" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="#d1fae5" strokeWidth="6" />
            <path d="M32 4 a28 28 0 0 1 28 28" stroke="#059669" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <RiFileListLine size={22} className="text-emerald-600" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600 text-center mb-3">Loading purchase requests…</p>
          <div className="flex items-center justify-center gap-1.5">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 text-gray-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .tr-row:hover td { background-color: #f0fdf4 !important; }
        .th-sort:hover { background-color: #065f46 !important; cursor: pointer; }
      `}</style>

      <div className="w-full p-6 md:p-10 space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">Procurement Portal</p>
            <h1 className="text-3xl font-bold text-gray-900">All Purchase Requests</h1>
            <p className="text-sm text-gray-400 mt-1">Complete view of all procurement requests</p>
          </div>
          <div className="text-right">
            <p className="mono text-xs text-gray-400">Total Budget Tracked</p>
            <p className="mono text-2xl font-bold text-emerald-700">₱{totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_CARDS.map(({ label, value, icon, iconBg, iconColor, numColor, cardBg, border }) => (
            <div key={label} className={`${cardBg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}>
              <div className={`${iconBg} ${iconColor} rounded-xl w-10 h-10 flex items-center justify-center shrink-0`}>{icon}</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`mono text-xl font-bold ${numColor}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* TABLE PANEL */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
          {/* Controls */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800 shrink-0">All Purchase Requests</h2>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap
                    ${statusFilter === value ? "bg-emerald-700 text-white border-emerald-700" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                    }`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
              <div className="relative flex items-center">
                <RiSearchLine size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search PR, supplier, or section…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-52"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RiFileListLine size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No purchase requests found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                      <th className="th-sort px-4 py-3 text-left font-bold" onClick={() => handleSort("pr_no")}>
                        PR No <SortIcon field="pr_no" />
                      </th>
                      <th className="th-sort px-4 py-3 text-left font-bold" onClick={() => handleSort("office_section")}>
                        Office/Section <SortIcon field="office_section" />
                      </th>
                      <th className="th-sort px-4 py-3 text-left font-bold" onClick={() => handleSort("total_cost")}>
                        Total Cost <SortIcon field="total_cost" />
                      </th>
                      <th className="th-sort px-4 py-3 text-left font-bold" onClick={() => handleSort("created_at")}>
                        Created <SortIcon field="created_at" />
                      </th>
                      <th className="px-4 py-3 text-left font-bold">Status</th>
                      <th className="px-4 py-3 text-left font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedList.map((pr) => {
                      const { name: statusName, color: statusColor } = getStatusInfo(pr.status, pr.status_id);
                      return (
                        <tr key={pr.id} className="tr-row border-b border-gray-100">
                          <td className="px-4 py-3 text-gray-900 font-semibold">{pr.pr_no}</td>
                          <td className="px-4 py-3 text-gray-600">{pr.office_section}</td>
                          <td className="px-4 py-3 text-gray-600 mono">₱{(pr.total_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-PH") : "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE_CLASS[statusColor]}`}>
                              {statusName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPrNo(pr.pr_no);
                                setIsLivePreviewOpen(true);
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                            >
                              Create
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="mt-4 -mx-6 px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {filteredList.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, filteredList.length)}
                  </span>{" "}
                  of <span className="font-semibold text-gray-700">{filteredList.length}</span> requests
                  {statusFilter !== "all" && <span className="ml-1 text-emerald-600">({statusFilter})</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowLeftLine size={14} />
                  </button>
                  {pageNums.map((p, i) =>
                    p === "…" ? (
                      <span key={i} className="px-2 text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                          currentPage === p
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowRightLine size={14} />
                  </button>
                </div>
                <span className="mono">
                  Filtered total:{" "}
                  <span className="font-semibold text-emerald-700">
                    ₱{filteredList.reduce((s, pr) => s + (pr.total_cost || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <LivePreview open={isLivePreviewOpen} onClose={() => setIsLivePreviewOpen(false)} prNo={selectedPrNo} />
    </div>
    </AuthGuard>
  );
}
