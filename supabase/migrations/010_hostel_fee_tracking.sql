-- Migration 010: Add fee tracking columns to hostel_allocations
-- Previously fee_status was hardcoded to 'pending' in the API — now stored per allocation.

ALTER TABLE hostel_allocations
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_status  VARCHAR(50)   DEFAULT 'pending';
