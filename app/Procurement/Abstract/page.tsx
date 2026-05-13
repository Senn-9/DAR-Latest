"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SignoutModal from "@/components/SignOutModal";
import PrepareAbstractModal, { type SupplierQuotePayload } from "@/components/AbstractOfAwards/PrepareAbstractModal";
import LivePreview from "@/components/test/livePreview";
import {
  RiFileListLine, RiSearchLine,
  RiArrowUpLine, RiArrowDownLine,
  RiArrowLeftLine, RiArrowRightLine,
  RiEyeLine, RiPlayCircleLine,
  RiCalendarLine, RiCheckLine, RiCloseLine, RiFilter3Line,
} from "react-icons/ri";

export default function AbstractPage() {
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

  const [loading, setLoading]         = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [signoutModalOpen, setSignoutModalOpen] = useState(false);
  const [list, setList]               = useState<PRListRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField]     = useState<"pr_no" | "office_section" | "total_cost" | "created_at">("created_at");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPrNo, setPreviewPrNo] = useState<string | null>(null);
  const [prepareAwardingTarget, setPrepareAwardingTarget] = useState<PRListRow | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<PRListRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const PAGE_SIZE = 10;
  const CURRENT_YEAR = new Date().getFullYear();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [fiscalYear, setFiscalYear] = useState(CURRENT_YEAR);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 5; y--) years.push(y);
    return years;
  }, []);

  const isDivisionHead = currentUser?.roles?.role_name?.toLowerCase().includes("division head") ?? false;
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
          .in("status_id", [10, 33])
          .order("created_at", { ascending: false });

        if (!error) {
          const filteredData = (data || []).filter((pr) => {
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
      10: { name: "Abstract of Awards", color: "aaa" },
      33: { name: "Completed (PR Phase)", color: "completed" },
    };
    return statusMap[statusId!] || { name: "Unknown", color: "default" };
  };

  const BADGE_CLASS: Record<string, string> = {
    aaa:        "bg-rose-50 text-rose-800 border border-rose-200",
    completed:  "bg-green-50 text-green-800 border border-green-200",
    default:    "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const aaaCount = list.filter(pr => pr.status_id === 10).length;
  const completedCount = list.filter(pr => pr.status_id === 33).length;

  const STAT_CARDS = [
    { label: "Total",          value: list.length,     cardBg: "bg-emerald-50", border: "border-emerald-100", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", numColor: "text-emerald-600", statusId: null },
    { label: "AAA",            value: aaaCount,        cardBg: "bg-rose-50",    border: "border-rose-100",    iconBg: "bg-rose-100",    iconColor: "text-rose-600",    numColor: "text-rose-600",    statusId: 10 },
    { label: "Completed (PR)", value: completedCount,  cardBg: "bg-green-50",   border: "border-green-100",   iconBg: "bg-green-100",   iconColor: "text-green-600",   numColor: "text-green-600",   statusId: 33 },
  ];

  const handleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir(f === "created_at" ? "desc" : "asc"); }
    setCurrentPage(1);
  };

  const [statusFilterId, setStatusFilterId] = useState<number | null>(null);

  const filteredList = list
    .filter((pr) => {
      const matchSearch =
        pr.pr_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pr.office_section || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pr.entity_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchSection = sectionFilter === null || pr.office_section === sectionFilter;
      const matchYear = pr.created_at ? new Date(pr.created_at).getFullYear() === fiscalYear : true;
      const matchStatus = statusFilterId === null || pr.status_id === statusFilterId;
      return matchSearch && matchSection && matchYear && matchStatus;
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
  const pagedList  = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

  const handlePrepareAwardingSubmit = async (itemsWithDealers: any[]) => {
    if (!prepareAwardingTarget?.id) {
      return { ok: false, message: "No PR selected for awarding." };
    }

    // 1. Find the active canvass session for this PR
    const { data: sessionRow, error: sessionError } = await supabase
      .from("canvass_sessions")
      .select("id")
      .eq("pr_id", prepareAwardingTarget.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      return { ok: false, message: sessionError.message || "Failed to find canvass session." };
    }

    const sessionId = sessionRow?.id ?? null;
    if (!sessionId) {
      return { ok: false, message: "No canvass session found for this PR." };
    }

    // 2. Prepare payload for canvass_entries
    // Each item-dealer combination becomes a row in canvass_entries
    const payload: any[] = [];
    
    itemsWithDealers.forEach((item) => {
      // Only include dealers that have at least a supplier_name or unit_price
      const validDealers = item.dealers.filter(
        (d: any) => (d.supplier_name || "").trim() !== "" || d.unit_price !== null
      );

      validDealers.forEach((dealer: any) => {
        const unitPrice = dealer.unit_price ?? "0";
        const quantity = Number(item.quantity) || 0;
        
        // Calculate total price only if unitPrice is a valid number
        const numericPrice = Number(unitPrice);
        const totalPrice = !Number.isNaN(numericPrice) ? quantity * numericPrice : 0;
        
        payload.push({
          session_id: sessionId,
          pr_items: item.id, // Linking to purchase_request_items.id
          pr_no: prepareAwardingTarget.pr_no,
          unit: item.unit?.trim() || null,
          quantity: quantity,
          supplier_name: dealer.supplier_name.trim() || null,
          unit_price: unitPrice,
          total_price: totalPrice,
          is_winning: Boolean(dealer.is_winning),
          created_at: new Date().toISOString(),
        });
      });
    });

    if (payload.length === 0) {
      return { ok: false, message: "Please fill in at least one dealer for any item." };
    }

    // 3. Delete existing entries for this session to avoid duplicates
    const { error: deleteError } = await supabase
      .from("canvass_entries")
      .delete()
      .eq("session_id", sessionId);

    if (deleteError) {
      return { ok: false, message: deleteError.message || "Failed to clear existing awarding details." };
    }

    // 4. Insert entries into database
    const { error: insertError } = await supabase.from("canvass_entries").insert(payload);

    if (insertError) {
      return { ok: false, message: insertError.message || "Failed to save awarding details." };
    }

    // 5. Optionally update PR status or add a remark
    // For now, we'll just return success as requested
    return {
      ok: true,
      message: `${payload.length} awarding entr${payload.length > 1 ? "ies" : "y"} saved successfully to database.`,
    };
  };

  const handleSubmitAbstract = async () => {
    if (!submitTarget?.id) {
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("purchase_requests")
        .update({ status_id: 33 })
        .eq("id", submitTarget.id);

      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }

      alert("Abstract submitted successfully! Page will refresh now.");
      setSubmitConfirmOpen(false);
      setSubmitTarget(null);

      window.location.reload();
    } catch (err) {
      console.error("Error submitting abstract:", err);
      alert("An unexpected error occurred while submitting the abstract.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SKELETON LOADING ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { font-family: 'Sora', sans-serif; }
          .mono { font-family: 'JetBrains Mono', monospace; }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .skeleton-shimmer {
            background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
        `}</style>

        <div className="w-full p-6 md:p-10 space-y-6">
          {/* ── HEADER SKELETON ── */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="skeleton-shimmer h-3 w-32 rounded" />
              <div className="skeleton-shimmer h-8 w-56 rounded" />
              <div className="skeleton-shimmer h-4 w-48 rounded" />
            </div>
          </div>

          {/* ── TABS SKELETON ── */}
          <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-9 w-32 rounded-xl" />
            ))}
          </div>

          {/* ── STAT CARDS SKELETON ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="skeleton-shimmer w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton-shimmer h-3 w-16 rounded" />
                  <div className="skeleton-shimmer h-6 w-12 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* ── TABLE PANEL SKELETON ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="skeleton-shimmer h-5 w-48 rounded" />
              <div className="skeleton-shimmer h-8 w-56 rounded-lg" />
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="skeleton-shimmer h-4 w-24 rounded shrink-0" />
                  <div className="skeleton-shimmer h-4 w-32 rounded shrink-0" />
                  <div className="skeleton-shimmer h-4 w-full max-w-xs rounded" />
                  <div className="skeleton-shimmer h-4 w-24 rounded shrink-0" />
                  <div className="skeleton-shimmer h-6 w-28 rounded-full shrink-0" />
                  <div className="skeleton-shimmer h-4 w-24 rounded shrink-0 ml-auto" />
                  <div className="skeleton-shimmer h-7 w-24 rounded-lg shrink-0" />
                </div>
              ))}
            </div>

            {/* Pagination footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="skeleton-shimmer h-4 w-40 rounded" />
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton-shimmer w-8 h-8 rounded-lg" />
                ))}
              </div>
              <div className="skeleton-shimmer h-4 w-32 rounded" />
            </div>
          </div>
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
        .tr-row:hover td { background-color: #f5f3ff !important; }
        .th-sort:hover { background-color: #065f46 !important; cursor: pointer; }
      `}</style>

      <div className="w-full p-6 md:p-10 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">Procurement Portal</p>
            <h1 className="text-3xl font-bold text-gray-900">Abstract of Awards</h1>
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
          <button
            onClick={() => setShowYearPicker(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-400 rounded-xl px-4 py-2.5 transition-colors shadow-sm"
          >
            <RiCalendarLine size={16} className="text-emerald-600" />
            <span className="font-semibold text-gray-700 text-sm">FY {fiscalYear}</span>
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
          {([
            { key: "pr",       label: "Purchase Request",   href: "/Procurement"          },
            { key: "canvass",  label: "Canvass",            href: "/Procurement/Canvass"  },

            { key: "abstract", label: "Abstract of Awards", href: "/Procurement/Abstract" },
            { key: "purchase order", label: "Purchase Order", href: "/Procurement/PurchaseOrder" },
            { key: "delivery", label: "Delivery",           href: "/Procurement/Delivery" },
            { key: "payment", label: "Payment",           href: "/Procurement/Payment" },

          ] as const).map(({ key, label, href }) => (
            <button
              key={key}
              onClick={() => router.push(href)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                key === "abstract"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STAT_CARDS.map(({ label, value, cardBg, border, iconBg, iconColor, numColor, statusId }) => (
            <button
              key={label}
              onClick={() => {
                setStatusFilterId(statusId);
                setCurrentPage(1);
              }}
              className={`${cardBg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 text-left ${
                statusFilterId === statusId ? 'ring-2 ring-offset-2 ring-emerald-500' : ''
              }`}
            >
              <div className={`${iconBg} ${iconColor} rounded-xl w-10 h-10 flex items-center justify-center shrink-0`}>
                <RiFileListLine size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`mono text-xl font-bold ${numColor}`}>{value}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 max-w-6xl mx-auto">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-800 shrink-0">Abstract of Awards Records</h2>
              {statusFilterId !== null && (
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {statusFilterId === 10 ? "AAA Only" : "Completed (PR) Only"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  filterOpen ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <RiFilter3Line size={14} />
                Filters
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4">
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-bold text-gray-500 mb-2">SECTION</label>
                <select
                  value={sectionFilter ?? ""}
                  onChange={(e) => { setSectionFilter(e.target.value || null); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">All Sections</option>
                  {Array.from(new Set(list.map((p) => p.office_section).filter(Boolean))).map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-bold text-gray-500 mb-2">SORT BY</label>
                <select
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as typeof sortField)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="created_at">Date Created</option>
                  <option value="pr_no">PR Number</option>
                  <option value="office_section">Section</option>
                  <option value="total_cost">Total Cost</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setSectionFilter(null); setCurrentPage(1); }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RiFileListLine size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No abstract records found.</p>
              <p className="text-xs mt-1">Try adjusting your search.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                      {([
                        { label: "PR Number",        field: null,                      align: "text-left"   },
                        { label: "Office / Section", field: "office_section" as const, align: "text-left"   },
                        { label: "Description",      field: null,                      align: "text-left"   },
                        { label: "Date",             field: "created_at" as const,     align: "text-left"   },
                        { label: "Status",           field: null,                      align: "text-center" },
                        { label: "Total Cost",       field: "total_cost" as const,     align: "text-right"  },
                        { label: "Actions",          field: null,                      align: "text-center" },
                                              { label: "Submit",           field: null,                      align: "text-center" },
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
                      const cost  = form.total_cost || 0;
                      const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                      const desc  = form.purchase_request_items?.map((i) => i.description).filter(Boolean).join("; ");

                      return (
                        <tr key={index} className="tr-row border-b border-gray-100 transition-colors hover:bg-emerald-50/50">

                          <td className={`mono px-2 py-2 font-semibold text-gray-800 whitespace-nowrap ${rowBg}`}>
                            {form.pr_no}
                          </td>

                          <td className={`px-2 py-2 text-gray-600 truncate ${rowBg}`}>
                            {form.office_section || <span className="text-gray-300">—</span>}
                          </td>

                          <td className={`px-2 py-2 text-gray-500 line-clamp-2 ${rowBg}`}>
                            {desc
                              ? desc
                              : <span className="text-gray-300">—</span>}
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
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewPrNo(form.pr_no)}
                                className="px-2 py-1 text-xs font-semibold rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                              >
                                <RiEyeLine size={14} />
                                Preview
                              </button>
                              {currentUser?.role_id === 3 && (
                                <button
                                  type="button"
                                  onClick={() => setPrepareAwardingTarget(form)}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiPlayCircleLine size={14} />
                                  Awarding
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            {currentUser?.role_id === 3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSubmitTarget(form);
                                  setSubmitConfirmOpen(true);
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors inline-flex items-center gap-1"
                              >
                                Submit
                              </button>
                            )}
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
                  of <span className="font-semibold text-gray-700">{filteredList.length}</span> records
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
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                          currentPage === p
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
                  Total:{" "}
                  <span className="font-semibold text-emerald-700">
                    ₱{filteredList.reduce((s, pr) => s + (pr.total_cost || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── YEAR PICKER MODAL ── */}
      {showYearPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Select</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">Fiscal Year</h3>
              </div>
              <button onClick={() => setShowYearPicker(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <RiCloseLine size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {yearOptions.map((year) => (
                <button
                  key={year}
                  onClick={() => { setFiscalYear(year); setShowYearPicker(false); setCurrentPage(1); }}
                  className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${fiscalYear === year ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                >
                  <span className={`font-semibold ${fiscalYear === year ? "text-emerald-700" : "text-gray-700"}`}>FY {year}</span>
                  {fiscalYear === year && <RiCheckLine size={18} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE PREVIEW MODAL ── */}
      {previewPrNo !== null && (
        <LivePreview open={true} prNo={previewPrNo} onClose={() => setPreviewPrNo(null)} />
      )}

      {prepareAwardingTarget && (
        <PrepareAbstractModal
          open={Boolean(prepareAwardingTarget)}
          prId={prepareAwardingTarget.id}
          prNo={prepareAwardingTarget.pr_no}
          onSubmit={handlePrepareAwardingSubmit}
          onClose={() => setPrepareAwardingTarget(null)}
        />
      )}

      {/* ── SIGNOUT MODAL ── */}
      <SignoutModal open={signoutModalOpen} onClose={() => setSignoutModalOpen(false)} />
          {/* ── SUBMIT CONFIRMATION MODAL ── */}
          {submitConfirmOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Confirm Abstract Submission</h2>
                <p className="text-sm text-gray-600">
                  Are you sure you want to submit the abstract for PR <span className="font-semibold text-gray-900">{submitTarget?.pr_no}</span>? 
                  This will change the status to "Completed (PR Phase)" and cannot be easily undone.
                </p>
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitConfirmOpen(false);
                      setSubmitTarget(null);
                    }}
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAbstract}
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-orange-600 bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}
