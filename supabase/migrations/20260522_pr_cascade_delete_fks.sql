-- Migration: Add ON DELETE CASCADE to leaf-level FK constraints pointing to
-- purchase_requests.id.
--
-- Root cause: when a PR is deleted via the Supabase client, RLS policies on
-- certain child tables silently block the DELETE (returning success with 0 rows
-- affected, no error) which leaves orphaned rows that cause an FK violation
-- when Postgres tries to remove the parent purchase_requests row.
--
-- Fix: for tables that are leaf-level (i.e. no other tables have FKs pointing
-- INTO them from the PR delete chain), switch the FK from RESTRICT (default)
-- to CASCADE. Postgres will then automatically remove these rows as part of
-- the PR deletion, bypassing the per-table RLS that blocks the client-side
-- DELETE.
--
-- Tables with their own child chains (purchase_orders → purchase_order_items,
-- canvass_sessions → canvass_entries, etc.) are intentionally left out here
-- because cascading through them requires also cascading their entire subtree.
-- Those are handled by the explicit ordered deletes in deletePRCascade.

-- ── ors_entries (confirmed source of FK violation) ───────────────────────────
ALTER TABLE ors_entries
  DROP CONSTRAINT IF EXISTS ors_entries_pr_id_fkey;
ALTER TABLE ors_entries
  ADD CONSTRAINT ors_entries_pr_id_fkey
    FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;

-- ── purchase_request_items (leaf table) ──────────────────────────────────────
ALTER TABLE purchase_request_items
  DROP CONSTRAINT IF EXISTS purchase_request_items_pr_id_fkey;
ALTER TABLE purchase_request_items
  ADD CONSTRAINT purchase_request_items_pr_id_fkey
    FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;

-- ── proposals (leaf table) ───────────────────────────────────────────────────
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_pr_id_fkey;
ALTER TABLE proposals
  ADD CONSTRAINT proposals_pr_id_fkey
    FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;

-- ── remarks / pr_id (leaf — no child tables reference remarks.id via pr) ─────
ALTER TABLE remarks
  DROP CONSTRAINT IF EXISTS remarks_pr_id_fkey;
ALTER TABLE remarks
  ADD CONSTRAINT remarks_pr_id_fkey
    FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;

-- ── bac_resolution_prs / pr_id (linking table, safe leaf w.r.t. PR) ─────────
ALTER TABLE bac_resolution_prs
  DROP CONSTRAINT IF EXISTS bac_resolution_prs_pr_id_fkey;
ALTER TABLE bac_resolution_prs
  ADD CONSTRAINT bac_resolution_prs_pr_id_fkey
    FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;
