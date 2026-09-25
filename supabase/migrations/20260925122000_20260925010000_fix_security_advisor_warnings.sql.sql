-- Fix 1: Add search_path to trigger functions missing it
CREATE OR REPLACE FUNCTION public.fn_auto_sync_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.amount_paid = GREATEST(0, COALESCE(NEW.amount_paid, 0));
  NEW.total_amount = GREATEST(0, COALESCE(NEW.total_amount, 0));

  IF NEW.amount_paid >= NEW.total_amount AND NEW.total_amount > 0 THEN
    NEW.status = 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partially_paid';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status != 'paid' THEN
    NEW.status = 'overdue';
  ELSIF NEW.amount_paid = 0 AND NEW.status = 'paid' THEN
    NEW.status = 'unpaid';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_calc_po_item_line_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.quantity = GREATEST(0, COALESCE(NEW.quantity, 1));
  NEW.unit_price = GREATEST(0, COALESCE(NEW.unit_price, 0));
  NEW.line_total = ROUND(NEW.quantity * NEW.unit_price, 2);
  NEW.received_quantity = GREATEST(0, COALESCE(NEW.received_quantity, 0));
  RETURN NEW;
END;
$$;

-- Fix 2: Revoke EXECUTE from PUBLIC and anon for all SECURITY DEFINER functions
-- Trigger functions (not meant to be called via RPC)
REVOKE EXECUTE ON FUNCTION public.fn_sync_po_financial_totals() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_po_status_on_grn_item() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_sync_invoice_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_calc_po_item_line_total() FROM PUBLIC, anon;

-- Utility functions (called via RPC by authenticated frontend only)
REVOKE EXECUTE ON FUNCTION public.user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_overdue_invoices() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_po_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_grn_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_supplier_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number() FROM PUBLIC, anon;

-- Re-grant to authenticated only
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_overdue_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_po_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_grn_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_supplier_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated;