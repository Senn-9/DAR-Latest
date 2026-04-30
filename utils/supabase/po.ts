import { createClient } from "./client";

export interface PurchaseOrderRow {
  id: number;
  po_no: string | null;
  pr_no: string | null;
  pr_id: number | null;
  supplier: string | null;
  address: string | null;
  tin: string | null;
  procurement_mode: string | null;
  delivery_place: string | null;
  delivery_term: string | null;
  delivery_date: string | null;
  payment_term: string | null;
  date: string | null;
  office_section: string | null;
  fund_cluster: string | null;
  ors_no: string | null;
  ors_date: string | null;
  funds_available: string | null;
  ors_amount: number | null;
  total_amount: number | null;
  status_id: number | null;
  division_id: number | null;
  official_name: string | null;
  official_desig: string | null;
  accountant_name: string | null;
  accountant_desig: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PurchaseOrderItemRow {
  id?: number;
  po_id?: number;
  stock_no: string | null;
  unit: string | null;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal: number | null;
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PurchaseOrderRow[];
}

export async function fetchPurchaseOrdersByDivision(
  divisionId: number,
): Promise<PurchaseOrderRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("division_id", divisionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PurchaseOrderRow[];
}

export async function fetchPOWithItemsById(poId: number): Promise<{
  header: PurchaseOrderRow;
  items: PurchaseOrderItemRow[];
}> {
  const supabase = createClient();
  const { data: header, error: headerError } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", poId)
    .single();
  if (headerError || !header) throw headerError ?? new Error("PO not found");

  const { data: items, error: itemError } = await supabase
    .from("purchase_order_items")
    .select("id, po_id, stock_no, unit, description, quantity, unit_price, subtotal")
    .eq("po_id", poId);
  if (itemError) throw itemError;

  return {
    header: header as PurchaseOrderRow,
    items: (items ?? []) as PurchaseOrderItemRow[],
  };
}

export async function updatePOStatus(poId: number, statusId: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status_id: statusId, updated_at: new Date().toISOString() })
    .eq("id", poId);
  if (error) throw error;
}
