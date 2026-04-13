"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { BacResolution } from "@/types/tables";
import { RiArrowRightLine } from "react-icons/ri";

type UserRow = { id: number; fullname: string | null };

const inputCls =
  "w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition placeholder:text-gray-400";

const selectCls = `${inputCls} appearance-none bg-[length:1.25rem] bg-[right_0.65rem_center] bg-no-repeat pr-10`;
// Chevron via inline SVG data URI for consistent look across browsers
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const PROCUREMENT_MODES = [
  "Small Value Procurement (SVP)",
  "Shopping",
  "Competitive Public Bidding",
  "Limited Source Bidding",
  "Direct Contracting",
  "Negotiated Procurement",
  "Others",
] as const;

type Props = {
  prId: number;
  prNo: string;
  /** When true, "Resolve & Complete BAC Workflow" saves resolution and advances PR to AAA (status 11). */
  canCompleteWorkflow?: boolean;
  onWorkflowComplete?: (prId: number) => void;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CanvassResolutionDetailsPanel({
  prId,
  prNo,
  canCompleteWorkflow = false,
  onWorkflowComplete,
}: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [savingKind, setSavingKind] = useState<null | "save" | "complete">(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [resolutionId, setResolutionId] = useState<number | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [resolutionNo, setResolutionNo] = useState("");
  const [preparedBy, setPreparedBy] = useState<string>("");
  const [resolvedAt, setResolvedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("");

  /** Placeholder BAC number when no session exists yet (e.g. user opens Resolution before PR Received). */
  const autoBacNo = `AUTO-${prNo || String(prId)}`;

  /** Always reads from DB (no stale sessionId) so load/save stay consistent. */
  const getOrCreateSessionId = useCallback(async (): Promise<number> => {
    const { data: existing, error: findErr } = await supabase
      .from("canvass_sessions")
      .select("id")
      .eq("pr_id", prId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;
    const existingId =
      existing && typeof (existing as { id?: number }).id === "number"
        ? (existing as { id: number }).id
        : null;
    if (existingId != null) {
      setSessionId(existingId);
      return existingId;
    }

    const { data: created, error: insErr } = await supabase
      .from("canvass_sessions")
      .insert({
        pr_id: prId,
        stage: "Resolution",
        status: "active",
        bac_no: autoBacNo,
      })
      .select("id")
      .single();

    if (insErr) throw insErr;
    const newId =
      created && typeof (created as { id?: number }).id === "number" ? (created as { id: number }).id : null;
    if (newId == null) throw new Error("Could not create canvass session.");
    setSessionId(newId);
    return newId;
  }, [prId, supabase, autoBacNo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let sid: number | null = null;
      try {
        sid = await getOrCreateSessionId();
      } catch (e) {
        setSessionId(null);
        setError(e instanceof Error ? e.message : "Could not create or load canvass session.");
      }

      const [{ data: userRows, error: usersErr }, resQuery] = await Promise.all([
        supabase.from("users").select("id, fullname").order("fullname", { ascending: true }),
        sid != null
          ? supabase.from("bac_resolution").select("*").eq("session_id", sid).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (usersErr) throw usersErr;
      setUsers((userRows as UserRow[]) ?? []);

      if (resQuery.error) throw resQuery.error;
      const row = resQuery.data as BacResolution | null;

      if (row?.id != null) {
        setResolutionId(row.id);
        setResolutionNo(row.resolution_no ?? "");
        setPreparedBy(row.prepared_by != null ? String(row.prepared_by) : "");
        setResolvedAt(toDatetimeLocalValue(row.resolved_at));
        setNotes(row.notes ?? "");
        setMode(row.mode ?? "");
      } else {
        setResolutionId(null);
        setResolutionNo("");
        setPreparedBy("");
        setResolvedAt("");
        setNotes("");
        setMode("");
      }

      let currentUserId: number | null = null;
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) {
          const u = JSON.parse(s) as { id?: number; username?: string; email?: string };
          if (typeof u.id === "number") currentUserId = u.id;
          else if (u.username) {
            const { data } = await supabase.from("users").select("id").eq("username", u.username).maybeSingle();
            if (data && typeof (data as { id?: number }).id === "number") {
              currentUserId = (data as { id: number }).id;
            }
          } else if (u.email) {
            const { data } = await supabase.from("users").select("id").eq("email", u.email).maybeSingle();
            if (data && typeof (data as { id?: number }).id === "number") {
              currentUserId = (data as { id: number }).id;
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!row?.prepared_by && currentUserId != null) {
        setPreparedBy(String(currentUserId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load resolution data.");
      setSessionId(null);
      setResolutionId(null);
    } finally {
      setLoading(false);
    }
  }, [prId, supabase, getOrCreateSessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const validateAndBuildPayload = (sid: number) => {
    if (!resolutionNo.trim()) {
      setError("Resolution No. is required.");
      return null;
    }
    if (!mode.trim()) {
      setError("Mode of Procurement is required.");
      return null;
    }
    return {
      session_id: sid,
      resolution_no: resolutionNo.trim(),
      prepared_by: preparedBy ? Number(preparedBy) : null,
      resolved_at: fromDatetimeLocalValue(resolvedAt),
      notes: notes.trim() || null,
      mode: mode.trim(),
    };
  };

  const persistResolution = async (payload: {
    session_id: number;
    resolution_no: string;
    prepared_by: number | null;
    resolved_at: string | null;
    notes: string | null;
    mode: string;
  }) => {
    if (resolutionId != null) {
      const { error: updErr } = await supabase.from("bac_resolution").update(payload).eq("id", resolutionId);
      if (updErr) throw updErr;
      return resolutionId;
    }
    const { data: inserted, error: insErr } = await supabase
      .from("bac_resolution")
      .insert(payload)
      .select("id")
      .single();
    if (insErr) throw insErr;
    const newId =
      inserted && typeof (inserted as { id?: number }).id === "number" ? (inserted as { id: number }).id : null;
    if (newId != null) setResolutionId(newId);
    return newId;
  };

  const handleSave = async () => {
    setSavingKind("save");
    setError(null);
    setSuccess(null);
    try {
      const sid = await getOrCreateSessionId();
      const payload = validateAndBuildPayload(sid);
      if (!payload) return;

      const hadExistingRow = resolutionId != null;
      await persistResolution(payload);
      setSuccess(hadExistingRow ? "Resolution updated." : "Resolution saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save resolution.");
    } finally {
      setSavingKind(null);
    }
  };

  const handleResolveAndComplete = async () => {
    if (!canCompleteWorkflow || !onWorkflowComplete) return;

    setSavingKind("complete");
    setError(null);
    setSuccess(null);
    try {
      const sid = await getOrCreateSessionId();
      const payload = validateAndBuildPayload(sid);
      if (!payload) return;

      await persistResolution(payload);

      const { error: prErr } = await supabase
        .from("purchase_requests")
        .update({ status_id: 11, status: "Abstract of Awards" })
        .eq("id", prId);
      if (prErr) throw prErr;

      const { error: sessErr } = await supabase
        .from("canvass_sessions")
        .update({ stage: "AAA", status: "active" })
        .eq("id", sid);
      if (sessErr) throw sessErr;

      setSuccess("BAC resolution recorded. Workflow advanced to Abstract of Awards.");
      onWorkflowComplete(prId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the BAC workflow.");
    } finally {
      setSavingKind(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
        Loading resolution…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800 font-semibold">
          {success}
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">
            Resolution details
          </h3>
          <div className="flex-1 h-px bg-gray-200" aria-hidden />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Resolution No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputCls}
                value={resolutionNo}
                onChange={(e) => setResolutionNo(e.target.value)}
                placeholder="RES-2026-0003"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">PR Reference</label>
              <input
                type="text"
                readOnly
                className={`${inputCls} bg-gray-100 text-gray-500 cursor-not-allowed`}
                value={prNo}
                aria-readonly
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Mode of Procurement <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                className={selectCls}
                style={{ backgroundImage: selectChevron }}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="">Select mode…</option>
                {PROCUREMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prepared by</label>
              <div className="relative">
                <select
                  className={selectCls}
                  style={{ backgroundImage: selectChevron }}
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                >
                  <option value="">Select user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.fullname && u.fullname.trim()) || `User #${u.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resolved at</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={resolvedAt}
                onChange={(e) => setResolvedAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea
              className={`${inputCls} min-h-[100px] resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks…"
              rows={4}
            />
          </div>

          <p className="text-[11px] text-gray-400 font-medium">
            {sessionId != null
              ? `Linked to canvass session #${sessionId} (set automatically for this PR).`
              : "Saving will create a canvass session for this PR if one does not exist yet."}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <button
          type="button"
          onClick={handleSave}
          disabled={savingKind !== null}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold transition-all disabled:opacity-60"
        >
          {savingKind === "save" ? "Saving…" : resolutionId != null ? "Update resolution" : "Save resolution"}
        </button>

        <button
          type="button"
          onClick={handleResolveAndComplete}
          disabled={savingKind !== null || !canCompleteWorkflow || !onWorkflowComplete}
          title={
            !canCompleteWorkflow
              ? "Available once this PR is in BAC Resolution (after collection is advanced)."
              : undefined
          }
          className="w-full sm:w-auto sm:max-w-[min(100%,420px)] sm:flex-1 inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-l-3xl rounded-r-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-extrabold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-800"
        >
          {savingKind === "complete" ? (
            "Completing…"
          ) : (
            <>
              <span>Resolve &amp; Complete BAC Workflow</span>
              <RiArrowRightLine className="flex-shrink-0 text-lg" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
