"use client";

import { useCallback, useEffect, useState } from "react";
import { RiCloseLine, RiCheckboxCircleLine, RiInformationLine, RiCloseCircleLine, RiPencilLine, RiPauseCircleLine, RiAlertLine, RiSubtractLine } from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";

type Props = {
  prId: number;
  prNo: string;
  onClose: () => void;
  onSubmitted?: (prId: number) => void;
  embedded?: boolean;
};

type UserRow = { id: number; fullname: string | null };

type CurrentUser = {
  id?: number;
  division_id?: number;
};

type FlagOption = {
  id: number;
  label: string;
  slug: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const inputCls =
  "w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition placeholder:text-gray-400";

const selectCls = `${inputCls} appearance-none bg-[length:1.25rem] bg-[right_0.65rem_center] bg-no-repeat pr-10`;
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const iconForSlug = (slug: string) => {
  if (slug === "complete") return <RiCheckboxCircleLine size={16} />;
  if (slug === "incomplete_info") return <RiInformationLine size={16} />;
  if (slug === "wrong_information") return <RiCloseCircleLine size={16} />;
  if (slug === "needs_revision") return <RiPencilLine size={16} />;
  if (slug === "on_hold") return <RiPauseCircleLine size={16} />;
  if (slug === "urgent") return <RiAlertLine size={16} />;
  return <RiSubtractLine size={16} />;
};

function readCurrentUser(): CurrentUser | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

export default function ResolutionModal({ prId, prNo, onClose, onSubmitted, embedded }: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [resolutionId, setResolutionId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [resolutionNo, setResolutionNo] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [prRequestId, setPrRequestId] = useState(prId);

  const [flagOptions, setFlagOptions] = useState<FlagOption[]>([]);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [flagId, setFlagId] = useState(2);
  const [remarks, setRemarks] = useState("");

  const selectedFlag = flagOptions.find((f) => f.id === flagId) ?? {
    id: 2,
    label: "Complete",
    slug: "complete",
    description: "All information is correct and complete.",
    icon: iconForSlug("complete"),
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  };

  const getOrCreateSessionId = useCallback(async (): Promise<number> => {
    const { data: existing, error: findErr } = await supabase
      .from("canvass_sessions")
      .select("id")
      .eq("pr_id", prId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;

    const existingId = existing?.id ?? null;
    if (existingId != null) {
      setSessionId(existingId);
      return existingId;
    }

    const { data: created, error: createErr } = await supabase
      .from("canvass_sessions")
      .insert({
        pr_id: prId,
        stage: "Resolution",
        status: "active",
        bac_no: `AUTO-${prNo || String(prId)}`,
      })
      .select("id")
      .single();

    if (createErr) throw createErr;

    const newId = created?.id ?? null;
    if (newId == null) throw new Error("Could not create canvass session.");

    setSessionId(newId);
    return newId;
  }, [prId, prNo, supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const currentUser = readCurrentUser();
      const sid = await getOrCreateSessionId();

      const [{ data: userRows, error: usersErr }, { data: resolutionRow, error: resolutionErr }] = await Promise.all([
        supabase.from("users").select("id, fullname").order("fullname", { ascending: true }),
        supabase.from("bac_resolution").select("*").eq("session_id", sid).maybeSingle(),
      ]);

      if (usersErr) throw usersErr;
      if (resolutionErr) throw resolutionErr;

      setUsers((userRows as UserRow[]) ?? []);

      const row = resolutionRow as (Record<string, any> & { pr_request_id?: number | null }) | null;

      if (row?.id != null) {
        setResolutionId(row.id);
        setResolutionNo(row.resolution_no ?? "");
        setPreparedBy(
          row.prepared_by != null
            ? String(row.prepared_by)
            : currentUser?.id != null
              ? String(currentUser.id)
              : "",
        );
        setDivisionId(row.division_id ?? currentUser?.division_id ?? null);
        setPrRequestId(row.pr_request_id ?? prId);
      } else {
        setResolutionId(null);
        setResolutionNo("");
        setPreparedBy(currentUser?.id != null ? String(currentUser.id) : "");
        setDivisionId(currentUser?.division_id ?? null);
        setPrRequestId(prId);
      }

      const { data: flagData } = await supabase.from("status_flag").select("id, flag_name").order("id", { ascending: true });
      const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "_");
      const opts: FlagOption[] = (flagData || []).map((row: { id: number; flag_name: string }) => ({
        id: row.id,
        label: row.flag_name,
        slug: toSlug(row.flag_name),
        description:
          row.flag_name === "Complete"
            ? "All information is correct and complete."
            : row.flag_name === "Incomplete Info"
            ? "Required fields or attachments are missing."
            : row.flag_name === "Wrong Information"
            ? "Submitted data contains errors that must be corrected."
            : row.flag_name === "Needs Revision"
            ? "Minor corrections needed before forwarding."
            : row.flag_name === "On Hold"
            ? "Processing paused pending clarification."
            : row.flag_name === "Urgent"
            ? "Requires immediate attention."
            : "Leave flag unset",
        icon: iconForSlug(toSlug(row.flag_name)),
        iconBg: "bg-gray-100",
        iconColor: "text-gray-500",
      }));
      setFlagOptions(opts);
      const completeFlag = opts.find((o) => o.slug === "complete")?.id ?? opts[0]?.id ?? 2;
      setFlagId(completeFlag);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load resolution.");
      setSessionId(null);
      setResolutionId(null);
    } finally {
      setLoading(false);
    }
  }, [getOrCreateSessionId, prId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildPayload = (sid: number) => {
    if (!resolutionNo.trim()) {
      setError("Resolution No. is required.");
      return null;
    }

    if (!preparedBy) {
      setError("Prepared By is required.");
      return null;
    }

    return {
      session_id: sid,
      resolution_no: resolutionNo.trim(),
      prepared_by: Number(preparedBy),
      division_id: divisionId,
      pr_request_id: prRequestId,
    };
  };

  const persistResolution = async () => {
    const sid = await getOrCreateSessionId();
    const payload = buildPayload(sid);
    if (!payload) return false;

    if (resolutionId != null) {
      const { error: updateErr } = await supabase.from("bac_resolution").update(payload).eq("id", resolutionId);
      if (updateErr) throw updateErr;
      return true;
    }

    const { data, error: insertErr } = await supabase
      .from("bac_resolution")
      .insert(payload)
      .select("id")
      .single();

    if (insertErr) throw insertErr;
    if (data?.id != null) setResolutionId(data.id);
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await persistResolution();
      if (!saved) return;

      let userId: number | null = null;
      let storedUser: { id?: number; username?: string; email?: string } | null = null;
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) storedUser = JSON.parse(s) as { id?: number; username?: string; email?: string };
        if (typeof storedUser?.id === "number") userId = storedUser.id;
      } catch {}

      if (userId === null && storedUser?.username) {
        const { data } = await supabase.from("users").select("id").eq("username", storedUser.username).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      if (userId === null && storedUser?.email) {
        const { data } = await supabase.from("users").select("id").eq("email", storedUser.email).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      const remarkText = remarks.trim() || "Resolution saved";
      const statusFlagId = selectedFlag.id;

      if (remarkText || statusFlagId || userId) {
        const { error: remarksErr } = await supabase.from("remarks").insert({
          pr_id: prId,
          remark: remarkText || null,
          status_flag_id: statusFlagId,
          user_id: userId || null,
        });

        if (remarksErr) {
          console.error("Error saving remark:", remarksErr);
        }
      }

      setSuccess(resolutionId != null ? "Resolution updated." : "Resolution saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save resolution.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrepare = async () => {
    setPreparing(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await persistResolution();
      if (!saved) return;

      let userId: number | null = null;
      let storedUser: { id?: number; username?: string; email?: string } | null = null;
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) storedUser = JSON.parse(s) as { id?: number; username?: string; email?: string };
        if (typeof storedUser?.id === "number") userId = storedUser.id;
      } catch {}

      if (userId === null && storedUser?.username) {
        const { data } = await supabase.from("users").select("id").eq("username", storedUser.username).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      if (userId === null && storedUser?.email) {
        const { data } = await supabase.from("users").select("id").eq("email", storedUser.email).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      const remarkText = remarks.trim() || "Prepare BAC Resolution";
      const statusFlagId = selectedFlag.id;

      if (remarkText || statusFlagId || userId) {
        const { error: remarksErr } = await supabase.from("remarks").insert({
          pr_id: prId,
          remark: remarkText || null,
          status_flag_id: statusFlagId,
          user_id: userId || null,
        });

        if (remarksErr) {
          console.error("Error saving remark:", remarksErr);
        }
      }

      setSuccess("BAC Resolution prepared successfully.");

      window.open("https://docs.google.com/spreadsheets/d/1dysnxUROw9Llx--GFs9KjaodKzNpJ3JRG05zxU0v3cM/copy", "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare BAC resolution.");
    } finally {
      setPreparing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const currentUser = readCurrentUser();
      const saved = await persistResolution();
      if (!saved) return;

      let userId: number | null = null;
      let storedUser: { id?: number; username?: string; email?: string } | null = null;
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) storedUser = JSON.parse(s) as { id?: number; username?: string; email?: string };
        if (typeof storedUser?.id === "number") userId = storedUser.id;
      } catch {}

      if (userId === null && storedUser?.username) {
        const { data } = await supabase.from("users").select("id").eq("username", storedUser.username).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      if (userId === null && storedUser?.email) {
        const { data } = await supabase.from("users").select("id").eq("email", storedUser.email).maybeSingle();
        if (data && typeof (data as { id?: number }).id === "number") userId = (data as { id: number }).id;
      }

      const remarkText = remarks.trim() || "BAC Resolution Submitted";
      const statusFlagId = selectedFlag.id;

      if (remarkText || statusFlagId || userId) {
        const { error: remarksErr } = await supabase.from("remarks").insert({
          pr_id: prId,
          remark: remarkText || null,
          status_flag_id: statusFlagId,
          user_id: userId || null,
        });

        if (remarksErr) {
          console.error("Error saving remark:", remarksErr);
        }
      }

      const { error: updateErr } = await supabase
        .from("purchase_requests")
        .update({ status_id: 8, status: "Canvassing (Releasing)" })
        .eq("id", prId);

      if (updateErr) throw updateErr;

      onSubmitted?.(prId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit resolution.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-linear-to-r from-purple-600 to-purple-700 px-8 py-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">BAC Resolution</h2>
            <p className="mt-1 text-sm text-purple-100">PR {prNo} · Resolution Entry</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-white/10">
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto bg-gray-50 p-8 space-y-6">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Loading resolution...
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {success}
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    Resolution Fields
                  </h3>
                  <div className="h-px flex-1 bg-gray-200" aria-hidden />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Resolution No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={resolutionNo}
                      onChange={(e) => setResolutionNo(e.target.value)}
                      placeholder="e.g. RES-2026-001"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Prepared By <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        className={selectCls}
                        style={{ backgroundImage: selectChevron }}
                        value={preparedBy}
                        onChange={(e) => setPreparedBy(e.target.value)}
                      >
                        <option value="">Select user...</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {(user.fullname && user.fullname.trim()) || `User #${user.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Status Flag</label>
                    <button
                      type="button"
                      onClick={() => setShowFlagPicker(true)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedFlag.iconBg} ${selectedFlag.iconColor}`}>{selectedFlag.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{selectedFlag.label}</p>
                        <p className="text-xs text-gray-400 truncate">{selectedFlag.description}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showFlagPicker && (
                      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFlagPicker(false)} />
                        <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                          <div className="px-5 py-4 bg-gray-800 text-white flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Processing Flag</p>
                              <p className="text-base font-bold mt-0.5">Select Status Flag</p>
                            </div>
                            <button type="button" onClick={() => setShowFlagPicker(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                              <RiCloseLine size={20} />
                            </button>
                          </div>
                          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                            {flagOptions.map((flag) => {
                              const isSelected = flagId === flag.id;
                              return (
                                <button
                                  key={flag.id}
                                  type="button"
                                  onClick={() => {
                                    setFlagId(flag.id);
                                    setShowFlagPicker(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"}`}
                                >
                                  <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${flag.iconBg} ${flag.iconColor}`}>{flag.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800">{flag.label}</p>
                                    <p className="text-xs text-gray-400">{flag.description}</p>
                                  </div>
                                  {isSelected && <RiCheckboxCircleLine size={18} className="text-emerald-600 flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Remarks</label>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={4}
                      placeholder="Enter remarks or notes..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white px-8 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || submitting || preparing}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : resolutionId != null ? "Update Resolution" : "Save Resolution"}
          </button>
          <button
            type="button"
            onClick={handlePrepare}
            disabled={loading || saving || submitting || preparing}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {preparing ? "Preparing..." : "Prepare BAC Resolution"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || saving || submitting || preparing}
            className="rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-purple-800 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}



