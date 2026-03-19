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
  type PRItem = { description: string; total_cost: number } //pr_item table
  type PRListRow = { entity_name: string; pr_num: string; pr_item?: PRItem[] } //pr_form table with pr_item relation

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
            pr_item (
              *
              )
          `)

        if (error) {
          console.error("Error fetching data:", error);
        } else {
          setList((data || []) as PRListRow[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPRData();
  }, [supabase]);

  return (

    <div className="p-8 max-w-4xl mx-auto space-y-6 text-black">
      
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
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">

            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Entity Name</th>
                <th className="border p-2 text-left">PR Number</th>
                <th className="border p-2 text-left">Items / Descriptions</th>
                <th className="border p-2 text-left">Total Cost</th>
              </tr>
            </thead>

            <tbody>
              {list.map((form, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="border p-2 font-medium">{form.entity_name}</td>
                  <td className="border p-2">{form.pr_num}</td>
                  <td className="border p-2 text-sm text-gray-600">
                    {form.pr_item && form.pr_item.length > 0
                      ? form.pr_item.map((item: any) => item.description).join(", ") : "No items"}
                  </td>
                  <td className="border p-2 font-medium">
                    {form.pr_item && form.pr_item.length > 0
                      ? form.pr_item.map((item: any) => item.total_cost).join(", ") : "N/A"}
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