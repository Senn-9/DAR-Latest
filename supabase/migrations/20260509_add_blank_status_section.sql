-- Migration: Add blank_status_section column to ors_entries
-- Stores whether the ORS was created with Section C (Status of Obligation) blank
ALTER TABLE ors_entries
ADD COLUMN IF NOT EXISTS blank_status_section BOOLEAN DEFAULT FALSE;
