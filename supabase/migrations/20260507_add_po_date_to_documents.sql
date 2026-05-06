-- Add po_date column to document tables to store document-specific PO dates
ALTER TABLE public.loa_documents
ADD COLUMN IF NOT EXISTS po_date date;

ALTER TABLE public.iar_documents
ADD COLUMN IF NOT EXISTS po_date date;

ALTER TABLE public.dv_documents
ADD COLUMN IF NOT EXISTS po_date date;
