"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiEyeLine,
  RiFileTextLine,
  RiFilter3Line,
  RiSearchLine,
} from "react-icons/ri";
import RemarksTimelineModal from "@/components/RemarksTimelineModal";
import {
  fetchDeliveriesByIds,
  fetchPurchaseOrdersByIds,
  fetchPurchaseRequestsByIds,
  fetchRecentRemarks,
  type LogPhase,
  type RemarkLogRow,
} from "@/utils/supabase/logs";

type PhaseFilter = "all" | "pr" | "po" | "delivery" | "payment" | "completed";

type CurrentUser = {
  fullname: string;
  username: string;
  role_id: number;
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

        const [prs, pos, dels] = await Promise.all([
          fetchPurchaseRequestsByIds(prIds),
          fetchPurchaseOrdersByIds(poIds),
          fetchDeliveriesByIds(deliveryIds),
        ]);
        if (cancelled) return;

        const prMap: Record<number, string> = {};
        prs.forEach((p) => {
          prMap[p.id] = p.pr_no;
        });
        setPrNoById(prMap);

        const poMap: Record<number, string> = {};
        pos.forEach((p) => {
          if (p.po_no) poMap[p.id] = p.po_no;
        });
        setPoNoById(poMap);

        const dMap: Record<number, string> = {};
        dels.forEach((d) => {
          dMap[d.id] = d.delivery_no;
        });
        setDeliveryNoById(dMap);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
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
      return {
        ...r,
        phase,
        prNo,
        poNo,
        deliveryNo,
        ref,
        actor: r.fullname ?? r.username ?? "Unknown",
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

      return matchTab && matchFlag && matchSearch;
    });

    filtered.sort((a, b) => {
      const av = new Date(a.created_at).getTime();
      const bv = new Date(b.created_at).getTime();
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return filtered;
  }, [remarks, prNoById, poNoById, deliveryNoById, activeTab, search, flagFilter, sortDir]);

  const counts = useMemo(() => {
    const c: Record<PhaseFilter, number> = {
      all: enriched.length,
      pr: 0,
      po: 0,
      delivery: 0,
      payment: 0,
      completed: 0,
    };
    remarks.forEach((r) => {
      const phase = inferPhase(r);
      if (phase === "pr") c.pr += 1;
      else if (phase === "po") c.po += 1;
      else if (phase === "delivery") c.delivery += 1;
      else if (phase === "payment") c.payment += 1;
      if (r.status_flag_id === 2) c.completed += 1;
    });
    c.all = remarks.length;
    return c;
  }, [remarks, enriched.length]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, flagFilter, sortDir]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <div className="w-full p-6 md:p-10 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-gray-500">Loading procurement logs...</p>
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
      `}</style>

      <div className="w-full p-6 md:p-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">
              Procurement Portal
            </p>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit flex-wrap">
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
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
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
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-gray-800">Log Entries</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reference, user, remark..."
                  className="pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-colors ${
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
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Flag
                  </label>
                  <select
                    value={flagFilter}
                    onChange={(e) =>
                      setFlagFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                    }
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
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
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-semibold flex items-center gap-1.5 hover:bg-gray-50"
                  >
                    Date <SortIcon />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setFlagFilter("all");
                    setSortDir("desc");
                    setSearch("");
                  }}
                  className="ml-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                  <th className="text-left px-5 py-3 font-semibold">Phase</th>
                  <th className="text-left px-5 py-3 font-semibold">Reference</th>
                  <th className="text-left px-5 py-3 font-semibold">User</th>
                  <th className="text-left px-5 py-3 font-semibold">Flag</th>
                  <th className="text-left px-5 py-3 font-semibold">Remark</th>
                  <th className="text-center px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                      No log entries found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${phaseChip(r.phase)}`}>
                          {r.phase.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">
                        {r.ref}
                      </td>
                      <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                        {r.actor}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {r.status_flag_id ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {FLAG_OPTIONS.find((f) => f.id === r.status_flag_id)?.label ?? `Flag ${r.status_flag_id}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-700 max-w-md">
                        <p className="line-clamp-2">
                          {(r.remark ?? "").replace(/\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]\s*/i, "") || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
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

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
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
    </div>
  );
}

