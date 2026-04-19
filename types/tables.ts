export type ID = number
export type Timestamp = string

// ───────────────── USERS ─────────────────
export type User = {
  id: ID
  created_at: Timestamp
  fullname: string | null
  password: string | null
  username: string | null
  division_id: ID | null
  role_id: ID | null
  last_login: Timestamp | null
}

export type Role = {
  role_id: ID
  role_name: string | null
}

// ───────────────── DIVISIONS ─────────────────
export type Division = {
  division_id: ID
  division_name: string | null
}

export type DivisionBudget = {
  id: ID
  division_id: ID
  fiscal_year: number
  allocated: number
  utilized: number
  notes: string | null
  created_at: Timestamp
  updated_at: Timestamp | null
}

// ───────────────── STATUS ─────────────────
export type Status = {
  id: ID
  status_name: string
}

export type StatusFlag = {
  id: ID
  flag_name: string | null
}

// ───────────────── PURCHASE REQUEST ─────────────────
export type PurchaseRequest = {
  id: ID
  pr_no: string
  office_section: string
  resp_code: string | null
  purpose: string
  total_cost: number
  is_high_value: boolean
  status: string
  budget_number: string | null
  pap_code: string | null
  proposal_file: string | null
  created_at: Timestamp | null
  entity_name: string | null
  fund_cluster: string | null
  req_name: string | null
  req_desig: string | null
  app_name: string | null
  app_desig: string | null
  app_no: string | null
  status_id: ID | null
  proposal_no: string | null
  division_id: ID | null
  updated_at: Timestamp | null
}

export type PurchaseRequestItem = {
  id: ID
  pr_id: ID
  description: string
  stock_no: string | null
  unit: string | null
  quantity: number
  unit_price: number
  subtotal: number
  created_at: Timestamp
}

// ───────────────── CANVASS ─────────────────
export type CanvassSession = {
  id: ID
  created_at: Timestamp
  updated_at: Timestamp | null
  pr_id: ID | null
  stage: string | null
  released_by: ID | null
  deadline: Timestamp | null
  status: string | null
  bac_no: string | null
}

export type CanvassEntry = {
  id: ID
  session_id: ID | null
  item_no: number | null
  description: string | null
  unit: string | null
  quantity: number | null
  supplier_name: string | null
  unit_price: number | null
  total_price: number | null
  is_winning: boolean | null
  created_at: Timestamp
  tin_no: string | null
  delivery_days: string | null
  assignment_id: ID | null
  supplier_address: string | null
}

export type CanvasserAssignment = {
  id: ID
  session_id: ID | null
  division_id: ID | null
  canvasser_id: ID | null
  released_at: Timestamp | null
  returned_at: Timestamp | null
  status: string | null
  quotation_no: string | null
  rfq_index: number | null
}

// ───────────────── BAC ─────────────────
export type BacResolution = {
  id: ID
  session_id: ID | null
  resolution_no: string | null
  prepared_by: ID | null
  resolved_at: Timestamp | null
  notes: string | null
  mode: string | null
  division_id: ID | null
  whereas_1: string | null
  whereas_2: string | null
  whereas_3: string | null
  now_therefore_text: string | null
  resolved_at_place: string | null
}

export type BacResolutionPR = {
  id: ID
  resolution_id: ID
  pr_id: ID | null
  pr_no: string
  pr_date: string | null
  estimated_cost: number
  end_user: string | null
  recommended_mode: string | null
}

// ───────────────── AAA ─────────────────
export type AAADocument = {
  id: ID
  session_id: ID | null
  aaa_no: string | null
  prepared_by: ID | null
  prepared_at: Timestamp | null
  file_url: string | null
  particulars: string | null
}

// ───────────────── DELIVERY (NEW CORE FLOW) ─────────────────
export type Delivery = {
  id: ID
  po_id: ID | null
  po_no: string
  supplier: string | null
  office_section: string | null
  division_id: ID | null
  status_id: ID
  delivery_no: string
  dr_no: string | null
  soa_no: string | null
  notes: string | null
  created_by: ID | null
  created_at: Timestamp
  updated_at: Timestamp | null
  expected_delivery_date: string | null
}

// ───────────────── DV (DISBURSEMENT VOUCHER) ─────────────────
export type DVDocument = {
  id: ID
  delivery_id: ID
  dv_no: string | null
  fund_cluster: string | null
  ors_no: string | null
  payee: string | null
  payee_tin: string | null
  address: string | null
  particulars: string | null
  responsibility_center: string | null
  mfo_pap: string | null
  amount_due: string | null
  mode_of_payment: string | null
  certified_by: string | null
  approved_by: string | null
  created_by: ID | null
  created_at: Timestamp
  updated_at: Timestamp | null
}

// ───────────────── IAR ─────────────────
export type IARDocument = {
  id: ID
  delivery_id: ID
  iar_no: string | null
  po_no: string | null
  invoice_no: string | null
  invoice_date: string | null
  requisitioning_office: string | null
  responsibility_center: string | null
  inspected_at: string | null
  received_at: string | null
  inspector_name: string | null
  supply_officer_name: string | null
  created_by: ID | null
  created_at: Timestamp
  updated_at: Timestamp | null
}

// ───────────────── LOA ─────────────────
export type LOADocument = {
  id: ID
  delivery_id: ID
  loa_no: string | null
  po_no: string | null
  invoice_no: string | null
  invoice_date: string | null
  accepted_at: string | null
  accepted_by_name: string | null
  accepted_by_title: string | null
  created_by: ID | null
  created_at: Timestamp
  updated_at: Timestamp | null
}

// ───────────────── ORS ─────────────────
export type ORSEntry = {
  id: ID
  ors_no: string | null
  pr_id: ID | null
  pr_no: string | null
  division_id: ID | null
  fiscal_year: number | null
  amount: number
  status: string | null
  prepared_by: ID | null
  approved_by: ID | null
  notes: string | null
  created_at: Timestamp
  updated_at: Timestamp | null
  fund_cluster: string | null
  responsibility_center: string | null
  particulars: string | null
  mfo_pap: string | null
  uacs_code: string | null
  prepared_by_name: string | null
  prepared_by_desig: string | null
  approved_by_name: string | null
  approved_by_desig: string | null
  date_created: string | null
}

// ───────────────── PURCHASE ORDER ─────────────────
export type PurchaseOrder = {
  id: ID
  created_at: Timestamp
  updated_at: Timestamp | null
  po_no: string | null
  pr_no: string | null
  pr_id: ID | null
  supplier: string | null
  address: string | null
  tin: string | null
  procurement_mode: string | null
  delivery_place: string | null
  delivery_term: string | null
  delivery_date: string | null
  payment_term: string | null
  date: string | null
  office_section: string | null
  fund_cluster: string | null
  ors_no: string | null
  ors_date: string | null
  funds_available: string | null
  ors_amount: number | null
  total_amount: number | null
  status_id: ID | null
  division_id: ID | null
  official_name: string | null
  official_desig: string | null
  accountant_name: string | null
  accountant_desig: string | null
}

export type PurchaseOrderItem = {
  id: ID
  po_id: ID | null
  stock_no: string | null
  unit: string | null
  description: string | null
  quantity: number | null
  unit_price: number | null
  subtotal: number | null
}

// ───────────────── REMARKS (UPDATED) ─────────────────
export type Remark = {
  id: ID
  remark: string | null
  created_at: Timestamp
  user_id: ID | null
  pr_id: ID | null
  status_flag_id: ID | null
  prform_id: ID | null
  po_id: ID | null
  delivery_id: ID | null
  phase: "pr" | "po" | "delivery" | "payment" | "system" | null
}