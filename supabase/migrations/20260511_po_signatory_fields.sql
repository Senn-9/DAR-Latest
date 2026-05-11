-- Ensure signatory and date fields exist on purchase_orders
-- These fields capture the printed names and designations for the PO signatories
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS official_desig TEXT,
  ADD COLUMN IF NOT EXISTS accountant_name TEXT,
  ADD COLUMN IF NOT EXISTS accountant_desig TEXT;

-- Note: the `date` column (PO date) already exists on this table.
-- These fields map to the highlighted sections of the official PO form (Appendix 61):
--   official_name  / official_desig  → "Signature over Printed Name of Authorized Official" (Conforme right)
--   accountant_name / accountant_desig → "Signature over Printed Name of Chief Accountant" (bottom left)
--   date → "Date" field in the PO header
