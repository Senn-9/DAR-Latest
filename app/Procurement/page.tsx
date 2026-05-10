"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import SignoutModal from "@/components/SignOutModal";
import RemarksTimelineModal from "@/components/RemarksTimelineModal";
import { SuccessModal, ErrorModal } from "@/components/StatusModal";
import { deletePRCascade } from "@/utils/supabase/deletePR";
import PRModalComponent from "@/components/PRModalComponent";
import ViewPRModal from "@/components/Viewprmodal";
import EditPRModal from "@/components/EditPRModal";
import ProcessPRModal from "@/components/ProcessPRModal";
import BACProcessModal from "@/components/BACProcessModal";
import PARPOProcessModal from "@/components/PARPOProcessModal";
import BudgetProcessModal from "@/components/BudgetProcessModal";
import { useRouter } from "next/navigation";
import {
  RiFileListLine, RiTimeLine, RiCheckboxCircleLine, RiCloseCircleLine,
  RiSearchLine, RiArrowUpLine, RiArrowDownLine,
  RiArrowLeftLine, RiArrowRightLine, RiTruckLine, RiEyeLine, RiPlayCircleLine, RiChat3Line,
  RiCalendarLine, RiCheckLine, RiCloseLine, RiFilter3Line, RiDeleteBinLine,
} from "react-icons/ri";

export default function ProcurementPage() {
  const supabase = createClient();

  type PRItem = { description: string; subtotal: number };

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

  // ── Budget process target now carries full prData ──────────────────────────
  type BudgetTarget = {
    prId: number;
    prNo: string;
    prData: {
      office_section?: string;
      purpose?: string;
      total_cost?: number;
      status?: string;
      entity_name?: string;
      fund_cluster?: string;
      req_name?: string;
      app_name?: string;
      app_no?: string;
      resp_code?: string;
    };
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
  const [editPrId, setEditPrId]           = useState<number | null>(null);
  const [processTarget, setProcessTarget] = useState<{ prId: number; prNo: string; statusId: number | null } | null>(null);
  const [submitConfirm, setSubmitConfirm] = useState<{ prId: number; prNo: string } | null>(null);
  const [bacProcessTarget, setBACProcessTarget]     = useState<{ prId: number; prNo: string } | null>(null);
  const [parpoProcessTarget, setPARPOProcessTarget] = useState<{ prId: number; prNo: string } | null>(null);
  const [budgetProcessTarget, setBudgetProcessTarget] = useState<BudgetTarget | null>(null); // ← updated type
  const [submitting, setSubmitting]       = useState(false);
  const [remarksTarget, setRemarksTarget]   = useState<{ prId: number; prNo: string } | null>(null);
  const [deletePrTarget, setDeletePrTarget] = useState<{ prId: number; prNo: string } | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const [deleteErrorMsg,   setDeleteErrorMsg]   = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"pr" | "canvass" | "abstract" | "purchase order" |"delivery" | "Payment">("pr"); //added tabs
  const router = useRouter();

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
      prev.map((pr) =>
        pr.id === submitConfirm.prId
          ? { ...pr, status_id: 2, status: "Processing (Division Head)" }
          : pr
      )
    );
  };

  const handleProcessed = (prId: number, newStatusId: number, newStatus?: string) => {
    setList((prev) =>
      prev.map((pr) =>
        pr.id === prId
          ? { ...pr, status_id: newStatusId, ...(newStatus && { status: newStatus }) }
          : pr
      )
    );
  };

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

  const isEndUser = !isAdmin && !isDivisionHead && !isBACAccount && !isPARPOAccount && !isBudgetAccount && !isSupplyAccount && !isAccountingAccount;

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
        
        // Fetch purchase requests (PR data)
        const { data: prData, error: prError } = await supabase
          .from("purchase_requests")
          .select(`
            id, entity_name, pr_no, office_section, resp_code,
            purpose, total_cost, is_high_value, status, status_id,
            fund_cluster, req_name, app_name, app_no,
            created_at, purchase_request_items (*)
          `)
          .order("created_at", { ascending: false });
        
        if (prError) {
          console.error('PR fetch error:', prError);
          return;
        }
        
        // Process purchase requests only (no delivery/payment data in PR view)
        const processedPRs = (prData || []).map(pr => ({
          ...pr,
          source: 'pr' as const
        }));
        
        const allData = processedPRs;
        
        const filteredData = allData.filter((item) => {
          // Admin and specialized roles see all procurement data
          if (isAdmin || isBACAccount || isPARPOAccount || isBudgetAccount || isSupplyAccount || isAccountingAccount) {
            return true;
          }
          
          // Division heads see ALL procurement stages (PR to Payment) from their division
          if (isDivisionHead) {
            return item.office_section === currentUser?.divisions?.division_name;
          }
          
          // End users see ALL procurement stages (PR to Payment) from their division
          // This includes PRs they created plus all subsequent stages (PO, Delivery, Payment) for their division
          return item.office_section === currentUser?.divisions?.division_name;
        });
        
        setList(filteredData as PRListRow[]);
      } finally {
        setLoading(false);
      }
    };
    fetchPRData();
  }, [supabase, isAdmin, currentUser, isBACAccount, isPARPOAccount, isBudgetAccount, isSupplyAccount, isAccountingAccount]);

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
      1:  { name: "Pending",                   color: "pending"    },
      2:  { name: "Processing (Division Head)", color: "processing" },
      3:  { name: "Processing (BAC)",           color: "processing" },
      4:  { name: "Processing (Budget)",        color: "processing" },
      5:  { name: "Processing (PARPO)",         color: "processing" },
      6:  { name: "Canvassing (Reception)",     color: "canvassing" },
      7:  { name: "BAC Resolution",             color: "bac"        },
      8:  { name: "Canvassing (Releasing)",     color: "canvassing" },
      9:  { name: "Canvassing (Collection)",    color: "canvassing" },
      10: { name: "Abstract of Awards",         color: "aaa"        },
      11: { name: "PO (Creation)",              color: "po"         },
      12: { name: "PO (Allocation)",            color: "po"         },
      13: { name: "ORS (Creation)",             color: "approved"   },
      14: { name: "ORS (Processing)",           color: "approved"   },
      15: { name: "PO (Accounting)",            color: "po"         },
      16: { name: "PO (PARPO)",                 color: "po"         },
      17: { name: "PO (Serving)",               color: "po"         },
      18: { name: "Delivery (Waiting)",         color: "delivery"   },
      19: { name: "Delivery (Received)",       color: "delivery"   },
      20: { name: "Delivery (IAR)",            color: "delivery"   },
      21: { name: "Delivery (IAR Processing)", color: "delivery" },
      22: { name: "Delivery (LOA)",            color: "delivery"   },
      25: { name: "Delivery (Division Chief)", color: "delivery"   },
      26: { name: "Payment (cancelled)",       color: "payment"    },
      27: { name: "Cancelled",                 color: "rejected"   },
      28: { name: "Payment Pending",           color: "payment"    },
      29: { name: "Voucher Verification",    color: "payment"    },
      30: { name: "Accounting Review",         color: "payment"    },
      32: { name: "PARPO Approval",            color: "payment"    },
      33: { name: "Completed (PR Phase)",      color: "completed"  },
      34: { name: "PARPO office signature",    color: "payment"    },
      35: { name: "Accounting — Tax",          color: "payment"    },
      36: { name: "Payment completed",         color: "completed"  },
      37: { name: "Cancelled",                 color: "rejected"   },
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
    completed:  "bg-green-50 text-green-800 border border-green-200",
    delivery:   "bg-cyan-50 text-cyan-800 border border-cyan-200",
    payment:    "bg-orange-50 text-orange-800 border border-orange-200",
    rejected:   "bg-red-50 text-red-800 border border-red-200",
    default:    "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const FLAG_BADGE: Record<string, string> = {
    "no flag":           "bg-gray-100 text-gray-700 border border-gray-200",
    "complete":          "bg-emerald-50 text-emerald-800 border border-emerald-200",
    "incomplete info":   "bg-amber-50 text-amber-800 border border-amber-200",
    "wrong information": "bg-red-50 text-red-800 border border-red-200",
    "needs revision":    "bg-indigo-50 text-indigo-800 border border-indigo-200",
    "on hold":           "bg-blue-50 text-blue-800 border border-blue-200",
    "urgent":            "bg-rose-50 text-rose-800 border border-rose-200",
    default:             "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const countByColor = (color: string) =>
    list.reduce((n, i) => (getStatusInfo(i.status_id).color === color ? n + 1 : n), 0);

  const pendingCount    = countByColor("pending");
  const processingCount = countByColor("processing");
  const canvassingCount = countByColor("canvassing");
  const completedCount  = countByColor("completed");

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
      const matchSection = sectionFilter === null || pr.office_section === sectionFilter;
      const matchYear = pr.created_at ? new Date(pr.created_at).getFullYear() === fiscalYear : true;
      return matchSearch && (statusFilter === "all" || color === statusFilter) && matchSection && matchYear;
    })
    .sort((a, b) => {
      let aVal: number | string = "";
      let bVal: number | string = "";
      if (sortField === "total_cost") {
        aVal = a.total_cost || 0;
        bVal = b.total_cost || 0;
      } else if (sortField === "created_at") {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
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
    { value: "po",         label: "PO" },
    { value: "completed",  label: "Completed" },
  ];

  const STAT_CARDS = [
    { label: "Total",      value: list.length,     icon: <RiFileListLine size={20} />,        iconBg: "bg-emerald-100", iconColor: "text-emerald-600", numColor: "text-emerald-600", cardBg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Pending",    value: pendingCount,    icon: <RiTimeLine size={20} />,             iconBg: "bg-amber-100",   iconColor: "text-amber-600",   numColor: "text-amber-600",   cardBg: "bg-amber-50",   border: "border-amber-100"   },
    { label: "Processing", value: processingCount, icon: <RiFileListLine size={20} />,         iconBg: "bg-blue-100",    iconColor: "text-blue-600",    numColor: "text-blue-600",    cardBg: "bg-blue-50",    border: "border-blue-100"    },
    { label: "Canvassing", value: canvassingCount, icon: <RiFileListLine size={20} />,         iconBg: "bg-violet-100",  iconColor: "text-violet-600",  numColor: "text-violet-600",  cardBg: "bg-violet-50",  border: "border-violet-100"  },
    { label: "Completed",  value: completedCount,  icon: <RiCheckboxCircleLine size={20} />,   iconBg: "bg-green-100",   iconColor: "text-green-600",   numColor: "text-green-600",   cardBg: "bg-green-50",   border: "border-green-100"   },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

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
            <div className="skeleton-shimmer h-10 w-28 rounded-xl" />
          </div>

          {/* ── TABS SKELETON ── */}
          <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-9 w-32 rounded-xl" />
            ))}
          </div>

          {/* ── STAT CARDS SKELETON ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="skeleton-shimmer w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton-shimmer h-3 w-16 rounded" />
                  <div className="skeleton-shimmer h-6 w-10 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* ── TABLE PANEL SKELETON ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header with filter buttons */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="skeleton-shimmer h-5 w-40 rounded" />
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-shimmer h-6 w-20 rounded-full" />
                ))}
                <div className="skeleton-shimmer h-8 w-56 rounded-lg" />
              </div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="skeleton-shimmer h-4 w-24 rounded shrink-0" />
                  <div className="skeleton-shimmer h-4 w-32 rounded shrink-0" />
                  <div className="skeleton-shimmer h-4 w-full max-w-xs rounded" />
                  <div className="skeleton-shimmer h-6 w-28 rounded-full shrink-0" />
                  <div className="skeleton-shimmer h-4 w-20 rounded shrink-0" />
                  <div className="skeleton-shimmer h-4 w-24 rounded shrink-0 ml-auto" />
                  <div className="flex items-center justify-center gap-1.5 shrink-0">
                    <div className="skeleton-shimmer h-7 w-16 rounded-lg" />
                    <div className="skeleton-shimmer h-7 w-16 rounded-lg" />
                  </div>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowYearPicker(true)}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-400 rounded-xl px-4 py-2.5 transition-colors shadow-sm"
            >
              <RiCalendarLine size={16} className="text-emerald-600" />
              <span className="font-semibold text-gray-700 text-sm">FY {fiscalYear}</span>
            </button>
            {!(isBACAccount || isDivisionHead) && <PRModalComponent onSave={handlePRSaved} />}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit">
          {([
            { key: "pr",       label: "Purchase Request",   href: null                        },
            { key: "canvass",  label: "Canvass",            href: "/Procurement/Canvass"      },

            { key: "abstract", label: "Abstract of Awards", href: "/Procurement/Abstract"     },
            { key: "purchase order", label: "Purchase Order", href: "/Procurement/PurchaseOrder" },
            { key: "delivery", label: "Delivery", href: "/Procurement/Delivery"     },
            { key: "payment", label: "Payment", href: "/Procurement/Payment"     },

          ] as const).map(({ key, label, href }) => (
            <button
              key={key}
              onClick={() => href && router.push(href)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                key === "pr"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── PR TAB CONTENT ── */}
        {activeTab === "pr" && (
          <>
            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {STAT_CARDS.map(({ label, value, icon, iconBg, iconColor, numColor, cardBg, border }) => (
                <div
                  key={label}
                  className={`${cardBg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
                >
                  <div className={`${iconBg} ${iconColor} rounded-xl w-10 h-10 flex items-center justify-center shrink-0`}>{icon}</div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className={`mono text-xl font-bold ${numColor}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TABLE PANEL ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 max-w-6xl mx-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800 shrink-0">All Purchase Requests</h2>
            <div className="flex flex-wrap items-center gap-2">
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

          {/* Status sub-tabs */}
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setStatusFilter(value); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                  statusFilter === value
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-4">
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
              <p className="text-sm font-medium">No purchase requests found.</p>
              <p className="text-xs mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                      <th className="px-2 py-2 text-left font-semibold th-sort select-none cursor-pointer w-28" onClick={() => handleSort("pr_no")}>
                        <span className="inline-flex items-center gap-1">
                          PR # <SortIcon field="pr_no" />
                        </span>
                      </th>
                      <th className="px-2 py-2 text-left font-semibold th-sort select-none cursor-pointer w-24" onClick={() => handleSort("office_section")}>
                        <span className="inline-flex items-center gap-1">
                          Section <SortIcon field="office_section" />
                        </span>
                      </th>
                      <th className="px-2 py-2 text-left font-semibold flex-1 min-w-40">Description</th>
                      <th className="px-2 py-2 text-left font-semibold th-sort select-none cursor-pointer w-24" onClick={() => handleSort("created_at")}>
                        <span className="inline-flex items-center gap-1">
                          Date <SortIcon field="created_at" />
                        </span>
                      </th>
                      <th className="px-2 py-2 text-center font-semibold w-32">Status</th>
                      {isEndUser && <th className="px-2 py-2 text-center font-semibold w-28">Status Flag</th>}
                      <th className="px-2 py-2 text-right font-semibold th-sort select-none cursor-pointer w-24" onClick={() => handleSort("total_cost")}>
                        <span className="inline-flex items-center gap-1 justify-end">
                          Cost <SortIcon field="total_cost" />
                        </span>
                      </th>
                      <th className="px-2 py-2 text-center font-semibold w-56">Actions</th>
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

                          {/* PR Number */}
                          <td className={`mono px-2 py-2 font-semibold text-gray-800 whitespace-nowrap ${rowBg}`}>
                            {form.pr_no}
                          </td>

                          {/* Office / Section */}
                          <td className={`px-2 py-2 text-gray-600 truncate ${rowBg}`}>
                            {form.office_section || <span className="text-gray-300">—</span>}
                          </td>

                          {/* Description */}
                          <td className={`px-2 py-2 text-gray-500 line-clamp-2 ${rowBg}`}>
                            {desc
                              ? desc
                              : <span className="text-gray-300">—</span>}
                          </td>

                          {/* Date */}
                          <td className={`px-2 py-2 text-gray-500 whitespace-nowrap ${rowBg}`}>
                            {form.created_at
                              ? new Date(form.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                              : <span className="text-gray-300">—</span>}
                          </td>

                          {/* Status */}
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${BADGE_CLASS[statusColor] ?? BADGE_CLASS.default}`}>
                              {statusName}
                            </span>
                          </td>

                          {/* Status Flag — end users only */}
                          {isEndUser && (
                            <td className={`px-2 py-2 text-center ${rowBg}`}>
                              {(() => {
                                const fid   = latestFlagByPr[form.id] ?? null;
                                const fname = fid ? flagNameById[fid] : "No Flag";
                                const key   = (fname || "No Flag").toLowerCase();
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${FLAG_BADGE[key] ?? FLAG_BADGE.default}`}>
                                    {fname}
                                  </span>
                                );
                              })()}
                            </td>
                          )}

                          {/* Total Cost */}
                          <td className={`mono px-2 py-2 text-right font-semibold text-gray-800 ${rowBg}`}>
                            {cost > 0
                              ? `₱${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              : <span className="text-gray-300 font-normal">—</span>}
                          </td>

                          {/* ── ACTIONS ── */}
                          <td className={`px-2 py-2 text-center ${rowBg}`}>
                            <div className="flex items-center justify-center gap-1">

                              {/* Budget account — View + Budget Process */}
                              {isBudgetAccount && (
                                <>
                                  <button
                                    onClick={() => setViewPrId(form.id)}
                                    className="px-2 py-1 text-xs font-semibold rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                                  >
                                    <RiEyeLine size={14} />
                                    View
                                  </button>
                                  {form.status_id === 4 && (
                                    <button
                                      onClick={() =>
                                        setBudgetProcessTarget({
                                          prId: form.id,
                                          prNo:  form.pr_no,
                                          prData: {
                                            office_section: form.office_section,
                                            purpose:        form.purpose,
                                            total_cost:     form.total_cost,
                                            status:         form.status,
                                            entity_name:    form.entity_name,
                                            fund_cluster:   form.fund_cluster,
                                            req_name:       form.req_name,
                                            app_name:       form.app_name,
                                            app_no:         form.app_no,
                                            resp_code:      form.resp_code,
                                          },
                                        })
                                      }
                                      className="px-2 py-1 text-xs font-semibold rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
                                    >
                                      <RiPlayCircleLine size={14} />
                                      Budget Process
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Accounting account — View */}
                              {isAccountingAccount && (
                                <button
                                  onClick={() => setViewPrId(form.id)}
                                  className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
                                >
                                  View
                                </button>
                              )}

                              {/* Delete — Admin only */}
                              {isAdmin && (
                                <button
                                  onClick={() => setDeletePrTarget({ prId: form.id, prNo: form.pr_no })}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiDeleteBinLine size={14} />
                                  Delete
                                </button>
                              )}

                              {/* Remarks — all users */}
                              <button
                                onClick={() => setRemarksTarget({ prId: form.id, prNo: form.pr_no })}
                                className="px-2 py-1 text-xs font-semibold rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                              >
                                <RiChat3Line size={14} />
                                Remarks
                              </button>

                              {/* View — everyone except budget and accounting (they already have View above) */}
                              {!isBudgetAccount && !isAccountingAccount && (
                                <button
                                  onClick={() => setViewPrId(form.id)}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiEyeLine size={14} />
                                  View
                                </button>
                              )}

                              
                              {/* Process — admin always, Division Head for pending/submitted PRs in their division */}
                              {!isBudgetAccount && !isAccountingAccount && (isAdmin || (isDivisionHead && [1, 2].includes(form.status_id ?? 0))) && (
                                <button
                                  onClick={() => setProcessTarget({ prId: form.id, prNo: form.pr_no, statusId: form.status_id })}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiPlayCircleLine size={14} />
                                  Process
                                </button>
                              )}

                              {/* Submit — regular end users, Pending only, and only their own PRs */}
                              {!isAdmin && !isDivisionHead && !isBACAccount && !isBudgetAccount && !isAccountingAccount && form.status_id === 1 && form.req_name === currentUser?.fullname && (
                                <button
                                  onClick={() => setSubmitConfirm({ prId: form.id, prNo: form.pr_no })}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiPlayCircleLine size={14} />
                                  Submit
                                </button>
                              )}

                              {/* BAC Process — BAC account, status_id=3 */}
                              {!isBudgetAccount && !isAccountingAccount && isBACAccount && form.status_id === 3 && (
                                <button
                                  onClick={() => setBACProcessTarget({ prId: form.id, prNo: form.pr_no })}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiPlayCircleLine size={14} />
                                  BAC Process
                                </button>
                              )}

                              {/* PARPO Process — PARPO account, status_id=5 */}
                              {!isBudgetAccount && !isAccountingAccount && isPARPOAccount && form.status_id === 5 && (
                                <button
                                  onClick={() => setPARPOProcessTarget({ prId: form.id, prNo: form.pr_no })}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <RiPlayCircleLine size={14} />
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

      <footer className="border-t border-gray-200 bg-white/80 px-6 py-6 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Official Logos</p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            <img
              src="/ncf/ncf logo.jpg"
              alt="Naga College Foundation logo"
              className="h-20 w-20 rounded-xl border border-emerald-100 bg-white object-contain p-1 shadow-sm md:h-24 md:w-24"
            />
            <img
              src="/ncf/ccs logo.png"
              alt="College of Computer Studies logo"
              className="h-20 w-20 rounded-xl border border-emerald-100 bg-white object-contain p-1 shadow-sm md:h-24 md:w-24"
            />
          </div>
        </div>
      </footer>

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
              <button
                onClick={() => setSubmitConfirm(null)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                No, Cancel
              </button>
              <button
                onClick={handleSubmitPR}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Submitting…
                  </>
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
            setList((prev) => prev.map((pr) => (pr.id === prId ? { ...pr } : pr)));
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
            setList((prev) => prev.map((pr) => (pr.id === prId ? { ...pr } : pr)));
            setPARPOProcessTarget(null);
          }}
        />
      )}

      {/* ── BUDGET PROCESS MODAL ── */}
      {budgetProcessTarget && (
        <BudgetProcessModal
          prId={budgetProcessTarget.prId}
          currentPrNo={budgetProcessTarget.prNo}
          prData={budgetProcessTarget.prData}  
          onClose={() => setBudgetProcessTarget(null)}
          onProcessed={(prId: number) => {
            setList((prev) => prev.map((pr) => (pr.id === prId ? { ...pr } : pr)));
            setBudgetProcessTarget(null);
          }}
        />
      )}

      {/* ── VIEW PR MODAL ── */}
      {viewPrId !== null && (
        <ViewPRModal
          prId={viewPrId}
          onClose={() => setViewPrId(null)}
          onEdit={() => {
            setViewPrId(null);
            setEditPrId(viewPrId);
          }}
        />
      )}

      {/* ── EDIT PR MODAL ── */}
      {editPrId !== null && (
        <EditPRModal
          prId={editPrId}
          onClose={() => setEditPrId(null)}
          onSave={() => {
            setEditPrId(null);
            setTimeout(() => window.location.reload(), 500);
          }}
        />
      )}

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

      {/* ── DELETE PR CONFIRM MODAL ── */}
      {deletePrTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleteConfirming && setDeletePrTarget(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <RiDeleteBinLine size={28} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Purchase Request?</h3>
            <p className="text-gray-600 mb-1">
              PR <span className="font-semibold text-gray-800">{deletePrTarget.prNo}</span> and <strong>all connected records</strong> (POs, deliveries, canvass data, ORS entries, remarks) will be permanently deleted.
            </p>
            <p className="text-xs text-red-600 font-semibold mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeletePrTarget(null)}
                disabled={deleteConfirming}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirming}
                onClick={async () => {
                  setDeleteConfirming(true);
                  const { error } = await deletePRCascade(deletePrTarget.prId);
                  setDeleteConfirming(false);
                  setDeletePrTarget(null);
                  if (error) {
                    setDeleteErrorMsg("Delete failed: " + error);
                  } else {
                    setList((prev) => prev.filter((p) => p.id !== deletePrTarget.prId));
                    setDeleteSuccessMsg(`PR ${deletePrTarget.prNo} and all connected records have been deleted.`);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteConfirming ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Deleting…</>
                ) : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        visible={!!deleteSuccessMsg}
        title="Deleted"
        message={deleteSuccessMsg ?? ""}
        onConfirm={() => setDeleteSuccessMsg(null)}
      />
      <ErrorModal
        visible={!!deleteErrorMsg}
        message={deleteErrorMsg ?? ""}
        onDismiss={() => setDeleteErrorMsg(null)}
      />

      {/* ── REMARKS TIMELINE MODAL ── */}
      {remarksTarget && (
        <RemarksTimelineModal
          visible={true}
          target={{ prId: remarksTarget.prId }}
          title={`Remarks · PR ${remarksTarget.prNo}`}
          subtitle="PR procurement remarks history"
          onClose={() => setRemarksTarget(null)}
        />
      )}

      {/* ── SIGNOUT MODAL ── */}
      <SignoutModal open={signoutModalOpen} onClose={() => setSignoutModalOpen(false)} />
    </div>
  );
}
