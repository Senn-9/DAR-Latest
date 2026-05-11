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

  26, 27, 28, 29, 30, 32, 33, 34, 35, 36, 37,

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
  created_by?: number | null;
  dr_no?: string | null;
}) {
  const supabase = createClient();

  // Prevent creating another "Log Delivery" when there's an
  // existing active delivery process for the same PO.
  if (payload.po_id != null) {
    const ACTIVE_DELIVERY_STATUS_IDS = [18, 19, 20, 21, 22, 25];
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

  // Generate unique delivery number with retry mechanism
  const generateUniqueDeliveryNo = async (drNo?: string | null): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    let deliverySuffix = "";
    if (drNo && drNo.trim() !== "") {
      // Clean DR number and use it as prefix
      const cleanDrNo = drNo.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      deliverySuffix = `${cleanDrNo}-${randomSuffix}`;
    } else {
      // Use date-based format for better readability
      const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
      deliverySuffix = `${dateStr}-${randomSuffix}`;
    }

    return `DEL-${year}-${deliverySuffix}`;
  };

  // Try insertion with retry mechanism for unique constraint violations
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const autoDeliveryNo = await generateUniqueDeliveryNo(payload.dr_no);
      
      // Additional check: verify delivery_no doesn't exist before insertion
      const { data: existingDelivery, error: checkError } = await supabase
        .from("deliveries")
        .select("id")
        .eq("delivery_no", autoDeliveryNo)
        .maybeSingle();
      
      if (checkError) throw checkError;
      if (existingDelivery) {
        // Delivery number already exists, try again
        continue;
      }
      
      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          ...payload,
          delivery_no: autoDeliveryNo,
          dr_no: payload.dr_no || null,
          status_id: 18,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        // Check if it's a unique constraint violation on delivery_no
        if (error.code === '23505' && error.message?.includes('delivery_no')) {
          if (attempts < maxAttempts) {
            // Retry with a different delivery number
            continue;
          } else {
            throw new Error("Unable to generate unique delivery number after multiple attempts. Please try again.");
          }
        }
        throw error;
      }
      
      return data as DeliveryRow;
      
    } catch (error: any) {
      if (attempts >= maxAttempts) {
        throw error;
      }
      // For other errors, don't retry
      if (error.code !== '23505') {
        throw error;
      }
    }
  }
  
  throw new Error("Failed to create delivery after multiple attempts.");
}


export async function fetchPoIdsWithActiveDeliveries(): Promise<number[]> {
  const supabase = createClient();

  const ACTIVE_DELIVERY_STATUS_IDS = [18, 19, 20, 21, 22, 25];

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

export async function fetchPoIdsWithCompletedDeliveries(): Promise<number[]> {
  const supabase = createClient();

  // Completed delivery statuses (28+ are payment phase statuses)
  const COMPLETED_DELIVERY_STATUS_IDS = [28, 29, 30, 32, 33, 34, 35, 36, 37];

  const { data, error } = await supabase
    .from("deliveries")
    .select("po_id, status_id")
    .in("status_id", COMPLETED_DELIVERY_STATUS_IDS);

  if (error) throw error;

  console.log("Completed delivery PO IDs:", (data ?? []).map((r: any) => ({ po_id: r.po_id, status_id: r.status_id })));

  return (data ?? []).map((r: any) => Number(r.po_id));
}



export async function hasActiveDeliveryForPo(poId: number): Promise<boolean> {

  const supabase = createClient();

  const ACTIVE_DELIVERY_STATUS_IDS = [18, 19, 20, 21, 22, 25];

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
      | "delivery_no"
    >
  >,
) {
  const supabase = createClient();
  
  // Create a clean update object without any undefined values
  const updateData: any = {
    updated_at: new Date().toISOString()
  };
  
  // Only include fields that are explicitly provided, but exclude 'id' field
  Object.keys(patch).forEach(key => {
    const value = patch[key as keyof typeof patch];
    if (value !== undefined && key !== 'id') {
      updateData[key] = value;
    }
  });
  
  // If dr_no is being updated and delivery_no is not explicitly provided, update delivery_no to use dr_no
  // with uniqueness check to prevent constraint violations
  if (patch.dr_no && !patch.delivery_no) {
    // First check if the dr_no is actually different from the current one
    const { data: currentDelivery, error: fetchError } = await supabase
      .from("deliveries")
      .select("dr_no")
      .eq("id", id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Only update delivery_no if dr_no is actually changing
    if (currentDelivery.dr_no !== patch.dr_no) {
      const now = new Date();
      const year = now.getFullYear();
      const deliveryNo = `DEL-${year}-${patch.dr_no.trim()}`;
      
      // Check if this delivery_no already exists
      const { data: existing, error: checkError } = await supabase
        .from("deliveries")
        .select("id")
        .eq("delivery_no", deliveryNo)
        .neq("id", id) // Exclude current delivery from check
        .maybeSingle();
      
      if (checkError) throw checkError;
      if (existing) {
        throw new Error(`Delivery number ${deliveryNo} already exists. Please use a different DR number or manually specify delivery_no.`);
      }
      
      updateData.delivery_no = deliveryNo;
    }
  }
  
  const { data, error } = await supabase
    .from("deliveries")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as DeliveryRow;
}



export async function updateDeliveryStatusOnly(id: number, statusId: number, previousStatusId?: number) {

  const supabase = createClient();

  

  console.log(`Attempting to update delivery ${id} to status ${statusId} from previous status ${previousStatusId}`);

  

  // First try with timestamps (for when migration is applied)
  const updateDataWithTimestamps: any = {
    status_id: statusId,
    updated_at: new Date().toISOString()
  };

  // Set the appropriate completion timestamp based on the step being completed (previous status)
  const currentTimestamp = new Date().toISOString();
  if (previousStatusId) {
    switch (previousStatusId) {
      case 29: // Voucher Verification completed
        updateDataWithTimestamps.voucher_completed_at = currentTimestamp;
        console.log("Setting voucher_completed_at timestamp for previous status 29");
        break;
      case 30: // Accounting Review completed
        updateDataWithTimestamps.accounting_completed_at = currentTimestamp;
        console.log("Setting accounting_completed_at timestamp for previous status 30");
        break;
      case 32: // PARPO Approval completed
        updateDataWithTimestamps.parpo_approval_completed_at = currentTimestamp;
        console.log("Setting parpo_approval_completed_at timestamp for previous status 32");
        break;
      case 33: // Forward to Cash completed
        updateDataWithTimestamps.cash_processing_completed_at = currentTimestamp;
        console.log("Setting cash_processing_completed_at timestamp for previous status 33");
        break;
      case 34: // PARPO office signature completed
        updateDataWithTimestamps.parpo_signature_completed_at = currentTimestamp;
        console.log("Setting parpo_signature_completed_at timestamp for previous status 34");
        break;
      case 35: // Tax processing completed
        updateDataWithTimestamps.tax_processing_completed_at = currentTimestamp;
        console.log("Setting tax_processing_completed_at timestamp for previous status 35");
        break;
      case 36: // Cash for Release completed
        updateDataWithTimestamps.cash_processing_completed_at = currentTimestamp;
        console.log("Setting cash_processing_completed_at timestamp for previous status 36");
        break;
      case 37: // Payment Completed
        updateDataWithTimestamps.payment_completed_at = currentTimestamp;
        console.log("Setting payment_completed_at timestamp for status 37");
        break;
    }
  } else {
    console.log("No previous status ID provided, cannot set completion timestamp");
  }

  console.log("Attempting to update with timestamp data:", updateDataWithTimestamps);

  // Try update with timestamps first
  let { data, error } = await supabase
    .from("deliveries")
    .update(updateDataWithTimestamps)
    .eq("id", id)
    .select("*")
    .single();

  // If timestamp columns don't exist yet, fall back to basic status update
  if (error && (error.message?.includes('column') || error.message?.includes('does not exist'))) {
    console.log("Timestamp columns not found, falling back to basic status update");
    console.log("Error details:", error.message, error.details);
    console.log("Please ensure the migration 20260504_add_payment_completion_timestamps.sql has been applied to the database");
    
    const basicUpdateData = {
      status_id: statusId,
      updated_at: new Date().toISOString()
    };

    const result = await supabase
      .from("deliveries")
      .update(basicUpdateData)
      .eq("id", id)
      .select("*")
      .single();

    data = result.data;
    error = result.error;
  }

  if (error) {

    console.error("Status update error details:", {

      error,

      deliveryId: id,

      statusId,

      errorMessage: error.message,

      errorDetails: error.details

    });

    throw error;

  }

  

  console.log("Status update successful:", data);

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

    delivery_id: deliveryId,

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

  // Map database field names back to frontend field names for consistency
  if (data) {
    const mappedData = { ...data };
    // Always map database fields to frontend field names for consistency
    if (mappedData.inspector_name) {
      mappedData.inspection_officer = mappedData.inspector_name;
      delete mappedData.inspector_name;
    }
    if (mappedData.supply_officer_name) {
      mappedData.supply_officer = mappedData.supply_officer_name;
      delete mappedData.supply_officer_name;
    }
    if (mappedData.responsibility_center !== undefined && mappedData.responsibility_center !== null) {
      mappedData.responsibility_center_code = mappedData.responsibility_center;
      delete mappedData.responsibility_center;
    }
    // Add iar_date for template usage (format created_at as date)
    if (mappedData.created_at) {
      const createdDate = new Date(mappedData.created_at);
      mappedData.iar_date = createdDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }
    
    // Coerce checkbox states to boolean (DB returns boolean, but default them to false if null)
    mappedData.inspection_verified = mappedData.inspection_verified === true;
    mappedData.items_complete = mappedData.items_complete === true;

    // Parse iar_po_items from JSON string back to array
    if (mappedData.iar_po_items) {
      if (typeof mappedData.iar_po_items === 'string') {
        try {
          mappedData.iar_po_items = JSON.parse(mappedData.iar_po_items);
        } catch {
          mappedData.iar_po_items = [];
        }
      }
    } else {
      mappedData.iar_po_items = [];
    }

    return mappedData;
  }

  return data;

}



export async function upsertIARByDelivery(

  deliveryId: number,

  payload: Record<string, any>,

) {

  const supabase = createClient();

  const existing = await fetchIARByDelivery(deliveryId);

  // Filter out fields that don't exist in the database and map field names
  const filteredPayload = { ...payload };

  delete filteredPayload.fund_cluster; // This comes from PO data
  delete filteredPayload.id; // Never update the id field
  delete filteredPayload.iar_date; // This doesn't exist in database, only used for templates
  delete filteredPayload.po_date; // Remove po_date as it's not a column in iar_documents

  // Coerce checkbox states to boolean before saving
  if (filteredPayload.inspection_verified !== undefined) {
    filteredPayload.inspection_verified = filteredPayload.inspection_verified === true;
  }
  if (filteredPayload.items_complete !== undefined) {
    filteredPayload.items_complete = filteredPayload.items_complete === true;
  }

  // Serialize iar_po_items array to JSON string for DB storage (column is jsonb)
  if (filteredPayload.iar_po_items !== undefined) {
    if (Array.isArray(filteredPayload.iar_po_items)) {
      filteredPayload.iar_po_items = JSON.stringify(filteredPayload.iar_po_items);
    } else if (filteredPayload.iar_po_items === null) {
      filteredPayload.iar_po_items = null;
    }
  }

  // Map frontend field names to database field names for consistency
  if (filteredPayload.inspection_officer) {
    filteredPayload.inspector_name = filteredPayload.inspection_officer;
    delete filteredPayload.inspection_officer;
  }

  if (filteredPayload.supply_officer) {
    filteredPayload.supply_officer_name = filteredPayload.supply_officer;
    delete filteredPayload.supply_officer;
  }

  if (filteredPayload.responsibility_center_code !== undefined) {
    filteredPayload.responsibility_center = filteredPayload.responsibility_center_code;
    delete filteredPayload.responsibility_center_code;
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("iar_documents")
      .update({ ...filteredPayload, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;

    // Add iar_date back for template usage, coerce checkbox booleans, and parse iar_po_items
    let parsedIarPoItems: any[] = [];
    if (data.iar_po_items) {
      try { parsedIarPoItems = typeof data.iar_po_items === 'string' ? JSON.parse(data.iar_po_items) : data.iar_po_items; } catch { parsedIarPoItems = []; }
    }
    const result = {
      ...data,
      inspection_verified: data.inspection_verified === true,
      items_complete: data.items_complete === true,
      iar_po_items: parsedIarPoItems,
      iar_date: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : undefined
    };
    return result;
  }

  const { data, error } = await supabase
    .from("iar_documents")
    .insert({
      delivery_id: deliveryId,
      ...filteredPayload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  // Add iar_date back for template usage, coerce checkbox booleans, and parse iar_po_items
  let parsedIarPoItemsInsert: any[] = [];
  if (data.iar_po_items) {
    try { parsedIarPoItemsInsert = typeof data.iar_po_items === 'string' ? JSON.parse(data.iar_po_items) : data.iar_po_items; } catch { parsedIarPoItemsInsert = []; }
  }
  const result = {
    ...data,
    inspection_verified: data.inspection_verified === true,
    items_complete: data.items_complete === true,
    iar_po_items: parsedIarPoItemsInsert,
    iar_date: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : undefined
  };
  return result;
}

// ... (rest of the code remains the same)

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

  console.log("=== UPSERT LOA BY DELIVERY ===");

  console.log("Delivery ID:", deliveryId);

  console.log("LOA Payload:", payload);

  

  const supabase = createClient();

  const existing = await fetchLOAByDelivery(deliveryId);

  console.log("Existing LOA:", existing);

  

  // Filter out the id field to prevent constraint violations
  const filteredPayload = { ...payload };
  delete filteredPayload.id; // Never update the id field

  if (existing?.id) {

    console.log("Updating existing LOA...");

    const { data, error } = await supabase

      .from("loa_documents")

      .update({ ...filteredPayload, updated_at: new Date().toISOString() })

      .eq("id", existing.id)

      .select("*")

      .single();

    if (error) {

      console.error("LOA update error:", error);

      throw error;

    }

    console.log("LOA updated successfully:", data);

    return data;

  }

  console.log("Inserting new LOA...");

  const { data, error } = await supabase

    .from("loa_documents")

    .insert({

      delivery_id: deliveryId,

      ...filteredPayload,

      created_at: new Date().toISOString(),

      updated_at: new Date().toISOString(),

    })

    .select("*")

    .single();

  if (error) {

    console.error("LOA insert error:", error);

    throw error;

  }

  console.log("LOA inserted successfully:", data);

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
  console.log("=== UPSERT DV BY DELIVERY ===");
  console.log("Delivery ID:", deliveryId);
  console.log("DV Payload:", payload);
  
  const supabase = createClient();
  const existing = await fetchDVByDelivery(deliveryId);
  console.log("Existing DV:", existing);
  
  // Filter out fields that shouldn't be in the database
  const filteredPayload = { ...payload };
  delete filteredPayload.id; // Never update the id field
  delete filteredPayload.delivery_id; // This is set separately
  delete filteredPayload.created_at; // Managed by database
  delete filteredPayload.created_by; // Should be set separately if needed
  
  // Remove any undefined values and validate date fields (except dv_date which accepts any text)
  Object.keys(filteredPayload).forEach(key => {
    const value = filteredPayload[key];
    
    // Remove undefined values
    if (value === undefined) {
      delete filteredPayload[key];
      return;
    }
    
    // dv_date can be any text format, so skip validation for it
    if (key === 'dv_date') {
      return;
    }
    
    // Validate other date fields - they should be null or valid date strings
    if (key.includes('date') || key.includes('_at')) {
      // If it's a number or looks like a number, set to null
      if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '')) {
        console.warn(`Invalid date value for ${key}: ${value}, setting to null`);
        filteredPayload[key] = null;
      }
      // If it's an empty string, set to null
      else if (value === '') {
        filteredPayload[key] = null;
      }
    }
  });

  console.log("Filtered DV Payload:", filteredPayload);

  if (existing?.id) {
    console.log("Updating existing DV...");
    const { data, error } = await supabase
      .from("dv_documents")
      .update({ ...filteredPayload, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      console.error("DV update error:", error);
      console.error("DV update error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("DV updated successfully:", data);
    return data;
  }

  console.log("Inserting new DV...");
  const { data, error } = await supabase
    .from("dv_documents")
    .insert({
      delivery_id: deliveryId,
      ...filteredPayload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("DV insert error:", error);
    console.error("DV insert error details:", JSON.stringify(error, null, 2));
    throw error;
  }

  console.log("DV inserted successfully:", data);
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

  remarksCount: number;

}



export interface DeletePaymentPreview {

  deliveryId: string;

  deliveryNo: string;

  poNo: string;

  statusId: number;

  voucherCount: number;

  orsCount: number;

  dvCount: number;

  remarksCount: number;

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



  const [iar, loa, dv, remarks] = await Promise.all([

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

    supabase

      .from("remarks")

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

    remarksCount: remarks.count ?? 0,

  };

}



export async function fetchPaymentDeletePreview(

  deliveryId: string | number,

): Promise<DeletePaymentPreview> {

  const supabase = createClient();

  const { data: d, error: dErr } = await supabase

    .from("deliveries")

    .select("id, delivery_no, po_no, status_id")

    .eq("id", deliveryId)

    .single();

  if (dErr || !d) throw dErr ?? new Error("Delivery not found.");



  const [iar, loa, dv, remarks] = await Promise.all([

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

    supabase

      .from("remarks")

      .select("id", { count: "exact", head: true })

      .eq("delivery_id", deliveryId)

      .like("remark", "[PAYMENT]%"),

  ]);



  return {

    deliveryId: String((d as any).id),

    deliveryNo: String((d as any).delivery_no ?? ""),

    poNo: String((d as any).po_no ?? ""),

    statusId: Number((d as any).status_id) || 0,

    voucherCount: iar.count ?? 0,

    orsCount: loa.count ?? 0,

    dvCount: dv.count ?? 0,

    remarksCount: remarks.count ?? 0,

  };

}



export async function deletePaymentDeep(

  deliveryId: string | number,

): Promise<void> {

  const supabase = createClient();

  const { data: d, error: dErr } = await supabase

    .from("deliveries")

    .select("id")

    .eq("id", deliveryId)

    .single();

  if (dErr || !d) throw dErr ?? new Error("Delivery not found.");



  // Delete payment-related records first to avoid foreign key constraints

  const { error: remarksErr } = await supabase

    .from("remarks")

    .delete()

    .eq("delivery_id", deliveryId);

  if (remarksErr) throw remarksErr;



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



  // Finally delete the delivery record

  const { error: delErr } = await supabase

    .from("deliveries")

    .delete()

    .eq("id", deliveryId);

  if (delErr) throw delErr;

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



  // Delete related records first to avoid foreign key constraints

  const { error: remarksErr } = await supabase

    .from("remarks")

    .delete()

    .eq("delivery_id", deliveryId);

  if (remarksErr) throw remarksErr;



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



  // Finally delete the delivery record

  const { error: delErr } = await supabase

    .from("deliveries")

    .delete()

    .eq("id", deliveryId);

  if (delErr) throw delErr;

}

export async function applyTimestampMigration() {
  const supabase = createClient();
  console.log('Applying timestamp columns migration...');
  
  try {
    // Execute the SQL to add timestamp columns
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE deliveries 
        ADD COLUMN IF NOT EXISTS voucher_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS accounting_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS parpo_approval_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS cash_processing_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS parpo_signature_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS tax_processing_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP NULL;
      `
    });
    
    if (error) {
      console.error('Error applying migration:', error);
      
      // Try alternative approach using direct SQL
      console.log('Trying alternative approach...');
      
      const { data, error: altError } = await supabase
        .from('deliveries')
        .select('id')
        .limit(1);
      
      if (altError) {
        console.error('Database connection error:', altError);
      } else {
        console.log('Database connection successful, but migration failed');
        console.log('Please manually run the SQL from 20260504_add_payment_completion_timestamps.sql');
      }
    } else {
      console.log('Migration applied successfully!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}
