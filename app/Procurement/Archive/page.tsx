"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import ViewPRModal from "@/components/Viewprmodal";
import {
  RiArchiveLine,
  RiSearchLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiEyeLine,
  RiFileListLine,
  RiFileTextLine,
  RiFilter3Line,
  RiCloseLine,
  RiCalendarLine,
  RiCheckLine,
} from "react-icons/ri";

const PAGE_SIZE = 15;

const DIVISION_RESTRICTED_ROLES = [2, 6, 7, 11];

type ArchiveEntry = {
  id: number;
  type: "PR" | "PO";
  refNo: string;
  officeSection: string;
  description: string;
  createdAt: string;
  status: string;
  statusId: number;
  parentPrNo?: string;
};

type CurrentUser = {
  id?: number;
  fullname: string;
  role_id: number;
  division_id?: number | null;
  divisions?: { division_name: string };
  roles?: { role_name: string };
};

export default function ArchivePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "PR" | "PO">("all");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [divisions, setDivisions] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sortField, setSortField] = useState<"createdAt" | "refNo" | "officeSection">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [viewPrId, setViewPrId] = useState<number | null>(null);

  const CURRENT_YEAR = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(CURRENT_YEAR);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const canViewFilesButton = currentUser
    ? currentUser.role_id === 1 || currentUser.role_id === 2 || currentUser.role_id === 3 || currentUser.role_id === 5
    : false;
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 5; y--) years.push(y);
    return years;
  }, [CURRENT_YEAR]);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchArchived = async () => {
      setLoading(true);
      try {
        const isRestricted = DIVISION_RESTRICTED_ROLES.includes(currentUser.role_id);
        const userDivision = currentUser.divisions?.division_name;

        // ── Cancelled + Archived PRs ───────────────────────────────────────────
        let prQuery = supabase
          .from("purchase_requests")
          .select("id, pr_no, office_section, purpose, status, status_id, created_at")
          .in("status_id", [41, 42])
          .order("created_at", { ascending: false });

        if (isRestricted && userDivision) {
          prQuery = prQuery.eq("office_section", userDivision);
        }

        const { data: prs } = await prQuery;

        // ── Cancelled + Archived POs ───────────────────────────────────────────
        const { data: pos } = await supabase
          .from("purchase_orders")
          .select("id, po_no, status_id, created_at, pr_id")
          .in("status_id", [41, 42])
          .order("created_at", { ascending: false });

        let filteredPOs = pos ?? [];

        // Enrich POs with parent PR info (for RBAC + display)
        if (filteredPOs.length > 0) {
          const prIds = [...new Set(filteredPOs.map((p: any) => p.pr_id).filter(Boolean))];
          const { data: parentPRs } = await supabase
            .from("purchase_requests")
            .select("id, pr_no, office_section, purpose")
            .in("id", prIds);

          const prMap: Record<number, { pr_no: string; office_section: string; purpose: string }> =
            Object.fromEntries((parentPRs ?? []).map((pr: any) => [pr.id, pr]));

          if (isRestricted && userDivision) {
            filteredPOs = filteredPOs.filter(
              (po: any) => prMap[po.pr_id]?.office_section === userDivision,
            );
          }

          filteredPOs = filteredPOs.map((po: any) => ({
            ...po,
            _parentPR: prMap[po.pr_id] ?? null,
          }));
        }

        // ── Combine ────────────────────────────────────────────────────────
        const combined: ArchiveEntry[] = [
          ...(prs ?? []).map((pr: any) => ({
            id: pr.id,
            type: "PR" as const,
            refNo: pr.pr_no ?? "",
            officeSection: pr.office_section ?? "",
            description: pr.purpose ?? "",
            createdAt: pr.created_at ?? "",
            status: pr.status ?? (pr.status_id === 42 ? "Archived" : "Cancelled"),
            statusId: pr.status_id,
          })),
          ...filteredPOs.map((po: any) => ({
            id: po.id,
            type: "PO" as const,
            refNo: po.po_no ?? "",
            officeSection: po._parentPR?.office_section ?? "",
            description: po._parentPR?.purpose ?? "",
            createdAt: po.created_at ?? "",
            status: po.status ?? (po.status_id === 42 ? "Archived" : "Cancelled"),
            statusId: po.status_id,
            parentPrNo: po._parentPR?.pr_no,
          })),
        ];

        const uniqueDivisions = [...new Set(combined.map((e) => e.officeSection).filter(Boolean))].sort();
        setDivisions(uniqueDivisions);
        setEntries(combined);
      } finally {
        setLoading(false);
      }
    };

    fetchArchived();
  }, [currentUser]);

  const isRestricted = currentUser ? DIVISION_RESTRICTED_ROLES.includes(currentUser.role_id) : false;

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (typeFilter !== "all") result = result.filter((e) => e.type === typeFilter);
    if (divisionFilter) result = result.filter((e) => e.officeSection === divisionFilter);
    result = result.filter((e) => e.createdAt ? new Date(e.createdAt).getFullYear() === fiscalYear : true);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.refNo.toLowerCase().includes(q) ||
          e.officeSection.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.parentPrNo ?? "").toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      const av = a[sortField] as string;
      const bv = b[sortField] as string;
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [entries, typeFilter, divisionFilter, searchQuery, sortField, sortDir, fiscalYear]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      sortDir === "asc" ? <RiArrowUpLine size={11} /> : <RiArrowDownLine size={11} />
    ) : (
      <span className="w-3 inline-block" />
    );

  const buildPageNums = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (currentPage > 3) pages.push("…");
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) pages.push(p);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-[family-name:var(--font-sora)]">
        <div className="w-full px-4 py-4 sm:p-6 space-y-4 md:space-y-6">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-1">Procurement Archive</p>
              <h1 className="text-3xl font-bold text-gray-900">Archived Entries</h1>
              {currentUser && (
                <p className="text-sm text-gray-400 mt-1">
                  Signed in as <span className="text-gray-700 font-semibold">{currentUser.fullname}</span>
                  {currentUser.divisions?.division_name && (
                    <span className="ml-2 px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                      {currentUser.divisions.division_name}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {canViewFilesButton && (
                <Link
                  href="/Procurement/Archive/Files"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-amber-400 hover:text-amber-700"
                >
                  <RiFileListLine size={16} className="text-amber-600" />
                  <span>Files</span>
                </Link>
              )}
              <button
                onClick={() => setShowYearPicker(true)}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-400 rounded-xl px-4 py-2.5 transition-colors shadow-sm"
              >
                <RiCalendarLine size={16} className="text-emerald-600" />
                <span className="font-semibold text-gray-700 text-sm">FY {fiscalYear}</span>
              </button>
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Archived", value: entries.length, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
              { label: "Cancelled", value: entries.filter((e) => e.statusId === 41).length, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-100" },
              { label: "Archived", value: entries.filter((e) => e.statusId === 42).length, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            ].map((card) => (
              <div key={card.label} className={`rounded-2xl ${card.bg} border ${card.border} shadow-sm p-4`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
                <p className={`text-3xl font-extrabold ${card.color} mt-1`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <RiSearchLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ref. no., division, description…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <RiCloseLine size={15} />
                  </button>
                )}
              </div>

              {/* Type tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {(["all", "PR", "PO"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTypeFilter(t); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      typeFilter === t
                        ? "bg-white text-amber-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                ))}
              </div>

              {/* Filter toggle (divisions) */}
              {!isRestricted && divisions.length > 0 && (
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    filterOpen || divisionFilter
                      ? "border-amber-400 text-amber-700 bg-amber-50"
                      : "border-gray-200 text-gray-600 bg-white hover:border-amber-300"
                  }`}
                >
                  <RiFilter3Line size={14} />
                  Filters
                  {divisionFilter && (
                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  )}
                </button>
              )}

              <span className="text-xs text-gray-400 ml-auto">
                {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {/* Expanded division filter */}
            {filterOpen && !isRestricted && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Division:</span>
                <button
                  onClick={() => { setDivisionFilter(""); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    !divisionFilter ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
                  }`}
                >
                  All
                </button>
                {divisions.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDivisionFilter(d); setCurrentPage(1); }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      divisionFilter === d ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Table ──────────────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pagedEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <RiArchiveLine size={52} className="mb-4 opacity-25" />
                <p className="text-sm font-semibold text-gray-500">No archived entries found</p>
                <p className="text-xs mt-1 text-gray-400">
                  {searchQuery || typeFilter !== "all" || divisionFilter
                    ? "Try adjusting your search or filters"
                    : "Cancelled entries will appear here"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <button className="flex items-center gap-1 hover:text-amber-700 transition-colors" onClick={() => toggleSort("refNo")}>
                          Ref. No. <SortIcon field="refNo" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <button className="flex items-center gap-1 hover:text-amber-700 transition-colors" onClick={() => toggleSort("officeSection")}>
                          Division / Office <SortIcon field="officeSection" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <button className="flex items-center gap-1 hover:text-amber-700 transition-colors" onClick={() => toggleSort("createdAt")}>
                          Date <SortIcon field="createdAt" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedEntries.map((entry, idx) => (
                      <tr
                        key={`${entry.type}-${entry.id}`}
                        className={`border-b border-gray-50 hover:bg-amber-50/40 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        {/* Type */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                              entry.type === "PR"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-teal-50 text-teal-700 border-teal-200"
                            }`}
                          >
                            {entry.type === "PR" ? <RiFileListLine size={10} /> : <RiFileTextLine size={10} />}
                            {entry.type}
                          </span>
                        </td>

                        {/* Ref No. */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-gray-800 text-xs">{entry.refNo || "—"}</div>
                          {entry.type === "PO" && entry.parentPrNo && (
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">PR: {entry.parentPrNo}</div>
                          )}
                        </td>

                        {/* Division */}
                        <td className="px-4 py-3 text-gray-600 max-w-[160px]">
                          <div className="truncate text-xs">{entry.officeSection || "—"}</div>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 text-gray-500 max-w-xs hidden md:table-cell">
                          <div className="truncate text-xs">{entry.description || "—"}</div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleDateString("en-PH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            entry.statusId === 42
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                            {entry.status || "Cancelled"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          {entry.type === "PR" && (
                            <button
                              onClick={() => setViewPrId(entry.id)}
                              className="px-2 py-1 text-xs font-semibold rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                            >
                              <RiEyeLine size={12} /> View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ─────────────────────────────────────────────── */}
            {!loading && filteredEntries.length > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredEntries.length)}–{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)}
                  </span>{" "}
                  of <span className="font-semibold text-gray-700">{filteredEntries.length}</span> entries
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-amber-400 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowLeftLine size={14} />
                  </button>
                  {buildPageNums().map((p, i) =>
                    p === "…" ? (
                      <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                          currentPage === p
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-white border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-700"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-amber-400 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RiArrowRightLine size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── View PR Modal ─────────────────────────────────────────────────── */}
      {viewPrId !== null && (
        <ViewPRModal prId={viewPrId} onClose={() => setViewPrId(null)} onEdit={() => {}} />
      )}

      {/* ── YEAR PICKER DIALOG ── */}
      {showYearPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 transform scale-100 transition-transform">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <RiCalendarLine size={20} className="text-emerald-600" />
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
    </AuthGuard>
  );
}
