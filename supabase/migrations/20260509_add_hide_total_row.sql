-- Migration: Add hide_total_row column to purchase_orders
-- Stores whether the PO was printed without the TOTAL row in the items table
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS hide_total_row BOOLEAN DEFAULT FALSE;
