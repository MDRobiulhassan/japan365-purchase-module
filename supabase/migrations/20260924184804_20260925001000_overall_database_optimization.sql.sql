-- 1. AUTOMATED TIMESTAMPS

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_invoices_updated_at ON purchase_invoices;
CREATE TRIGGER trg_purchase_invoices_updated_at
BEFORE UPDATE ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_goods_receipts_updated_at ON goods_receipts;
CREATE TRIGGER trg_goods_receipts_updated_at
BEFORE UPDATE ON goods_receipts
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

-- 2. FINANCIAL DATA INTEGRITY

CREATE OR REPLACE FUNCTION public.fn_calc_po_item_line_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.quantity = GREATEST(0, COALESCE(NEW.quantity, 1));
  NEW.unit_price = GREATEST(0, COALESCE(NEW.unit_price, 0));
  NEW.line_total = ROUND(NEW.quantity * NEW.unit_price, 2);
  NEW.received_quantity = GREATEST(0, COALESCE(NEW.received_quantity, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_po_item_line_total ON purchase_order_items;
CREATE TRIGGER trg_po_item_line_total
BEFORE INSERT OR UPDATE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_calc_po_item_line_total();

CREATE OR REPLACE FUNCTION public.fn_sync_po_financial_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id uuid;
  v_subtotal numeric(14,2);
  v_tax_rate numeric(5,2);
  v_shipping_cost numeric(14,2);
  v_tax_amount numeric(14,2);
  v_total_amount numeric(14,2);
BEGIN
  v_po_id := COALESCE(NEW.po_id, OLD.po_id);
  IF v_po_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM purchase_order_items
  WHERE po_id = v_po_id;

  SELECT COALESCE(tax_rate, 0), COALESCE(shipping_cost, 0)
  INTO v_tax_rate, v_shipping_cost
  FROM purchase_orders
  WHERE id = v_po_id;

  v_tax_amount := ROUND(v_subtotal * (v_tax_rate / 100), 2);
  v_total_amount := v_subtotal + v_tax_amount + v_shipping_cost;

  UPDATE purchase_orders
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_amount = v_total_amount,
    updated_at = now()
  WHERE id = v_po_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_po_financial_totals ON purchase_order_items;
CREATE TRIGGER trg_sync_po_financial_totals
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_po_financial_totals();

-- 3. INVOICE STATUS AUTOMATION

CREATE OR REPLACE FUNCTION public.fn_auto_sync_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_auto_sync_invoice_status ON purchase_invoices;
CREATE TRIGGER trg_auto_sync_invoice_status
BEFORE INSERT OR UPDATE ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_sync_invoice_status();

CREATE OR REPLACE FUNCTION public.sync_overdue_invoices()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count int;
BEGIN
  UPDATE purchase_invoices
  SET status = 'overdue', updated_at = now()
  WHERE status = 'unpaid'
    AND due_date < CURRENT_DATE
    AND amount_paid < total_amount;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_overdue_invoices() TO authenticated, anon;

-- 4. AUTO NUMBER GENERATORS

CREATE OR REPLACE FUNCTION public.get_next_po_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(CURRENT_DATE, 'YYYY');
  v_prefix text := 'PO-' || v_year || '-';
  v_next_val int;
BEGIN
  SELECT COALESCE(
    MAX(
      NULLIF(regexp_replace(po_number, '^PO-\d{4}-', ''), '')::int
    ), 0
  ) + 1
  INTO v_next_val
  FROM purchase_orders
  WHERE po_number LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next_val::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_grn_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(CURRENT_DATE, 'YYYY');
  v_prefix text := 'GRN-' || v_year || '-';
  v_next_val int;
BEGIN
  SELECT COALESCE(
    MAX(
      NULLIF(regexp_replace(grn_number, '^GRN-\d{4}-', ''), '')::int
    ), 0
  ) + 1
  INTO v_next_val
  FROM goods_receipts
  WHERE grn_number LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next_val::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_supplier_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_val int;
BEGIN
  SELECT COALESCE(
    MAX(
      NULLIF(regexp_replace(code, '^SUP-', ''), '')::int
    ), 0
  ) + 1
  INTO v_next_val
  FROM suppliers
  WHERE code LIKE 'SUP-%';

  RETURN 'SUP-' || lpad(v_next_val::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(CURRENT_DATE, 'YYYY');
  v_prefix text := 'INV-' || v_year || '-';
  v_next_val int;
BEGIN
  SELECT COALESCE(
    MAX(
      NULLIF(regexp_replace(invoice_number, '^INV-\d{4}-', ''), '')::int
    ), 0
  ) + 1
  INTO v_next_val
  FROM purchase_invoices
  WHERE invoice_number LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next_val::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_po_number() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_next_grn_number() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_next_supplier_code() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated, anon;

-- 5. SUPPLIER SUMMARY VIEW

CREATE OR REPLACE VIEW public.supplier_summary_view
WITH (security_invoker = true)
AS
WITH po_agg AS (
  SELECT
    supplier_id,
    COUNT(id)::int AS total_orders_count,
    COUNT(id) FILTER (WHERE status IN ('approved', 'partially_received'))::int AS active_orders_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('draft', 'cancelled')), 0) AS total_spend,
    MAX(order_date) AS last_order_date
  FROM purchase_orders
  GROUP BY supplier_id
),
inv_agg AS (
  SELECT
    supplier_id,
    COUNT(id)::int AS total_invoices_count,
    COALESCE(SUM(total_amount), 0) AS total_invoiced_amount,
    COALESCE(SUM(amount_paid), 0) AS total_paid_amount,
    COALESCE(SUM(total_amount - amount_paid), 0) AS outstanding_payables
  FROM purchase_invoices
  GROUP BY supplier_id
),
grn_agg AS (
  SELECT
    supplier_id,
    COUNT(id)::int AS total_receipts_count
  FROM goods_receipts
  GROUP BY supplier_id
)
SELECT
  s.id,
  s.code,
  s.name,
  s.contact_person,
  s.email,
  s.phone,
  s.address,
  s.city,
  s.country,
  s.tax_id,
  s.payment_terms,
  s.status,
  s.created_at,
  s.updated_at,
  COALESCE(po.total_orders_count, 0) AS total_orders_count,
  COALESCE(po.active_orders_count, 0) AS active_orders_count,
  COALESCE(po.total_spend, 0) AS total_spend,
  po.last_order_date,
  COALESCE(inv.total_invoices_count, 0) AS total_invoices_count,
  COALESCE(inv.total_invoiced_amount, 0) AS total_invoiced_amount,
  COALESCE(inv.total_paid_amount, 0) AS total_paid_amount,
  COALESCE(inv.outstanding_payables, 0) AS outstanding_payables,
  COALESCE(grn.total_receipts_count, 0) AS total_receipts_count
FROM suppliers s
LEFT JOIN po_agg po ON s.id = po.supplier_id
LEFT JOIN inv_agg inv ON s.id = inv.supplier_id
LEFT JOIN grn_agg grn ON s.id = grn.supplier_id;

GRANT SELECT ON public.supplier_summary_view TO authenticated, anon;

-- 6. DASHBOARD METRICS VIEW

CREATE OR REPLACE VIEW public.dashboard_metrics_view
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*)::int FROM purchase_orders) AS total_orders,
  (SELECT COUNT(*)::int FROM purchase_orders WHERE status IN ('pending_approval', 'draft')) AS pending_approval_orders,
  (SELECT COUNT(*)::int FROM suppliers WHERE status = 'active') AS active_suppliers,
  COALESCE((SELECT SUM(total_amount) FROM purchase_orders WHERE status NOT IN ('draft', 'cancelled')), 0) AS total_spend,
  COALESCE((SELECT SUM(total_amount - amount_paid) FROM purchase_invoices WHERE status != 'paid'), 0) AS open_invoice_amount,
  (SELECT COUNT(*)::int FROM purchase_invoices WHERE status = 'overdue' OR (status != 'paid' AND due_date < CURRENT_DATE)) AS overdue_invoices_count,
  (SELECT COUNT(DISTINCT po_id)::int FROM goods_receipts WHERE status = 'partial') AS partial_receipts_count;

GRANT SELECT ON public.dashboard_metrics_view TO authenticated, anon;