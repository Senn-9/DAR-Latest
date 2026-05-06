-- Add checkbox state columns to iar_documents
-- inspection_verified: "Inspected, verified and found in order as to quantity and specifications"
-- items_complete: true = Complete Delivery, false = Partial Delivery

ALTER TABLE iar_documents
  ADD COLUMN IF NOT EXISTS inspection_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS items_complete boolean NOT NULL DEFAULT false;
