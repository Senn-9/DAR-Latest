"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [prRequests, setPRRequests] = useState<any[]>([]);
  const [prItems, setPRItems] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          username,
          email,
          created_at,
          divisions (
            division_name
          )
        `);

      if (error) {
        console.error(error);
      } else {
        setUsers(data || []);
      }
    };

    const fetchPRItems = async () => {
      const { data, error } = await supabase
        .from("purchase_request_items")
        .select(`
          id,
          description,
          purchase_requests (pr_no, office_section, resp_code)
        `);
      
      if (error) {
        console.error(error);
      } else {
        setPRItems(data || []); // ✅ now works
      }
    }

    const fetchPRRequests = async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(`
          id,
          pr_no,
          office_section,
          resp_code
        `);

      if (error) {
        console.error(error);
      } else {
        setPRRequests(data || []); // ✅ now works
      }
    };

    fetchUsers();
    fetchPRItems();
    fetchPRRequests(); // ✅ call the function
  }, []);

  return (
    <div className="text-black">
      <h1 className="text-xl font-bold mb-2">Users</h1>

      {users.map((user) => (
        <div key={user.id}>
          <p>Username: {user.username}</p>
          <p>Email: {user.email}</p>
          <p>Division: {user.divisions?.division_name}</p>
          <p>Created At: {user.created_at}</p>

          <div className="flex items-center">
            -------------------------------------------------------------------
          </div>
        </div>

      ))}

      <h1 className="text-xl font-bold mb-2">PR Items</h1>

      {prItems.map((item) => (
        <div key={item.id}>
          <p>ID: {item.id}</p>
          <p>PR No: {item.purchase_requests?.pr_no}</p>
          <p>Office Section: {item.purchase_requests?.office_section}</p>
          <p>Resp Code: {item.purchase_requests?.resp_code}</p>
          <p>Description: {item.description}</p>
        </div>
      ))}

      <h1 className="text-xl font-bold mb-2">PR Requests</h1>

      {prRequests.map((pr) => (
        <div key={pr.id}>
          <p>PR No: {pr.pr_no}</p>
          <p>Office Section: {pr.office_section}</p>
          <p>Resp Code: {pr.resp_code}</p>

          <div className="flex items-center">
            ----------------------------------------------
          </div>
        </div>

      ))}
    </div>
  );
}