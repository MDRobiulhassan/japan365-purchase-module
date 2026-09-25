-- Revoke EXECUTE from authenticated for internal trigger functions
-- These are only fired by database triggers, never called via RPC
REVOKE EXECUTE ON FUNCTION public.fn_sync_po_financial_totals() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_update_po_status_on_grn_item() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_auto_sync_invoice_status() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_calc_po_item_line_total() FROM authenticated;