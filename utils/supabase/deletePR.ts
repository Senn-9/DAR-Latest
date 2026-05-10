import { createClient } from "@/utils/supabase/client";

/**
 * Cascade-deletes a purchase request and EVERY record linked to it:
 *   purchase_request_items, purchase_orders, purchase_order_items,
 *   deliveries, iar_documents, loa_documents, dv_documents,
 *   canvass_sessions, canvass_entries, canvasser_assignments,
 *   aaa_documents, bac_resolution_prs, ors_entries,
 *   proposals, remarks.
 */
export async function deletePRCascade(prId: number): Promise<{ error: string | null }> {
  const supabase = createClient();

  try {
    /* ── 1. PO chain ─────────────────────────────── */
    const { data: poRows } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("pr_id", prId);
    const poIds = (poRows ?? []).map((r) => r.id as number);

    if (poIds.length > 0) {
      const { data: deliveryRows } = await supabase
        .from("deliveries")
        .select("id")
        .in("po_id", poIds);
      const deliveryIds = (deliveryRows ?? []).map((r) => r.id as number);

      if (deliveryIds.length > 0) {
        await supabase.from("iar_documents").delete().in("delivery_id", deliveryIds);
        await supabase.from("loa_documents").delete().in("delivery_id", deliveryIds);
        await supabase.from("dv_documents").delete().in("delivery_id", deliveryIds);
        await supabase.from("deliveries").delete().in("id", deliveryIds);
      }

      await supabase.from("purchase_order_items").delete().in("po_id", poIds);
      await supabase.from("purchase_orders").delete().in("id", poIds);
    }

    /* ── 2. Canvass chain ────────────────────────── */
    const { data: sessionRows } = await supabase
      .from("canvass_sessions")
      .select("id")
      .eq("pr_id", prId);
    const sessionIds = (sessionRows ?? []).map((r) => r.id as number);

    if (sessionIds.length > 0) {
      await supabase.from("canvass_entries").delete().in("session_id", sessionIds);
      await supabase.from("canvasser_assignments").delete().in("session_id", sessionIds);
      await supabase.from("aaa_documents").delete().in("session_id", sessionIds);
      await supabase.from("canvass_sessions").delete().in("id", sessionIds);
    }

    /* ── 3. Direct PR children ───────────────────── */
    await supabase.from("bac_resolution_prs").delete().eq("pr_id", prId);
    await supabase.from("ors_entries").delete().eq("pr_id", prId);
    await supabase.from("proposals").delete().eq("pr_id", prId);
    await supabase.from("remarks").delete().eq("pr_id", prId);
    await supabase.from("purchase_request_items").delete().eq("pr_id", prId);

    /* ── 4. The PR itself ────────────────────────── */
    const { error } = await supabase
      .from("purchase_requests")
      .delete()
      .eq("id", prId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error during delete." };
  }
}
