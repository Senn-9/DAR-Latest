import { createClient } from './client';

export interface DeliveryRow {
  id: number;
  po_id: number | null;
  po_no: string;
  supplier: string | null;
  office_section: string | null;
  division_id: number | null;
  status_id: number;
  delivery_no: string;
  dr_no: string | null;
  soa_no: string | null;
  notes: string | null;
  expected_delivery_date: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
  // Additional PO fields
  po_date?: string | null;
  fund_cluster?: string | null;
  responsibility_center_code?: string | null;
  po_items?: Array<{
    stock_no: string | null;
    unit: string | null;
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
    subtotal: number | null;
  }>;
}

export type DeliveryRemarkPhase = "delivery" | "payment";

export interface DeliveryPOContext {
  poId: number | null;
  poNo: string;
  supplier: string;
  prId: string | null;
  prNo: string;
}

export async function fetchDeliveries() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DeliveryRow[];
}

export async function fetchDeliveryById(id: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as DeliveryRow | null;
}

export async function fetchDeliveryPOContext(
  deliveryId: number,
): Promise<DeliveryPOContext | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, po_id, po_no, supplier")
    .eq("id", deliveryId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let prId: string | null = null;
  let prNo = "";
  const poId = (data as any).po_id != null ? Number((data as any).po_id) : null;
  if (poId != null) {
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("id, pr_id, pr_no, date, fund_cluster, office_section")
      .eq("id", poId)
      .maybeSingle();
    if (poErr) throw poErr;
    if (po) {
      prId = (po as any).pr_id != null ? String((po as any).pr_id) : null;
      prNo = String((po as any).pr_no ?? "");
    }
  }

  return {
    poId,
    poNo: String((data as any).po_no ?? ""),
    supplier: String((data as any).supplier ?? "—"),
    prId,
    prNo,
  };
}

export async function fetchDeliveriesByDivision(divisionId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("division_id", divisionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DeliveryRow[];
}

export async function fetchPODataForDelivery(poId: number) {
  const supabase = createClient();
  console.log('fetchPODataForDelivery called with poId:', poId);
  
  // First, try a simple query to see if the PO exists
  const { data: simplePO, error: simpleError } = await supabase
    .from("purchase_orders")
    .select("id, po_no, supplier")
    .eq("id", poId)
    .maybeSingle();
    
  console.log('Simple PO query result:', { simplePO, simpleError });
  
  if (simpleError) {
    console.error('Error in simple PO query:', simpleError);
    throw simpleError;
  }
  
  if (!simplePO) {
    console.log('No PO found with id:', poId);
    return null;
  }
  
  // Now do the full query with items
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(`
      id, po_no, pr_no, pr_id, supplier, address, tin,
      date, fund_cluster, office_section,
      purchase_order_items (
        stock_no, unit, description, quantity, unit_price, subtotal
      )
    `)
    .eq("id", poId)
    .maybeSingle();
    
  console.log('Full PO query result:', { data, error });
  
  if (error) {
    console.error('Error in full PO query:', error);
    throw error;
  }
  return data;
}

export async function fetchPoCandidatesForDelivery() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(`
      id, po_no, pr_no, supplier, office_section, division_id,
      date, fund_cluster,
      purchase_order_items (
        stock_no, unit, description, quantity, unit_price, subtotal
      )
    `)
    /** PO phase complete — served POs are eligible for delivery logging */
    .eq("status_id", 34)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const PAYMENT_PHASE_STATUS_IDS = [
  35, 26, 27, 28, 29, 30, 31, 32, 36,
] as const;

export async function fetchDeliveriesForPaymentPhase(
  divisionId?: number | null,
) {
  const supabase = createClient();
  let q = supabase
    .from("deliveries")
    .select("*")
    .in("status_id", [...PAYMENT_PHASE_STATUS_IDS])
    .order("updated_at", { ascending: false });
  if (divisionId != null) {
    q = q.eq("division_id", divisionId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DeliveryRow[];
}

export async function fetchPaymentPhaseStatuses(): Promise<
  { id: number; status_name: string }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("status")
    .select("id, status_name")
    .in("id", [...PAYMENT_PHASE_STATUS_IDS])
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { id: number; status_name: string }[];
}

export async function insertDelivery(payload: {
  po_id: number | null;
  po_no: string;
  supplier?: string | null;
  office_section?: string | null;
  division_id?: number | null;
  delivery_no: string;
  expected_delivery_date?: string | null;
  created_by?: number | null;
}) {
  const supabase = createClient();
  // Prevent creating another "Log Delivery" when there's an
  // existing active delivery process for the same PO.
  if (payload.po_id != null) {
    const ACTIVE_DELIVERY_STATUS_IDS = [18, 19, 20, 21, 22, 23, 24, 25];
    const { data: existing, error: existErr } = await supabase
      .from("deliveries")
      .select("id")
      .eq("po_id", payload.po_id)
      .in("status_id", ACTIVE_DELIVERY_STATUS_IDS)
      .limit(1);
    if (existErr) throw existErr;
    if (existing && (existing as any).length > 0) {
      throw new Error("This PO already has an active delivery process. Cannot create another Log Delivery.");
    }
  }
  const { data, error } = await supabase
    .from("deliveries")
    .insert({
      ...payload,
      status_id: 18,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DeliveryRow;
}

export async function fetchPoIdsWithActiveDeliveries(): Promise<number[]> {
  const supabase = createClient();
  const ACTIVE_DELIVERY_STATUS_IDS = [18, 19, 20, 21, 22, 23, 24];
  const { data, error } = await supabase
    .from("deliveries")
    .select("po_id");
  if (error) throw error;
  // Filter client-side for status_ids since relationship queries may vary by DB setup
  const { data: rows, error: rowsErr } = await supabase
    .from("deliveries")
    .select("po_id")
    .in("status_id", ACTIVE_DELIVERY_STATUS_IDS);
  if (rowsErr) throw rowsErr;
  return (rows ?? []).map((r: any) => Number(r.po_id));
}

export async function hasActiveDeliveryForPo(poId: number): Promise<boolean> {
  const supabase = createClient();
  const ACTIVE_DELIVERY_STATUS_IDS = [18, 19, 20, 21, 22, 23, 24];
  const { data, error } = await supabase
    .from("deliveries")
    .select("id")
    .eq("po_id", poId)
    .in("status_id", ACTIVE_DELIVERY_STATUS_IDS)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function updateDelivery(
  id: number,
  patch: Partial<
    Pick<
      DeliveryRow,
      | "status_id"
      | "dr_no"
      | "soa_no"
      | "notes"
      | "expected_delivery_date"
      | "supplier"
      | "office_section"
      | "division_id"
    >
  >,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as DeliveryRow;
}

export async function insertDeliveryProcessRemark(
  deliveryId: number,
  userId: string | number | null,
  remark: string,
  statusFlagId: number | null,
  phase: DeliveryRemarkPhase,
) {
  const supabase = createClient();
  const ctx = await fetchDeliveryPOContext(deliveryId);
  if (!ctx?.poId) {
    throw new Error("Linked PO not found for this delivery record.");
  }

  const note = remark.trim();
  const phaseTag = phase === "payment" ? "[PAYMENT]" : "[DELIVERY]";
  const finalRemark = note ? `${phaseTag} ${note}` : phaseTag;

  const { error } = await supabase.from("remarks").insert({
    po_id: ctx.poId,
    pr_id: ctx.prId ? Number(ctx.prId) : null,
    user_id: userId,
    remark: finalRemark,
    status_flag_id: statusFlagId ?? null,
  });
  if (error) throw error;
}

export async function fetchIARByDelivery(deliveryId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("iar_documents")
    .select("*")
    .eq("delivery_id", deliveryId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertIARByDelivery(
  deliveryId: number,
  payload: Record<string, any>,
) {
  const supabase = createClient();
  const existing = await fetchIARByDelivery(deliveryId);
  if (existing?.id) {
    const { data, error } = await supabase
      .from("iar_documents")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("iar_documents")
    .insert({
      delivery_id: deliveryId,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchLOAByDelivery(deliveryId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loa_documents")
    .select("*")
    .eq("delivery_id", deliveryId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertLOAByDelivery(
  deliveryId: number,
  payload: Record<string, any>,
) {
  const supabase = createClient();
  const existing = await fetchLOAByDelivery(deliveryId);
  if (existing?.id) {
    const { data, error } = await supabase
      .from("loa_documents")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("loa_documents")
    .insert({
      delivery_id: deliveryId,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDVByDelivery(deliveryId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dv_documents")
    .select("*")
    .eq("delivery_id", deliveryId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertDVByDelivery(
  deliveryId: number,
  payload: Record<string, any>,
) {
  const supabase = createClient();
  const existing = await fetchDVByDelivery(deliveryId);
  if (existing?.id) {
    const { data, error } = await supabase
      .from("dv_documents")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("dv_documents")
    .insert({
      delivery_id: deliveryId,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDeliveryStatuses(): Promise<
  { id: number; status_name: string }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("status")
    .select("id, status_name")
    .gte("id", 18)
    .lte("id", 36)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { id: number; status_name: string }[];
}

export async function deleteDelivery(id: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("deliveries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export interface DeleteDeliveryPreview {
  deliveryId: string;
  deliveryNo: string;
  poNo: string;
  statusId: number;
  iarCount: number;
  loaCount: number;
  dvCount: number;
}

export async function fetchDeliveryDeletePreview(
  deliveryId: string | number,
): Promise<DeleteDeliveryPreview> {
  const supabase = createClient();
  const { data: d, error: dErr } = await supabase
    .from("deliveries")
    .select("id, delivery_no, po_no, status_id")
    .eq("id", deliveryId)
    .single();
  if (dErr || !d) throw dErr ?? new Error("Delivery not found.");

  const [iar, loa, dv] = await Promise.all([
    supabase
      .from("iar_documents")
      .select("id", { count: "exact", head: true })
      .eq("delivery_id", deliveryId),
    supabase
      .from("loa_documents")
      .select("id", { count: "exact", head: true })
      .eq("delivery_id", deliveryId),
    supabase
      .from("dv_documents")
      .select("id", { count: "exact", head: true })
      .eq("delivery_id", deliveryId),
  ]);

  return {
    deliveryId: String((d as any).id),
    deliveryNo: String((d as any).delivery_no ?? ""),
    poNo: String((d as any).po_no ?? ""),
    statusId: Number((d as any).status_id) || 0,
    iarCount: iar.count ?? 0,
    loaCount: loa.count ?? 0,
    dvCount: dv.count ?? 0,
  };
}

export async function deleteDeliveryDeep(
  deliveryId: string | number,
): Promise<void> {
  const supabase = createClient();
  const { data: d, error: dErr } = await supabase
    .from("deliveries")
    .select("id")
    .eq("id", deliveryId)
    .single();
  if (dErr || !d) throw dErr ?? new Error("Delivery not found.");

  const { error: iarErr } = await supabase
    .from("iar_documents")
    .delete()
    .eq("delivery_id", deliveryId);
  if (iarErr) throw iarErr;

  const { error: loaErr } = await supabase
    .from("loa_documents")
    .delete()
    .eq("delivery_id", deliveryId);
  if (loaErr) throw loaErr;

  const { error: dvErr } = await supabase
    .from("dv_documents")
    .delete()
    .eq("delivery_id", deliveryId);
  if (dvErr) throw dvErr;

  const { error: delErr } = await supabase
    .from("deliveries")
    .delete()
    .eq("id", deliveryId);
  if (delErr) throw delErr;
}
