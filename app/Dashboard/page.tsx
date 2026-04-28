"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  RiFileListLine, RiTimeLine, RiCheckboxCircleLine, RiCloseCircleLine,
  RiSearchLine, RiArrowUpLine, RiArrowDownLine,
  RiArrowLeftLine, RiArrowRightLine,
} from "react-icons/ri";
import AnalyticsDashboard from "../analytics/analytics";

export default function DashboardPage() {
  const router = useRouter();
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
  type CurrentUser = {
    fullname: string;
    username: string;
    role_id: number;
    divisions?: { division_name: string };
    roles?: { role_name: string };
  };

  const [loading, setLoading]           = useState(true);
  const [currentUser, setCurrentUser]   = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [list, setList]                 = useState<PRListRow[]>([]);
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField]       = useState<"pr_no" | "office_section" | "total_cost" | "created_at">("created_at");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage]   = useState(1);
  const PAGE_SIZE = 10;

  const isSupplyAccount =
    currentUser?.username?.toLowerCase() === "supply" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("supply") ?? false);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      setIsAdmin(user.role_id === 1);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("id, entity_name, pr_no, office_section, status, status_id, created_at, total_cost, purchase_request_items (*)")
        .order("created_at", { ascending: false });
      if (!error) {
        setList(
          (data || []).filter((pr) =>
            isAdmin || isSupplyAccount ? true : pr.office_section === currentUser?.divisions?.division_name
          ) as PRListRow[]
        );
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, isAdmin, currentUser, isSupplyAccount]);

  const getStatusInfo = (status: string | null) => {
    const k = (status || "unknown").toLowerCase();
    if (k.includes("pending"))        return { name: status || "Unknown", color: "pending" };
    if (k.includes("processing"))     return { name: status || "Unknown", color: "processing" };
    if (k.includes("canvassing"))     return { name: status || "Unknown", color: "canvassing" };
    if (k.includes("bac resolution")) return { name: status || "Unknown", color: "bac" };
    if (k.includes("aaa issuance"))   return { name: status || "Unknown", color: "aaa" };
    if (k.includes("po"))             return { name: status || "Unknown", color: "po" };
    if (k.includes("approve"))        return { name: status || "Unknown", color: "approved" };
    if (k.includes("reject"))         return { name: status || "Unknown", color: "rejected" };
    return { name: status || "Unknown", color: "default" };
  };

  const BADGE_CLASS: Record<string, string> = {
    pending:    "bg-amber-50 text-amber-800 border border-amber-200",
    processing: "bg-blue-50 text-blue-800 border border-blue-200",
    canvassing: "bg-violet-50 text-violet-800 border border-violet-200",
    bac:        "bg-purple-50 text-purple-800 border border-purple-200",
    aaa:        "bg-rose-50 text-rose-800 border border-rose-200",
    po:         "bg-teal-50 text-teal-800 border border-teal-200",
    approved:   "bg-emerald-50 text-emerald-800 border border-emerald-200",
    rejected:   "bg-red-50 text-red-800 border border-red-200",
    default:    "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const totalBudget = list.reduce((s, pr) => s + (pr.total_cost || 0), 0);

  const countByColor = (color: string) =>
    list.reduce((n, i) => (getStatusInfo(i.status).color === color ? n + 1 : n), 0);

  const pendingCount    = countByColor("pending");
  const processingCount = countByColor("processing");
  const canvassingCount = countByColor("canvassing");
  const approvedCount   = countByColor("approved");
  const rejectedCount   = countByColor("rejected");

  const handleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir(f === "created_at" ? "desc" : "asc"); }
    setCurrentPage(1);
  };

  const filteredList = list
    .filter((pr) => {
      const matchSearch =
        pr.pr_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pr.office_section || "").toLowerCase().includes(searchQuery.toLowerCase());
      const { color } = getStatusInfo(pr.status);
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
  const pagedList  = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className={`inline-flex ml-1 ${sortField === field ? "opacity-100" : "opacity-30"}`}>
      {sortField === field && sortDir === "desc"
        ? <RiArrowDownLine size={12} />
        : <RiArrowUpLine size={12} />}
    </span>
  );

  const STATUS_OPTIONS = [
    { value: "all",        label: "All Statuses" },
    { value: "pending",    label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "canvassing", label: "Canvassing" },
    { value: "bac",        label: "BAC Resolution" },
    { value: "aaa",        label: "AAA Issuance" },
    { value: "po",         label: "PO" },
    { value: "approved",   label: "Approved" },
    { value: "rejected",   label: "Rejected" },
  ];

  const STAT_CARDS = [
    { label: "Total",      value: list.length,     icon: <RiFileListLine size={20} />,       iconBg: "bg-emerald-100", iconColor: "text-emerald-600", numColor: "text-emerald-600", cardBg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Pending",    value: pendingCount,    icon: <RiTimeLine size={20} />,            iconBg: "bg-amber-100",   iconColor: "text-amber-600",   numColor: "text-amber-600",   cardBg: "bg-amber-50",   border: "border-amber-100"   },
    { label: "Processing", value: processingCount, icon: <RiFileListLine size={20} />,        iconBg: "bg-blue-100",    iconColor: "text-blue-600",    numColor: "text-blue-600",    cardBg: "bg-blue-50",    border: "border-blue-100"    },
    { label: "Canvassing", value: canvassingCount, icon: <RiFileListLine size={20} />,        iconBg: "bg-violet-100",  iconColor: "text-violet-600",  numColor: "text-violet-600",  cardBg: "bg-violet-50",  border: "border-violet-100"  },
    { label: "Approved",   value: approvedCount,   icon: <RiCheckboxCircleLine size={20} />, iconBg: "bg-green-100",   iconColor: "text-green-600",   numColor: "text-green-600",   cardBg: "bg-green-50",   border: "border-green-100"   },
    { label: "Rejected",   value: rejectedCount,   icon: <RiCloseCircleLine size={20} />,    iconBg: "bg-red-100",     iconColor: "text-red-500",     numColor: "text-red-500",     cardBg: "bg-red-50",     border: "border-red-100"     },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  /* ── FULL-PAGE LOADING SCREEN ── */
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
        {/* Skeleton cards */}
        <div className="w-full max-w-4xl px-8 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-11 bg-gray-200 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .tr-row:hover td { background-color: #f0fdf4 !important; }
        .th-sort:hover { background-color: #065f46 !important; cursor: pointer; }
      `}</style>

      <div className="w-full p-6 md:p-10 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">Procurement Portal</p>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {currentUser && (
              <p className="text-sm text-gray-400 mt-1">
                Signed in as <span className="text-gray-700 font-semibold">{currentUser.fullname}</span>
                {currentUser.divisions?.division_name && (
                  <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    {currentUser.divisions.division_name}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="mono text-xs text-gray-400">Total Budget Tracked</p>
            <p className="mono text-2xl font-bold text-emerald-700">
              ₱{totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_CARDS.map(({ label, value, icon, iconBg, iconColor, numColor, cardBg, border }) => (
            <div
              key={label}
              className={`${cardBg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
            >
              <div className={`${iconBg} ${iconColor} rounded-xl w-10 h-10 flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`mono text-xl font-bold ${numColor}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">

          {/* Controls row */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800 shrink-0">Recent Purchase Requests</h2>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setStatusFilter(value); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap
                    ${statusFilter === value
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
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
                  placeholder="Search PR or section…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
              <p className="text-xs mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                    {([
                      { label: "PR #",             field: "pr_no" as const,         align: "text-left",   width: "w-28" },
                      { label: "Section",          field: "office_section" as const, align: "text-left",   width: "w-24" },
                      { label: "Description",      field: null,                       align: "text-left",   width: "flex-1 min-w-40" },
                      { label: "Date",             field: "created_at" as const,     align: "text-left",   width: "w-24" },
                      { label: "Status",           field: null,                       align: "text-center", width: "w-32" },
                      { label: "Cost",             field: "total_cost" as const,     align: "text-right",  width: "w-24" },
                      { label: "Actions",          field: null,                       align: "text-center", width: "w-56" },
                    ] as const).map(({ label, field, align, width }) => (
                      <th
                        key={label}
                        onClick={field ? () => handleSort(field) : undefined}
                        className={`px-2 py-2 font-semibold ${align} ${field ? "th-sort select-none cursor-pointer" : ""} ${width}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {field && <SortIcon field={field} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedList.map((form, index) => {
                    const { name: statusName, color: statusColor } = getStatusInfo(form.status);
                    const cost = form.total_cost || 0;
                    const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                    const desc = form.purchase_request_items?.map((i) => i.description).filter(Boolean).join("; ");
                      return (
                        <tr key={form.id} className="tr-row border-b border-gray-100 transition-colors hover:bg-emerald-50/50">
                          <td className={`mono px-2 py-2 font-semibold text-gray-800 whitespace-nowrap ${rowBg}`}>{form.pr_no}</td>
                          <td className={`px-2 py-2 text-gray-600 truncate ${rowBg}`}>
                            {form.office_section || <span className="text-gray-300">—</span>}
                          </td>
                          <td className={`px-2 py-2 text-gray-500 line-clamp-2 ${rowBg}`}>
                            {desc || <span className="text-gray-300">—</span>}
                          </td>
                          <td className={`px-2 py-2 text-gray-500 whitespace-nowrap ${rowBg}`}>
                            {form.created_at
                              ? new Date(form.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${BADGE_CLASS[statusColor] ?? BADGE_CLASS.default}`}>
                              {statusName}
                            </span>
                          </td>
                          <td className={`mono px-2 py-2 text-right font-semibold text-gray-800 ${rowBg}`}>
                            {cost > 0
                              ? `₱${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              : <span className="text-gray-300 font-normal">—</span>}
                          </td>
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => router.push(`/Dashboard?view=edit&id=${form.id}`)}
                                className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => router.push(`/Dashboard?view=detail&id=${form.id}`)}
                                className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
                              >
                                View
                              </button>
                              <button 
                                onClick={() => router.push(`/Procurement?tab=request-approval&id=${form.id}`)}
                                className="px-2 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                              >
                                Process
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── PAGINATION FOOTER ── */}
              <div className="mt-4 -mx-6 px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredList.length)}–{Math.min(currentPage * PAGE_SIZE, filteredList.length)}
                  </span>{" "}
                  of <span className="font-semibold text-gray-700">{filteredList.length}</span> requests
                  {statusFilter !== "all" && <span className="text-gray-400 ml-1">(filtered from {list.length})</span>}
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
                      <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-all
                          ${currentPage === p
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700"
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

        {/* ── ANALYTICS SECTION ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}