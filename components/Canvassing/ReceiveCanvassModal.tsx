"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiAlertLine, RiCheckboxCircleLine, RiCloseLine } from "react-icons/ri";

type DivisionRow = { division_id: number; division_name: string | null };
type UserRow = { id: number; fullname: string | null; division_id: number | null; role_id: number | null };
type SessionRow = { id: number; deadline: string | null; stage: string | null; status: string | null };
type AssignmentRow = {
  id: number;
  session_id: number | null;
  division_id: number | null;
  canvasser_id: number | null;
  released_at: string | null;
  received_at: string | null;
  returned_at: string | null;
  status: string | null;
};

type Props = {
  prId: number;
  prNo: string;
  requestingDivision?: string;
  onClose: () => void;
  onAdvanced?: (prId: number) => void;
  embedded?: boolean;
  readonly?: boolean;
};

const pillCls = "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border";

export default function ReceiveCanvassModal({ prId, prNo, requestingDivision, onClose, onAdvanced, embedded, readonly }: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [embedded]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sess, error: sessErr } = await supabase
        .from("canvass_sessions")
        .select("id, deadline, stage, status")
        .eq("pr_id", prId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessErr) throw sessErr;
      setSession((sess as SessionRow) ?? null);

      const [{ data: divs, error: divErr }, { data: us, error: usErr }, { data: asg, error: asgErr }] =
        await Promise.all([
          supabase.from("divisions").select("division_id, division_name").order("division_name", { ascending: true }),
          supabase
            .from("users")
            .select("id, fullname, division_id, role_id")
            .in("role_id", [6, 7])
            .order("fullname", { ascending: true }),
          sess?.id
            ? supabase
                .from("canvasser_assignments")
                .select("id, session_id, division_id, canvasser_id, released_at, received_at, returned_at, status")
                .eq("session_id", sess.id)
            : Promise.resolve({ data: [] as AssignmentRow[], error: null }),
        ]);

      if (divErr) throw divErr;
      if (usErr) throw usErr;
      if (asgErr) throw asgErr;

      setDivisions((divs as DivisionRow[]) ?? []);
      setUsers((us as UserRow[]) ?? []);
      setAssignments((asg as AssignmentRow[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to load canvass data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prId]);

  const byDivision = useMemo(() => {
    const uByDiv = new Map<number, UserRow[]>();
    for (const u of users) {
      if (typeof u.division_id !== "number") continue;
      const arr = uByDiv.get(u.division_id) ?? [];
      arr.push(u);
      uByDiv.set(u.division_id, arr);
    }
    return uByDiv;
  }, [users]);

  const assignmentFor = (divisionId: number, userId: number) =>
    assignments.find((a) => a.division_id === divisionId && a.canvasser_id === userId);

  const isReleased = (a: AssignmentRow) =>
    Boolean(a.released_at) || ["released", "received", "returned"].includes((a.status ?? "").toLowerCase().trim());

  const isReceived = (a: AssignmentRow) =>
    Boolean(a.received_at) || ["received", "returned"].includes((a.status ?? "").toLowerCase().trim());

  const nameOf = (u: UserRow) => (u.fullname && u.fullname.trim() ? u.fullname.trim() : "—");
  const roleLabel = (roleId: number | null) => (roleId === 7 ? "Canvasser" : roleId === 6 ? "End User" : "User");

  const handleMarkReceived = async (divisionId: number, userId: number) => {
    if (readonly) return;
    const key = `${divisionId}:${userId}`;
    if (!session?.id) {
      setError("No canvass session found for this PR.");
      return;
    }

    setSavingKey(key);
    setError(null);
    try {
      const existing = assignmentFor(divisionId, userId);
      const releasedAssignments = assignments.filter((a) => isReleased(a));
      const willCompleteCollection =
        releasedAssignments.length > 0 &&
        releasedAssignments.every((a) => a.id === existing?.id || isReceived(a));

      if (!existing?.id || !isReleased(existing)) {
        setError("Release the canvass first before marking it as received.");
        return;
      }

      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("canvasser_assignments")
        .update({ received_at: now, status: "received" })
        .eq("id", existing.id);
      if (updErr) throw updErr;

      const { error: remarksErr } = await supabase.from("remarks").insert({
        pr_id: prId,
        remark: "Physical canvass copy received",
        status_flag_id: 2,
        user_id: userId,
      });
      if (remarksErr) {
        console.error("Error saving receipt remark:", remarksErr);
      }

      if (willCompleteCollection) {
        const { error: prErr } = await supabase
          .from("purchase_requests")
          .update({ status_id: 9, status: "Canvassing (Collection)" })
          .eq("id", prId);
        if (prErr) throw prErr;

        const { error: sessErr } = await supabase
          .from("canvass_sessions")
          .update({ stage: "Collection", status: "active" })
          .eq("id", session.id);
        if (sessErr) throw sessErr;

        onAdvanced?.(prId);
      }

      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Receipt acknowledgment failed.";
      setError(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const panel = (
    <div className={`bg-white ${embedded ? "" : "rounded-2xl shadow-2xl"} w-full ${embedded ? "" : "max-w-2xl"} overflow-hidden`}>
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-700">Stage 2 · Canvass Receive</p>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">Mark Canvass as Received</h2>
            <p className="text-sm text-gray-500 mt-1">Confirm receipt of the released canvass sheets for the assigned canvasser.</p>
          </div>
          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-sky-700 text-white flex flex-col items-center justify-center leading-none shadow-sm">
              <span className="text-lg font-extrabold">07</span>
              <span className="text-[10px] font-bold opacity-90 mt-0.5">STEP</span>
            </div>
            {!embedded && (
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
                <RiCloseLine size={22} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4 max-h-[68vh] overflow-y-auto">
        <div className="flex items-start gap-3 px-4 py-3 bg-sky-50 border-l-4 border-sky-400 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
            <RiAlertLine size={18} className="text-sky-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sky-800">
              This view is for receipt only. No release actions appear here.
            </p>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Canvassers by Division</h3>
            <div className="text-[10px] text-gray-400 font-mono">{loading ? "Loading…" : session?.id ? `Session #${session.id}` : "No session"}</div>
          </div>

          <div className="p-4 space-y-4 bg-gray-50">
            {loading ? (
              <div className="text-sm text-gray-500 px-2 py-6">Loading canvassers…</div>
            ) : (
              divisions.map((d) => {
                if (requestingDivision && d.division_name !== requestingDivision) {
                  return null;
                }

                const divUsers = byDivision.get(d.division_id) ?? [];
                const canvassers = divUsers.filter((u) => u.role_id === 7);
                if (canvassers.length === 0) return null;

                return (
                  <div key={d.division_id} className="bg-white rounded-2xl border border-gray-100 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-xs font-extrabold uppercase tracking-wide">
                        {(d.division_name || "Division").trim()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {canvassers.map((u) => {
                        const a = assignmentFor(d.division_id, u.id);
                        const released = a ? isReleased(a) : false;
                        const received = a ? isReceived(a) : false;
                        const statusLabel = received ? "Received" : released ? "Released" : "Pending";
                        const statusCls = received
                          ? "bg-sky-100 text-sky-800 border-sky-200"
                          : released
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-amber-100 text-amber-800 border-amber-200";

                        const key = `${d.division_id}:${u.id}`;
                        const isSaving = savingKey === key;

                        return (
                          <div
                            key={u.id}
                            className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-gray-900 truncate">{nameOf(u)}</p>
                              <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">{roleLabel(u.role_id)}</p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`${pillCls} ${statusCls}`}>{statusLabel}</span>
                              <button
                                type="button"
                                disabled={Boolean(readonly) || !session?.id || isSaving || !released || received}
                                onClick={() => handleMarkReceived(d.division_id, u.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-extrabold transition-all inline-flex items-center gap-2 ${
                                  received
                                    ? "bg-sky-100 text-sky-800 border border-sky-200 cursor-not-allowed"
                                    : released
                                    ? "bg-sky-700 hover:bg-sky-800 text-white"
                                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                } disabled:opacity-60`}
                              >
                                {received ? <RiCheckboxCircleLine size={16} /> : null}
                                {isSaving ? "Saving…" : received ? "Received" : released ? "Mark Received" : "Waiting for Release"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!embedded ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-[80] w-full max-w-2xl">{panel}</div>
        </div>
      ) : (
        panel
      )}
    </>
  );
}