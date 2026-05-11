-- ============================================================
-- Migration: Add missing ORS and PO fields
-- Date: 2026-05-11
-- ============================================================

-- ors_entries: payee name (shown in preview but was never persisted)
ALTER TABLE ors_entries
  ADD COLUMN IF NOT EXISTS payee TEXT;

-- ors_entries: Section A & B signature dates (new date inputs)
ALTER TABLE ors_entries
  ADD COLUMN IF NOT EXISTS prepared_by_date TEXT,
  ADD COLUMN IF NOT EXISTS certified_by_date TEXT;

-- purchase_orders: Conforme section supplier signature date
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS conforme_date TEXT;

-- purchase_orders: hide_total_row flag (was in app code but missing from DB type)
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS hide_total_row BOOLEAN DEFAULT FALSE;
