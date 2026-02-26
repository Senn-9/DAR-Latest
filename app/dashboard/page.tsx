"use client";

import { useState, useEffect } from "react";
import {
  RiFileList3Line, RiTimeLine, RiCheckboxCircleLine, RiCloseCircleLine,
  RiArrowUpLine, RiArrowDownLine, RiEyeLine, RiInboxLine
} from "react-icons/ri";

// ── Types ──────────────────────────────────────────────────────────
type StatCard = {
  label: string;
  value: number;
  change: string;
  up: boolean;
  icon: React.ReactNode;
  light: string;
  text: string;
};

type PendingItem = {
  id: string;
  item: string;
  office: string;
  date: string;
  days: number;
  status: string;
};

type ActivityItem = {
  id: string;
  action: string;
  item: string;
  by: string;
  time: string;
  color: string;
};

type StatusRow = {
  label: string;
  pending: number;
  approved: number;
  cancelled: number;
};

// ── Helpers ────────────────────────────────────────────────────────
function daysBadge(days: number) {
  if (days <= 1) return "bg-green-100 text-green-700";
  if (days <= 3) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-600";
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
      <RiInboxLine size={32} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [tab, setTab] = useState<"pending" | "activity">("pending");

  // Replace these with your Supabase fetches
  const [statCards, setStatCards] = useState<StatCard[]>([
    { label: "Total Requests", value: 0, change: "0%", up: true, icon: <RiFileList3Line size={20} />, light: "bg-emerald-50", text: "text-emerald-700" },
    { label: "Pending",        value: 0, change: "0%", up: true, icon: <RiTimeLine size={20} />,        light: "bg-yellow-50",  text: "text-yellow-600" },
    { label: "Approved",       value: 0, change: "0%", up: true, icon: <RiCheckboxCircleLine size={20} />, light: "bg-blue-50", text: "text-blue-600" },
    { label: "Cancelled",      value: 0, change: "0%", up: false, icon: <RiCloseCircleLine size={20} />, light: "bg-red-50",   text: "text-red-500" },
  ]);

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with your Supabase queries, e.g.:
    // const { data } = await supabase.from("purchase_requests").select("*");
    // setPendingItems(data ?? []);
    setLoading(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="hover:bg-slate-100 cursor-pointer bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col gap-2 md:gap-3">
            <div className="flex items-center justify-between">
              <div className={`${card.light} ${card.text} p-2 md:p-2.5 rounded-lg md:rounded-xl`}>
                {card.icon}
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? "text-emerald-600" : "text-red-500"}`}>
                {card.up ? <RiArrowUpLine size={12} /> : <RiArrowDownLine size={12} />}
                {card.change}
              </span>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
        <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-3 md:mb-4">Status Breakdown</h2>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-medium rounded-l-lg">Stage</th>
                <th className="px-4 py-2.5 text-center font-medium">Pending</th>
                <th className="px-4 py-2.5 text-center font-medium">Approved</th>
                <th className="px-4 py-2.5 text-center font-medium rounded-r-lg">Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {statusBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No data available.
                  </td>
                </tr>
              ) : (
                statusBreakdown.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-100 cursor-pointer border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-700 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">{row.pending}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{row.approved}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">{row.cancelled}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-2 md:hidden">
          {statusBreakdown.length === 0 ? (
            <EmptyState label="No data available." />
          ) : (
            statusBreakdown.map((row, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">{row.label}</p>
                <div className="flex gap-2">
                  <span className="flex-1 text-center bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1.5 rounded-lg">
                    <span className="block text-base font-bold">{row.pending}</span>
                    Pending
                  </span>
                  <span className="flex-1 text-center bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1.5 rounded-lg">
                    <span className="block text-base font-bold">{row.approved}</span>
                    Approved
                  </span>
                  <span className="flex-1 text-center bg-red-100 text-red-600 text-xs font-semibold px-2 py-1.5 rounded-lg">
                    <span className="block text-base font-bold">{row.cancelled}</span>
                    Cancelled
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending + Activity tabs */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
        <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setTab("pending")}
              className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors
                ${tab === "pending" ? "bg-white shadow-sm text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              Pending ({pendingItems.length})
            </button>
            <button
              onClick={() => setTab("activity")}
              className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors
                ${tab === "activity" ? "bg-white shadow-sm text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              Recent Activity
            </button>
          </div>
        </div>

        {/* Pending Tab */}
        {tab === "pending" && (
          <div className="flex flex-col gap-2">
            {loading ? (
              <EmptyState label="Loading..." />
            ) : pendingItems.length === 0 ? (
              <EmptyState label="No pending items." />
            ) : (
              pendingItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-gray-400 font-mono">{item.id}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{item.item}</span>
                    <span className="text-xs text-gray-400">{item.office} · {item.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${daysBadge(item.days)}`}>
                      {item.days}d
                    </span>
                    <span className="hidden sm:inline text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                      {item.status}
                    </span>
                    <button className="text-gray-400 hover:text-emerald-700 p-1">
                      <RiEyeLine size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <div className="flex flex-col gap-2">
            {loading ? (
              <EmptyState label="Loading..." />
            ) : recentActivity.length === 0 ? (
              <EmptyState label="No recent activity." />
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${act.color}`}>
                      {act.action}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{act.item}</p>
                      <p className="text-xs text-gray-400 truncate">
                        <span className="hidden sm:inline">{act.id} · </span>by {act.by}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{act.time}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}