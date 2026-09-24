/*
# Auto-update Purchase Order Status on Goods Receipt Insertion / Modification

## Overview
This migration creates a database trigger and trigger function that automatically:
1. Synchronizes `received_quantity` on `purchase_order_items` whenever goods receipt items are inserted, updated, or deleted.
2. Updates the associated `purchase_orders.status` to:
   - `received`: when all ordered items are fully received (`total_received >= total_ordered`).
   - `partially_received`: when some items have been received (`total_received > 0` and `< total_ordered`).
   - `approved`: if receipts are deleted or zeroed out and total received returns to 0 (restores prior approved status).
3. Preserves terminal statuses (`closed`, `cancelled`) without unintended overrides.

## Security & Reliability
- Uses `SECURITY DEFINER` so the trigger can update order quantities and status regardless of granular column RLS constraints.
- Atomic execution inside PostgreSQL transactions guarantees data consistency.
*/

-- 1. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.fn_update_po_status_on_grn_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id uuid;
  v_po_status text;
  v_total_ordered numeric;
  v_total_received numeric;
  v_target_po_item_id uuid;
BEGIN
  -- Determine target po_item_id and po_id
  IF TG_OP = 'DELETE' THEN
    v_target_po_item_id := OLD.po_item_id;
  ELSE
    v_target_po_item_id := NEW.po_item_id;
  END IF;

  -- Handle case where po_item_id changed in an UPDATE
  IF TG_OP = 'UPDATE' AND OLD.po_item_id IS DISTINCT FROM NEW.po_item_id THEN
    UPDATE purchase_order_items
    SET received_quantity = COALESCE(
      (SELECT SUM(quantity_received) FROM goods_receipt_items WHERE po_item_id = OLD.po_item_id),
      0
    )
    WHERE id = OLD.po_item_id;
  END IF;

  -- Get the po_id from purchase_order_items
  SELECT po_id INTO v_po_id
  FROM purchase_order_items
  WHERE id = v_target_po_item_id;

  IF v_po_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 1. Sync received_quantity on the affected purchase_order_item
  UPDATE purchase_order_items
  SET received_quantity = COALESCE(
    (SELECT SUM(quantity_received) FROM goods_receipt_items WHERE po_item_id = v_target_po_item_id),
    0
  )
  WHERE id = v_target_po_item_id;

  -- 2. Fetch current PO status
  SELECT status INTO v_po_status
  FROM purchase_orders
  WHERE id = v_po_id;

  -- Only auto-update if not closed or cancelled
  IF v_po_status NOT IN ('closed', 'cancelled') THEN
    -- Calculate totals across all items for this PO
    SELECT 
      COALESCE(SUM(quantity), 0),
      COALESCE(SUM(received_quantity), 0)
    INTO v_total_ordered, v_total_received
    FROM purchase_order_items
    WHERE po_id = v_po_id;

    IF v_total_ordered > 0 AND v_total_received >= v_total_ordered THEN
      UPDATE purchase_orders
      SET status = 'received', updated_at = now()
      WHERE id = v_po_id AND status != 'received';
    ELSIF v_total_received > 0 THEN
      UPDATE purchase_orders
      SET status = 'partially_received', updated_at = now()
      WHERE id = v_po_id AND status != 'partially_received';
    ELSIF v_total_received = 0 AND v_po_status IN ('partially_received', 'received') THEN
      UPDATE purchase_orders
      SET status = 'approved', updated_at = now()
      WHERE id = v_po_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Create the trigger on goods_receipt_items
DROP TRIGGER IF EXISTS trg_update_po_status_on_grn_item ON goods_receipt_items;
CREATE TRIGGER trg_update_po_status_on_grn_item
AFTER INSERT OR UPDATE OR DELETE ON goods_receipt_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_po_status_on_grn_item();
