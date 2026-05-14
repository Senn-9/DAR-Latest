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
  created_at?: string | null;
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

const BAC_RESOLUTION_STATUS_ID = 7;

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

function formatCreatedAt(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDateKey(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
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

  // Track existing resolution IDs per PR for updates
  const [existingResolutions, setExistingResolutions] = useState<Map<number, number>>(new Map());
  // Store full resolution data per PR (resolution_no, prepared_by, etc.)
  const [prResolutionData, setPrResolutionData] = useState<Map<number, { resolution_no: string; prepared_by: number | null; division_id: number | null }>>(new Map());

  const [flagOptions, setFlagOptions] = useState<FlagOption[]>([]);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [flagId, setFlagId] = useState(2);
  const [remarks, setRemarks] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [bacResolutionLink, setBacResolutionLink] = useState("");

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
          .select("id, pr_no, office_section, purpose, total_cost, status_id, status, created_at")
          .eq("status_id", BAC_RESOLUTION_STATUS_ID)
          .order("created_at", { ascending: false }),
        supabase.from("users").select("id, fullname").order("fullname", { ascending: true }),
      ]);

      if (prErr) throw prErr;
      if (usersErr) throw usersErr;

      const prs = ((prData as PRRow[]) ?? []).filter((pr) => pr.status_id === BAC_RESOLUTION_STATUS_ID);
      setPrList(prs);
      setUsers((userRows as UserRow[]) ?? []);

      // Load existing resolutions for these PRs to pre-populate form
      if (prs.length > 0) {
        const prIds = prs.map((p) => p.id);
        let existingResolutionsData: unknown[] | null = null;

        try {
          console.log("Querying bac_resolution for PR IDs:", prIds);
          const result = await supabase
            .from("bac_resolution")
            .select("id, resolution_no, prepared_by, division_id, pr_request_id")
            .in("pr_request_id", prIds)
            .order("id", { ascending: false });

          console.log("bac_resolution query result:", { data: result.data, error: result.error });
          existingResolutionsData = result.data;
          if (result.error) {
            console.error("Error loading existing resolutions:", result.error);
          }
        } catch (queryErr) {
          console.error("Exception querying bac_resolution:", queryErr);
        }

        if (existingResolutionsData && existingResolutionsData.length > 0) {
          // Build map of pr_request_id -> resolution id
          const resolutionMap = new Map<number, number>();
          // Build map of pr_request_id -> full resolution data
          const resolutionDataMap = new Map<number, { resolution_no: string; prepared_by: number | null; division_id: number | null }>();

          existingResolutionsData.forEach((res) => {
            const prId = (res as { pr_request_id: number }).pr_request_id;
            const resId = (res as { id: number }).id;
            const resNo = (res as { resolution_no: string | null }).resolution_no;
            const prepBy = (res as { prepared_by: number | null }).prepared_by;
            const divId = (res as { division_id: number | null }).division_id;

            if (!resolutionMap.has(prId)) {
              resolutionMap.set(prId, resId);
              resolutionDataMap.set(prId, {
                resolution_no: resNo ?? "",
                prepared_by: prepBy ?? null,
                division_id: divId ?? null,
              });
            }
          });
          setExistingResolutions(resolutionMap);
          setPrResolutionData(resolutionDataMap);

          // Don't auto-select - let user choose which to edit
          setSelectedPrIds([]);

          // Clear form fields initially - will populate when user selects a PR
          setResolutionNo("");
          setPreparedBy(currentUser?.id != null ? String(currentUser.id) : "");
          setDivisionId(currentUser?.division_id ?? null);
        } else {
          setExistingResolutions(new Map());
          setPrResolutionData(new Map());
          setResolutionNo("");
          setPreparedBy(currentUser?.id != null ? String(currentUser.id) : "");
          setDivisionId(currentUser?.division_id ?? null);
        }
      } else {
        setExistingResolutions(new Map());
        setPrResolutionData(new Map());
        setResolutionNo("");
        setPreparedBy(currentUser?.id != null ? String(currentUser.id) : "");
        setDivisionId(currentUser?.division_id ?? null);
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
      setError(e instanceof Error ? e.message : "Failed to load PRs.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFormToDefaults = useCallback(() => {
    const currentUser = readCurrentUser();
    setResolutionNo("");
    setPreparedBy(currentUser?.id != null ? String(currentUser.id) : "");
    setDivisionId(currentUser?.division_id ?? null);
  }, []);

  const selectedDateKey = selectedPrIds.length > 0
    ? getDateKey(prList.find((pr) => pr.id === selectedPrIds[0])?.created_at)
    : "";

  const isPrSelectable = useCallback((pr: PRRow) => {
    if (!selectedDateKey) return true;
    return getDateKey(pr.created_at) === selectedDateKey;
  }, [selectedDateKey]);

  const togglePrSelection = useCallback((prId: number) => {
    setSelectedPrIds((prev) => {
      const isSelected = prev.includes(prId);
      const pr = prList.find((item) => item.id === prId);
      if (!pr) return prev;
      const currentSelectedDateKey = prev.length > 0
        ? getDateKey(prList.find((item) => item.id === prev[0])?.created_at)
        : "";
      const selectable = !currentSelectedDateKey || getDateKey(pr.created_at) === currentSelectedDateKey;
      if (!isSelected && !selectable) return prev;

      const nextSelected = isSelected
        ? prev.filter((id) => id !== prId)
        : [...prev, prId];

      if (nextSelected.length === 0) {
        resetFormToDefaults();
        return nextSelected;
      }

      if (nextSelected.length === 1) {
        const selectedId = nextSelected[0];
        const prData = prResolutionData.get(selectedId);
        if (prData) {
          setResolutionNo(prData.resolution_no);
          setPreparedBy(prData.prepared_by != null ? String(prData.prepared_by) : "");
          setDivisionId(prData.division_id);
        } else {
          resetFormToDefaults();
        }
      }

      return nextSelected;
    });
  }, [prList, prResolutionData, resetFormToDefaults]);

  const selectAll = () => {
    if (prList.length === 0) {
      resetFormToDefaults();
      return;
    }
    const targetDateKey = selectedDateKey || getDateKey(prList[0]?.created_at);
    setSelectedPrIds(
      prList
        .filter((pr) => getDateKey(pr.created_at) === targetDateKey)
        .map((pr) => pr.id)
    );
  };

  const deselectAll = () => {
    setSelectedPrIds([]);
    resetFormToDefaults();
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

    // Separate PRs into those with existing resolutions (update) and new ones (insert)
    const toUpdate: { id: number; data: typeof payload & { pr_request_id: number } }[] = [];
    const toInsert: (typeof payload & { pr_request_id: number })[] = [];

    selectedPrIds.forEach((prId) => {
      const existingId = existingResolutions.get(prId);
      const resolutionData = { ...payload, pr_request_id: prId };
      if (existingId) {
        toUpdate.push({ id: existingId, data: resolutionData });
      } else {
        toInsert.push(resolutionData);
      }
    });

    // Update existing records
    for (const { id, data } of toUpdate) {
      const { error: updateErr } = await supabase.from("bac_resolution").update(data).eq("id", id);
      if (updateErr) throw updateErr;
    }

    // Insert new records
    let insertedIds: { id: number; pr_request_id: number }[] = [];
    if (toInsert.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("bac_resolution")
        .insert(toInsert)
        .select("id, pr_request_id");

      if (insertErr) throw insertErr;

      if (inserted && inserted.length > 0) {
        insertedIds = inserted as { id: number; pr_request_id: number }[];
        // Update the existingResolutions map with newly inserted IDs
        setExistingResolutions((prev) => {
          const next = new Map(prev);
          insertedIds.forEach((res) => {
            next.set(res.pr_request_id, res.id);
          });
          return next;
        });
      }
    }

    // Update prResolutionData to reflect the new resolution numbers in the table
    setPrResolutionData((prev) => {
      const next = new Map(prev);
      selectedPrIds.forEach((prId) => {
        next.set(prId, {
          resolution_no: payload.resolution_no,
          prepared_by: payload.prepared_by,
          division_id: payload.division_id,
        });
      });
      return next;
    });

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
      // Use persistResolution to handle updates/inserts properly
      const saved = await persistResolution();
      if (!saved) return;

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

  const handleUploadResolutionLink = async () => {
    if (!bacResolutionLink.trim()) {
      setError("Please enter a BAC Resolution link.");
      return;
    }

    if (selectedPrIds.length === 0) {
      setError("Please select at least one PR to upload the resolution link.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Get PR numbers for selected IDs
      const selectedPrs = prList.filter((pr) => selectedPrIds.includes(pr.id));

      // Check for existing documents
      const { data: existingDocs, error: checkErr } = await supabase
        .from("documents")
        .select("id, pr_id")
        .in("pr_id", selectedPrIds);

      if (checkErr) throw checkErr;

      const existingPrIds = new Set((existingDocs || []).map((doc: { pr_id: number }) => doc.pr_id));

      // Separate into updates and inserts
      const toUpdate: { pr_id: number; pr_no: string; bac_reso_link: string; abstract_link: null }[] = [];
      const toInsert: { pr_id: number; pr_no: string; bac_reso_link: string; abstract_link: null }[] = [];

      selectedPrs.forEach((pr) => {
        const data = {
          pr_id: pr.id,
          pr_no: pr.pr_no,
          bac_reso_link: bacResolutionLink.trim(),
          abstract_link: null,
        };

        if (existingPrIds.has(pr.id)) {
          toUpdate.push(data);
        } else {
          toInsert.push(data);
        }
      });

      // Update existing documents
      if (toUpdate.length > 0) {
        for (const doc of toUpdate) {
          const { error: updateErr } = await supabase
            .from("documents")
            .update({ bac_reso_link: doc.bac_reso_link })
            .eq("pr_id", doc.pr_id);

          if (updateErr) throw updateErr;
        }
      }

      // Insert new documents
      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from("documents").insert(toInsert);
        if (insertErr) throw insertErr;
      }

      setSuccess(`BAC Resolution link uploaded for ${selectedPrIds.length} PR(s).`);
      setBacResolutionLink("");
      setShowUploadModal(false);
    } catch (e) {
      console.error("Upload error:", e);
      setError(e instanceof Error ? e.message : "Could not upload resolution link.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-purple-600">Resolution · BAC</p>
                    <h2 className="text-2xl font-extrabold text-gray-900 mt-1">Prepare BAC Resolution</h2>
                    <p className="text-sm text-gray-500 mt-1 font-mono">{new Date().toLocaleDateString("en-PH")}</p>
                  </div>
                  <div className="flex items-start gap-2 flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex flex-col items-center justify-center leading-none shadow-sm">
                      <span className="text-lg font-extrabold">07</span>
                      <span className="text-[10px] font-bold opacity-90 mt-0.5">STEP</span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
                      <RiCloseLine size={22} />
                    </button>
                  </div>
                </div>
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
                    {selectedDateKey && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Date locked: {formatCreatedAt(prList.find((pr) => pr.id === selectedPrIds[0])?.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
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
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Resolution No.</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Office/Section</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Created At</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {prList.map((pr) => {
                          const isSelected = selectedPrIds.includes(pr.id);
                          const isSelectable = isPrSelectable(pr);
                          const hasExistingResolution = existingResolutions.has(pr.id);
                          const prResData = prResolutionData.get(pr.id);
                          return (
                            <tr
                              key={pr.id}
                              onClick={() => {
                                if (isSelectable || isSelected) togglePrSelection(pr.id);
                              }}
                              className={`transition-colors ${
                                isSelected
                                  ? "bg-purple-50 cursor-pointer"
                                  : isSelectable
                                    ? "hover:bg-gray-50 cursor-pointer"
                                    : "bg-gray-50/80 text-gray-400 cursor-not-allowed opacity-60"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  isSelected
                                    ? "bg-purple-600 border-purple-600"
                                    : isSelectable
                                      ? "border-gray-300"
                                      : "border-gray-200 bg-gray-100"
                                }`}>
                                  {isSelected && <RiCheckboxCircleLine size={14} className="text-white" />}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${isSelectable || isSelected ? "text-gray-900" : "text-gray-400"}`}>{pr.pr_no}</span>
                                  {hasExistingResolution && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                      Saved
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {prResData?.resolution_no ? (
                                  <span className="font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">
                                    {prResData.resolution_no}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{pr.office_section}</td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatCreatedAt(pr.created_at)}</td>
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
          {/* <button
            type="button"
            onClick={handlePrepare}
            disabled={loading || saving || preparing || selectedPrIds.length === 0}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {preparing ? "Preparing..." : "Prepare BAC Resolution"}
          </button> */}
          {/* <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            disabled={loading || saving || preparing || selectedPrIds.length === 0}
            className="rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-purple-800 disabled:opacity-60"
          >
            Upload Resolution Link
          </button> */}
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-100">Document Upload</p>
                  <h3 className="text-lg font-extrabold mt-1">Upload BAC Resolution Link</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                >
                  <RiCloseLine size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                    {success}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    BAC Resolution Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/resolution"
                    value={bacResolutionLink}
                    onChange={(e) => setBacResolutionLink(e.target.value)}
                    className={inputCls}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Enter the complete URL to the BAC Resolution document
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Selected PRs:</span> {selectedPrIds.length}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadResolutionLink}
                  disabled={saving || !bacResolutionLink.trim()}
                  className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-purple-800 disabled:opacity-60"
                >
                  {saving ? "Uploading..." : "Upload Link"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
