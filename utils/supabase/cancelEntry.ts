import { createClient } from "@/utils/supabase/client";

export async function cancelPR(
  prId: number,
  auditContext?: {
    userId?: number | null;
    cancelledBy?: string;
    prNo?: string;
    remark?: string;
    action?: "cancel" | "archive";
  },
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const actor = auditContext?.cancelledBy ?? "Admin";
  const isArchive = auditContext?.action === "archive";
  const statusId = isArchive ? 42 : 41;
  const statusLabel = isArchive ? "Archived" : "Cancelled";
  const tag = isArchive ? "ARCHIVED" : "CANCELLED";
  const remarkText =
    auditContext?.remark ??
    `[${tag} by ${actor}]${auditContext?.prNo ? " PR: " + auditContext.prNo : ""}`;

  await supabase.from("remarks").insert({
    pr_id: prId,
    user_id: auditContext?.userId ?? null,
    remark: remarkText,
    status_flag_id: null,
  });

  const { error } = await supabase
    .from("purchase_requests")
    .update({ status_id: statusId, status: statusLabel })
    .eq("id", prId);

  return { error: error?.message ?? null };
}

export async function cancelPO(
  poId: number,
  auditContext?: {
    userId?: number | null;
    cancelledBy?: string;
    poNo?: string;
    remark?: string;
    action?: "cancel" | "archive";
  },
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const actor = auditContext?.cancelledBy ?? "Admin";
  const isArchive = auditContext?.action === "archive";
  const statusId = isArchive ? 42 : 41;
  const tag = isArchive ? "ARCHIVED" : "CANCELLED";
  const remarkText =
    auditContext?.remark ??
    `[${tag} by ${actor}]${auditContext?.poNo ? " PO: " + auditContext.poNo : ""}`;

  await supabase.from("remarks").insert({
    po_id: poId,
    user_id: auditContext?.userId ?? null,
    remark: remarkText,
    status_flag_id: null,
  });

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status_id: statusId })
    .eq("id", poId);

  return { error: error?.message ?? null };
}
