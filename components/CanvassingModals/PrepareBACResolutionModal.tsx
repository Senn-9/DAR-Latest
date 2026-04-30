"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RiCloseLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiCloseCircleLine,
  RiPencilLine,
  RiPauseCircleLine,
  RiAlertLine,
  RiSubtractLine,
} from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";

type Props = {
  onClose: () => void;
  onProcessed?: (prIds: number[]) => void;
};

type PRRow = {
  id: number;
  pr_no: string;
  office_section: string;
  purpose: string;
  total_cost: number;
  status_id: number;
  status: string;
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

const iconForSlug = (slug: string) => {
  if (slug === "complete") return <RiCheckboxCircleLine size={16} />;
  if (slug === "incomplete_info") return <RiInformationLine size={16} />;
  if (slug === "wrong_information") return <RiCloseCircleLine size={16} />;
  if (slug === "needs_revision") return <RiPencilLine size={16} />;
  if (slug === "on_hold") return <RiPauseCircleLine size={16} />;
  if (slug === "urgent") return <RiAlertLine size={16} />;
  return <RiSubtractLine size={16} />;
};

const inputCls =
  "w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition placeholder:text-gray-400";

const selectCls = `${inputCls} appearance-none bg-[length:1.25rem] bg-[right_0.65rem_center] bg-no-repeat pr-10`;
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

function readCurrentUser(): CurrentUser | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

async function getCurrentUserId(supabase: ReturnType<typeof createClient>): Promise<number | null> {
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

  return userId;
}

export default function PrepareBACResolutionModal({ onClose, onProcessed }: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [prList, setPrList] = useState<PRRow[]>([]);
  const [selectedPrIds, setSelectedPrIds] = useState<number[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [resolutionNo, setResolutionNo] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [divisionId, setDivisionId] = useState<number | null>(null);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const currentUser = readCurrentUser();

      const [{ data: prData, error: prErr }, { data: userRows, error: usersErr }] = await Promise.all([
        supabase
          .from("purchase_requests")
          .select("id, pr_no, office_section, purpose, total_cost, status_id, status")
          .eq("status_id", 7)
          .order("created_at", { ascending: false }),
        supabase.from("users").select("id, fullname").order("fullname", { ascending: true }),
      ]);

      if (prErr) throw prErr;
      if (usersErr) throw usersErr;

      setPrList((prData as PRRow[]) ?? []);
      setUsers((userRows as UserRow[]) ?? []);
      setPreparedBy(currentUser?.id != null ? String(currentUser.id) : "");
      setDivisionId(currentUser?.division_id ?? null);

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
      setError(e instanceof Error ? e.message : "Failed to load PRs.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePrSelection = (prId: number) => {
    setSelectedPrIds((prev) =>
      prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]
    );
  };

  const selectAll = () => {
    setSelectedPrIds(prList.map((pr) => pr.id));
  };

  const deselectAll = () => {
    setSelectedPrIds([]);
  };

  const buildPayload = () => {
    if (!resolutionNo.trim()) {
      setError("Resolution No. is required.");
      return null;
    }

    if (!preparedBy) {
      setError("Prepared By is required.");
      return null;
    }

    if (selectedPrIds.length === 0) {
      setError("Please select at least one PR to process.");
      return null;
    }

    return {
      resolution_no: resolutionNo.trim(),
      prepared_by: Number(preparedBy),
      division_id: divisionId,
    };
  };

  const persistResolution = async () => {
    const payload = buildPayload();
    if (!payload) return false;

    const resolutions = selectedPrIds.map((prId) => ({
      ...payload,
      pr_request_id: prId,
    }));

    const { error: insertErr } = await supabase.from("bac_resolution").insert(resolutions);

    if (insertErr) throw insertErr;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await persistResolution();
      if (!saved) return;

      const userId = await getCurrentUserId(supabase);
      const remarkText = remarks.trim() || "Resolution saved";
      const statusFlagId = selectedFlag.id;

      if (remarkText || statusFlagId || userId) {
        const remarksData = selectedPrIds.map((prId) => ({
          pr_id: prId,
          remark: remarkText || null,
          status_flag_id: statusFlagId,
          user_id: userId || null,
        }));

        const { error: remarksErr } = await supabase.from("remarks").insert(remarksData);
        if (remarksErr) {
          console.error("Error saving remarks:", remarksErr);
        }
      }

      setSuccess(`Resolution saved for ${selectedPrIds.length} PR(s).`);
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

      const userId = await getCurrentUserId(supabase);
      const remarkText = remarks.trim() || "Prepare BAC Resolution";
      const statusFlagId = selectedFlag.id;

      if (remarkText || statusFlagId || userId) {
        const remarksData = selectedPrIds.map((prId) => ({
          pr_id: prId,
          remark: remarkText || null,
          status_flag_id: statusFlagId,
          user_id: userId || null,
        }));

        const { error: remarksErr } = await supabase.from("remarks").insert(remarksData);
        if (remarksErr) {
          console.error("Error saving remarks:", remarksErr);
        }
      }

      setSuccess("BAC Resolution prepared successfully.");

      window.open(
        "https://docs.google.com/spreadsheets/d/1dysnxUROw9Llx--GFs9KjaodKzNpJ3JRG05zxU0v3cM/copy",
        "_blank"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare BAC resolution.");
    } finally {
      setPreparing(false);
    }
  };

  const handleProcess = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = buildPayload();
      if (!payload) return;

      const resolutions = selectedPrIds.map((prId) => ({
        ...payload,
        pr_request_id: prId,
      }));

      const { error: insertErr } = await supabase.from("bac_resolution").insert(resolutions);
      if (insertErr) throw insertErr;

      const { error: updateErr } = await supabase
        .from("purchase_requests")
        .update({ status_id: 8, status: "Canvassing (Releasing)" })
        .in("id", selectedPrIds);

      if (updateErr) throw updateErr;

      const userId = await getCurrentUserId(supabase);
      const remarkText = remarks.trim() || "BAC Resolution Processed";
      const statusFlagId = selectedFlag.id;

      if (remarkText || statusFlagId || userId) {
        const remarksData = selectedPrIds.map((prId) => ({
          pr_id: prId,
          remark: remarkText || null,
          status_flag_id: statusFlagId,
          user_id: userId || null,
        }));

        const { error: remarksErr } = await supabase.from("remarks").insert(remarksData);
        if (remarksErr) {
          console.error("Error saving remarks:", remarksErr);
        }
      }

      setSuccess(`Successfully processed ${selectedPrIds.length} PR(s).`);
      onProcessed?.(selectedPrIds);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process resolution.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Prepare BAC Resolution</h2>
            <p className="mt-1 text-sm text-purple-100">Multi-PR Resolution Processing</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-white/10">
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto bg-gray-50 p-8 space-y-6">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Loading PRs...
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

              <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                      Select PRs (Status: BAC Resolution)
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      {selectedPrIds.length} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {prList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No PRs with BAC Resolution status found.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700 w-12">Select</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">PR Number</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Office/Section</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Purpose</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {prList.map((pr) => {
                          const isSelected = selectedPrIds.includes(pr.id);
                          return (
                            <tr
                              key={pr.id}
                              onClick={() => togglePrSelection(pr.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-purple-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  isSelected ? "bg-purple-600 border-purple-600" : "border-gray-300"
                                }`}>
                                  {isSelected && <RiCheckboxCircleLine size={14} className="text-white" />}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">{pr.pr_no}</td>
                              <td className="px-4 py-3 text-gray-600">{pr.office_section}</td>
                              <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{pr.purpose}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                ₱{pr.total_cost?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white px-8 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || preparing || selectedPrIds.length === 0}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Resolution"}
          </button>
          <button
            type="button"
            onClick={handlePrepare}
            disabled={loading || saving || preparing || selectedPrIds.length === 0}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {preparing ? "Preparing..." : "Prepare BAC Resolution"}
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={loading || saving || preparing || selectedPrIds.length === 0}
            className="rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-purple-800 disabled:opacity-60"
          >
            {saving ? "Processing..." : "Process Selected PRs"}
          </button>
        </div>
      </div>
    </div>
  );
}
