"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import SignoutModal from "@/components/SignOutModal";
import PRModalComponent from "@/components/PRModalComponent";

export default function ProcurementPage() {

  const handlePRSaved = () => {
    console.log("PR was saved!");
  };

  const supabase = createClient();
  type PRItem = { description: string; total_cost: number };
  type PRListRow = {
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
  }

  type PRStatus = {
    id: number;
    status_name: string;
  }

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signoutModalOpen, setSignoutModalOpen] = useState(false);
  const [prStatuses, setPRStatuses] = useState<PRStatus[]>([]);
  const [list, setList] = useState<PRListRow[]>([]);

  // Fetch logged-in user from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
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
            entity_name,
            pr_num,
            office_section,
            status_id,
            pr_item (
              *
            )
          `)

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

  return (

    <div className="p-8 w-full space-y-6 text-black">
      
      {/* Logged-in User Credentials Display */}
      {currentUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900">Logged in as:</p>
          <p className="text-lg font-bold text-blue-800">{currentUser.fullname}</p>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <span className="font-semibold">User ID:</span> {currentUser.username}
            </div>
            <div>
              <span className="font-semibold">Division:</span> {currentUser.divisions?.division_name || "N/A"}
            </div>
            <div>
              <span className="font-semibold">Role:</span> {currentUser.roles?.role_name || "N/A"}
            </div>
          </div>
        </div>
      )}

      {/* Role-Based Admin Button */}
      {currentUser && (
        <div className="mb-6">
          <button
            disabled={!isAdmin}
            className={`px-6 py-3 rounded font-bold transition-colors ${
              isAdmin
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-gray-400 text-gray-600 cursor-not-allowed"
            }`}
          >
            {isAdmin ? "Admin Panel" : "Admin Only (Disabled)"}
          </button>
        </div>
      )}

      <div className="mb-6">
        <PRModalComponent onSave={handlePRSaved} />
      </div>

      <button
        onClick={() => setSignoutModalOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">
        Sign Out
      </button>

      <h2 className="text-xl font-bold mb-4">Purchase Request Overview</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="space-y-4 w-full">
            {/* Loading Skeleton */}
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-300 rounded-lg animate-pulse"></div>
              ))}
            </div>
            <p className="text-center text-gray-600 mt-4">Loading purchase requests...</p>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No purchase requests found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
          <table className="min-w-full border-collapse bg-white">

            <thead className="bg-emerald-700 text-white">
              <tr>
                <th className="p-3 text-center text-sm font-semibold tracking-wide">Entity Name</th>
                <th className="p-3 text-center text-sm font-semibold tracking-wide">PR Number</th>
                <th className="p-3 text-center text-sm font-semibold tracking-wide">Office / Section</th>
                <th className="p-3 text-center text-sm font-semibold tracking-wide">Status</th>
                <th className="p-3 text-left text-sm font-semibold tracking-wide">Items / Descriptions</th>
                <th className="p-3 text-left text-sm font-semibold tracking-wide">Total Cost</th>
              </tr>
            </thead>

            <tbody>
              {list.map((form, index) => (
                <tr key={index} className="border-2 border-gray-200 transition-colors hover:bg-emerald-50">
                  <td className="p-3 font-medium text-center text-sm text-gray-800">
                    {form.entity_name}
                  </td>
                  <td className="p-3 text-center text-sm font-bold text-gray-700">
                    {form.pr_num}
                  </td>
                  <td className="p-3 text-center text-sm font-medium text-emerald-700">
                    {form.office_section || "N/A"}
                  </td>
                  <td className="p-3 flex items-center justify-center">
                    {(() => {
                      const status = prStatuses.find((s) => s.id === form.status_id);
                      const name = status?.status_name || "N/A";
                      const key = name.toLowerCase();
                      let cls =
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ";
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
                  <td className="p-3 text-sm text-gray-600">
                    {form.pr_item && form.pr_item.length > 0
                      ? form.pr_item.map((item: any) => item.description).join(", ") : "No items"}
                  </td>
                  <td className="p-3 font-semibold text-emerald-700">
                    {form.pr_item && form.pr_item.length > 0
                      ? form.pr_item.map((item: any) => `₱${Number(item.total_cost).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`).join(", ") : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

      {/* Signout Modal */}
      <SignoutModal 
        open={signoutModalOpen}
        onClose={() => setSignoutModalOpen(false)}
      />

    </div>

  );

}