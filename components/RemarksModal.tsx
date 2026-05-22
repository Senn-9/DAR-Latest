"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RiChat3Line,
  RiCloseLine,
  RiFlagLine,
  RiSendPlaneLine,
} from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";
import { fetchRemarksThread, type LogPhase, type RemarkLogRow } from "@/utils/supabase/logs";

// ── Flag display config keyed by DB id ────────────────────────────────────────
const FLAG_CFG: Record<
  number,
  { label: string; color: string; bg: string; border: string }
> = {
  1: { label: "No Flag",    color: "text-gray-500",   bg: "bg-gray-100",   border: "border-gray-300" },
  2: { label: "Completed",  color: "text-green-700",  bg: "bg-green-100",  border: "border-green-400" },
  3: { label: "Incomplete", color: "text-yellow-700", bg: "bg-yellow-100", border: "border-yellow-400" },
};

function phaseBadge(phase: LogPhase) {
  if (phase === "pr")       return "bg-blue-100 text-blue-700";
  if (phase === "po")       return "bg-purple-100 text-purple-700";
  if (phase === "delivery") return "bg-teal-100 text-teal-700";
  if (phase === "payment")  return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
}

function inferPhase(r: RemarkLogRow): LogPhase {
  if (r.phase) return r.phase;
  const raw = (r.remark ?? "").toUpperCase();
  const m = raw.match(/\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]/);
  if (m?.[1]) {
    const tag = m[1].toLowerCase();
    if (["pr", "po", "delivery", "payment", "system"].includes(tag))
      return tag as LogPhase;
  }
  if (r.delivery_id != null) return "delivery";
  if (r.po_id != null && r.pr_id == null) return "po";
  if (r.pr_id != null) return "pr";
  return "system";
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface RemarkTarget {
  prId?: number | null;
  poId?: number | null;
  deliveryId?: number | null;
}

export interface RemarksModalProps {
  visible: boolean;
  onClose: () => void;
  /** Which entity IDs to load remarks for and attach to new remarks */
  target: RemarkTarget;
  /** Phase tag written into new remarks */
  phase: LogPhase;
  title?: string;
  subtitle?: string;
  /** User ID for authorship on new remarks */
  currentUserId?: number | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RemarksModal({
  visible,
  onClose,
  target,
  phase,
  title,
  subtitle,
  currentUserId,
}: RemarksModalProps) {
  const supabase = createClient();

  const [remarks, setRemarks]           = useState<RemarkLogRow[]>([]);
  const [loading, setLoading]           = useState(false);
  const [flagOptions, setFlagOptions]   = useState<{ id: number; flag_name: string | null }[]>([]);
  const [selectedFlagId, setSelectedFlagId] = useState<number | null>(null);
  const [text, setText]                 = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const bottomRef                       = useRef<HTMLDivElement>(null);

  // Stable fetch helper -------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchRemarksThread({
        prId:       target.prId,
        poId:       target.poId,
        deliveryId: target.deliveryId,
      });
      // Display oldest → newest (chat style)
      setRemarks(rows.slice().reverse());
    } catch {
      setRemarks([]);
    } finally {
      setLoading(false);
    }
  }, [target.prId, target.poId, target.deliveryId]);

  // Load on open --------------------------------------------------------------
  useEffect(() => {
    if (!visible) return;
    load();
    supabase
      .from("status_flag")
      .select("id, flag_name")
      .order("id", { ascending: true })
      .then(({ data }) => setFlagOptions(data ?? []));
  }, [visible, load]);

  // Auto-scroll to bottom after remarks load ----------------------------------
  useEffect(() => {
    if (!loading) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [remarks, loading]);

  // Post remark ---------------------------------------------------------------
  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error: err } = await supabase.from("remarks").insert({
        remark:         trimmed,
        phase,
        pr_id:          target.prId       ?? null,
        po_id:          target.poId       ?? null,
        delivery_id:    target.deliveryId ?? null,
        status_flag_id: selectedFlagId,
        user_id:        currentUserId     ?? null,
      });
      if (err) throw err;
      setText("");
      setSelectedFlagId(null);
      await load();
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to post remark.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 bg-emerald-700 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <RiChat3Line size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {title ?? "Remarks"}
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5 truncate">
                  {subtitle ?? "Remarks thread"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              aria-label="Close"
            >
              <RiCloseLine size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* ── Remarks list ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <p className="text-sm">Loading remarks…</p>
            </div>
          ) : remarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <RiChat3Line size={38} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">No remarks yet.</p>
              <p className="text-xs mt-1">Be the first to add a remark below.</p>
            </div>
          ) : (
            remarks.map((r) => {
              const ph       = inferPhase(r);
              const flagCfg  = r.status_flag_id ? (FLAG_CFG[r.status_flag_id] ?? null) : null;
              const cleanText = (r.remark ?? "").replace(
                /\[(PR|PO|DELIVERY|PAYMENT|SYSTEM)\]\s*/i,
                "",
              );
              return (
                <div
                  key={r.id}
                  className="bg-gray-50 rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${phaseBadge(ph)}`}
                      >
                        {ph.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-600 font-semibold truncate">
                        {r.fullname ?? r.username ?? "Unknown"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(r.created_at).toLocaleDateString("en-PH", {
                        year:   "numeric",
                        month:  "short",
                        day:    "numeric",
                        hour:   "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {cleanText || "—"}
                  </p>

                  {flagCfg && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <RiFlagLine size={12} className={flagCfg.color} />
                      <span className={`text-xs font-semibold ${flagCfg.color}`}>
                        {flagCfg.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Compose area ── */}
        <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 rounded-b-2xl shrink-0 space-y-3">
          {/* Flag pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mr-1">
              Flag:
            </span>
            {flagOptions.map((f) => {
              const cfg        = f.id in FLAG_CFG ? FLAG_CFG[f.id] : null;
              const isSelected = selectedFlagId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFlagId(isSelected ? null : f.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isSelected
                      ? `${cfg?.bg ?? "bg-gray-100"} ${cfg?.color ?? "text-gray-600"} ${cfg?.border ?? "border-gray-300"}`
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <RiFlagLine size={11} />
                  {f.flag_name ?? "Flag"}
                </button>
              );
            })}
          </div>

          {/* Textarea + send */}
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
              rows={3}
              disabled={submitting}
              placeholder={`Add a remark… (Ctrl+Enter to post)`}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 placeholder-gray-300"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 self-end whitespace-nowrap"
            >
              <RiSendPlaneLine size={16} />
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>

          {submitError && (
            <p className="text-xs text-red-600 font-semibold">{submitError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
