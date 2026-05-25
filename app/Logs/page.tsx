"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiFileTextLine,
  RiFilter3Line,
  RiSearchLine,
} from "react-icons/ri";
import RemarksTimelineModal from "@/components/RemarksTimelineModal";
import { createClient } from "@/utils/supabase/client";
import {
  fetchDeliveriesByIds,
  fetchPurchaseOrdersByIds,
  fetchPurchaseRequestsByIds,
  fetchRecentRemarks,
  fetchStatuses,
  type LogPhase,
  type RemarkLogRow,
} from "@/utils/supabase/logs";

type PhaseFilter = "all" | "pr" | "po" | "delivery" | "payment" | "completed";

type CurrentUser = {
  id?: number;
  fullname: string;
  username: string;
  role_id: number;
  division_id?: number | null;
  divisions?: { division_name: string };
  roles?: { role_name: string };
};

const FLAG_OPTIONS: { id: number; label: string }[] = [
  { id: 1, label: "No Flag" },
  { id: 2, label: "Complete" },
  { id: 3, label: "Incomplete Info" },
  { id: 4, label: "Wrong Information" },
  { id: 5, label: "Needs Revision" },
  { id: 6, label: "On Hold" },
  { id: 7, label: "Urgent" },
];

function inferPhase(r: Pick<RemarkLogRow, "phase" | "remark" | "pr_id" | "po_id" | "delivery_id">): LogPhase {
  if (r.phase) return r.phase;
  const raw = (r.remark ?? "").toUpperCase();
  const match = raw.match(/\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]/);
  if (match?.[1]) {
    const tag = match[1].toLowerCase();
    if (tag === "pr" || tag === "po" || tag === "delivery" || tag === "payment" || tag === "system") {
      return tag;
    }
  }
  if (r.delivery_id != null) return "delivery";
  if (r.po_id != null && r.pr_id == null) return "po";
  if (r.pr_id != null) return "pr";
  return "system";
}

function phaseChip(phase: LogPhase) {
  if (phase === "pr") return "bg-blue-100 text-blue-700";
  if (phase === "po") return "bg-purple-100 text-purple-700";
  if (phase === "delivery") return "bg-teal-100 text-teal-700";
  if (phase === "payment") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
}

function refLabel(phase: LogPhase) {
  if (phase === "pr") return "PR";
  if (phase === "po") return "PO";
  if (phase === "delivery") return "DEL";
  if (phase === "payment") return "PAY";
  return "SYS";
}

export default function LogsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState<RemarkLogRow[]>([]);
  const [prNoById, setPrNoById] = useState<Record<number, string>>({});
  const [poNoById, setPoNoById] = useState<Record<number, string>>({});
  const [deliveryNoById, setDeliveryNoById] = useState<Record<number, string>>({});

  const [activeTab, setActiveTab] = useState<PhaseFilter>("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [flagFilter, setFlagFilter] = useState<number | "all">("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const CURRENT_YEAR = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [prDivisionById, setPrDivisionById] = useState<Record<number, number | null>>({});
  const [poDivisionById, setPoDivisionById] = useState<Record<number, number | null>>({});
  const [deliveryDivisionById, setDeliveryDivisionById] = useState<Record<number, number | null>>({});
  const [prStatusById, setPrStatusById] = useState<Record<number, number | null>>({});
  const [poStatusById, setPoStatusById] = useState<Record<number, number | null>>({});
  const [deliveryStatusById, setDeliveryStatusById] = useState<Record<number, number | null>>({});
  const [statusNameById, setStatusNameById] = useState<Record<number, string>>({});
  const [allDivisions, setAllDivisions] = useState<{ id: number; name: string }[]>([]);
  const [myLogsOnly, setMyLogsOnly] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<number | "all">("all");

  const [hoveredRemark, setHoveredRemark] = useState<{ text: string; flagLabel: string; actor: string; divisionName: string; dateStr: string; right: number; y: number; showBelow: boolean } | null>(null);

  const [threadOpen, setThreadOpen] = useState(false);
  const [threadTarget, setThreadTarget] = useState<{ poId?: number | null; prId?: number | null; deliveryId?: number | null }>({});
  const [threadTitle, setThreadTitle] = useState<string | undefined>(undefined);
  const [threadSubtitle, setThreadSubtitle] = useState<string | undefined>(undefined);

  const PAGE_SIZE = 12;

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRecentRemarks(750)
      .then(async (rows) => {
        if (cancelled) return;
        setRemarks(rows);

        const prIds = rows.map((r) => r.pr_id).filter((x): x is number => typeof x === "number");
        const poIds = rows.map((r) => r.po_id).filter((x): x is number => typeof x === "number");
        const deliveryIds = rows.map((r) => r.delivery_id).filter((x): x is number => typeof x === "number");

        const supabase = createClient();
        const [prs, pos, dels, statusesData, divsResult] = await Promise.all([
          fetchPurchaseRequestsByIds(prIds),
          fetchPurchaseOrdersByIds(poIds),
          fetchDeliveriesByIds(deliveryIds),
          fetchStatuses(),
          supabase.from("divisions").select("division_id, division_name"),
        ]);
        if (cancelled) return;

        const prMap: Record<number, string> = {};
        const prDivMap: Record<number, number | null> = {};
        const prStMap: Record<number, number | null> = {};
        prs.forEach((p) => {
          prMap[p.id] = p.pr_no;
          prDivMap[p.id] = p.division_id ?? null;
          prStMap[p.id] = p.status_id ?? null;
        });
        setPrNoById(prMap);
        setPrDivisionById(prDivMap);
        setPrStatusById(prStMap);

        const poMap: Record<number, string> = {};
        const poDivMap: Record<number, number | null> = {};
        const poStMap: Record<number, number | null> = {};
        pos.forEach((p) => {
          if (p.po_no) poMap[p.id] = p.po_no;
          poDivMap[p.id] = p.division_id ?? null;
          poStMap[p.id] = p.status_id ?? null;
        });
        setPoNoById(poMap);
        setPoDivisionById(poDivMap);
        setPoStatusById(poStMap);

        const dMap: Record<number, string> = {};
        const dDivMap: Record<number, number | null> = {};
        const dStMap: Record<number, number | null> = {};
        dels.forEach((d) => {
          dMap[d.id] = d.delivery_no;
          dDivMap[d.id] = d.division_id ?? null;
          dStMap[d.id] = d.status_id ?? null;
        });
        setDeliveryNoById(dMap);
        setDeliveryDivisionById(dDivMap);
        setDeliveryStatusById(dStMap);

        const stMap: Record<number, string> = {};
        statusesData.forEach((s) => { stMap[s.id] = s.status_name; });
        setStatusNameById(stMap);

        const divsData = (divsResult.data ?? []) as { division_id: number; division_name: string | null }[];
        setAllDivisions(divsData.map((d) => ({
          id: d.division_id,
          name: d.division_name ?? `Division ${d.division_id}`,
        })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    const isRoleRestricted = currentUser != null && (
      currentUser.role_id === 6 ||
      (currentUser.roles?.role_name?.toLowerCase().includes("division head") ?? false)
    );
    const currentUserDivisionId = currentUser?.division_id ?? null;

    const rows = remarks.map((r) => {
      const phase = inferPhase(r);
      const prNo = r.pr_id != null ? prNoById[r.pr_id] : undefined;
      const poNo = r.po_id != null ? poNoById[r.po_id] : undefined;
      const deliveryNo = r.delivery_id != null ? deliveryNoById[r.delivery_id] : undefined;
      const ref =
        deliveryNo ??
        poNo ??
        prNo ??
        (r.delivery_id != null ? `Delivery #${r.delivery_id}` : r.po_id != null ? `PO #${r.po_id}` : r.pr_id != null ? `PR #${r.pr_id}` : `Remark #${r.id}`);

      const divisionId =
        r.delivery_id != null ? (deliveryDivisionById[r.delivery_id] ?? null) :
        r.po_id != null ? (poDivisionById[r.po_id] ?? null) :
        r.pr_id != null ? (prDivisionById[r.pr_id] ?? null) :
        null;

      const statusId =
        r.delivery_id != null ? (deliveryStatusById[r.delivery_id] ?? null) :
        r.po_id != null ? (poStatusById[r.po_id] ?? null) :
        r.pr_id != null ? (prStatusById[r.pr_id] ?? null) :
        null;

      return {
        ...r,
        phase,
        prNo,
        poNo,
        deliveryNo,
        ref,
        actor: r.fullname ?? r.username ?? "Unknown",
        divisionId,
        statusId,
        statusName: statusId != null ? (statusNameById[statusId] ?? undefined) : undefined,
      };
    });

    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      const matchTab =
        activeTab === "all"
          ? true
          : activeTab === "completed"
            ? r.status_flag_id === 2
            : r.phase === activeTab;

      const matchFlag = flagFilter === "all" ? true : r.status_flag_id === flagFilter;

      const matchSearch =
        q.length === 0
          ? true
          : (r.remark ?? "").toLowerCase().includes(q) ||
            (r.ref ?? "").toLowerCase().includes(q) ||
            (r.actor ?? "").toLowerCase().includes(q) ||
            (r.prNo ?? "").toLowerCase().includes(q) ||
            (r.poNo ?? "").toLowerCase().includes(q) ||
            (r.deliveryNo ?? "").toLowerCase().includes(q);

      const matchYear = new Date(r.created_at).getFullYear() === selectedYear;
      const matchDivisionGate = !isRoleRestricted || !currentUserDivisionId || r.divisionId === currentUserDivisionId;
      const matchMyLogs = !myLogsOnly || (currentUser != null && r.user_id === currentUser.id);
      const matchDivision = divisionFilter === "all" || r.divisionId === divisionFilter;
      const matchStatus = statusFilter === "all" || r.statusId === statusFilter;

      return matchTab && matchFlag && matchSearch && matchYear && matchDivisionGate && matchMyLogs && matchDivision && matchStatus;
    });

    filtered.sort((a, b) => {
      const av = new Date(a.created_at).getTime();
      const bv = new Date(b.created_at).getTime();
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return filtered;
  }, [remarks, prNoById, poNoById, deliveryNoById,
      prDivisionById, poDivisionById, deliveryDivisionById,
      prStatusById, poStatusById, deliveryStatusById,
      statusNameById, currentUser,
      activeTab, search, flagFilter, sortDir, selectedYear,
      myLogsOnly, divisionFilter, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<PhaseFilter, number> = {
      all: enriched.length,
      pr: 0,
      po: 0,
      delivery: 0,
      payment: 0,
      completed: 0,
    };
    const isRoleRestricted = currentUser != null && (
      currentUser.role_id === 6 ||
      (currentUser.roles?.role_name?.toLowerCase().includes("division head") ?? false)
    );
    const currentUserDivisionId = currentUser?.division_id ?? null;
    const yearRemarks = remarks.filter((r) => {
      const matchYear = new Date(r.created_at).getFullYear() === selectedYear;
      const divisionId =
        r.delivery_id != null ? (deliveryDivisionById[r.delivery_id] ?? null) :
        r.po_id != null ? (poDivisionById[r.po_id] ?? null) :
        r.pr_id != null ? (prDivisionById[r.pr_id] ?? null) :
        null;
      const matchDivisionGate = !isRoleRestricted || !currentUserDivisionId || divisionId === currentUserDivisionId;
      return matchYear && matchDivisionGate;
    });
    yearRemarks.forEach((r) => {
      const phase = inferPhase(r);
      if (phase === "pr") c.pr += 1;
      else if (phase === "po") c.po += 1;
      else if (phase === "delivery") c.delivery += 1;
      else if (phase === "payment") c.payment += 1;
      if (r.status_flag_id === 2) c.completed += 1;
    });
    c.all = yearRemarks.length;
    return c;
  }, [remarks, enriched.length, selectedYear, currentUser,
      prDivisionById, poDivisionById, deliveryDivisionById]);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 5; y--) years.push(y);
    return years;
  }, [CURRENT_YEAR]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, flagFilter, sortDir, selectedYear, myLogsOnly, divisionFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(enriched.length / PAGE_SIZE));
  const pageRows = enriched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortIcon = () => (
    <span className="inline-flex ml-1">
      {sortDir === "desc" ? <RiArrowDownLine size={12} /> : <RiArrowUpLine size={12} />}
    </span>
  );

  const openThread = (r: (typeof pageRows)[number]) => {
    const target = r.po_id != null ? { poId: r.po_id } : r.delivery_id != null ? { deliveryId: r.delivery_id } : r.pr_id != null ? { prId: r.pr_id } : {};
    setThreadTarget(target);
    setThreadTitle(`${refLabel(r.phase)} Remarks`);
    setThreadSubtitle(r.ref ? `Reference: ${r.ref}` : undefined);
    setThreadOpen(true);
  };

  const isRoleRestricted = currentUser != null && (
    currentUser.role_id === 6 ||
    (currentUser.roles?.role_name?.toLowerCase().includes("division head") ?? false)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 space-y-4 md:p-10 md:space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
            <p className="text-gray-500">Loading procurement logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">
              Procurement Portal
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 leading-tight">
              <RiFileTextLine className="text-emerald-700" />
              Procurement Logs
            </h1>
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
            <span className="font-semibold text-gray-700 text-sm">FY {selectedYear}</span>
            <RiArrowDownLine size={13} className="text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1 w-full sm:w-fit flex-wrap overflow-x-auto">
          {([
            { key: "all", label: "All" },
            { key: "pr", label: "PR" },
            { key: "po", label: "PO" },
            { key: "delivery", label: "Delivery" },
            { key: "payment", label: "Payment" },
            { key: "completed", label: "Completed" },
          ] as { key: PhaseFilter; label: string }[]).map((t) => {
            const on = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  on ? "bg-emerald-700 text-white" : "text-gray-600 hover:bg-emerald-50"
                }`}
              >
                {t.label}
                <span className={`ml-2 text-xs ${on ? "text-emerald-100" : "text-gray-400"}`}>
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="font-bold text-gray-800">Log Entries</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reference, user, remark..."
                  className="pl-10 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                  filtersOpen
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-emerald-50"
                }`}
              >
                <RiFilter3Line />
                Filters
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-end gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Flag
                  </label>
                  <select
                    value={flagFilter}
                    onChange={(e) =>
                      setFlagFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                    }
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white"
                  >
                    <option value="all">All</option>
                    {FLAG_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Sort
                  </label>
                  <button
                    onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white font-semibold flex items-center gap-1.5 hover:bg-gray-50"
                  >
                    Date <SortIcon />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">My Logs</label>
                  <button
                    onClick={() => setMyLogsOnly((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      myLogsOnly
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {myLogsOnly ? "On" : "Off"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Division</label>
                  <select
                    value={divisionFilter}
                    onChange={(e) => setDivisionFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white"
                  >
                    <option value="all">All Divisions</option>
                    {allDivisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white"
                  >
                    <option value="all">All Statuses</option>
                    {Object.entries(statusNameById).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setFlagFilter("all");
                    setSortDir("desc");
                    setSearch("");
                    setMyLogsOnly(false);
                    setDivisionFilter("all");
                    setStatusFilter("all");
                  }}
                  className="ml-auto px-4 py-1.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 p-4 lg:hidden">
            {pageRows.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                No log entries found.
              </div>
            ) : (
              pageRows.map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.ref}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${phaseChip(r.phase)}`}>
                      {r.phase.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white border border-gray-100 p-2.5">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">User</p>
                      <p className="mt-1 font-semibold text-gray-800">{r.actor}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-100 p-2.5">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Flag</p>
                      <p className="mt-1 font-semibold text-gray-800">
                        {r.status_flag_id ? (FLAG_OPTIONS.find((f) => f.id === r.status_flag_id)?.label ?? `Flag ${r.status_flag_id}`) : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-100 p-2.5">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Status</p>
                      <p className="mt-1 font-semibold text-gray-800">{r.statusName ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-100 p-2.5">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Reference</p>
                      <p className="mt-1 font-semibold text-gray-800 break-words">{r.ref}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-white border border-gray-100 p-3 text-sm text-gray-700">
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 mb-1">Remark</p>
                    <p className="leading-relaxed">
                      {(r.remark ?? "").replace(/\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]\s*/i, "") || "—"}
                    </p>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => openThread(r)}
                      className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-2"
                    >
                      <RiEyeLine />
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="text-left px-2 py-2 font-semibold">Date</th>
                  <th className="text-left px-2 py-2 font-semibold">Phase</th>
                  <th className="text-left px-2 py-2 font-semibold">Reference</th>
                  <th className="text-left px-2 py-2 font-semibold">User</th>
                  <th className="text-left px-2 py-2 font-semibold">Flag</th>
                  <th className="text-left px-2 py-2 font-semibold">Status</th>
                  <th className="text-left px-2 py-2 font-semibold">Remark</th>
                  <th className="text-center px-2 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-gray-400">
                      No log entries found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, rowIndex) => (
                    <tr key={r.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-2 py-2 text-gray-600 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${phaseChip(r.phase)}`}>
                          {r.phase.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-semibold text-gray-800 whitespace-nowrap">
                        {r.ref}
                      </td>
                      <td className="px-2 py-2 text-gray-700 whitespace-nowrap">
                        {r.actor}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.status_flag_id ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {FLAG_OPTIONS.find((f) => f.id === r.status_flag_id)?.label ?? `Flag ${r.status_flag_id}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.statusName ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                            {r.statusName}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td
                        className="px-2 py-2 text-gray-700 max-w-md cursor-default"
                        onMouseEnter={(e) => {
                          const clean = (r.remark ?? "").replace(/\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]\s*/i, "") || "—";
                          const rect = e.currentTarget.getBoundingClientRect();
                          // Force the first 2 rows to always show tooltip below so it doesn't get clipped at the top
                          const showBelow = rowIndex < 2 || rect.top < window.innerHeight * 0.4;
                          const flagLabel = r.status_flag_id ? (FLAG_OPTIONS.find((f) => f.id === r.status_flag_id)?.label ?? `Flag ${r.status_flag_id}`) : "—";
                          const divName = r.divisionId != null ? (allDivisions.find((d) => d.id === r.divisionId)?.name ?? "") : "";
                          const dateStr = new Date(r.created_at).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                          setHoveredRemark({
                            text: clean,
                            flagLabel,
                            actor: r.actor,
                            divisionName: divName,
                            dateStr,
                            right: window.innerWidth - rect.right,
                            y: showBelow ? rect.bottom : rect.top,
                            showBelow,
                          });
                        }}
                        onMouseLeave={() => setHoveredRemark(null)}
                      >
                        <p className="line-clamp-2">
                          {(r.remark ?? "").replace(/\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]\s*/i, "") || "—"}
                        </p>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => openThread(r)}
                          className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-2"
                        >
                          <RiEyeLine />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {enriched.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              </span>
              {"–"}
              <span className="font-semibold text-gray-700">
                {Math.min(page * PAGE_SIZE, enriched.length)}
              </span>{" "}
              of <span className="font-semibold text-gray-700">{enriched.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">
                Page <span className="font-semibold text-gray-700">{page}</span> /{" "}
                <span className="font-semibold text-gray-700">{totalPages}</span>
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <RemarksTimelineModal
        visible={threadOpen}
        target={threadTarget}
        title={threadTitle}
        subtitle={threadSubtitle}
        onClose={() => setThreadOpen(false)}
      />

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
                  }}
                  className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${
                    selectedYear === year ? "bg-emerald-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`font-semibold ${
                    selectedYear === year ? "text-emerald-700" : "text-gray-700"
                  }`}>
                    FY {year}
                  </span>
                  {selectedYear === year && <RiCheckLine size={18} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {hoveredRemark && (
        <div
          className="fixed z-[9999] w-60 bg-gray-900 text-white rounded-xl shadow-2xl px-3 py-2.5 pointer-events-none"
          style={{
            right: hoveredRemark.right,
            top: hoveredRemark.y,
            transform: hoveredRemark.showBelow ? "translateY(10px)" : "translateY(calc(-100% - 10px))",
          }}
        >
          <p className="text-[11px] whitespace-nowrap"><span className="text-gray-400">Status Flag:</span> <span className="font-semibold">{hoveredRemark.flagLabel}</span></p>
          <p className="text-[11px] mt-1 text-gray-200 break-words whitespace-normal"><span className="text-gray-400">Remark:</span> {hoveredRemark.text}</p>
          <div className="mt-2 pt-1.5 border-t border-gray-700 space-y-0.5">
            <p className="text-[10px] text-gray-300"><span className="text-gray-500">By:</span> {hoveredRemark.actor}</p>
            {hoveredRemark.divisionName && <p className="text-[10px] text-gray-300"><span className="text-gray-500">Division:</span> {hoveredRemark.divisionName}</p>}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">{hoveredRemark.dateStr}</p>
          {hoveredRemark.showBelow ? (
            <div className="absolute bottom-full right-4 border-[5px] border-transparent border-b-gray-900" />
          ) : (
            <div className="absolute top-full right-4 border-[5px] border-transparent border-t-gray-900" />
          )}
        </div>
      )}
    </div>
    </AuthGuard>
  );
}

