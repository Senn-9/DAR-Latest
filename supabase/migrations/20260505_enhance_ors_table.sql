-- Migration: Add missing fields to ors_entries table to match ORS PDF template (Appendix 11)
-- Compatible with: Supabase SQL Editor (PostgreSQL 15+)

-- Add columns for ORS form fields
ALTER TABLE ors_entries
ADD COLUMN IF NOT EXISTS entity_name TEXT NULL,
ADD COLUMN IF NOT EXISTS payee_address TEXT NULL,
ADD COLUMN IF NOT EXISTS office TEXT NULL,
ADD COLUMN IF NOT EXISTS reference_no TEXT NULL,
ADD COLUMN IF NOT EXISTS obligation_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payable_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_yet_due_balance DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_demandable_balance DECIMAL(15,2) DEFAULT 0;

-- Add comment for reference_no column (separate statement for Supabase compatibility)
COMMENT ON COLUMN ors_entries.reference_no IS 'ORS/JEV/Check/ADA/TRA No.';

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ors_entries_ors_no ON ors_entries(ors_no);
CREATE INDEX IF NOT EXISTS idx_ors_entries_pr_id ON ors_entries(pr_id);
CREATE INDEX IF NOT EXISTS idx_ors_entries_reference_no ON ors_entries(reference_no);
