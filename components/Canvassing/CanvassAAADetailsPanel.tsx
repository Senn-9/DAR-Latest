"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
// import type { AAADocument, BacResolution } from "@/types/tables";
import { RiCheckLine, RiArrowRightLine } from "react-icons/ri";

type UserRow = { id: number; fullname: string | null };
type SessionRow = { id: number; bac_no: string | null };
type AssignmentRow = { id: number; canvasser_id: number | null; returned_at: string | null; status: string | null };
type EntryRow = {
  id: number;
  assignment_id: number | null;
  item_no: number | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  supplier_name: string | null;
  unit_price: number | null;
  is_winning: boolean | null;
};

type StatusFlagRow = { id: number; flag_name: string };

const inputCls =
  "w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition placeholder:text-gray-400";
const selectCls = `${inputCls} appearance-none bg-[length:1.25rem] bg-[right_0.65rem_center] bg-no-repeat pr-10`;
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

type Props = {
  prId: number;
  prNo: string;
  /** When true, show the \"Proceed\" button (AAA usually comes after status 11). */
  canProceed?: boolean;
  onProceed?: (prId: number) => void;
};

function stNorm(s: string | null) {
  return (s ?? "").toLowerCase().trim();
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function CanvassAAADetailsPanel({ prId, prNo, canProceed = false, onProceed }: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<null | "save" | "apply" | "remark">(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [resolution, setResolution] = useState<Record<string, any> | null>(null);
  const [aaaId, setAaaId] = useState<number | null>(null);

  const [aaaNo, setAaaNo] = useState("");
  const [particulars, setParticulars] = useState("");

  const [returnedAssignments, setReturnedAssignments] = useState<AssignmentRow[]>([]);
  const [usersById, setUsersById] = useState<Record<number, string>>({});
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);

  const [flags, setFlags] = useState<StatusFlagRow[]>([]);
  const [flagId, setFlagId] = useState<number | "">( "");
  const [remarkText, setRemarkText] = useState("");

  const fetchAaaDoc = useCallback(
    async (sid: number) => {
      // Try common table naming variants.
      const try1 = await supabase.from("aaa_document").select("*").eq("session_id", sid).maybeSingle();
      if (!try1.error) return try1;
      const try2 = await supabase.from("aaa_documents").select("*").eq("session_id", sid).maybeSingle();
      return try2;
    },
    [supabase]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: sess, error: sessErr } = await supabase
        .from("canvass_sessions")
        .select("id, bac_no")
        .eq("pr_id", prId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sessErr) throw sessErr;
      const srow = (sess as SessionRow) ?? null;
      setSession(srow);

      const sid = srow?.id ?? null;

      const [resRes, aaaRes, flagRes] = await Promise.all([
        sid ? supabase.from("bac_resolution").select("*").eq("session_id", sid).maybeSingle() : Promise.resolve({ data: null, error: null }),
        sid ? fetchAaaDoc(sid) : Promise.resolve({ data: null, error: null }),
        supabase.from("status_flag").select("id, flag_name").order("id", { ascending: true }),
      ]);

      if (resRes.error) throw resRes.error;
      setResolution((resRes.data as Record<string, any>) ?? null);

      // AAA doc is non-blocking; keep rendering even if RLS/table missing.
      const arow = (aaaRes.data as Record<string, any>) ?? null;
      setAaaId(arow?.id ?? null);
      setAaaNo(arow?.aaa_no ?? "");
      setParticulars(arow?.particulars ?? "");

      if (!flagRes.error) {
        const rows = ((flagRes.data as StatusFlagRow[]) ?? []).filter((r) => typeof r.id === "number");
        setFlags(rows);
        setFlagId(rows[0]?.id ?? "");
      } else {
        setFlags([]);
        setFlagId("");
      }

      if (sid) {
        const { data: asg, error: asgErr } = await supabase
          .from("canvasser_assignments")
          .select("id, canvasser_id, returned_at, status")
          .eq("session_id", sid);
        if (asgErr) throw asgErr;
        const list = (asg as AssignmentRow[]) ?? [];
        const returned = list.filter((a) => Boolean(a.returned_at) || stNorm(a.status) === "returned");
        setReturnedAssignments(returned);

        const ids = [
          ...new Set(
            returned.map((a) => a.canvasser_id).filter((x): x is number => typeof x === "number")
          ),
        ];
        if (ids.length) {
          const { data: us, error: uErr } = await supabase.from("users").select("id, fullname").in("id", ids);
          if (uErr) throw uErr;
          const map: Record<number, string> = {};
          for (const u of (us as UserRow[]) ?? []) {
            if (typeof u.id === "number") map[u.id] = (u.fullname && u.fullname.trim()) || `User #${u.id}`;
          }
          setUsersById(map);
        } else {
          setUsersById({});
        }

        setSelectedAssignmentId(returned[0]?.id ?? null);
      } else {
        setReturnedAssignments([]);
        setUsersById({});
        setSelectedAssignmentId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load AAA data.");
      setSession(null);
      setResolution(null);
      setReturnedAssignments([]);
      setUsersById({});
    } finally {
      setLoading(false);
    }
  }, [prId, supabase, fetchAaaDoc]);

  useEffect(() => {
    load();
  }, [load]);

  const bacNo = session?.bac_no ?? "—";
  const resolutionNo = resolution?.resolution_no ?? "—";
  const dateText = useMemo(() => todayLabel(), []);

  const handleSaveAAA = async () => {
    if (!session?.id) {
      setError("No canvass session found for this PR.");
      return;
    }
    if (!aaaNo.trim()) {
      setError("AAA No. is required.");
      return;
    }
    setSaving("save");
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        session_id: session.id,
        aaa_no: aaaNo.trim(),
        particulars: particulars.trim() || null,
      };
      if (aaaId != null) {
        const upd1 = await supabase.from("aaa_document").update(payload).eq("id", aaaId);
        const upd = upd1.error ? await supabase.from("aaa_documents").update(payload).eq("id", aaaId) : upd1;
        if (upd.error) throw upd.error;
        setSuccess("AAA details updated.");
      } else {
        const ins1 = await supabase.from("aaa_document").insert(payload).select("id").single();
        const ins = ins1.error ? await supabase.from("aaa_documents").insert(payload).select("id").single() : ins1;
        if (ins.error) throw ins.error;
        const inserted = ins.data;
        const newId =
          inserted && typeof (inserted as { id?: number }).id === "number" ? (inserted as { id: number }).id : null;
        setAaaId(newId);
        setSuccess("AAA details saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save AAA details.");
    } finally {
      setSaving(null);
    }
  };

  const handleApplySource = async () => {
    if (!session?.id) {
      setError("No canvass session found for this PR.");
      return;
    }
    if (!selectedAssignmentId) return;
    setSaving("apply");
    setError(null);
    setSuccess(null);
    try {
      // No DB field in schema (per tables.ts). Keep it client-side for now.
      setSuccess("RFQ source applied.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply RFQ source.");
    } finally {
      setSaving(null);
    }
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    setSaving("remark");
    setError(null);
    setSuccess(null);
    try {
      let userId: number | null = null;
      try {
        const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
        if (s) {
          const u = JSON.parse(s) as { id?: number };
          if (typeof u.id === "number") userId = u.id;
        }
      } catch {}

      const { error: insErr } = await supabase.from("remarks").insert({
        pr_id: prId,
        remark: remarkText.trim(),
        status_flag_id: typeof flagId === "number" ? flagId : null,
        user_id: userId,
      });
      if (insErr) throw insErr;
      setRemarkText("");
      setSuccess("Remark added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add remark.");
    } finally {
      setSaving(null);
    }
  };

  const [quoteRows, setQuoteRows] = useState<Array<{ item_no: number; qty: number; unit: string; particulars: string; supplier: string; price: number | null }>>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  useEffect(() => {
    const sid = session?.id ?? null;
    if (!sid || !selectedAssignmentId) {
      setQuoteRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setQuotesLoading(true);
      try {
        const { data: ent, error: entErr } = await supabase
          .from("canvass_entries")
          .select("id, assignment_id, item_no, description, unit, quantity, supplier_name, unit_price, is_winning")
          .eq("assignment_id", selectedAssignmentId);
        if (entErr) throw entErr;
        if (cancelled) return;
        const rows = (ent as EntryRow[]) ?? [];
        const byItem = new Map<number, EntryRow[]>();
        for (const r of rows) {
          const ino = r.item_no ?? null;
          if (ino == null) continue;
          const arr = byItem.get(ino) ?? [];
          arr.push(r);
          byItem.set(ino, arr);
        }
        const out: Array<{ item_no: number; qty: number; unit: string; particulars: string; supplier: string; price: number | null }> = [];
        for (const [ino, list] of [...byItem.entries()].sort((a, b) => a[0] - b[0])) {
          const win = list.find((r) => r.is_winning) ?? null;
          const best =
            win ??
            list
              .slice()
              .sort((a, b) => (a.unit_price ?? Number.POSITIVE_INFINITY) - (b.unit_price ?? Number.POSITIVE_INFINITY))[0] ??
            null;
          out.push({
            item_no: ino,
            qty: best?.quantity ?? 0,
            unit: best?.unit ?? "",
            particulars: best?.description ?? "",
            supplier: best?.supplier_name ?? "",
            price: best?.unit_price ?? null,
          });
        }
        setQuoteRows(out);
      } catch {
        setQuoteRows([]);
      } finally {
        if (!cancelled) setQuotesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id, selectedAssignmentId, supabase]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
        Loading AAA…
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

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Purchase request</p>
          <p className="text-sm font-extrabold text-gray-900 truncate">{prNo}</p>
        </div>
        <div className="text-xs text-gray-500 font-mono shrink-0">{session?.id ? `Session #${session.id}` : "No session"}</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Prior steps summary</h3>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold">
            Ready
          </span>
        </div>
        <div className="p-4 bg-gray-50">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Resolution</span>{" "}
            {resolutionNo !== "—" ? resolutionNo : "—"}
            {resolution?.mode ? ` · ${resolution.mode}` : ""}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">Document references</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">BAC No.</label>
            <input className={`${inputCls} bg-gray-100 text-gray-600`} value={bacNo} readOnly />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">Resolution No.</label>
            <input className={`${inputCls} bg-gray-100 text-gray-600`} value={resolutionNo} readOnly />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">PR No.</label>
            <input className={`${inputCls} bg-gray-100 text-gray-600`} value={prNo} readOnly />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">Date</label>
            <input className={`${inputCls} bg-gray-100 text-gray-600`} value={dateText} readOnly />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">AAA details</h3>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            AAA No. <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            value={aaaNo}
            onChange={(e) => setAaaNo(e.target.value)}
            placeholder="e.g. 2025-08-390"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Particulars / Job Order Description</label>
          <textarea
            className={`${inputCls} min-h-[110px] resize-y`}
            value={particulars}
            onChange={(e) => setParticulars(e.target.value)}
            placeholder="e.g., REQUEST FOR SUPPLY, LABOR AND MATERIALS…"
            rows={5}
          />
          <p className="mt-1 text-[11px] text-gray-400">This text appears as the Job Order row at the top of the abstract table.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleSaveAAA}
            disabled={saving !== null}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold transition-all disabled:opacity-60"
          >
            {saving === "save" ? "Saving…" : aaaId != null ? "Update AAA" : "Save AAA"}
          </button>
          {canProceed && onProceed && (
            <button
              type="button"
              onClick={() => onProceed(prId)}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-l-3xl rounded-r-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-extrabold tracking-tight transition-all"
            >
              <span>Proceed</span>
              <RiArrowRightLine className="flex-shrink-0 text-lg" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">RFQ source</h3>
        <p className="text-xs text-gray-500 mb-3">Choose which returned RFQ to use as the basis for the abstract.</p>
        <div className="flex flex-wrap items-center gap-2">
          {returnedAssignments.length === 0 ? (
            <span className="text-sm text-gray-500">No returned RFQ found yet.</span>
          ) : (
            returnedAssignments.map((a) => {
              const name = typeof a.canvasser_id === "number" ? usersById[a.canvasser_id] : "";
              const active = selectedAssignmentId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-extrabold transition-all ${
                    active
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col items-start leading-tight">
                    <span className="truncate max-w-[220px]">{(name || `Assignment #${a.id}`).trim()}</span>
                    <span className="text-[10px] font-bold opacity-70">Returned</span>
                  </div>
                </button>
              );
            })
          )}
          <button
            type="button"
            onClick={handleApplySource}
            disabled={saving !== null || !session?.id || !selectedAssignmentId}
            className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RiCheckLine size={16} />
            {saving === "apply" ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Remarks &amp; flag</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">Flag</label>
            <div className="relative">
              <select
                className={selectCls}
                style={{ backgroundImage: selectChevron }}
                value={flagId}
                onChange={(e) => setFlagId(e.target.value ? Number(e.target.value) : "")}
              >
                {flags.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.flag_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">Remark</label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Add a remark for AAA Preparation…"
              />
              <button
                type="button"
                onClick={handleAddRemark}
                disabled={saving !== null || !remarkText.trim()}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving === "remark" ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Abstract of price quotations</h3>
          <p className="text-xs text-gray-500 mt-1">Based on the selected RFQ source. Winners default to the lowest price if none is marked.</p>
        </div>
        <div className="bg-gray-50 p-4 overflow-x-auto">
          <table className="min-w-[720px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-widest text-white bg-emerald-900">
                <th className="px-3 py-2 text-left rounded-tl-xl">No.</th>
                <th className="px-3 py-2 text-left">Qty</th>
                <th className="px-3 py-2 text-left">Unit</th>
                <th className="px-3 py-2 text-left">Particulars</th>
                <th className="px-3 py-2 text-left">Supplier</th>
                <th className="px-3 py-2 text-right rounded-tr-xl">Unit price</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-800">
              {quotesLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-gray-500">
                    Loading quotations…
                  </td>
                </tr>
              ) : quoteRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-gray-500">
                    No quotation rows to show.
                  </td>
                </tr>
              ) : (
                quoteRows.map((r, i) => (
                  <tr key={r.item_no} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 font-semibold">{r.item_no}</td>
                    <td className="px-3 py-2">{r.qty}</td>
                    <td className="px-3 py-2">{r.unit}</td>
                    <td className="px-3 py-2">{r.particulars}</td>
                    <td className="px-3 py-2">{r.supplier}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {r.price != null ? `₱${r.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-gray-400 font-medium">
            Tip: mark winners during Collection for the cleanest abstract.
          </p>
        </div>
      </div>
    </div>
  );
}

