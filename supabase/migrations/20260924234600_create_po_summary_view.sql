/*
# Create Purchase Order Summary View (po_summary_view)

## Overview
This migration creates `po_summary_view`, a consolidated SQL view that joins:
- `purchase_orders` (header data, financial totals, status)
- `suppliers` (supplier name, code, contact details)
- `purchase_order_items` (aggregated item counts, ordered quantities, received quantities, fulfillment %)
- `goods_receipts` (receipt count, latest receipt date)
- `purchase_invoices` (invoice count, total invoiced, total paid, outstanding balance)

## Benefits
1. Eliminates complex client-side joins and Cartesian products across multiple tables.
2. Provides instant aggregation metrics (fulfillment %, total items, receipts count, outstanding balance).
3. Uses `security_invoker = true` to fully respect Row Level Security (RLS) policies based on the querying user's role.
4. Accelerates report generation, dashboard rendering, and export operations.
*/

CREATE OR REPLACE VIEW public.po_summary_view
WITH (security_invoker = true)
AS
WITH poi_summary AS (
  SELECT 
    po_id,
    COUNT(id)::int AS total_items_count,
    COALESCE(SUM(quantity), 0) AS total_ordered_qty,
    COALESCE(SUM(received_quantity), 0) AS total_received_qty,
    COALESCE(SUM(line_total), 0) AS items_subtotal
  FROM purchase_order_items
  GROUP BY po_id
),
gr_summary AS (
  SELECT 
    po_id,
    COUNT(id)::int AS receipts_count,
    MAX(receipt_date) AS last_receipt_date
  FROM goods_receipts
  GROUP BY po_id
),
pi_summary AS (
  SELECT 
    po_id,
    COUNT(id)::int AS invoices_count,
    COALESCE(SUM(total_amount), 0) AS total_invoiced_amount,
    COALESCE(SUM(amount_paid), 0) AS total_paid_amount
  FROM purchase_invoices
  WHERE po_id IS NOT NULL
  GROUP BY po_id
)
SELECT 
  -- Purchase Order Header
  po.id,
  po.po_number,
  po.supplier_id,
  po.order_date,
  po.expected_date,
  po.status,
  po.subtotal,
  po.tax_rate,
  po.tax_amount,
  po.shipping_cost,
  po.total_amount,
  po.notes,
  po.created_at,
  po.updated_at,

  -- Supplier Details
  s.name AS supplier_name,
  s.code AS supplier_code,
  s.email AS supplier_email,
  s.phone AS supplier_phone,
  s.city AS supplier_city,
  s.country AS supplier_country,
  s.status AS supplier_status,

  -- Line Item Aggregates
  COALESCE(poi.total_items_count, 0) AS total_items_count,
  COALESCE(poi.total_ordered_qty, 0) AS total_ordered_qty,
  COALESCE(poi.total_received_qty, 0) AS total_received_qty,
  CASE 
    WHEN COALESCE(poi.total_ordered_qty, 0) > 0 
    THEN ROUND((COALESCE(poi.total_received_qty, 0) / poi.total_ordered_qty) * 100, 2)
    ELSE 0 
  END AS fulfillment_percentage,
  CASE
    WHEN COALESCE(poi.total_ordered_qty, 0) > 0 AND COALESCE(poi.total_received_qty, 0) >= poi.total_ordered_qty THEN true
    ELSE false
  END AS is_fully_received,

  -- Goods Receipts Aggregates
  COALESCE(gr.receipts_count, 0) AS receipts_count,
  gr.last_receipt_date,

  -- Invoices & Payment Aggregates
  COALESCE(pi.invoices_count, 0) AS invoices_count,
  COALESCE(pi.total_invoiced_amount, 0) AS total_invoiced_amount,
  COALESCE(pi.total_paid_amount, 0) AS total_paid_amount,
  (po.total_amount - COALESCE(pi.total_paid_amount, 0)) AS outstanding_balance,
  CASE
    WHEN COALESCE(pi.invoices_count, 0) = 0 THEN 'unbilled'
    WHEN COALESCE(pi.total_paid_amount, 0) = 0 THEN 'unpaid'
    WHEN COALESCE(pi.total_paid_amount, 0) < po.total_amount THEN 'partially_paid'
    ELSE 'paid'
  END AS payment_status

FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN poi_summary poi ON po.id = poi.po_id
LEFT JOIN gr_summary gr ON po.id = gr.po_id
LEFT JOIN pi_summary pi ON po.id = pi.po_id;

-- Grant access to authenticated and anonymous roles (RLS enforced via security_invoker)
GRANT SELECT ON public.po_summary_view TO authenticated, anon;
