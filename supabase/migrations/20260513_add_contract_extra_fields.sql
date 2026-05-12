-- Add contract_title and second_party_city to contract_documents
alter table public.contract_documents
  add column if not exists contract_title    text,
  add column if not exists second_party_city text;
