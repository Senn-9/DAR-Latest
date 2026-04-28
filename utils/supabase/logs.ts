import { createClient } from "./client";

export type LogPhase = "pr" | "po" | "delivery" | "payment" | "system";

export interface RemarkLogRow {
  id: number;
  remark: string | null;
  created_at: string;
  user_id: number | null;
  pr_id: number | null;
  po_id: number | null;
  delivery_id: number | null;
  status_flag_id: number | null;
  phase: LogPhase | null;
  fullname?: string;
  username?: string;
}

export interface PurchaseRequestRef {
  id: number;
  pr_no: string;
  office_section: string | null;
}

export interface PurchaseOrderRef {
  id: number;
  po_no: string | null;
  pr_no: string | null;
  supplier: string | null;
}

export interface DeliveryRef {
  id: number;
  delivery_no: string;
  po_no: string;
  supplier: string | null;
}

export async function fetchRecentRemarks(limit = 500): Promise<RemarkLogRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("remarks")
    .select(
      `
      id,
      remark,
      created_at,
      user_id,
      pr_id,
      po_id,
      delivery_id,
      status_flag_id,
      phase,
      profiles:user_id (fullname, username)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    remark: (r.remark ?? null) as string | null,
    created_at: String(r.created_at),
    user_id: r.user_id != null ? Number(r.user_id) : null,
    pr_id: r.pr_id != null ? Number(r.pr_id) : null,
    po_id: r.po_id != null ? Number(r.po_id) : null,
    delivery_id: r.delivery_id != null ? Number(r.delivery_id) : null,
    status_flag_id: r.status_flag_id != null ? Number(r.status_flag_id) : null,
    phase: (r.phase ?? null) as LogPhase | null,
    fullname: r.profiles?.fullname ?? undefined,
    username: r.profiles?.username ?? undefined,
  }));
}

export async function fetchRemarksThread(params: {
  poId?: number | null;
  prId?: number | null;
  deliveryId?: number | null;
}): Promise<RemarkLogRow[]> {
  const supabase = createClient();
  let q = supabase
    .from("remarks")
    .select(
      `
      id,
      remark,
      created_at,
      user_id,
      pr_id,
      po_id,
      delivery_id,
      status_flag_id,
      phase,
      profiles:user_id (fullname, username)
    `,
    )
    .order("created_at", { ascending: false });

  if (params.poId != null) q = q.eq("po_id", params.poId);
  else if (params.deliveryId != null) q = q.eq("delivery_id", params.deliveryId);
  else if (params.prId != null) q = q.eq("pr_id", params.prId);
  else return [];

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    remark: (r.remark ?? null) as string | null,
    created_at: String(r.created_at),
    user_id: r.user_id != null ? Number(r.user_id) : null,
    pr_id: r.pr_id != null ? Number(r.pr_id) : null,
    po_id: r.po_id != null ? Number(r.po_id) : null,
    delivery_id: r.delivery_id != null ? Number(r.delivery_id) : null,
    status_flag_id: r.status_flag_id != null ? Number(r.status_flag_id) : null,
    phase: (r.phase ?? null) as LogPhase | null,
    fullname: r.profiles?.fullname ?? undefined,
    username: r.profiles?.username ?? undefined,
  }));
}

export async function fetchPurchaseRequestsByIds(
  ids: number[],
): Promise<PurchaseRequestRef[]> {
  const supabase = createClient();
  const uniq = Array.from(new Set(ids.filter((x) => Number.isFinite(x))));
  if (uniq.length === 0) return [];
  const { data, error } = await supabase
    .from("purchase_requests")
    .select("id, pr_no, office_section")
    .in("id", uniq);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    pr_no: String(r.pr_no ?? ""),
    office_section: r.office_section != null ? String(r.office_section) : null,
  }));
}

export async function fetchPurchaseOrdersByIds(
  ids: number[],
): Promise<PurchaseOrderRef[]> {
  const supabase = createClient();
  const uniq = Array.from(new Set(ids.filter((x) => Number.isFinite(x))));
  if (uniq.length === 0) return [];
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, po_no, pr_no, supplier")
    .in("id", uniq);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    po_no: r.po_no != null ? String(r.po_no) : null,
    pr_no: r.pr_no != null ? String(r.pr_no) : null,
    supplier: r.supplier != null ? String(r.supplier) : null,
  }));
}

export async function fetchDeliveriesByIds(
  ids: number[],
): Promise<DeliveryRef[]> {
  const supabase = createClient();
  const uniq = Array.from(new Set(ids.filter((x) => Number.isFinite(x))));
  if (uniq.length === 0) return [];
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, delivery_no, po_no, supplier")
    .in("id", uniq);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    delivery_no: String(r.delivery_no ?? ""),
    po_no: String(r.po_no ?? ""),
    supplier: r.supplier != null ? String(r.supplier) : null,
  }));
}

