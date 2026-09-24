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
  IF TG_OP = 'DELETE' THEN
    v_target_po_item_id := OLD.po_item_id;
  ELSE
    v_target_po_item_id := NEW.po_item_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.po_item_id IS DISTINCT FROM NEW.po_item_id THEN
    UPDATE purchase_order_items
    SET received_quantity = COALESCE(
      (SELECT SUM(quantity_received) FROM goods_receipt_items WHERE po_item_id = OLD.po_item_id),
      0
    )
    WHERE id = OLD.po_item_id;
  END IF;

  SELECT po_id INTO v_po_id
  FROM purchase_order_items
  WHERE id = v_target_po_item_id;

  IF v_po_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE purchase_order_items
  SET received_quantity = COALESCE(
    (SELECT SUM(quantity_received) FROM goods_receipt_items WHERE po_item_id = v_target_po_item_id),
    0
  )
  WHERE id = v_target_po_item_id;

  SELECT status INTO v_po_status
  FROM purchase_orders
  WHERE id = v_po_id;

  IF v_po_status NOT IN ('closed', 'cancelled') THEN
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

DROP TRIGGER IF EXISTS trg_update_po_status_on_grn_item ON goods_receipt_items;
CREATE TRIGGER trg_update_po_status_on_grn_item
AFTER INSERT OR UPDATE OR DELETE ON goods_receipt_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_po_status_on_grn_item();