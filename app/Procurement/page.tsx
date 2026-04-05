"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import SignoutModal from "@/components/SignOutModal";
import PRModalComponent from "@/components/PRModalComponent";
import ViewPRModal from "@/components/Viewprmodal";
import ProcessPRModal from "@/components/ProcessPRModal";
import BACProcessModal from "@/components/BACProcessModal";
import PARPOProcessModal from "@/components/PARPOProcessModal";
import {
  RiFileListLine, RiTimeLine, RiCheckboxCircleLine, RiCloseCircleLine,
  RiSearchLine, RiArrowUpLine, RiArrowDownLine,
  RiArrowLeftLine, RiArrowRightLine,
} from "react-icons/ri";

export default function ProcurementPage() {
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

  const [loading, setLoading]             = useState(true);
  const [currentUser, setCurrentUser]     = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [signoutModalOpen, setSignoutModalOpen] = useState(false);
  const [list, setList]                   = useState<PRListRow[]>([]);
  const [flagNameById, setFlagNameById]   = useState<Record<number, string>>({});
  const [latestFlagByPr, setLatestFlagByPr] = useState<Record<number, number | null>>({});
  const [searchQuery, setSearchQuery]     = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [sortField, setSortField]         = useState<"pr_no" | "office_section" | "total_cost" | "created_at">("created_at");
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage]     = useState(1);
  const [viewPrId, setViewPrId]           = useState<number | null>(null);
  const [processTarget, setProcessTarget] = useState<{ prId: number; prNo: string; statusId: number | null } | null>(null);
  const [submitConfirm, setSubmitConfirm] = useState<{ prId: number; prNo: string } | null>(null);
  const [bacProcessTarget, setBACProcessTarget] = useState<{ prId: number; prNo: string } | null>(null);
  const [parpoProcessTarget, setPARPOProcessTarget] = useState<{ prId: number; prNo: string } | null>(null);
  const [submitting, setSubmitting]       = useState(false);
  const PAGE_SIZE = 10;

  const handlePRSaved = () => { console.log("PR was saved!"); };

  const handleSubmitPR = async () => {
    if (!submitConfirm) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("purchase_requests")
      .update({ status_id: 2, status: "Processing (Division Head)" })
      .eq("id", submitConfirm.prId);
    setSubmitting(false);
    setSubmitConfirm(null);
    if (error) { console.error("Error submitting PR:", error); return; }
    setList((prev) =>
      prev.map((pr) => pr.id === submitConfirm.prId ? { ...pr, status_id: 2, status: "Processing (Division Head)" } : pr)
    );
  };

  const handleProcessed = (prId: number, newStatusId: number, newStatus?: string) => {
    setList((prev) =>
      prev.map((pr) => {
        if (pr.id === prId) {
          return { ...pr, status_id: newStatusId, ...(newStatus && { status: newStatus }) };
        }
        return pr;
      })
    );
  };

  const isDivisionHead = currentUser?.roles?.role_name?.toLowerCase().includes("division head") ?? false;
  const isBACAccount =
    (currentUser?.username?.toLowerCase() === "bac") ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("bac") ?? false);
  const isPARPOAccount =
    (currentUser?.username?.toLowerCase() === "parpo") ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("parpo") ?? false);
  const isEndUser = !isAdmin && !isDivisionHead && !isBACAccount && !isPARPOAccount;

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.role_id === 1);
    }
  }, []);

  useEffect(() => {
    const fetchStatusFlags = async () => {
      const { data } = await supabase.from("status_flag").select("id, flag_name");
      const map: Record<number, string> = {};
      (data || []).forEach((r: { id: number; flag_name: string }) => { map[r.id] = r.flag_name; });
      setFlagNameById(map);
    };
    fetchStatusFlags();
  }, [supabase]);

  useEffect(() => {
    const fetchPRData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("purchase_requests")
          .select(`id, entity_name, pr_no, office_section, status, status_id, created_at, total_cost, purchase_request_items (*)`)
          .order("created_at", { ascending: false });
        if (!error) {
          const filteredData = (data || []).filter((pr) => {
            if (isAdmin || isBACAccount || isPARPOAccount) return true;
            return pr.office_section === currentUser?.divisions?.division_name;
          });
          setList(filteredData as PRListRow[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPRData();
  }, [supabase, isAdmin, currentUser, isBACAccount, isPARPOAccount]);

  useEffect(() => {
    const fetchLatestFlags = async () => {
      const ids = list.map((p) => p.id);
      if (ids.length === 0) { setLatestFlagByPr({}); return; }
      const { data, error } = await supabase
        .from("remarks")
        .select("pr_id, status_flag_id, created_at")
        .in("pr_id", ids)
        .order("created_at", { ascending: false });
      if (!error) {
        const map: Record<number, number | null> = {};
        (data || []).forEach((r: { pr_id: number; status_flag_id: number | null }) => {
          if (map[r.pr_id] === undefined) map[r.pr_id] = r.status_flag_id ?? null;
        });
        setLatestFlagByPr(map);
      }
    };
    fetchLatestFlags();
  }, [supabase, list]);

  const getStatusInfo = (statusId: number | null) => {
    const statusMap: Record<number, { name: string; color: string }> = {
      1: { name: "Pending", color: "pending" },
      2: { name: "Processing (Division Head)", color: "processing" },
      3: { name: "Processing (BAC)", color: "processing" },
      4: { name: "Processing (Budget)", color: "processing" },
      5: { name: "Processing (PARPO)", color: "processing" },
      6: { name: "Canvassing (Reception)", color: "canvassing" },
      8: { name: "Canvassing (Releasing)", color: "canvassing" },
      9: { name: "Canvassing (Collection)", color: "canvassing" },
      10: { name: "BAC Resolution", color: "bac" },
      11: { name: "AAA Issuance", color: "aaa" },
      12: { name: "PO (Review)", color: "po" },
      13: { name: "PO (Create)", color: "po" },
      14: { name: "ORS Processing", color: "approved" },
    };

    return statusMap[statusId!] || { name: "Unknown", color: "default" };
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

  const FLAG_BADGE: Record<string, string> = {
    "no flag":         "bg-gray-100 text-gray-700 border border-gray-200",
    "complete":        "bg-emerald-50 text-emerald-800 border border-emerald-200",
    "incomplete info": "bg-amber-50 text-amber-800 border border-amber-200",
    "wrong information": "bg-red-50 text-red-800 border border-red-200",
    "needs revision":  "bg-indigo-50 text-indigo-800 border border-indigo-200",
    "on hold":         "bg-blue-50 text-blue-800 border border-blue-200",
    "urgent":          "bg-rose-50 text-rose-800 border border-rose-200",
    default:           "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const countByColor = (color: string) =>
    list.reduce((n, i) => (getStatusInfo(i.status_id).color === color ? n + 1 : n), 0);

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
        (pr.office_section || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pr.entity_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const { color } = getStatusInfo(pr.status_id);
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
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
            <h1 className="text-3xl font-bold text-gray-900">Purchase Request Form</h1>
            {currentUser && (
              <p className="text-sm text-gray-400 mt-1">
                Signed in as{" "}
                <span className="text-gray-700 font-semibold">{currentUser.fullname}</span>
                {currentUser.divisions?.division_name && (
                  <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    {currentUser.divisions.division_name}
                  </span>
                )}
              </p>
            )}
          </div>
          {!(isBACAccount || isDivisionHead) && <PRModalComponent onSave={handlePRSaved} />}
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_CARDS.map(({ label, value, icon, iconBg, iconColor, numColor, cardBg, border }) => (
            <div key={label} className={`${cardBg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}>
              <div className={`${iconBg} ${iconColor} rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0`}>{icon}</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`mono text-xl font-bold ${numColor}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800 shrink-0">All Purchase Requests</h2>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setStatusFilter(value); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${statusFilter === value ? "bg-emerald-700 text-white border-emerald-700" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"}`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
              <div className="relative flex items-center">
                <RiSearchLine size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search PR, entity or section…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-56"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RiFileListLine size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No purchase requests found.</p>
              <p className="text-xs mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white text-xs uppercase tracking-wider">
                      {([
                        { label: "PR Number",        field: null,                      align: "text-left"   },
                        { label: "Office / Section", field: "office_section" as const, align: "text-left"   },
                        { label: "Description",      field: null,                       align: "text-left"   },
                        { label: "Date",             field: "created_at" as const,     align: "text-left"   },
                        { label: "Status",           field: null,                       align: "text-center" },
                        { label: "Status Flag",      field: null,                       align: "text-center" },
                        { label: "Total Cost",       field: "total_cost" as const,     align: "text-right"  },
                        { label: "Actions",          field: null,                       align: "text-center" },
                      ] as const).map(({ label, field, align }) => (
                        <th
                          key={label}
                          style={{ display: label === "Status Flag" && !isEndUser ? "none" as const : undefined }}
                          onClick={field ? () => handleSort(field) : undefined}
                          className={`px-5 py-3 font-semibold whitespace-nowrap ${align} ${field ? "th-sort select-none" : ""}`}
                        >
                          <span className="inline-flex items-center gap-0.5">
                            {label}{field && <SortIcon field={field} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedList.map((form, index) => {
                      const { name: statusName, color: statusColor } = getStatusInfo(form.status_id);
                      const cost = form.total_cost || 0;
                      const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                      const desc = form.purchase_request_items?.map((i) => i.description).filter(Boolean).join("; ");
                      return (
                        <tr key={index} className="tr-row border-b border-gray-100 transition-colors">

                          {/* PR Number */}
                          <td className={`mono px-5 py-3.5 font-semibold text-gray-800 ${rowBg}`}>
                            {form.pr_no}
                          </td>

                          {/* Office / Section */}
                          <td className={`px-5 py-3.5 text-gray-600 ${rowBg}`}>
                            {form.office_section || <span className="text-gray-300">—</span>}
                          </td>

                          {/* Description */}
                          <td className={`px-5 py-3.5 text-gray-500 max-w-xs ${rowBg}`}>
                            {desc ? <span className="line-clamp-2 leading-snug">{desc}</span> : <span className="text-gray-300">—</span>}
                          </td>

                          {/* Date */}
                          <td className={`px-5 py-3.5 text-gray-500 whitespace-nowrap ${rowBg}`}>
                            {form.created_at
                              ? new Date(form.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                              : <span className="text-gray-300">—</span>}
                          </td>

                          {/* Status */}
                          <td className={`px-5 py-3.5 text-center ${rowBg}`}>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${BADGE_CLASS[statusColor] ?? BADGE_CLASS.default}`}>
                              {statusName}
                            </span>
                          </td>

                          {/* Status Flag */}
                          {isEndUser && (
                            <td className={`px-5 py-3.5 text-center ${rowBg}`}>
                              {(() => {
                                const fid = latestFlagByPr[form.id] ?? null;
                                const fname = fid ? flagNameById[fid] : "No Flag";
                                const key = (fname || "No Flag").toLowerCase();
                                return (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${FLAG_BADGE[key] ?? FLAG_BADGE.default}`}>
                                    {fname}
                                  </span>
                                );
                              })()}
                            </td>
                          )}

                          {/* Total Cost */}
                          <td className={`mono px-5 py-3.5 text-right font-semibold text-gray-800 ${rowBg}`}>
                            {cost > 0 ? `₱${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : <span className="text-gray-300 font-normal">—</span>}
                          </td>

                          {/* Actions */}
                          <td className={`px-5 py-3.5 text-center ${rowBg}`}>
                            <div className="flex items-center justify-center gap-1.5">

                              {/* Edit — not for Division Head or BAC (unless admin) */}
                              {(isAdmin || (!isDivisionHead && !isBACAccount)) && (
                                <button
                                  onClick={() => console.log("Edit", form.pr_no)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all whitespace-nowrap"
                                >
                                  Edit
                                </button>
                              )}

                              {/* View — everyone */}
                              <button
                                onClick={() => setViewPrId(form.id)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all whitespace-nowrap"
                              >
                                View
                              </button>

                              {/* Submit — regular users only, only when Pending (status_id=1) */}
                              {!isAdmin && !isDivisionHead && !isBACAccount && form.status_id === 1 && (
                                <button
                                  onClick={() => setSubmitConfirm({ prId: form.id, prNo: form.pr_no })}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all whitespace-nowrap"
                                >
                                  Submit
                                </button>
                              )}

                              {/* Process — admin always, Division Head when status_id=2, BAC always */}
                              {(isAdmin || (isDivisionHead && form.status_id === 2)) && (
                                <button
                                  onClick={() => setProcessTarget({ prId: form.id, prNo: form.pr_no, statusId: form.status_id })}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all whitespace-nowrap"
                                >
                                  Process
                                </button>
                              )}

                              {/* BAC Process — BAC account only when status is 3 (Processing BAC) */}
                              {isBACAccount && form.status_id === 3 && (
                                <button
                                  onClick={() => setBACProcessTarget({ prId: form.id, prNo: form.pr_no })}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-all whitespace-nowrap"
                                >
                                  BAC Process
                                </button>
                              )}

                              {/* PARPO Process — PARPO account only when status is 5 (Processing PARPO) */}
                              {isPARPOAccount && form.status_id === 5 && (
                                <button
                                  onClick={() => setPARPOProcessTarget({ prId: form.id, prNo: form.pr_no })}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all whitespace-nowrap"
                                >
                                  PARPO Process
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── PAGINATION FOOTER ── */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredList.length)}–{Math.min(currentPage * PAGE_SIZE, filteredList.length)}
                  </span>{" "}
                  of <span className="font-semibold text-gray-700">{filteredList.length}</span> requests
                  {statusFilter !== "all" && <span className="text-gray-400 ml-1">(filtered from {list.length})</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <RiArrowLeftLine size={14} />
                  </button>
                  {pageNums.map((p, i) =>
                    p === "…" ? (
                      <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                    ) : (
                      <button key={p} onClick={() => setCurrentPage(p as number)} className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-all ${currentPage === p ? "bg-emerald-700 text-white border-emerald-700" : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700"}`}>
                        {p}
                      </button>
                    )
                  )}
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
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

      {/* ── SUBMIT CONFIRMATION MODAL ── */}
      {submitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSubmitConfirm(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">Submit Purchase Request?</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              You are about to submit{" "}
              <span className="font-semibold text-gray-800 font-mono">{submitConfirm.prNo}</span>{" "}
              for Division Head review. This will update the status to{" "}
              <span className="font-semibold text-blue-700">Processing (Division Head)</span>.
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">This action cannot be undone.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSubmitConfirm(null)} disabled={submitting} className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-all disabled:opacity-50">
                No, Cancel
              </button>
              <button onClick={handleSubmitPR} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Submitting…</>
                ) : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROCESS PR MODAL ── */}
      {processTarget && (
        <ProcessPRModal
          prId={processTarget.prId}
          prNum={processTarget.prNo}
          currentStatusId={processTarget.statusId}
          onClose={() => setProcessTarget(null)}
          onProcessed={handleProcessed}
        />
      )}

      {/* ── BAC PROCESS MODAL ── */}
      {bacProcessTarget && (
        <BACProcessModal
          prId={bacProcessTarget.prId}
          currentPrNo={bacProcessTarget.prNo}
          onClose={() => setBACProcessTarget(null)}
          onProcessed={(prId: number) => {
            setList((prev) =>
              prev.map((pr) => pr.id === prId ? { ...pr } : pr)
            );
            setBACProcessTarget(null);
          }}
        />
      )}

      {/* ── PARPO PROCESS MODAL ── */}
      {parpoProcessTarget && (
        <PARPOProcessModal
          prId={parpoProcessTarget.prId}
          currentPrNo={parpoProcessTarget.prNo}
          onClose={() => setPARPOProcessTarget(null)}
          onProcessed={(prId: number) => {
            setList((prev) =>
              prev.map((pr) => pr.id === prId ? { ...pr, status_id: 3, status: "Processing (BAC)" } : pr)
            );
            setPARPOProcessTarget(null);
          }}
        />
      )}

      {/* ── VIEW PR MODAL ── */}
      {viewPrId !== null && (
        <ViewPRModal prId={viewPrId} onClose={() => setViewPrId(null)} />
      )}

      {/* ── SIGNOUT MODAL ── */}
      <SignoutModal open={signoutModalOpen} onClose={() => setSignoutModalOpen(false)} />
    </div>
  );
}