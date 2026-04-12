"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiAlertLine,
  RiFileTextLine,
  RiSendPlaneLine,
  RiCloseLine,
} from "react-icons/ri";

type PRLineRow = {
  id?: number;
  description: string | null;
  unit: string | null;
  quantity: string | number | null;
  unit_price: string | number | null;
  subtotal: string | number | null;
};

type AssignmentRow = {
  id: number;
  session_id: number | null;
  division_id: number | null;
  canvasser_id: number | null;
  released_at: string | null;
  returned_at: string | null;
  status: string | null;
};

type CanvassEntryRow = {
  id: number;
  session_id: number | null;
  item_no: number | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  supplier_name: string | null;
  unit_price: number | null;
  total_price: number | null;
  assignment_id: number | null;
  tin_no: string | null;
  delivery_days: string | null;
};

function parseNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const x = parseFloat(v.replace(/,/g, ""));
    return Number.isNaN(x) ? 0 : x;
  }
  return 0;
}

function formatMoney(n: number) {
  return `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type StoredCurrentUser = {
  id?: number;
  username?: string;
  email?: string;
  role_id?: number;
  division_id?: number;
};

async function resolveCurrentUserId(
  supabase: ReturnType<typeof createClient>
): Promise<{ id: number; role_id: number | null; division_id: number | null } | null> {
  let stored: StoredCurrentUser | null = null;
  try {
    const s = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
    if (s) stored = JSON.parse(s) as StoredCurrentUser;
  } catch {
    return null;
  }
  if (typeof stored?.id === "number") {
    // Login stores the full `users` row. Use it directly so we still match `canvasser_id`
    // when RLS blocks `select` on `users` for the signed-in account.
    return {
      id: stored.id,
      role_id: typeof stored.role_id === "number" ? stored.role_id : null,
      division_id: typeof stored.division_id === "number" ? stored.division_id : null,
    };
  }
  if (stored?.username) {
    const { data } = await supabase
      .from("users")
      .select("id, role_id, division_id")
      .eq("username", stored.username)
      .maybeSingle();
    if (data && typeof (data as { id?: number }).id === "number") {
      const r = data as { id: number; role_id: number | null; division_id: number | null };
      return { id: r.id, role_id: r.role_id ?? null, division_id: r.division_id ?? null };
    }
  }
  if (stored?.email) {
    const { data } = await supabase
      .from("users")
      .select("id, role_id, division_id")
      .eq("email", stored.email)
      .maybeSingle();
    if (data && typeof (data as { id?: number }).id === "number") {
      const r = data as { id: number; role_id: number | null; division_id: number | null };
      return { id: r.id, role_id: r.role_id ?? null, division_id: r.division_id ?? null };
    }
  }
  return null;
}

type QuotationsModalProps = {
  prNo: string;
  sessionId: number;
  assignment: AssignmentRow;
  prLines: PRLineRow[];
  initialEntries: CanvassEntryRow[];
  onClose: () => void;
  onViewRfq?: () => void;
  onReturned: () => void;
};

function SupplierQuotationsModal({
  prNo,
  sessionId,
  assignment,
  prLines,
  initialEntries,
  onClose,
  onViewRfq,
  onReturned,
}: QuotationsModalProps) {
  const supabase = createClient();
  const [rows, setRows] = useState(() =>
    prLines.map((line, i) => {
      const itemNo = i + 1;
      const existing = initialEntries.find((e) => e.item_no === itemNo);
      return {
        itemNo,
        description: line.description ?? "",
        unit: line.unit ?? "",
        quantity: parseNum(line.quantity),
        supplierName: existing?.supplier_name ?? "",
        unitPrice: existing?.unit_price != null ? String(existing.unit_price) : "",
        entryId: existing?.id ?? null as number | null,
      };
    })
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const lineTotals = useMemo(
    () =>
      rows.map((r) => {
        const price = parseNum(r.unitPrice);
        return r.quantity * price;
      }),
    [rows]
  );

  const grandTotal = useMemo(() => lineTotals.reduce((a, b) => a + b, 0), [lineTotals]);

  const canSubmit = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.every(
      (r) => r.supplierName.trim().length > 0 && parseNum(r.unitPrice) > 0
    );
  }, [rows]);

  const persistEntries = async () => {
    setSaving(true);
    setError(null);
    try {
      const snapshot = rows;
      const nextIds: (number | null)[] = snapshot.map((r) => r.entryId);

      for (let i = 0; i < snapshot.length; i++) {
        const r = snapshot[i];
        const unitPrice = parseNum(r.unitPrice);
        const totalPrice = r.quantity * unitPrice;
        const payload = {
          session_id: sessionId,
          assignment_id: assignment.id,
          item_no: r.itemNo,
          description: r.description || null,
          unit: r.unit || null,
          quantity: r.quantity || null,
          supplier_name: r.supplierName.trim() || null,
          unit_price: unitPrice,
          total_price: totalPrice,
        };

        if (r.entryId) {
          const { error: uErr } = await supabase.from("canvass_entries").update(payload).eq("id", r.entryId);
          if (uErr) throw uErr;
        } else {
          const { data: ins, error: iErr } = await supabase
            .from("canvass_entries")
            .insert(payload)
            .select("id")
            .single();
          if (iErr) throw iErr;
          if (ins && typeof (ins as { id?: number }).id === "number") {
            nextIds[i] = (ins as { id: number }).id;
          }
        }
      }

      setRows((prev) =>
        prev.map((row, i) => ({ ...row, entryId: nextIds[i] ?? row.entryId }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save entries.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToBAC = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await persistEntries();
      const now = new Date().toISOString();
      const { error: aErr } = await supabase
        .from("canvasser_assignments")
        .update({ status: "returned", returned_at: now })
        .eq("id", assignment.id);
      if (aErr) throw aErr;
      onReturned();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[110] bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[min(90vh,880px)] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
              Supplier quotations · PR {prNo}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">Enter one quote per line item, then submit to BAC.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <RiCloseLine size={22} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 bg-gray-50">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
              {error}
            </div>
          )}

          {/* PR line items reference */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                PR line items (reference)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-emerald-800 text-white">
                    <th className="px-3 py-2.5 text-left font-extrabold uppercase tracking-wide">Description</th>
                    <th className="px-2 py-2.5 text-center font-extrabold uppercase w-14">Unit</th>
                    <th className="px-2 py-2.5 text-center font-extrabold uppercase w-12">Qty</th>
                    <th className="px-2 py-2.5 text-right font-extrabold uppercase w-24">Unit cost</th>
                    <th className="px-3 py-2.5 text-right font-extrabold uppercase w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {prLines.map((line, i) => {
                    const qty = parseNum(line.quantity);
                    const cost = parseNum(line.unit_price);
                    const st = line.subtotal;
                    const hasSub =
                      st != null && !(typeof st === "string" && (st as string).trim() === "");
                    const lineTot = hasSub ? parseNum(st) : qty * cost;
                    return (
                      <tr key={i} className="border-b border-gray-100 bg-white">
                        <td className="px-3 py-2 text-gray-800">{line.description || "—"}</td>
                        <td className="px-2 py-2 text-center text-gray-600">{line.unit || "—"}</td>
                        <td className="px-2 py-2 text-center text-gray-700 font-semibold">{qty || "—"}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatMoney(cost)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(lineTot)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 border-t border-emerald-100">
                    <td colSpan={4} className="px-3 py-2.5 text-sm font-extrabold text-emerald-900">
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-sm font-extrabold text-emerald-900 text-right tabular-nums">
                      {formatMoney(
                        prLines.reduce((sum, line, i) => {
                          const qty = parseNum(line.quantity);
                          const cost = parseNum(line.unit_price);
                          const st = line.subtotal;
                          const hasSub =
                            st != null && !(typeof st === "string" && (st as string).trim() === "");
                          return sum + (hasSub ? parseNum(st) : qty * cost);
                        }, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Enter quotations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                Enter supplier quotations
              </h3>
            </div>
            <div className="p-4 space-y-5">
              {rows.map((r, idx) => (
                <div key={r.itemNo} className="space-y-2">
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">Item {r.itemNo}</p>
                    <p className="text-xs text-gray-500">
                      {r.quantity} {r.unit || ""}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Supplier name"
                      value={r.supplierName}
                      onChange={(e) =>
                        setRows((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], supplierName: e.target.value };
                          return next;
                        })
                      }
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={r.unitPrice}
                      onChange={(e) =>
                        setRows((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], unitPrice: e.target.value };
                          return next;
                        })
                      }
                      className="sm:w-36 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 text-right tabular-nums placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewRfq?.();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-emerald-800 text-sm font-extrabold hover:bg-gray-50 transition-colors"
          >
            <RiFileTextLine size={18} />
            View RFQ
          </button>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => persistEntries()}
              disabled={saving}
              className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm font-extrabold hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={handleSubmitToBAC}
              disabled={!canSubmit || submitting}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold transition-all sm:min-w-[200px] ${
                canSubmit && !submitting
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <RiSendPlaneLine size={18} />
              {submitting ? "Submitting…" : "Submit to BAC"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  prId: number;
  prNo: string;
  onViewRfq?: () => void;
  onSubmitted?: () => void;
};

/**
 * Shown on the Collect step: canvass users with a `released` canvasser_assignment
 * (and not yet `returned`) get a button to open the supplier quotation workspace.
 */
export default function ReleasedCanvasserEntryButton({ prId, prNo, onViewRfq, onSubmitted }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [prLines, setPrLines] = useState<PRLineRow[]>([]);
  const [entries, setEntries] = useState<CanvassEntryRow[]>([]);
  const [me, setMe] = useState<{ id: number; role_id: number | null; division_id: number | null } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [returnedOnly, setReturnedOnly] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const userRow = await resolveCurrentUserId(supabase);
      setMe(userRow);

      const { data: sess } = await supabase
        .from("canvass_sessions")
        .select("id")
        .eq("pr_id", prId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sid = sess && typeof (sess as { id?: number }).id === "number" ? (sess as { id: number }).id : null;
      setSessionId(sid);

      const { data: items } = await supabase.from("purchase_request_items").select("*").eq("pr_id", prId);
      setPrLines((items as PRLineRow[]) ?? []);

      if (!sid || !userRow) {
        setAssignment(null);
        setEntries([]);
        setReturnedOnly(false);
        return;
      }

      const { data: asgList } = await supabase
        .from("canvasser_assignments")
        .select("id, session_id, division_id, canvasser_id, released_at, returned_at, status")
        .eq("session_id", sid)
        .eq("canvasser_id", userRow.id);

      const list = (asgList as AssignmentRow[]) ?? [];
      const stNorm = (s: string | null) => (s ?? "").toLowerCase().trim();
      const released = list.find((a) => {
        const st = stNorm(a.status);
        if (a.returned_at || st === "returned") return false;
        return st === "released" || Boolean(a.released_at);
      });
      const alreadyReturned = list.some(
        (a) => Boolean(a.returned_at) || stNorm(a.status) === "returned"
      );

      if (released) {
        setReturnedOnly(false);
        setAssignment(released);
        const { data: ent } = await supabase
          .from("canvass_entries")
          .select("*")
          .eq("session_id", sid)
          .eq("assignment_id", released.id);
        setEntries((ent as CanvassEntryRow[]) ?? []);
      } else {
        setAssignment(null);
        setEntries([]);
        setReturnedOnly(alreadyReturned);
      }
    } finally {
      setLoading(false);
    }
  }, [prId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
        Loading canvass assignment…
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-600">
        No canvass session found for this PR yet.
      </div>
    );
  }

  if (assignment) {
    return (
      <>
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
              Your assignment is released
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Enter supplier names and unit prices for each PR line, then submit to BAC.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold transition-colors"
          >
            Enter supplier quotations
          </button>
        </div>

        {modalOpen && (
          <SupplierQuotationsModal
            prNo={prNo}
            sessionId={sessionId}
            assignment={assignment}
            prLines={prLines}
            initialEntries={entries}
            onClose={() => setModalOpen(false)}
            onViewRfq={onViewRfq}
            onReturned={() => {
              onSubmitted?.();
              refresh();
            }}
          />
        )}
      </>
    );
  }

  if (returnedOnly && me) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 font-extrabold text-sm">
          ✓
        </div>
        <p className="text-sm font-semibold text-emerald-900 leading-snug">
          You have already submitted supplier quotations for this PR to BAC.
        </p>
      </div>
    );
  }

  if (me) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <RiAlertLine size={18} className="text-amber-700" />
        </div>
        <p className="text-sm font-semibold text-amber-900 leading-snug">
          Your division has no canvassing assignment for this PR, or it has not been released yet. Contact the BAC
          office.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-600">
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Collection</p>
      <p>Canvassers with a released assignment can enter supplier quotations from this step. BAC may advance the PR when
        collection is complete.</p>
    </div>
  );
}
