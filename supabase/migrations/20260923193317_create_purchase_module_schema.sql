/*
# Purchase Module Schema for ERP

## Overview
This migration creates a complete purchase module for an ERP system, including suppliers, 
purchase orders with line items, goods receipts, and supplier invoices. The module supports 
the full procurement lifecycle: create PO → approve → receive goods → record invoice → close.

## New Tables

### 1. suppliers
- `id` (uuid, PK): Unique supplier identifier
- `code` (text, unique): Supplier code (e.g. SUP-001)
- `name` (text): Supplier company name
- `contact_person` (text): Primary contact name
- `email` (text): Contact email
- `phone` (text): Phone number
- `address` (text): Street address
- `city` (text): City
- `country` (text): Country
- `tax_id` (text): Tax/VAT registration number
- `payment_terms` (text): Payment terms description (e.g. "Net 30")
- `status` (text): 'active' or 'inactive'
- `created_at` (timestamptz): Record creation time
- `updated_at` (timestamptz): Last update time

### 2. purchase_orders
- `id` (uuid, PK): Unique PO identifier
- `po_number` (text, unique): Human-readable PO number (e.g. PO-2024-0001)
- `supplier_id` (uuid, FK): Reference to suppliers
- `order_date` (date): Date the PO was placed
- `expected_date` (date): Expected delivery date
- `status` (text): 'draft', 'pending_approval', 'approved', 'partially_received', 'received', 'closed', 'cancelled'
- `subtotal` (numeric): Sum of line item amounts before tax
- `tax_rate` (numeric): Tax percentage applied (e.g. 10 for 10%)
- `tax_amount` (numeric): Calculated tax amount
- `total_amount` (numeric): Subtotal + tax_amount + shipping
- `shipping_cost` (numeric): Shipping/freight cost
- `notes` (text): Internal notes
- `created_at` (timestamptz): Record creation time
- `updated_at` (timestamptz): Last update time

### 3. purchase_order_items
- `id` (uuid, PK): Unique line item identifier
- `po_id` (uuid, FK): Reference to purchase_orders, CASCADE on delete
- `description` (text): Item description
- `quantity` (numeric): Ordered quantity
- `unit_price` (numeric): Price per unit
- `unit` (text): Unit of measure (e.g. pcs, kg, box)
- `line_total` (numeric): quantity * unit_price (stored for query convenience)
- `received_quantity` (numeric): Quantity received so far (default 0)

### 4. goods_receipts
- `id` (uuid, PK): Unique receipt identifier
- `grn_number` (text, unique): Goods receipt note number (e.g. GRN-2024-0001)
- `po_id` (uuid, FK): Reference to purchase_orders
- `supplier_id` (uuid, FK): Reference to suppliers
- `receipt_date` (date): Date goods were received
- `status` (text): 'partial' or 'complete'
- `notes` (text): Receipt notes
- `created_at` (timestamptz): Record creation time

### 5. goods_receipt_items
- `id` (uuid, PK): Unique receipt line identifier
- `grn_id` (uuid, FK): Reference to goods_receipts, CASCADE on delete
- `po_item_id` (uuid, FK): Reference to purchase_order_items
- `description` (text): Item description (copied from PO item)
- `quantity_received` (numeric): Quantity received in this receipt
- `unit` (text): Unit of measure

### 6. purchase_invoices
- `id` (uuid, PK): Unique invoice identifier
- `invoice_number` (text, unique): Supplier invoice number
- `po_id` (uuid, FK): Reference to purchase_orders (nullable for direct invoices)
- `supplier_id` (uuid, FK): Reference to suppliers
- `invoice_date` (date): Date on the invoice
- `due_date` (date): Payment due date
- `subtotal` (numeric): Invoice subtotal
- `tax_amount` (numeric): Invoice tax
- `total_amount` (numeric): Invoice total
- `amount_paid` (numeric): Amount already paid (default 0)
- `status` (text): 'unpaid', 'partially_paid', 'paid', 'overdue'
- `notes` (text): Invoice notes
- `created_at` (timestamptz): Record creation time

## Security
- RLS enabled on all tables
- Single-tenant app (no auth) — all policies use `TO anon, authenticated` with `USING (true)` 
  because the data is intentionally shared/public within the ERP system.

## Notes
1. Auto-numbering for PO, GRN is handled at the application layer by querying the latest record.
2. All monetary values use numeric(14,2) for precision.
3. Quantities use numeric(14,2) to support fractional quantities.
*/

-- ===== SUPPLIERS =====
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'United States',
  tax_id text,
  payment_terms text DEFAULT 'Net 30',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_suppliers" ON suppliers;
CREATE POLICY "anon_select_suppliers" ON suppliers FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_suppliers" ON suppliers;
CREATE POLICY "anon_insert_suppliers" ON suppliers FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_suppliers" ON suppliers;
CREATE POLICY "anon_update_suppliers" ON suppliers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_suppliers" ON suppliers;
CREATE POLICY "anon_delete_suppliers" ON suppliers FOR DELETE
  TO anon, authenticated USING (true);

-- ===== PURCHASE ORDERS =====
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'partially_received', 'received', 'closed', 'cancelled')),
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_select_purchase_orders" ON purchase_orders FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_insert_purchase_orders" ON purchase_orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_update_purchase_orders" ON purchase_orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_delete_purchase_orders" ON purchase_orders FOR DELETE
  TO anon, authenticated USING (true);

-- ===== PURCHASE ORDER ITEMS =====
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(14,2) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  received_quantity numeric(14,2) NOT NULL DEFAULT 0
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_po_items" ON purchase_order_items;
CREATE POLICY "anon_select_po_items" ON purchase_order_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_po_items" ON purchase_order_items;
CREATE POLICY "anon_insert_po_items" ON purchase_order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_po_items" ON purchase_order_items;
CREATE POLICY "anon_update_po_items" ON purchase_order_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_po_items" ON purchase_order_items;
CREATE POLICY "anon_delete_po_items" ON purchase_order_items FOR DELETE
  TO anon, authenticated USING (true);

-- ===== GOODS RECEIPTS =====
CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number text UNIQUE NOT NULL,
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'complete' CHECK (status IN ('partial', 'complete')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_goods_receipts" ON goods_receipts;
CREATE POLICY "anon_select_goods_receipts" ON goods_receipts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_goods_receipts" ON goods_receipts;
CREATE POLICY "anon_insert_goods_receipts" ON goods_receipts FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_goods_receipts" ON goods_receipts;
CREATE POLICY "anon_update_goods_receipts" ON goods_receipts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_goods_receipts" ON goods_receipts;
CREATE POLICY "anon_delete_goods_receipts" ON goods_receipts FOR DELETE
  TO anon, authenticated USING (true);

-- ===== GOODS RECEIPT ITEMS =====
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id uuid NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity_received numeric(14,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs'
);
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_grn_items" ON goods_receipt_items;
CREATE POLICY "anon_select_grn_items" ON goods_receipt_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_grn_items" ON goods_receipt_items;
CREATE POLICY "anon_insert_grn_items" ON goods_receipt_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_grn_items" ON goods_receipt_items;
CREATE POLICY "anon_update_grn_items" ON goods_receipt_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_grn_items" ON goods_receipt_items;
CREATE POLICY "anon_delete_grn_items" ON goods_receipt_items FOR DELETE
  TO anon, authenticated USING (true);

-- ===== PURCHASE INVOICES =====
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT CURRENT_DATE + 30,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_purchase_invoices" ON purchase_invoices;
CREATE POLICY "anon_select_purchase_invoices" ON purchase_invoices FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_purchase_invoices" ON purchase_invoices;
CREATE POLICY "anon_insert_purchase_invoices" ON purchase_invoices FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_purchase_invoices" ON purchase_invoices;
CREATE POLICY "anon_update_purchase_invoices" ON purchase_invoices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_purchase_invoices" ON purchase_invoices;
CREATE POLICY "anon_delete_purchase_invoices" ON purchase_invoices FOR DELETE
  TO anon, authenticated USING (true);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_po_id ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_supplier ON goods_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_gri_grn_id ON goods_receipt_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_pi_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pi_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pi_po_id ON purchase_invoices(po_id);
