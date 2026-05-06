"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiMoneyDollarCircleLine, RiCheckLine, RiAlertLine,
  RiSearchLine, RiArrowUpLine, RiArrowDownLine, RiArrowLeftLine, RiArrowRightLine, RiAddLine, RiEditLine,
  RiCalendarLine, RiCalculatorLine, RiEyeLine, RiEdit2Line, RiInformationLine, RiCloseLine,
} from "react-icons/ri";
import CreateBudgetModal from "@/components/Budget/CreateBudgetModal";
import EditBudgetModal from "@/components/Budget/EditBudgetModal";
import {
  fetchBudgets,
  fetchOrsEntries,
  type DivisionBudgetRow,
  type OrsEntryRow,
} from "./budget";

export default function BudgetPage() {
  const supabase = createClient();

  // Extended Budget type based on DivisionBudgetRow with UI-compatible field names
  type Budget = {
    id: string;
    budget_id: number; // alias for compatibility
    division_id: number;
    division_name: string;
    budget_year: number; // alias for fiscal_year
    fiscal_year: number;
    total_allocated: number; // alias for allocated
    allocated: number;
    total_earmarked: number; // calculated from ORS
    total_spent: number; // alias for utilized
    utilized: number;
    total_remaining: number; // calculated
    remaining: number;
    notes?: string | null;
    utilizationPercent: number;
    remainingPercent: number;
    status: "on-track" | "warning" | "critical";
    // Fields for EditBudgetModal compatibility
    budget_number: string;
    budget_status: string;
  };

  type Division = {
    division_id: number;
    division_name: string;
  };

  type CurrentUser = {
    fullname: string;
    username: string;
    user_id?: number;
    role_id: number;
    divisions?: { division_name: string };
    roles?: { role_name: string };
  };

  // ─── Constants ────────────────────────────────────────────────────────────
  const CURRENT_YEAR = new Date().getFullYear();
  const PAGE_SIZE = 10;
  /** Roles that may write to this module */
  const EDIT_ROLES = new Set([1, 4]); // Admin, Budget
  /** Role that sees only their own division */
  const ENDUSER_ROLE = 6;

  // ─── State ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isEndUser, setIsEndUser] = useState(false);

  // Year selection
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Budget is calculated based on ORS obligated amounts

  // Budget data
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalEarmarked, setTotalEarmarked] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [utilizationRate, setUtilizationRate] = useState(0);

  const [budgetList, setBudgetList] = useState<Budget[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"division_name" | "allocated" | "utilizationPercent">("division_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      const roleId = user.role_id ?? 0;
      setIsAdmin(roleId === 1);
      setCanEdit(EDIT_ROLES.has(roleId));
      setIsEndUser(roleId === ENDUSER_ROLE);
    }
  }, []);

  // Fetch divisions for modal
  useEffect(() => {
    const fetchDivisions = async () => {
      const { data } = await supabase.from("divisions").select("division_id, division_name");
      if (data) {
        setDivisions(data);
      }
    };
    fetchDivisions();
  }, [supabase]);

  // ─── Data Loading ─────────────────────────────────────────────────────────
  const loadBudgetData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      // ═══════════════════════════════════════════════════════════════════
      // STEP 1: Determine user's division for filtering
      // ═══════════════════════════════════════════════════════════════════
      let userDivisionId: number | undefined;
      
      if (isEndUser && currentUser?.divisions?.division_name) {
        const { data: userDivision } = await supabase
          .from("divisions")
          .select("division_id")
          .eq("division_name", currentUser.divisions.division_name)
          .single();
        if (userDivision) {
          userDivisionId = userDivision.division_id;
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 2: Fetch budgets and ORS entries in parallel
      // ═══════════════════════════════════════════════════════════════════
      const [budgetsData, orsData] = await Promise.all([
        fetchBudgets(selectedYear),
        fetchOrsEntries(selectedYear, userDivisionId),
      ]);

      // ═══════════════════════════════════════════════════════════════════
      // STEP 3: Filter budgets by user's division if end user
      // ═══════════════════════════════════════════════════════════════════
      const filteredBudgets = userDivisionId
        ? budgetsData.filter((b) => b.division_id === userDivisionId)
        : budgetsData;

      // Get the set of valid division IDs from filtered budgets
      const validDivisionIds = new Set(filteredBudgets.map(b => b.division_id));

      // ═══════════════════════════════════════════════════════════════════
      // STEP 4: BUDGET CALCULATION LOGIC
      // ═══════════════════════════════════════════════════════════════════
      
      // ─── ORS Calculation ───
      // Uses obligation_amount (accurate obligation request amount) 
      // Falls back to amount field if obligation_amount is not available
      // Only includes ORS entries for divisions that have budgets
      const orsByDivision: Record<number, number> = {};
      orsData.forEach((ors) => {
        if (ors.division_id && validDivisionIds.has(ors.division_id)) {
          // Use obligation_amount for accurate budget earmarking, fallback to amount
          const orsValue = ors.obligation_amount ?? ors.amount ?? 0;
          orsByDivision[ors.division_id] = (orsByDivision[ors.division_id] || 0) + orsValue;
        }
      });

      // ─── Budget Processing ───
      const processedBudgets: Budget[] = filteredBudgets.map((item) => {
        const allocated = item.allocated || 0;
        const orsAmount = orsByDivision[item.division_id] || 0;  // Obligated from ORS entries
        
        // Utilization is calculated using ORS obligated amounts only
        const utilized = orsAmount;
        
        const remaining = allocated - utilized;
        const utilizationPercent = allocated > 0 ? (utilized / allocated) * 100 : 0;
        const remainingPercent = allocated > 0 ? (remaining / allocated) * 100 : 0;

        // Determine status based on utilization AND remaining budget
        let status: "on-track" | "warning" | "critical" = "on-track";
        if (utilizationPercent > 90 || remaining < 0) {
          status = "critical"; // Over-allocated or negative remaining
        } else if (utilizationPercent > 75 || remainingPercent < 25) {
          status = "warning"; // High utilization or low remaining
        }

        return {
          ...item,
          budget_id: item.division_id,
          budget_year: item.fiscal_year,
          total_allocated: allocated,
          total_earmarked: orsAmount,
          total_spent: 0, // Not used - budget calculated on ORS obligated amounts only
          total_remaining: remaining,
          utilized,
          remaining,
          utilizationPercent,
          remainingPercent,
          status,
          budget_number: `BUD-${item.fiscal_year}-${item.division_id}`,
          budget_status: remaining < 0 ? "Over Budget" : remainingPercent < 25 ? "Low Remaining" : "Active",
        } as Budget;
      });

      // Calculate totals
      const totalAllocated = processedBudgets.reduce((sum, b) => sum + b.allocated, 0);
      const totalEarmarked = processedBudgets.reduce((sum, b) => sum + b.total_earmarked, 0);
      const totalSpent = processedBudgets.reduce((sum, b) => sum + b.total_spent, 0);
      const totalUtilized = processedBudgets.reduce((sum, b) => sum + b.utilized, 0);

      setBudgetList(processedBudgets);
      setTotalAllocated(totalAllocated);
      setTotalEarmarked(totalEarmarked);
      setTotalSpent(totalSpent);
      setTotalRemaining(totalAllocated - totalUtilized);
      setUtilizationRate(totalAllocated > 0 ? (totalUtilized / totalAllocated) * 100 : 0);
    } catch (err) {
      console.error("Error fetching budget data:", err);
    }

    setLoading(false);
  }, [currentUser, isEndUser, selectedYear, supabase]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  // ─── Year Picker Options ──────────────────────────────────────────────────
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 5; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const handleSort = (field: "division_name" | "allocated" | "utilizationPercent") => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredList = budgetList.filter(item =>
    (item.division_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedList = [...filteredList].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    const multiplier = sortDir === "asc" ? 1 : -1;

    if (typeof aVal === "string") {
      return (aVal.localeCompare(bVal as string)) * multiplier;
    }
    return ((aVal as number) - (bVal as number)) * multiplier;
  });

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
  const pagedList = sortedList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageNums = (() => {
    const nums = [];
    const maxPages = 5;
    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else {
      nums.push(1);
      if (currentPage > 3) nums.push("…");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (i !== 1 && i !== totalPages) nums.push(i);
      }
      if (currentPage < totalPages - 2) nums.push("…");
      nums.push(totalPages);
    }
    return nums;
  })();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "warning": return "bg-amber-100 text-amber-700 border-amber-200";
      case "critical": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "from-red-500 to-red-600";
    if (percent >= 75) return "from-amber-500 to-amber-600";
    if (percent >= 50) return "from-emerald-500 to-emerald-600";
    return "from-blue-500 to-blue-600";
  };

  // ─── Formatting Helpers ───────────────────────────────────────────────────

  /** Format number to compact form with 2 decimals (1.63K instead of 2K) */
  const formatCompact = (n: number): string => {
    const absN = Math.abs(n);
    if (absN >= 1000000) return (n / 1000000).toFixed(2) + "M";
    if (absN >= 1000) return (n / 1000).toFixed(2) + "K";
    return n.toFixed(2);
  };

  /** Format full amount with peso sign and 2 decimal places */
  const formatFull = (n: number): string => {
    return "₱" + Math.abs(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /** Amount component with tooltip showing full value */
  const Amount = ({ value, className = "" }: { value: number; className?: string }) => {
    const isNegative = value < 0;
    return (
      <span className={`group relative cursor-help ${className}`}>
        {isNegative && "-"}₱{formatCompact(value)}
        {/* Tooltip */}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
          {isNegative ? "-" : ""}{formatFull(value)}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="skeleton-shimmer h-3 w-24 rounded mb-2" />
              <div className="skeleton-shimmer h-6 w-16 rounded" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="skeleton-shimmer h-8 w-32 rounded mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton-shimmer h-4 w-32 rounded shrink-0" />
                <div className="skeleton-shimmer h-4 w-24 rounded shrink-0" />
                <div className="skeleton-shimmer h-4 w-full max-w-xs rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-1">
              DAR · Budget Management
            </p>
            <h1 className="text-2xl font-bold">Budget Overview</h1>
            <p className="text-sm text-white/70 mt-1">
              Monitor allocation and utilization across divisions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Year Selector */}
            <button
              onClick={() => setShowYearPicker(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2.5 transition-colors"
            >
              <RiCalendarLine size={18} className="text-white/70" />
              <span className="font-semibold">FY {selectedYear}</span>
              <RiArrowDownLine size={14} className="text-white/50" />
            </button>

            {/* Role Badge - flat style, not button-like */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 ${canEdit ? "text-emerald-200" : "text-white/60"}`}
            >
              {canEdit ? <RiEdit2Line size={14} /> : <RiEyeLine size={14} />}
              <span className="text-xs font-medium uppercase tracking-wide">
                {canEdit ? "Edit Access" : "Read-Only"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards with Progress Bars ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Allocated */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm group">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Total Allocated
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-700">
              {formatFull(totalAllocated)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Annual Procurement Plan {selectedYear}
          </p>
        </div>

        {/* Total Obligated (ORS) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm group">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Total Obligated (ORS)
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-600">
              {formatFull(totalEarmarked)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(totalAllocated > 0 ? (totalEarmarked / totalAllocated) * 100 : 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {totalAllocated > 0 ? ((totalEarmarked / totalAllocated) * 100).toFixed(1) : "0.0"}% of total budget
          </p>
        </div>

        {/* Remaining */}
        <div className={`bg-white rounded-2xl p-5 border shadow-sm group ${totalRemaining < 0 ? 'border-red-300 bg-red-50' : totalRemaining / totalAllocated < 0.25 ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-semibold uppercase tracking-wide ${totalRemaining < 0 ? 'text-red-500' : totalRemaining / totalAllocated < 0.25 ? 'text-amber-600' : 'text-gray-400'}`}>
              Remaining
            </p>
            {totalRemaining < 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                OVER BUDGET
              </span>
            )}
            {totalRemaining >= 0 && totalRemaining / totalAllocated < 0.25 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                LOW
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${totalRemaining < 0 ? "text-red-600" : totalRemaining / totalAllocated < 0.25 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatFull(Math.abs(totalRemaining))}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${totalRemaining < 0 ? 'bg-red-500' : totalRemaining / totalAllocated < 0.25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.max(0, Math.min(totalAllocated > 0 ? (totalRemaining / totalAllocated) * 100 : 0, 100))}%` }}
            />
          </div>
          <p className={`text-xs mt-2 ${totalRemaining < 0 ? 'text-red-600 font-medium' : totalRemaining / totalAllocated < 0.25 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
            {totalRemaining < 0 
              ? <>Over budget by ₱{formatFull(Math.abs(totalRemaining))}</>
              : totalAllocated > 0
              ? `${((totalRemaining / totalAllocated) * 100).toFixed(1)}% of budget remaining`
              : "0.0% of budget remaining"}
          </p>
        </div>
      </div>

      {/* Budget by Division Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 max-w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Budget Breakdown by Division</h2>
            <p className="text-xs text-gray-500">Supabase integration active • {budgetList.length} budgets loaded</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <RiSearchLine size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search division…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-56"
              />
            </div>
            {canEdit && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <RiAddLine size={16} />
                Create
              </button>
            )}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RiMoneyDollarCircleLine size={38} className="opacity-30 mb-3" />
            <p className="text-sm font-medium">No divisions found.</p>
            <p className="text-xs mt-1">Try adjusting your search.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-700 text-white uppercase tracking-widest">
                    {([
                      { label: "Division", field: "division_name" as const, align: "text-left", width: "flex-1 min-w-40" },
                      { label: "Allocated", field: "allocated" as const, align: "text-right", width: "w-32" },
                      { label: "Obligated (ORS)", field: null, align: "text-right", width: "w-32" },
                      { label: "Remaining", field: null, align: "text-right", width: "w-28" },
                      { label: "Utilization", field: "utilizationPercent" as const, align: "text-center", width: "w-32" },
                      { label: "Status", field: null, align: "text-center", width: "w-28" },
                      { label: "Actions", field: null, align: "text-center", width: "w-20" },
                    ] as const).map(({ label, field, align, width }) => (
                      <th
                        key={label}
                        onClick={field ? () => handleSort(field) : undefined}
                        className={`px-2 py-2 font-semibold ${align} ${field ? "th-sort select-none cursor-pointer" : ""} ${width}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}{field && <RiArrowUpLine size={12} className="opacity-50" />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedList.map((item, index) => {
                    const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";

                    return (
                      <tr key={item.budget_id} className="tr-row border-b border-gray-100 transition-colors hover:bg-emerald-50/50">
                        <td className={`px-2 py-2 font-semibold text-gray-800 ${rowBg}`}>
                          {item.division_name}
                        </td>
                        <td className={`mono px-2 py-2 text-right text-gray-700 ${rowBg}`}>
                          <span className="group relative cursor-help" title={formatFull(item.total_allocated)}>
                            ₱{formatCompact(item.total_allocated)}
                          </span>
                        </td>
                        <td className={`mono px-2 py-2 text-right text-gray-700 ${rowBg}`}>
                          <span className="group relative cursor-help" title={formatFull(item.total_earmarked)}>
                            ₱{formatCompact(item.total_earmarked)}
                          </span>
                        </td>
                        <td className={`mono px-2 py-2 text-right ${rowBg} ${item.total_remaining < 0 ? 'text-red-600 font-bold' : item.remainingPercent < 25 ? 'text-amber-600 font-medium' : 'text-gray-700'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {item.total_remaining < 0 && <span className="text-red-500 text-xs">▼</span>}
                            {item.total_remaining >= 0 && item.remainingPercent < 25 && <span className="text-amber-500 text-xs">⚠</span>}
                            <span className="group relative cursor-help" title={item.total_remaining < 0 ? "-" + formatFull(item.total_remaining) : formatFull(item.total_remaining)}>
                              ₱{formatCompact(Math.abs(item.total_remaining))}
                            </span>
                          </div>
                        </td>
                        <td className={`px-2 py-2 text-center ${rowBg}`}>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full bg-linear-to-r ${getUtilizationColor(item.utilizationPercent)}`}
                                  style={{ width: `${Math.min(item.utilizationPercent, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-700 w-10 text-right">{item.utilizationPercent.toFixed(1)}%</span>
                            </div>
                            {item.remainingPercent < 25 && item.total_remaining >= 0 && (
                              <span className="text-[10px] text-amber-600 font-medium">{item.remainingPercent.toFixed(0)}% left</span>
                            )}
                            {item.total_remaining < 0 && (
                              <span className="text-[10px] text-red-600 font-bold">Over budget!</span>
                            )}
                          </div>
                        </td>
                        <td className={`px-2 py-2 text-center ${rowBg}`}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                            {item.status === "on-track" && <RiCheckLine size={12} className="mr-1" />}
                            {item.status !== "on-track" && <RiAlertLine size={12} className="mr-1" />}
                            {item.status === "on-track" ? "On Track" : item.status === "warning" ? "Warning" : "Critical"}
                          </span>
                        </td>
                        <td className={`px-2 py-2 text-center ${rowBg}`}>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setSelectedBudget(item);
                                setShowEditModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded text-xs font-medium transition-colors"
                            >
                              <RiEditLine size={14} />
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 -mx-6 px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-700">{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredList.length)}</span> of <span className="font-semibold text-gray-700">{filteredList.length}</span> divisions
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RiArrowLeftLine size={14} />
                </button>

                {pageNums.map((p, idx) =>
                  p === "…" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-all ${
                        currentPage === p
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RiArrowRightLine size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Page</span>
                <span className="font-semibold text-gray-700">{currentPage}</span>
                <span>of</span>
                <span className="font-semibold text-gray-700">{totalPages}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Budget Modal */}
      <CreateBudgetModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onBudgetCreated={() => {
          // Refresh data when budget is created
          loadBudgetData();
          setShowCreateModal(false);
        }}
        divisions={divisions}
        currentUserId={currentUser?.user_id || 0}
        onEditExisting={(divisionId, fiscalYear) => {
          // Find the existing budget and open edit modal
          const existingBudget = budgetList.find(
            (b) => b.division_id === divisionId && b.fiscal_year === fiscalYear
          );
          if (existingBudget) {
            setSelectedBudget(existingBudget);
            setShowEditModal(true);
          }
        }}
      />

      {/* Edit Budget Modal */}
      <EditBudgetModal
        isOpen={showEditModal}
        budget={selectedBudget}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBudget(null);
        }}
        onBudgetUpdated={() => {
          // Refresh data when budget is updated
          loadBudgetData();
        }}
        divisions={divisions}
        isAdmin={isAdmin}
      />

      {/* ─── Year Picker Modal ──────────────────────────────────────────────── */}
      {showYearPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Select</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">Fiscal Year</h3>
              </div>
              <button
                onClick={() => setShowYearPicker(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RiCloseLine size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {yearOptions.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setShowYearPicker(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${
                    selectedYear === year ? "bg-emerald-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`font-semibold ${selectedYear === year ? "text-emerald-700" : "text-gray-700"}`}>
                    FY {year}
                  </span>
                  {selectedYear === year && <RiCheckLine size={18} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Read-only Notice ───────────────────────────────────────────────── */}
      {!canEdit && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
          <RiInformationLine size={20} className="text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            {isEndUser
              ? "You are viewing your division's budget summary. Contact the Budget office to request changes."
              : "You have read-only access to the budget module. Contact an administrator for modifications."}
          </p>
        </div>
      )}
    </div>
  );
}
