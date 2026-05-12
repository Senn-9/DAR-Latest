import { createClient } from "@/utils/supabase/client";

export type PODeletePreview = {
  poItems: number;
  deliveries: number;
  iarDocuments: number;
  loaDocuments: number;
  dvDocuments: number;
  contractDocuments: number;
  remarks: number;
  total: number;
};

/**
 * Returns the count of every record that would be removed by deletePOCascade.
 * Used to show a summary before the user confirms deletion.
 */
export async function fetchPODeletePreview(poId: number): Promise<PODeletePreview> {
  const supabase = createClient();

  const cnt = async (table: string, col: string, val: number | number[]) => {
    const q = Array.isArray(val)
      ? supabase.from(table).select("*", { count: "exact", head: true }).in(col, val)
      : supabase.from(table).select("*", { count: "exact", head: true }).eq(col, val);
    const { count } = await q;
    return count ?? 0;
  };

  /* ── resolve delivery IDs ─────────────────────────── */
  const { data: deliveryRows } = await supabase
    .from("deliveries")
    .select("id")
    .eq("po_id", poId);
  const deliveryIds = (deliveryRows ?? []).map((r) => r.id as number);

  /* ── parallel counts ──────────────────────────────── */
  const [
    poItems,
    iarDocuments,
    loaDocuments,
    dvDocuments,
    contractDocuments,
    remarks,
  ] = await Promise.all([
    cnt("purchase_order_items", "po_id", poId),
    deliveryIds.length ? cnt("iar_documents", "delivery_id", deliveryIds) : Promise.resolve(0),
    deliveryIds.length ? cnt("loa_documents", "delivery_id", deliveryIds) : Promise.resolve(0),
    deliveryIds.length ? cnt("dv_documents", "delivery_id", deliveryIds) : Promise.resolve(0),
    cnt("contract_documents", "po_id", poId),
    cnt("remarks", "po_id", poId),
  ]);

  const deliveries = deliveryIds.length;

  const total =
    poItems + deliveries + iarDocuments + loaDocuments + dvDocuments +
    contractDocuments + remarks;

  return {
    poItems,
    deliveries,
    iarDocuments,
    loaDocuments,
    dvDocuments,
    contractDocuments,
    remarks,
    total,
  };
}

/**
 * Cascade-deletes a purchase order and EVERY record linked to it:
 *   purchase_order_items, deliveries, iar_documents, loa_documents,
 *   dv_documents, contract_documents, remarks.
 */
export async function deletePOCascade(poId: number): Promise<{ error: string | null }> {
  const supabase = createClient();

  try {
    /* ── 1. Delivery chain ─────────────────────────── */
    const { data: deliveryRows } = await supabase
      .from("deliveries")
      .select("id")
      .eq("po_id", poId);
    const deliveryIds = (deliveryRows ?? []).map((r) => r.id as number);

    if (deliveryIds.length > 0) {
      await supabase.from("iar_documents").delete().in("delivery_id", deliveryIds);
      await supabase.from("loa_documents").delete().in("delivery_id", deliveryIds);
      await supabase.from("dv_documents").delete().in("delivery_id", deliveryIds);
      await supabase.from("deliveries").delete().in("id", deliveryIds);
    }

    /* ── 2. Direct PO children ───────────────────── */
    await supabase.from("purchase_order_items").delete().eq("po_id", poId);
    await supabase.from("contract_documents").delete().eq("po_id", poId);
    await supabase.from("remarks").delete().eq("po_id", poId);

    /* ── 3. The PO itself ────────────────────────── */
    const { error } = await supabase
      .from("purchase_orders")
      .delete()
      .eq("id", poId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error during delete." };
  }
}
