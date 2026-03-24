"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiEyeLine, RiMessage2Line, RiShareForwardLine } from "react-icons/ri";

export default function DashboardPage() {
  const supabase = createClient();
  type PRItem = { description: string; total_cost: number };
  type PRListRow = {
    pr_id: number;
    entity_name: string;
    pr_num: string;
    office_section: string;
    status_id: number | null;
    pr_item?: PRItem[];
  };

  type CurrentUser = {
    fullname: string;
    username: string;
    role_id: number;
    divisions?: { division_name: string };
    roles?: { role_name: string };
  };

  type PRStatus = {
    id: number;
    status_name: string;
  };

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prStatuses, setPRStatuses] = useState<PRStatus[]>([]);
  const [list, setList] = useState<PRListRow[]>([]);

  // Fetch logged-in user from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.role_id === 1);
    }
  }, []);

  // Fetch PR Statuses from pr_status table
  useEffect(() => {
    const fetchPRStatuses = async () => {
      const { data, error } = await supabase
        .from("pr_status")
        .select("id, status_name");

      if (error) {
        console.error("Error fetching PR statuses:", error);
      } else {
        setPRStatuses((data || []) as PRStatus[]);
      }
    };
    fetchPRStatuses();
  }, [supabase]);

  // Fetch PR Data
  useEffect(() => {
    const fetchPRData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("pr_form")
          .select(`
            pr_id,
            entity_name,
            pr_num,
            office_section,
            status_id,
            pr_item (
              *
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching data:", error);
        } else {
          // Filter PRs to show only those matching user's division
          const filteredData = (data || []).filter((pr) => {
            // Admins can see all PRs
            if (isAdmin) return true;
            // Regular users see only PRs matching their division
            return pr.office_section === currentUser?.divisions?.division_name;
          });
          setList(filteredData as PRListRow[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPRData();
  }, [supabase, isAdmin, currentUser]);

  const handleAction = (action: string, prId: number) => {
    console.log(`${action} PR #${prId}`);
    // Implement actual logic for View, Remarks, Forward here
  };

  return (
    <div className="p-8 w-full space-y-6 text-black">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track your purchase requests.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 border-l-4 border-l-emerald-500">
          <p className="text-sm text-gray-500 font-medium">Total Requests</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{list.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 border-l-4 border-l-yellow-400">
          <p className="text-sm text-gray-500 font-medium">Pending</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {list.filter(item => prStatuses.find(s => s.id === item.status_id)?.status_name.toLowerCase().includes('pending')).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 border-l-4 border-l-emerald-400">
          <p className="text-sm text-gray-500 font-medium">Approved</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {list.filter(item => prStatuses.find(s => s.id === item.status_id)?.status_name.toLowerCase().includes('approve')).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 border-l-4 border-l-red-400">
          <p className="text-sm text-gray-500 font-medium">Rejected</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {list.filter(item => prStatuses.find(s => s.id === item.status_id)?.status_name.toLowerCase().includes('reject')).length}
          </p>
        </div>
      </div>

      {/* PR Table */}
      <div className="bg-white shadow-md rounded-lg border border-emerald-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/30 flex justify-between items-center">
          <h2 className="font-semibold text-emerald-800 tracking-wide">Recent Purchase Requests</h2>
        </div>
        
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No purchase requests found for your division.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse bg-white">
              <thead className="bg-emerald-700 text-white">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold tracking-wide">PR Number</th>
                  <th className="p-3 text-left text-sm font-semibold tracking-wide">Office / Section</th>
                  <th className="p-3 text-left text-sm font-semibold tracking-wide">Status</th>
                  <th className="p-3 text-left text-sm font-semibold tracking-wide">Total Cost</th>
                  <th className="p-3 text-center text-sm font-semibold tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((form, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-emerald-50 transition-colors">
                    <td className="p-3 text-sm font-medium text-gray-800 bg-white">
                      {form.pr_num}
                    </td>
                    <td className="p-3 text-sm font-medium text-emerald-700 bg-emerald-50/30">
                      {form.office_section || "N/A"}
                    </td>
                    <td className="p-3 bg-white">
                      {(() => {
                        const status = prStatuses.find((s) => s.id === form.status_id);
                        const name = status?.status_name || "N/A";
                        const key = name.toLowerCase();
                        let cls = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ";
                        if (key.includes("pending")) {
                          cls += "bg-yellow-100 text-yellow-800 border-yellow-200";
                        } else if (key.includes("approve")) {
                          cls += "bg-emerald-100 text-emerald-800 border-emerald-200";
                        } else if (key.includes("reject")) {
                          cls += "bg-red-100 text-red-800 border-red-200";
                        } else {
                          cls += "bg-gray-100 text-gray-800 border-gray-200";
                        }
                        return <span className={cls}>{name}</span>;
                      })()}
                    </td>
                    <td className="p-3 font-semibold text-emerald-700 bg-emerald-50/30">
                      {form.pr_item && form.pr_item.length > 0
                        ? `₱${form.pr_item.reduce((sum, item) => sum + Number(item.total_cost || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "N/A"}
                    </td>
                    <td className="p-3 bg-white">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleAction('View', form.pr_id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View"
                        >
                          <RiEyeLine size={18} />
                        </button>
                        <button
                          onClick={() => handleAction('Remarks', form.pr_id)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Remarks"
                        >
                          <RiMessage2Line size={18} />
                        </button>
                        <button
                          onClick={() => handleAction('Forward', form.pr_id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Forward"
                        >
                          <RiShareForwardLine size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}