-- Phase 4 payment workflow: no budget-review step (31); 36 is terminal completed.
-- Requires public.status(id PK, status_name).

INSERT INTO public.status (id, status_name) VALUES
  (28, 'Payment Pending'),
  (29, 'Voucher Verification'),
  (30, 'Accounting Review'),
  (32, 'PARPO Approval'),
  (33, 'Forward to Cash'),
  (34, 'Forward to PARPO office for signature'),
  (35, 'Forward to Accounting for Tax processing'),
  (36, 'Forward to Cash for release (payment completed)')
ON CONFLICT (id) DO UPDATE SET status_name = EXCLUDED.status_name;

-- Legacy rows on removed Budget Review (31) → next step after Accounting Review in new flow
UPDATE public.deliveries SET status_id = 32 WHERE status_id = 31;
