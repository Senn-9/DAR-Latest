"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiSearchLine,
} from "react-icons/ri";

type RoleRow = { role_id: number; role_name: string | null };
type DivisionRow = { division_id: number; division_name: string | null };

type UserRow = {
  id: number;
  username: string | null;
  fullname: string | null;
  division_id: number | null;
  role_id: number | null;
  created_at: string | null;
  last_login: string | null;
  division_name?: string | null;
  role_name?: string | null;
};

type CurrentUser = {
  fullname: string;
  username: string;
  role_id: number;
  divisions?: { division_name: string; division_id?: number };
  roles?: { role_name: string };
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserManagementPage() {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const isAdmin = currentUser?.role_id === 1;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<number | "all">("all");
  const [divisionFilter, setDivisionFilter] = useState<number | "all">("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const [formUsername, setFormUsername] = useState("");
  const [formFullname, setFormFullname] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleId, setFormRoleId] = useState<number | "">("");
  const [formDivisionId, setFormDivisionId] = useState<number | "">("");

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const resetForm = () => {
    setFormUsername("");
    setFormFullname("");
    setFormPassword("");
    setFormRoleId("");
    setFormDivisionId("");
  };

  const loadLookups = async () => {
    const [r, d] = await Promise.all([
      supabase.from("roles").select("role_id, role_name").order("role_id"),
      supabase.from("divisions").select("division_id, division_name").order("division_id"),
    ]);
    if (!r.error) setRoles((r.data ?? []) as RoleRow[]);
    if (!d.error) setDivisions((d.data ?? []) as DivisionRow[]);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, username, fullname, division_id, role_id, created_at, last_login, divisions(division_name), roles(role_name)",
      )
      .order("fullname", { ascending: true });
    if (error) {
      setUsers([]);
      return;
    }
    const mapped = (data ?? []).map((u: any) => ({
      id: Number(u.id),
      username: u.username ?? null,
      fullname: u.fullname ?? null,
      division_id: u.division_id ?? null,
      role_id: u.role_id ?? null,
      created_at: u.created_at ?? null,
      last_login: u.last_login ?? null,
      division_name: u.divisions?.division_name ?? null,
      role_name: u.roles?.role_name ?? null,
    })) as UserRow[];
    setUsers(mapped);
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadLookups(), loadUsers()]).finally(() => setLoading(false));
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = users.filter((u) => {
      const matchRole = roleFilter === "all" ? true : u.role_id === roleFilter;
      const matchDiv = divisionFilter === "all" ? true : u.division_id === divisionFilter;
      const matchSearch =
        q.length === 0
          ? true
          : (u.username ?? "").toLowerCase().includes(q) ||
            (u.fullname ?? "").toLowerCase().includes(q) ||
            (u.role_name ?? "").toLowerCase().includes(q) ||
            (u.division_name ?? "").toLowerCase().includes(q);
      return matchRole && matchDiv && matchSearch;
    });
    rows.sort((a, b) => {
      const av = (a.fullname ?? a.username ?? "").toLowerCase();
      const bv = (b.fullname ?? b.username ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [users, search, roleFilter, divisionFilter, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, divisionFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setFormUsername(u.username ?? "");
    setFormFullname(u.fullname ?? "");
    setFormPassword("");
    setFormRoleId(typeof u.role_id === "number" ? u.role_id : "");
    setFormDivisionId(typeof u.division_id === "number" ? u.division_id : "");
  };

  const doCreate = async () => {
    const username = formUsername.trim();
    const fullname = formFullname.trim();
    const password = formPassword;
    if (!username || !fullname || !password) return;
    if (typeof formRoleId !== "number") return;

    const { error } = await supabase.from("users").insert({
      username,
      fullname,
      password,
      role_id: formRoleId,
      division_id: typeof formDivisionId === "number" ? formDivisionId : null,
      created_at: new Date().toISOString(),
      last_login: null,
    });
    if (!error) {
      setCreateOpen(false);
      resetForm();
      await loadUsers();
    }
  };

  const doUpdate = async () => {
    if (!editTarget) return;
    const username = formUsername.trim();
    const fullname = formFullname.trim();
    if (!username || !fullname) return;
    if (typeof formRoleId !== "number") return;

    const patch: Record<string, any> = {
      username,
      fullname,
      role_id: formRoleId,
      division_id: typeof formDivisionId === "number" ? formDivisionId : null,
    };
    if (formPassword.trim().length > 0) patch.password = formPassword;

    const { error } = await supabase.from("users").update(patch).eq("id", editTarget.id);
    if (!error) {
      setEditTarget(null);
      resetForm();
      await loadUsers();
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("users").delete().eq("id", deleteTarget.id);
    if (!error) {
      setDeleteTarget(null);
      await loadUsers();
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <div className="mx-auto w-full max-w-6xl p-6 md:p-10">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-600 font-semibold">Access denied.</p>
            <p className="text-xs text-gray-400 mt-1">User Management is available for Admin only.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <div className="mx-auto w-full max-w-6xl p-6 md:p-10">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-gray-500">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">
              Admin Panel
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1>
            {currentUser && (
              <p className="text-sm text-gray-400 mt-1">
                Signed in as{" "}
                <span className="text-gray-700 font-semibold">{currentUser.fullname}</span>
              </p>
            )}
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors flex items-center gap-2"
          >
            <RiAddLine size={20} />
            New User
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-gray-800">Users</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search username, name, role, division..."
                  className="pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="all">All Roles</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name ?? `Role ${r.role_id}`}
                  </option>
                ))}
              </select>

              <select
                value={divisionFilter}
                onChange={(e) =>
                  setDivisionFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="all">All Divisions</option>
                {divisions.map((d) => (
                  <option key={d.division_id} value={d.division_id}>
                    {d.division_name ?? `Division ${d.division_id}`}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Sort {sortDir === "asc" ? "A–Z" : "Z–A"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Full Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Username</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="text-left px-4 py-3 font-semibold">Division</th>
                  <th className="text-left px-4 py-3 font-semibold">Created</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Login</th>
                  <th className="text-center px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((u) => (
                    <tr key={u.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                        {u.fullname ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {u.username ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          {u.role_name ?? (typeof u.role_id === "number" ? `Role ${u.role_id}` : "—")}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          {u.division_name ?? (typeof u.division_id === "number" ? `Division ${u.division_id}` : "—")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {fmtDateTime(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {fmtDateTime(u.last_login)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-2"
                          >
                            <RiEdit2Line />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                          >
                            <RiDeleteBinLine />
                            Delete
                          </button>
                        </div>
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
                {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              </span>
              {"–"}
              <span className="font-semibold text-gray-700">
                {Math.min(page * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of <span className="font-semibold text-gray-700">{filtered.length}</span>
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

      {(createOpen || editTarget || deleteTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {createOpen ? "Create User" : editTarget ? "Edit User" : "Delete User"}
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5 truncate">
                  {deleteTarget
                    ? "This action cannot be undone."
                    : "Manage username, role and division."}
                </p>
              </div>
              <button
                onClick={() => {
                  setCreateOpen(false);
                  setEditTarget(null);
                  setDeleteTarget(null);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
                aria-label="Close"
              >
                <RiCloseLine size={18} />
              </button>
            </div>

            {deleteTarget ? (
              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-sm text-red-800 font-semibold">
                    Delete user {deleteTarget.fullname ?? deleteTarget.username ?? "—"}?
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Username: {deleteTarget.username ?? "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doDelete}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                      Username
                    </label>
                    <input
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                      placeholder="e.g. juan.dela.cruz"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                      Full Name
                    </label>
                    <input
                      value={formFullname}
                      onChange={(e) => setFormFullname(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                      placeholder="e.g. Juan Dela Cruz"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                      Password {editTarget ? "(leave blank to keep)" : ""}
                    </label>
                    <input
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                      type="password"
                      placeholder={editTarget ? "••••••••" : "Set initial password"}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                        Role
                      </label>
                      <select
                        value={formRoleId}
                        onChange={(e) => setFormRoleId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                      >
                        <option value="">Select role</option>
                        {roles.map((r) => (
                          <option key={r.role_id} value={r.role_id}>
                            {r.role_name ?? `Role ${r.role_id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                        Division
                      </label>
                      <select
                        value={formDivisionId}
                        onChange={(e) =>
                          setFormDivisionId(e.target.value ? Number(e.target.value) : "")
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                      >
                        <option value="">None</option>
                        {divisions.map((d) => (
                          <option key={d.division_id} value={d.division_id}>
                            {d.division_name ?? `Division ${d.division_id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setCreateOpen(false);
                      setEditTarget(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createOpen ? doCreate : doUpdate}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
                  >
                    {createOpen ? "Create" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

