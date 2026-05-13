"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import SignoutModal from "@/components/SignOutModal";
import ConfirmModal from "@/components/ConfirmModal";
import PrepareBACResolutionModal from "@/components/BACResolution/PrepareBACResolutionModal";
import BACRESO from "@/components/BACResolution/BACRESO";
import {
  RiFileListLine, RiSearchLine,
  RiArrowUpLine, RiArrowDownLine,
  RiArrowLeftLine, RiArrowRightLine,
  RiEyeLine, RiPlayCircleLine,
  RiFileTextLine,
} from "react-icons/ri";

export default function BACResolutionPage() {
  const supabase = createClient();
  const router = useRouter();

  type PRItem = {
    description: string;
    subtotal?: number | null;
    unit?: string | null;
    quantity?: number | string | null;
    unit_price?: number | string | null;
  };

  type PRListRow = {
    id: number;
    entity_name: string;
    pr_no: string;
    office_section: string;
    resp_code: string;
    purpose: string;
    total_cost: number;
    status: string;
    status_id: number | null;
    fund_cluster: string;
    req_name: string;
    app_name: string;
    app_no: string;
    created_at?: string;
    purchase_request_items?: PRItem[];
  };

  type CurrentUser = {
    fullname: string;
    username: string;
    role_id: number;
    divisions?: { division_name: string };
    roles?: { role_name: string };
  };

  const BAC_RESOLUTION_STATUS_ID = 7;

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signoutModalOpen, setSignoutModalOpen] = useState(false);
  const [list, setList] = useState<PRListRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"pr_no" | "office_section" | "total_cost" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [prepareResolutionOpen, setPrepareResolutionOpen] = useState(false);
  const [resolutionPrNo, setResolutionPrNo] = useState<string | null>(null);
  const PAGE_SIZE = 10;
  const [processingIds, setProcessingIds] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);

  const requestSubmit = (prId: number) => {
    setConfirmTargetId(prId);
    setConfirmOpen(true);
  };

  const handleSubmitPR = async (prId: number) => {
    setProcessingIds((p) => [...p, prId]);
    setConfirmOpen(false);
    try {
      const { data, error } = await supabase
        .from("purchase_requests")
        .update({ status_id: 8 })
        .eq("id", prId);
      if (error) throw error;
      setList((prev) => prev.filter((p) => p.id !== prId));
      try {
        if (typeof window !== "undefined") window.location.reload();
        else router.refresh();
      } catch (e) {
        router.refresh();
      }
    } catch (err: any) {
      alert("Failed to submit PR: " + (err?.message || err));
    } finally {
      setProcessingIds((p) => p.filter((id) => id !== prId));
      setConfirmTargetId(null);
    }
  };

  const isBACAccount =
    currentUser?.username?.toLowerCase() === "bac" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("bac") ?? false);
  const isPARPOAccount =
    currentUser?.username?.toLowerCase() === "parpo" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("parpo") ?? false);
  const isBudgetAccount =
    currentUser?.username?.toLowerCase() === "budget" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("budget") ?? false);
  const isSupplyAccount =
    currentUser?.username?.toLowerCase() === "supply" ||
    (currentUser?.roles?.role_name?.toLowerCase().includes("supply") ?? false);
  const isAccountingAccount =
    currentUser?.roles?.role_name?.toLowerCase().includes("accounting") ?? false;

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.role_id === 1);
    }
  }, []);

  useEffect(() => {
    const fetchPRData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("purchase_requests")
          .select(`
            id, entity_name, pr_no, office_section, resp_code,
            purpose, total_cost, status, status_id,
            fund_cluster, req_name, app_name, app_no,
            created_at, purchase_request_items (*)
          `)
          .eq("status_id", BAC_RESOLUTION_STATUS_ID)
          .order("created_at", { ascending: false });

        if (!error) {
          const filteredData = (data || []).filter((pr) => {
            if (pr.status_id !== BAC_RESOLUTION_STATUS_ID) return false;
            if (isAdmin || isBACAccount || isPARPOAccount || isBudgetAccount || isSupplyAccount || isAccountingAccount) return true;
            return pr.office_section === currentUser?.divisions?.division_name;
          });
          setList(filteredData as PRListRow[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPRData();
  }, [supabase, isAdmin, currentUser, isBACAccount, isPARPOAccount, isBudgetAccount, isSupplyAccount, isAccountingAccount]);

  const getStatusInfo = (statusId: number | null) => {
    const statusMap: Record<number, { name: string; color: string }> = {
      7: { name: "BAC Resolution", color: "bac" },
    };
    return statusMap[statusId!] || { name: "Unknown", color: "default" };
  };

  const BADGE_CLASS: Record<string, string> = {
    bac: "bg-purple-50 text-purple-800 border border-purple-200",
    default: "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const STAT_CARDS = [
    { label: "Total", value: list.length, cardBg: "bg-emerald-50", border: "border-emerald-100", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", numColor: "text-emerald-600" },
    { label: "BAC Resolution", value: list.length, cardBg: "bg-purple-50", border: "border-purple-100", iconBg: "bg-purple-100", iconColor: "text-purple-600", numColor: "text-purple-600" },
  ];

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
      return matchSearch;
    })
    .sort((a, b) => {
      let aVal: number | string = "";
      let bVal: number | string = "";
      if (sortField === "total_cost") {
        aVal = a.total_cost || 0; bVal = b.total_cost || 0;
      } else if (sortField === "created_at") {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        aVal = a[sortField] || ""; bVal = b[sortField] || "";
      }
      return aVal < bVal ? (sortDir === "asc" ? -1 : 1) : aVal > bVal ? (sortDir === "asc" ? 1 : -1) : 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const pagedList = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className={`inline-flex ml-1 ${sortField === field ? "opacity-100" : "opacity-30"}`}>
      {sortField === field && sortDir === "desc"
        ? <RiArrowDownLine size={12} />
        : <RiArrowUpLine size={12} />}
    </span>
  );

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { font-family: 'Sora', sans-serif; }
          .mono { font-family: 'JetBrains Mono', monospace; }
        `}</style>
        <div className="w-full p-6 md:p-10">Loading...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 text-gray-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .tr-row:hover td { background-color: #f5f3ff !important; }
        .th-sort:hover { background-color: #065f46 !important; cursor: pointer; }
      `}</style>

      <div className="w-full p-6 md:p-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">Procurement Portal</p>
            <h1 className="text-3xl font-bold text-gray-900">BAC Resolution</h1>
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
          {isBACAccount && (
            <button
              type="button"
              onClick={() => setPrepareResolutionOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
            >
              <RiPlayCircleLine size={16} />
              Prepare BAC Resolution
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
          {([
            { key: "pr", label: "Purchase Request", href: "/Procurement" },
            { key: "canvass", label: "Canvass", href: "/Procurement/Canvass" },
            { key: "bac", label: "BAC Resolution", href: "/Procurement/BACResolution" },
            { key: "abstract", label: "Abstract of Awards", href: "/Procurement/Abstract" },
            { key: "purchase order", label: "Purchase Order", href: "/Procurement/PurchaseOrder" },
            { key: "delivery", label: "Delivery", href: "/Procurement/Delivery" },
            { key: "payment", label: "Payment", href: "/Procurement/Payment" },
          ] as const).map(({ key, label, href }) => (
            <button
              key={key}
              onClick={() => router.push(href)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                key === "bac"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, cardBg, border, iconBg, iconColor, numColor }) => (
            <div
              key={label}
              className={`${cardBg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
            >
              <div className={`${iconBg} ${iconColor} rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0`}>
                <RiFileListLine size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`mono text-xl font-bold ${numColor}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 max-w-6xl mx-auto">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800 shrink-0">BAC Resolution Records</h2>
            <div className="relative flex items-center">
              <RiSearchLine size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search PR, entity or section..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-56"
              />
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RiFileListLine size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No BAC Resolution records found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                      {([
                        { label: "PR Number", field: null, align: "text-left" },
                        { label: "Office / Section", field: "office_section" as const, align: "text-left" },
                        { label: "Description", field: null, align: "text-left" },
                        { label: "Date", field: "created_at" as const, align: "text-left" },
                        { label: "Status", field: null, align: "text-center" },
                        { label: "Total Cost", field: "total_cost" as const, align: "text-right" },
                        { label: "Actions", field: null, align: "text-center" },
                      ] as const).map(({ label, field, align }) => (
                        <th
                          key={label}
                          onClick={field ? () => handleSort(field) : undefined}
                          className={`px-2 py-2 font-semibold whitespace-nowrap ${align} ${field ? "th-sort select-none cursor-pointer" : ""}`}
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
                        <tr key={index} className="tr-row border-b border-gray-100 transition-colors hover:bg-emerald-50/50">
                          <td className={`mono px-2 py-2 font-semibold text-gray-800 whitespace-nowrap ${rowBg}`}>{form.pr_no}</td>
                          <td className={`px-2 py-2 text-gray-600 truncate ${rowBg}`}>{form.office_section || <span className="text-gray-300">—</span>}</td>
                          <td className={`px-2 py-2 text-gray-500 line-clamp-2 ${rowBg}`}>{desc ? desc : <span className="text-gray-300">—</span>}</td>
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
                            {cost > 0 ? `₱${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : <span className="text-gray-300 font-normal">—</span>}
                          </td>
                                              <td className={`px-2 py-2 text-center ${rowBg}`}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => setResolutionPrNo(form.pr_no)}
                                                    className="px-2 py-1 text-xs font-semibold rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                                                  >
                                                    <RiFileTextLine size={14} />
                                                    Resolution
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => requestSubmit(form.id)}
                                                    disabled={processingIds.includes(form.id)}
                                                    className="px-2 py-1 text-xs font-semibold rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                                  >
                                                    {processingIds.includes(form.id) ? "Submitting..." : "Submit"}
                                                  </button>
                                                </div>
                                              </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing <span className="font-semibold text-gray-700">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredList.length)}–{Math.min(currentPage * PAGE_SIZE, filteredList.length)}</span> of <span className="font-semibold text-gray-700">{filteredList.length}</span> records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowLeftLine size={14} />
                  </button>
                  {pageNums.map((p, i) => p === "…" ? (
                    <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-all ${currentPage === p ? "bg-emerald-700 text-white border-emerald-700" : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700"}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowRightLine size={14} />
                  </button>
                </div>
                <span className="mono">
                  Total: <span className="font-semibold text-emerald-700">₱{filteredList.reduce((s, pr) => s + (pr.total_cost || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* View modal removed per request */}

      {prepareResolutionOpen && (
        <PrepareBACResolutionModal
          onClose={() => setPrepareResolutionOpen(false)}
          onProcessed={(prIds: number[]) => {
            setList((prev) => prev.filter((p) => !prIds.includes(p.id)));
            setPrepareResolutionOpen(false);
          }}
        />
      )}

      {/* Submit confirmation modal */}
      {/* Lazy import would be nicer, but keep synchronous for simplicity */}
      {/**/}

      {resolutionPrNo !== null && (
        <BACRESO
          prNo={resolutionPrNo}
          open={true}
          onClose={() => setResolutionPrNo(null)}
        />
      )}

      <SignoutModal open={signoutModalOpen} onClose={() => setSignoutModalOpen(false)} />
      <ConfirmModal
        open={confirmOpen}
        title="Submit PR"
        message="Submit this PR for processing? This will advance its workflow."
        confirmLabel="Submit"
        loading={confirmTargetId ? processingIds.includes(confirmTargetId) : false}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirmTargetId && handleSubmitPR(confirmTargetId)}
      />
    </div>
    </AuthGuard>
  );
}
