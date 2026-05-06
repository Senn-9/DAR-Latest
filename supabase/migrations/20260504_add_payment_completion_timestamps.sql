-- Add timestamp fields to track payment progress completion dates
-- These will store when each payment step was completed

ALTER TABLE deliveries 
ADD COLUMN voucher_completed_at TIMESTAMP NULL,
ADD COLUMN accounting_completed_at TIMESTAMP NULL,
ADD COLUMN parpo_approval_completed_at TIMESTAMP NULL,
ADD COLUMN cash_processing_completed_at TIMESTAMP NULL,
ADD COLUMN parpo_signature_completed_at TIMESTAMP NULL,
ADD COLUMN tax_processing_completed_at TIMESTAMP NULL,
ADD COLUMN payment_completed_at TIMESTAMP NULL;

-- Add indexes for better query performance
CREATE INDEX idx_deliveries_voucher_completed_at ON deliveries(voucher_completed_at);
CREATE INDEX idx_deliveries_accounting_completed_at ON deliveries(accounting_completed_at);
CREATE INDEX idx_deliveries_parpo_approval_completed_at ON deliveries(parpo_approval_completed_at);
CREATE INDEX idx_deliveries_cash_processing_completed_at ON deliveries(cash_processing_completed_at);
CREATE INDEX idx_deliveries_parpo_signature_completed_at ON deliveries(parpo_signature_completed_at);
CREATE INDEX idx_deliveries_tax_processing_completed_at ON deliveries(tax_processing_completed_at);
CREATE INDEX idx_deliveries_payment_completed_at ON deliveries(payment_completed_at);
