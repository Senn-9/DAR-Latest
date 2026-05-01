"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiCheckboxCircleLine, RiAddLine, RiDeleteBinLine } from "react-icons/ri";

// ─── DB types ────────────────────────────────────────────────────────────────

type AssignmentRow = {
  id: number;
  session_id: number | null;
  division_id: number | null;
  canvasser_id: number | null;
  released_at: string | null;
  returned_at: string | null;
  status: string | null;
};

type EntryRow = {
  id: number;
  session_id: number | null;
  item_no: number | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  supplier_name: string | null;
  unit_price: number | null;
  total_price: number | null;
  is_winning: boolean | null;
  assignment_id: number | null;
  tin_no: string | null;
  delivery_days: string | null;
};

// ─── Editable local types ─────────────────────────────────────────────────────

type EditableItem = {
  /** DB row id — null for newly added rows */
  dbId: number | null;
  item_no: number | null;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  total_price: number | null;
};

type EditableSupplier = {
  /** Stable local key for React */
  key: string;
  supplier_name: string;
  tin_no: string;
  delivery_days: string;
  items: EditableItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stNorm = (s: string | null) => (s ?? "").toLowerCase().trim();

function wasReleased(a: AssignmentRow) {
  return Boolean(a.released_at) || ["released", "returned"].includes(stNorm(a.status));
}

function isReturned(a: AssignmentRow) {
  return Boolean(a.returned_at) || stNorm(a.status) === "returned";
}

function formatMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcTotal(unitPrice: string, quantity: string): number | null {
  const u = parseFloat(unitPrice);
  const q = parseFloat(quantity);
  if (isNaN(u) || isNaN(q)) return null;
  return u * q;
}

let supplierKeyCounter = 0;
function newSupplierKey() {
  return `sup-${Date.now()}-${++supplierKeyCounter}`;
}

/** Convert raw DB entries for one assignment into EditableSupplier[] */
function buildEditableSuppliers(rows: EntryRow[]): EditableSupplier[] {
  const order: string[] = [];
  const map = new Map<string, EntryRow[]>();
  for (const r of rows) {
    const key = (r.supplier_name ?? "").trim() || "—";
    if (!map.has(key)) {
      order.push(key);
      map.set(key, []);
    }
    map.get(key)!.push(r);
  }

  return order.map((supplierKey) => {
    const grp = map.get(supplierKey)!;
    const head = grp[0];
    return {
      key: newSupplierKey(),
      supplier_name: supplierKey === "—" ? "" : supplierKey,
      tin_no: head.tin_no?.trim() ?? "",
      delivery_days: head.delivery_days?.trim() ?? "",
      items: grp.map((r) => ({
        dbId: r.id,
        item_no: r.item_no,
        description: r.description ?? "",
        unit: r.unit ?? "",
        quantity: r.quantity != null ? String(r.quantity) : "",
        unit_price: r.unit_price != null ? r.unit_price.toFixed(2) : "",
        total_price: r.total_price,
      })),
    };
  });
}

function blankSupplier(templateItems: EditableItem[]): EditableSupplier {
  return {
    key: newSupplierKey(),
    supplier_name: "",
    tin_no: "",
    delivery_days: "",
    items: templateItems.map((it) => ({
      dbId: null,
      item_no: it.item_no,
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      unit_price: "",
      total_price: null,
    })),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  prId: number;
  prNo: string;
  readonly?: boolean;
  onViewRfq?: () => void;
  onAdvancedToResolution?: (prId: number) => void;
  onPreviousStep?: () => void;
  onNextStep?: () => void;
  canGoNextStep?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollectCanvassStepPanel({
  prId,
  readonly,
  onAdvancedToResolution,
  onViewRfq: _onViewRfq,
  onPreviousStep: _onPreviousStep,
  onNextStep: _onNextStep,
  canGoNextStep: _canGoNextStep,
}: Props) {
  const supabase = createClient();
  const quotationsRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [advancing, setAdvancing] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Per-assignment editable supplier state */
  const [editMap, setEditMap] = useState<Record<number, EditableSupplier[]>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sess, error: sessErr } = await supabase
        .from("canvass_sessions")
        .select("id")
        .eq("pr_id", prId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessErr) throw sessErr;
      const sid =
        sess && typeof (sess as { id?: number }).id === "number"
          ? (sess as { id: number }).id
          : null;
      setSessionId(sid);

      if (!sid) {
        setAssignments([]);
        setEditMap({});
        setUserNames({});
        return;
      }

      const { data: asg, error: asgErr } = await supabase
        .from("canvasser_assignments")
        .select("id, session_id, division_id, canvasser_id, released_at, returned_at, status")
        .eq("session_id", sid);

      if (asgErr) throw asgErr;
      const list = (asg as AssignmentRow[]) ?? [];
      setAssignments(list);

      const returnedIds = list.filter(isReturned).map((a) => a.id);
      const canvasserIds = [
        ...new Set(
          list
            .filter(isReturned)
            .map((a) => a.canvasser_id)
            .filter((x): x is number => typeof x === "number")
        ),
      ];

      if (returnedIds.length === 0) {
        setEditMap({});
        setUserNames({});
        return;
      }

      const { data: ent, error: entErr } = await supabase
        .from("canvass_entries")
        .select("*")
        .in("assignment_id", returnedIds);

      if (entErr) throw entErr;

      const sorted = ((ent as EntryRow[]) ?? []).slice().sort((a, b) => {
        const aid = (a.assignment_id ?? 0) - (b.assignment_id ?? 0);
        if (aid !== 0) return aid;
        return (a.item_no ?? 0) - (b.item_no ?? 0);
      });

      const byAsg = new Map<number, EntryRow[]>();
      for (const row of sorted) {
        if (row.assignment_id == null) continue;
        const arr = byAsg.get(row.assignment_id) ?? [];
        arr.push(row);
        byAsg.set(row.assignment_id, arr);
      }

      const newEditMap: Record<number, EditableSupplier[]> = {};
      for (const [asgId, rows] of byAsg.entries()) {
        newEditMap[asgId] = buildEditableSuppliers(rows);
      }
      setEditMap(newEditMap);

      if (canvasserIds.length > 0) {
        const { data: users, error: uErr } = await supabase
          .from("users")
          .select("id, fullname")
          .in("id", canvasserIds);
        if (!uErr && users) {
          const map: Record<number, string> = {};
          for (const u of users as { id: number; fullname: string | null }[]) {
            map[u.id] = (u.fullname && u.fullname.trim()) || `User #${u.id}`;
          }
          setUserNames(map);
        } else {
          setUserNames({});
        }
      } else {
        setUserNames({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collection data.");
      setAssignments([]);
      setEditMap({});
    } finally {
      setLoading(false);
    }
  }, [prId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const releasedOut = useMemo(() => assignments.filter(wasReleased), [assignments]);
  const returnedCount = useMemo(() => assignments.filter(isReturned).length, [assignments]);
  const totalOut = releasedOut.length;
  const awaiting = totalOut > 0 && returnedCount < totalOut;

  const returnedAssignments = useMemo(
    () =>
      assignments
        .filter(isReturned)
        .sort((a, b) => (a.returned_at ?? "").localeCompare(b.returned_at ?? "")),
    [assignments]
  );

  // ── Edit helpers ───────────────────────────────────────────────────────────

  const updateSupplier = (
    asgId: number,
    supKey: string,
    patch: Partial<Omit<EditableSupplier, "key" | "items">>
  ) => {
    setEditMap((prev) => ({
      ...prev,
      [asgId]: (prev[asgId] ?? []).map((s) =>
        s.key === supKey ? { ...s, ...patch } : s
      ),
    }));
  };

  const updateItem = (
    asgId: number,
    supKey: string,
    itemIdx: number,
    patch: Partial<EditableItem>
  ) => {
    setEditMap((prev) => ({
      ...prev,
      [asgId]: (prev[asgId] ?? []).map((s) => {
        if (s.key !== supKey) return s;
        const items = s.items.map((it, i) => {
          if (i !== itemIdx) return it;
          const merged = { ...it, ...patch };
          if ("unit_price" in patch || "quantity" in patch) {
            merged.total_price = calcTotal(merged.unit_price, merged.quantity);
          }
          return merged;
        });
        return { ...s, items };
      }),
    }));
  };

  const addSupplier = (asgId: number) => {
    setEditMap((prev) => {
      const existing = prev[asgId] ?? [];
      const template = existing[0]?.items ?? [];
      return { ...prev, [asgId]: [...existing, blankSupplier(template)] };
    });
  };

  const removeSupplier = (asgId: number, supKey: string) => {
    setEditMap((prev) => ({
      ...prev,
      [asgId]: (prev[asgId] ?? []).filter((s) => s.key !== supKey),
    }));
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (readonly || !sessionId) return;
    setSaving(true);
    setError(null);
    try {
      for (const asg of returnedAssignments) {
        const suppliers = editMap[asg.id] ?? [];
        for (const sup of suppliers) {
          for (const item of sup.items) {
            const payload = {
              supplier_name: sup.supplier_name.trim() || null,
              tin_no: sup.tin_no.trim() || null,
              delivery_days: sup.delivery_days.trim() || null,
              unit_price: item.unit_price !== "" ? parseFloat(item.unit_price) : null,
              total_price: item.total_price,
              assignment_id: asg.id,
              session_id: sessionId,
              item_no: item.item_no,
              description: item.description || null,
              unit: item.unit || null,
              quantity: item.quantity !== "" ? parseFloat(item.quantity) : null,
            };

            if (item.dbId != null) {
              const { error: upErr } = await supabase
                .from("canvass_entries")
                .update(payload)
                .eq("id", item.dbId);
              if (upErr) throw upErr;
            } else {
              const { error: insErr } = await supabase
                .from("canvass_entries")
                .insert(payload);
              if (insErr) throw insErr;
            }
          }
        }
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save quotations.");
    } finally {
      setSaving(false);
    }
  };

  // ── Advance ────────────────────────────────────────────────────────────────

  const handleAdvanceToResolution = async () => {
    if (readonly || !sessionId) return;
    setAdvancing(true);
    setError(null);
    try {
      const { error: prErr } = await supabase
        .from("purchase_requests")
        .update({ status_id: 10, status: "Abstract of Awards" })
        .eq("id", prId);
      if (prErr) throw prErr;

      const { error: sessErr } = await supabase
        .from("canvass_sessions")
        .update({ stage: "Resolution", status: "active" })
        .eq("id", sessionId);
      if (sessErr) throw sessErr;

      onAdvancedToResolution?.(prId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not advance to BAC Resolution.");
    } finally {
      setAdvancing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
        Loading returned RFQs…
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-600">
        No canvass session for this PR. Complete reception and release first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}

      {/* Status strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-gray-900">
            {totalOut === 0 ? (
              <>0 RFQs released</>
            ) : (
              <>{returnedCount}/{totalOut} RFQ returned</>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalOut === 0
              ? "No canvass sheets have been released yet."
              : awaiting
              ? "Awaiting canvasser submissions."
              : "All released RFQs have been returned."}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            quotationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold transition-colors shrink-0"
        >
          <RiCheckboxCircleLine size={18} />
          Review RFQs
        </button>
      </div>

      {/* Supplier quotations */}
      <div
        ref={quotationsRef}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            Supplier Quotations
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Line items submitted on assignments marked returned.
          </p>
        </div>

        <div className="p-4 space-y-4 bg-gray-50 max-h-[60vh] overflow-y-auto">
          {returnedAssignments.length === 0 ? (
            <p className="text-sm text-gray-500 px-2 py-6 text-center">
              No returned submissions yet. Entries will appear here after canvassers submit to BAC.
            </p>
          ) : (
            returnedAssignments.map((asg) => {
              const canvasser =
                typeof asg.canvasser_id === "number"
                  ? userNames[asg.canvasser_id] ?? `User #${asg.canvasser_id}`
                  : "—";
              const suppliers = editMap[asg.id] ?? [];

              return (
                <div
                  key={asg.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Assignment header */}
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-gray-700">
                      Returned RFQ · {canvasser}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      Assignment #{asg.id}
                    </span>
                  </div>

                  <div className="p-4 space-y-5">
                    {suppliers.length === 0 && (
                      <p className="text-sm text-amber-700 font-medium">
                        No supplier quotes yet. Add one below.
                      </p>
                    )}

                    {suppliers.map((sup, gi) => (
                      <div key={sup.key} className="space-y-3">
                        {/* Supplier label + remove button */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                            Supplier {gi + 1}
                          </p>
                          {!readonly && suppliers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSupplier(asg.id, sup.key)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
                              title="Remove supplier"
                            >
                              <RiDeleteBinLine size={15} />
                            </button>
                          )}
                        </div>

                        {/* Supplier Name */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">
                            Supplier Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            disabled={readonly}
                            value={sup.supplier_name}
                            onChange={(e) =>
                              updateSupplier(asg.id, sup.key, { supplier_name: e.target.value })
                            }
                            placeholder="Business / trade name"
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* TIN + Delivery */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">TIN No.</label>
                            <input
                              type="text"
                              disabled={readonly}
                              value={sup.tin_no}
                              onChange={(e) =>
                                updateSupplier(asg.id, sup.key, { tin_no: e.target.value })
                              }
                              placeholder="000-000-000"
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">
                              Delivery (days)
                            </label>
                            <input
                              type="text"
                              disabled={readonly}
                              value={sup.delivery_days}
                              onChange={(e) =>
                                updateSupplier(asg.id, sup.key, { delivery_days: e.target.value })
                              }
                              placeholder="e.g. 7"
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* Unit Prices */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                            Unit Prices Quoted (₱)
                          </p>
                          <div className="space-y-1.5">
                            {sup.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 font-semibold w-14 shrink-0">
                                  Item {item.item_no ?? itemIdx + 1}
                                </span>
                                <span className="text-[11px] text-gray-400 w-10 shrink-0 text-center">
                                  {item.unit || "—"}
                                </span>
                                <span className="text-[11px] font-semibold text-gray-500 w-6 shrink-0 text-center">
                                  {item.quantity || "—"}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={readonly}
                                  value={item.unit_price}
                                  onChange={(e) =>
                                    updateItem(asg.id, sup.key, itemIdx, {
                                      unit_price: e.target.value,
                                    })
                                  }
                                  placeholder="0.00"
                                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-right tabular-nums text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                                <span className="text-xs tabular-nums text-gray-400 w-24 text-right shrink-0">
                                  {item.total_price != null ? formatMoney(item.total_price) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {gi < suppliers.length - 1 && (
                          <div className="border-t border-dashed border-gray-200 pt-1" />
                        )}
                      </div>
                    ))}

                    {/* Add Supplier Quote */}
                    {!readonly && (
                      <button
                        type="button"
                        onClick={() => addSupplier(asg.id)}
                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <RiAddLine size={16} />
                        Add Supplier Quote
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {!readonly && returnedAssignments.length > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl border border-emerald-300 bg-white text-emerald-700 text-sm font-extrabold hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save Quotations"}
          </button>
        )}

        <button
          type="button"
          disabled={
            readonly ||
            advancing ||
            !sessionId ||
            (totalOut > 0 && returnedCount === 0)
          }
          onClick={handleAdvanceToResolution}
          className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-extrabold transition-colors"
        >
          {advancing ? "Processing…" : "Encoded → BAC Resolution"}
        </button>
      </div>
    </div>
  );
}