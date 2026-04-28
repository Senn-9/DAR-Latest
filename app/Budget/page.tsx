"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiMoneyDollarCircleLine, RiCheckLine, RiAlertLine,
  RiSearchLine, RiArrowUpLine, RiArrowDownLine, RiArrowLeftLine, RiArrowRightLine, RiAddLine, RiEditLine,
} from "react-icons/ri";
import CreateBudgetModal from "@/components/Budget/CreateBudgetModal";
import EditBudgetModal from "@/components/Budget/EditBudgetModal";

export default function BudgetPage() {
  const supabase = createClient();

  type Budget = {
    budget_id: number;
    budget_number: string;
    budget_year: number;
    division_id: number;
    division_name: string;
    total_allocated: number;
    total_earmarked: number;
    total_spent: number;
    total_remaining: number;
    budget_status: string;
    utilizationPercent: number;
    status: "on-track" | "warning" | "critical";
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

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalEarmarked, setTotalEarmarked] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [utilizationRate, setUtilizationRate] = useState(0);

  const [budgetList, setBudgetList] = useState<Budget[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"division_name" | "total_allocated" | "total_earmarked" | "utilizationPercent">("division_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      setIsAdmin(user.role_id === 1);
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Query budgets with division names
        let query = supabase
          .from("budgets")
          .select(
            `budget_id, budget_number, budget_year, division_id, total_allocated, 
             total_earmarked, total_spent, total_remaining, budget_status, 
             divisions(division_name)`
          );

        // Filter by user's division if not admin
        if (!isAdmin && currentUser?.divisions?.division_name) {
          const { data: divData } = await supabase
            .from("divisions")
            .select("division_id")
            .eq("division_name", currentUser.divisions.division_name)
            .single();

          if (divData) {
            query = query.eq("division_id", divData.division_id);
          }
        }

        const { data, error } = await query;

        if (!error && data) {
          // Transform data with calculations
          const budgetsWithMetrics: Budget[] = (data as any[]).map((b) => {
            const utilized = b.total_earmarked + b.total_spent;
            const utilizationPercent = b.total_allocated > 0 ? Math.min((utilized / b.total_allocated) * 100, 100) : 0;

            let status: "on-track" | "warning" | "critical" = "on-track";
            if (utilizationPercent >= 90) status = "critical";
            else if (utilizationPercent >= 75) status = "warning";

            return {
              budget_id: b.budget_id,
              budget_number: b.budget_number,
              budget_year: b.budget_year,
              division_id: b.division_id,
              division_name: b.divisions?.division_name || "Unknown",
              total_allocated: b.total_allocated,
              total_earmarked: b.total_earmarked,
              total_spent: b.total_spent,
              total_remaining: b.total_remaining,
              budget_status: b.budget_status,
              utilizationPercent,
              status,
            };
          });

          // Calculate totals
          const sumAllocated = budgetsWithMetrics.reduce((sum, b) => sum + b.total_allocated, 0);
          const sumEarmarked = budgetsWithMetrics.reduce((sum, b) => sum + b.total_earmarked, 0);
          const sumSpent = budgetsWithMetrics.reduce((sum, b) => sum + b.total_spent, 0);
          const sumRemaining = budgetsWithMetrics.reduce((sum, b) => sum + b.total_remaining, 0);
          const utilization = sumAllocated > 0 ? Math.min(((sumEarmarked + sumSpent) / sumAllocated) * 100, 100) : 0;

          setTotalAllocated(sumAllocated);
          setTotalEarmarked(sumEarmarked);
          setTotalSpent(sumSpent);
          setTotalRemaining(sumRemaining);
          setUtilizationRate(utilization);
          setBudgetList(budgetsWithMetrics);
        }
      } catch (err) {
        console.error("Error fetching budget data:", err);
      }

      setLoading(false);
    };

    if (currentUser) {
      fetchData();
    }
  }, [isAdmin, currentUser, supabase]);

  const handleSort = (field: "division_name" | "total_allocated" | "total_earmarked" | "utilizationPercent") => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredList = budgetList.filter(item =>
    item.division_name.toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 flex flex-col justify-between text-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-emerald-100 font-medium mb-1">Total Allocated</p>
              <p className="mono text-2xl font-bold">₱{(totalAllocated / 1000000).toFixed(1)}M</p>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
              <RiMoneyDollarCircleLine size={20} />
            </div>
          </div>
        </div>

        <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-4 flex flex-col justify-between text-white shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-blue-100 font-medium mb-1">Earmarked</p>
            <p className="mono text-2xl font-bold">₱{(totalEarmarked / 1000).toFixed(0)}K</p>
          </div>
        </div>

        <div className="bg-linear-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 flex flex-col justify-between text-white shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-indigo-100 font-medium mb-1">Spent</p>
            <p className="mono text-2xl font-bold">₱{(totalSpent / 1000).toFixed(0)}K</p>
          </div>
        </div>

        <div className="bg-linear-to-br from-cyan-500 to-cyan-600 rounded-2xl p-4 flex flex-col justify-between text-white shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-cyan-100 font-medium mb-1">Remaining</p>
            <p className="mono text-2xl font-bold">{totalRemaining < 0 ? "P-" : "P"}{Math.abs(totalRemaining / 1000).toFixed(0)}K</p>
          </div>
        </div>

        <div className="bg-linear-to-br from-violet-500 to-violet-600 rounded-2xl p-4 flex flex-col justify-between text-white shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-violet-100 font-medium mb-1">Utilization</p>
            <p className="mono text-2xl font-bold">{utilizationRate.toFixed(1)}%</p>
          </div>
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
            {isAdmin && (
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
                      { label: "Allocated", field: "total_allocated" as const, align: "text-right", width: "w-28" },
                      { label: "Earmarked", field: "total_earmarked" as const, align: "text-right", width: "w-28" },
                      { label: "Spent", field: null, align: "text-right", width: "w-24" },
                      { label: "Remaining", field: null, align: "text-right", width: "w-24" },
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
                          ₱{(item.total_allocated / 1000).toFixed(0)}K
                        </td>
                        <td className={`mono px-2 py-2 text-right text-gray-700 ${rowBg}`}>
                          ₱{(item.total_earmarked / 1000).toFixed(0)}K
                        </td>
                        <td className={`mono px-2 py-2 text-right text-gray-700 ${rowBg}`}>
                          ₱{(item.total_spent / 1000).toFixed(0)}K
                        </td>
                        <td className={`mono px-2 py-2 text-right text-gray-700 ${rowBg}`}>
                          ₱{(item.total_remaining / 1000).toFixed(0)}K
                        </td>
                        <td className={`px-2 py-2 text-center ${rowBg}`}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-linear-to-r ${getUtilizationColor(item.utilizationPercent)}`}
                                style={{ width: `${Math.min(item.utilizationPercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-10 text-right">{item.utilizationPercent.toFixed(1)}%</span>
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
                      onClick={() => setCurrentPage(p)}
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
          if (currentUser) {
            const stored = localStorage.getItem("currentUser");
            if (stored) {
              const user = JSON.parse(stored);
              setCurrentUser(user);
            }
          }
        }}
        divisions={divisions}
        currentUserId={currentUser?.user_id || 0}
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
          if (currentUser) {
            const stored = localStorage.getItem("currentUser");
            if (stored) {
              const user = JSON.parse(stored);
              setCurrentUser(user);
            }
          }
        }}
        divisions={divisions}
        isAdmin={isAdmin}
      />
    </div>
  );
}
