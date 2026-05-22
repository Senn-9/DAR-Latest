import { createClient } from "@/utils/supabase/client";

export type PRDeletePreview = {
  prItems: number;
  purchaseOrders: number;
  poItems: number;
  deliveries: number;
  deliveryDocs: number;
  canvassSessions: number;
  canvassEntries: number;
  canvasserAssignments: number;
  aaaDocs: number;
  orsEntries: number;
  bacLinks: number;
  proposals: number;
  remarks: number;
  total: number;
  // Reference numbers for display in the confirm modal
  poNos: string[];
  orsNos: string[];
  bacNos: string[];
  resolutionNos: string[];
  deliveryNos: string[];
  proposalNos: string[];
};

/**
 * Returns the count of every record that would be removed by deletePRCascade.
 * Used to show a summary before the user confirms deletion.
 */
export async function fetchPRDeletePreview(prId: number): Promise<PRDeletePreview> {
  const supabase = createClient();

  const cnt = async (table: string, col: string, val: number | number[]) => {
    const q = Array.isArray(val)
      ? supabase.from(table).select("*", { count: "exact", head: true }).in(col, val)
      : supabase.from(table).select("*", { count: "exact", head: true }).eq(col, val);
    const { count } = await q;
    return count ?? 0;
  };

  /* ── resolve IDs and reference numbers ────────────── */
  const [poRes, sessionRes] = await Promise.all([
    supabase.from("purchase_orders").select("id, po_no").eq("pr_id", prId),
    supabase.from("canvass_sessions").select("id, bac_no").eq("pr_id", prId),
  ]);
  const poIds      = (poRes.data ?? []).map((r: any) => r.id as number);
  const poNos      = (poRes.data ?? []).map((r: any) => r.po_no as string | null).filter(Boolean) as string[];
  const sessionIds = (sessionRes.data ?? []).map((r: any) => r.id as number);
  const bacNos     = (sessionRes.data ?? []).map((r: any) => r.bac_no as string | null).filter(Boolean) as string[];

  let deliveryIds: number[] = [];
  let deliveryNos: string[] = [];
  if (poIds.length > 0) {
    const { data } = await supabase.from("deliveries").select("id, delivery_no").in("po_id", poIds);
    deliveryIds = (data ?? []).map((r: any) => r.id as number);
    deliveryNos = (data ?? []).map((r: any) => r.delivery_no as string | null).filter(Boolean) as string[];
  }

  /* ── parallel counts + reference data ─────────────── */
  const [
    prItems, poItems, deliveryDocs_iar, deliveryDocs_loa, deliveryDocs_dv,
    canvassEntries, canvasserAssignments, aaaDocs,
    orsData, bacLinksCount, proposalData, remarks, resolutionData,
  ] = await Promise.all([
    cnt("purchase_request_items", "pr_id", prId),
    poIds.length       ? cnt("purchase_order_items",  "po_id",       poIds)      : Promise.resolve(0),
    deliveryIds.length ? cnt("iar_documents",         "delivery_id", deliveryIds) : Promise.resolve(0),
    deliveryIds.length ? cnt("loa_documents",         "delivery_id", deliveryIds) : Promise.resolve(0),
    deliveryIds.length ? cnt("dv_documents",          "delivery_id", deliveryIds) : Promise.resolve(0),
    sessionIds.length  ? cnt("canvass_entries",       "session_id",  sessionIds) : Promise.resolve(0),
    sessionIds.length  ? cnt("canvasser_assignments", "session_id",  sessionIds) : Promise.resolve(0),
    sessionIds.length  ? cnt("aaa_documents",         "session_id",  sessionIds) : Promise.resolve(0),
    supabase.from("ors_entries").select("ors_no").eq("pr_id", prId),
    cnt("bac_resolution_prs", "pr_id", prId),
    supabase.from("proposals").select("proposal_no").eq("pr_id", prId),
    cnt("remarks", "pr_id", prId),
    sessionIds.length
      ? supabase.from("bac_resolution").select("resolution_no").in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { resolution_no: string | null }[] }),
  ]);

  const orsNos        = ((orsData.data ?? []) as any[]).map((r) => r.ors_no).filter(Boolean) as string[];
  const proposalNos   = ((proposalData.data ?? []) as any[]).map((r) => r.proposal_no).filter((v) => v != null).map(String) as string[];
  const resolutionNos = ((resolutionData.data ?? []) as any[]).map((r) => r.resolution_no).filter(Boolean) as string[];

  const purchaseOrders  = poIds.length;
  const canvassSessions = sessionIds.length;
  const deliveries      = deliveryIds.length;
  const deliveryDocs    = deliveryDocs_iar + deliveryDocs_loa + deliveryDocs_dv;
  const orsEntries      = (orsData.data ?? []).length;
  const proposals       = (proposalData.data ?? []).length;

  const total =
    prItems + purchaseOrders + poItems + deliveries + deliveryDocs +
    canvassSessions + canvassEntries + canvasserAssignments + aaaDocs +
    orsEntries + bacLinksCount + proposals + remarks;

  return {
    prItems, purchaseOrders, poItems, deliveries, deliveryDocs,
    canvassSessions, canvassEntries, canvasserAssignments, aaaDocs,
    orsEntries, bacLinks: bacLinksCount, proposals, remarks, total,
    poNos, orsNos, bacNos, resolutionNos, deliveryNos, proposalNos,
  };
}

/**
 * Cascade-deletes a purchase request and EVERY record linked to it:
 *   purchase_request_items, purchase_orders, purchase_order_items,
 *   deliveries, iar_documents, loa_documents, dv_documents,
 *   canvass_sessions, canvass_entries, canvasser_assignments,
 *   aaa_documents, bac_resolution_prs, ors_entries,
 *   proposals, remarks.
 */
export async function deletePRCascade(
  prId: number,
  auditContext?: { userId?: number | null; deletedBy?: string; customRemark?: string },
): Promise<{ error: string | null }> {
  const supabase = createClient();

  /* Helper: delete rows and collect errors without aborting.
     Skips automatically when an array value is empty. */
  const errors: string[] = [];
  const del = async (table: string, col: string, val: number | number[]) => {
    if (Array.isArray(val) && val.length === 0) return;
    const { error } = Array.isArray(val)
      ? await supabase.from(table).delete().in(col, val as number[])
      : await supabase.from(table).delete().eq(col, val as number);
    if (error) {
      // Table absent in this deployment → skip silently
      if (
        error.message.includes("schema cache") ||
        error.message.includes("does not exist") ||
        error.message.includes("Could not find the table")
      ) return;
      errors.push(`${table}(${col}): ${error.message}`);
    }
  };

  try {
    /* ── 0. Gather reference numbers for audit remark ── */
    const [prRes, orsRes, poRes, sessionRes] = await Promise.all([
      supabase.from("purchase_requests").select("pr_no").eq("id", prId).single(),
      supabase.from("ors_entries").select("ors_no").eq("pr_id", prId),
      supabase.from("purchase_orders").select("id, po_no").eq("pr_id", prId),
      supabase.from("canvass_sessions").select("id, bac_no").eq("pr_id", prId),
    ]);

    const prNo       = (prRes.data as any)?.pr_no ?? `#${prId}`;
    const poIds      = (poRes.data ?? []).map((r: any) => r.id as number);
    const poNos      = (poRes.data ?? []).map((r: any) => r.po_no as string | null).filter(Boolean) as string[];
    const orsNos     = (orsRes.data ?? []).map((r: any) => r.ors_no as string | null).filter(Boolean) as string[];
    const sessionIds = (sessionRes.data ?? []).map((r: any) => r.id as number);
    const bacNos     = (sessionRes.data ?? []).map((r: any) => r.bac_no as string | null).filter(Boolean) as string[];

    let deliveryIds: number[] = [];
    let deliveryNos: string[] = [];
    if (poIds.length > 0) {
      const { data: delRows } = await supabase
        .from("deliveries").select("id, delivery_no").in("po_id", poIds);
      deliveryIds = (delRows ?? []).map((r: any) => r.id as number);
      deliveryNos = (delRows ?? []).map((r: any) => r.delivery_no as string | null).filter(Boolean) as string[];
    }

    let resolutionNos: string[] = [];
    let proposalNos: string[] = [];
    await Promise.all([
      sessionIds.length > 0
        ? supabase.from("bac_resolution").select("resolution_no").in("session_id", sessionIds)
            .then(({ data }) => {
              resolutionNos = (data ?? []).map((r: any) => r.resolution_no).filter(Boolean) as string[];
            })
        : Promise.resolve(),
      supabase.from("proposals").select("proposal_no").eq("pr_id", prId)
        .then(({ data }) => {
          proposalNos = (data ?? []).map((r: any) => r.proposal_no).filter((v: any) => v != null).map(String);
        }),
    ]);

    /* ── Audit remark (pr_id omitted → null, survives cascade) ── */
    const auditParts: string[] = [`PR: ${prNo}`];
    if (poNos.length > 0)         auditParts.push(`PO: ${poNos.join(", ")}`);
    if (orsNos.length > 0)        auditParts.push(`ORS: ${orsNos.join(", ")}`);
    if (bacNos.length > 0)        auditParts.push(`BAC No: ${bacNos.join(", ")}`);
    if (resolutionNos.length > 0) auditParts.push(`Resolution: ${resolutionNos.join(", ")}`);
    if (deliveryNos.length > 0)   auditParts.push(`Delivery: ${deliveryNos.join(", ")}`);
    if (proposalNos.length > 0)   auditParts.push(`Proposals: ${proposalNos.join(", ")}`);
    const actor = auditContext?.deletedBy ?? "Admin";
    const remarkText = auditContext?.customRemark ?? `[DELETED by ${actor}] ${auditParts.join(" | ")}`;
    await supabase.from("remarks").insert({
      remark: remarkText,
      user_id: auditContext?.userId ?? null,
      phase: "system",
    });

    /* ── 1. PO / Delivery chain ──────────────────────────────────────
       Correct FK order (child before parent):
         contract_documents → purchase_orders
         remarks(delivery_id) → deliveries
         iar/loa/dv_documents → deliveries
         deliveries → purchase_orders
         remarks(po_id) → purchase_orders
         purchase_order_items → purchase_orders
       ─────────────────────────────────────────────────────────────── */
    if (poIds.length > 0) {
      await del("contract_documents", "po_id", poIds);
      if (deliveryIds.length > 0) {
        await del("remarks",       "delivery_id", deliveryIds);
        await del("iar_documents", "delivery_id", deliveryIds);
        await del("loa_documents", "delivery_id", deliveryIds);
        await del("dv_documents",  "delivery_id", deliveryIds);
        await del("deliveries",    "id",          deliveryIds);
      }
      await del("remarks",               "po_id", poIds);
      await del("purchase_order_items",  "po_id", poIds);
      await del("purchase_orders",       "id",    poIds);
    }

    /* ── 2. Canvass chain ────────────────────────────────────────────
       Correct FK order:
         bac_resolution_prs(resolution_id) → bac_resolution
         bac_resolution(session_id)        → canvass_sessions
         canvass_entries, canvasser_assignments, aaa_documents → canvass_sessions
       ─────────────────────────────────────────────────────────────── */
    await del("bac_resolution_prs", "pr_id", prId);   // must precede bac_resolution
    if (sessionIds.length > 0) {
      await del("bac_resolution",          "session_id", sessionIds);
      await del("canvass_entries",         "session_id", sessionIds);
      await del("canvasser_assignments",   "session_id", sessionIds);
      await del("aaa_documents",           "session_id", sessionIds);
      await del("canvass_sessions",        "id",         sessionIds);
    }

    /* ── 3. Direct PR children ───────────────────────────────────────
       bac_resolution(pr_request_id) is the FK that triggered the bug;
       also catches any rows whose session_id was NULL / already gone.
       ─────────────────────────────────────────────────────────────── */
    await del("bac_resolution",          "pr_request_id", prId);
    await del("ors_entries",             "pr_id",         prId);
    await del("proposals",               "pr_id",         prId);
    await del("remarks",                 "pr_id",         prId);
    await del("purchase_request_items",  "pr_id",         prId);

    /* ── 4. The PR itself (only if no child-table errors) ─────────── */
    if (errors.length > 0) {
      return {
        error: `Some linked records could not be removed (PR not deleted): ${errors.join("; ")}`,
      };
    }

    const { error: prErr } = await supabase
      .from("purchase_requests").delete().eq("id", prId);

    if (prErr) return { error: prErr.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error during delete." };
  }
}
