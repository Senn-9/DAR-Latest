-- ============================================================
-- Migration: Contract Documents table
-- Date: 2026-05-12
-- ============================================================

create table public.contract_documents (
  id                          serial primary key,
  po_id                       integer not null references public.purchase_orders(id) on delete cascade,
  po_no                       text,

  -- First party (from PO)
  first_party_agency          text,
  first_party_rep             text,
  first_party_office          text,
  first_party_city            text,

  -- Second party (from PO supplier fields)
  second_party_name           text,
  second_party_rep            text,
  second_party_address        text,

  -- Contract body (manual)
  consideration_amount        numeric,
  consideration_amount_words  text,
  service_description         text,
  delivery_location           text,
  payment_condition           text,

  -- Job order (manual)
  job_order_description       text,
  scheduled_days              text,
  liquidated_damages_rate     text default '1/10th of 1%',

  -- Dates (editable defaults)
  contract_date               date,
  commencement_date           date,
  commencement_location       text,

  -- Witnesses
  witness_one                 text,
  witness_two                 text,

  -- Meta
  created_by                  integer references public.users(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz
);
