/*
# Performance Indexes on Foreign Keys and Filtered Columns

## Overview
This migration adds performance indexes across all purchase module tables and the RBAC profiles table.
It optimizes join performance on foreign keys, accelerates queries filtered by status fields,
and speeds up common sorting and date range filtering operations.

## Performance Improvements

### 1. Foreign Key Indexes
- `goods_receipt_items(po_item_id)`: Accelerates joins between receipt items and purchase order items, as well as cascading deletes.
- `purchase_orders(supplier_id)`: (Ensures index exists) Speeds up supplier PO lookups.
- `purchase_order_items(po_id)`: (Ensures index exists) Speeds up fetching line items for a PO.
- `goods_receipts(po_id)`: (Ensures index exists) Speeds up PO receipt lookups.
- `goods_receipts(supplier_id)`: (Ensures index exists) Speeds up supplier receipt queries.
- `goods_receipt_items(grn_id)`: (Ensures index exists) Speeds up receipt item lookups by GRN.
- `purchase_invoices(supplier_id)`: (Ensures index exists) Speeds up supplier invoice lookups.
- `purchase_invoices(po_id)`: (Ensures index exists) Speeds up invoice matching to POs.

### 2. Status Field Indexes
- `suppliers(status)`: Optimizes filtering active suppliers for dropdowns and supplier directory.
- `goods_receipts(status)`: Optimizes filtering partial vs complete goods receipts in dashboard and listings.
- `purchase_orders(status)`: (Ensures index exists) Optimizes PO status tab and pipeline queries.
- `purchase_invoices(status)`: (Ensures index exists) Optimizes invoice payment status filtering.
- `profiles(role)`: Accelerates RBAC role lookups and admin permission checks.

### 3. Date and Sorting Indexes
- `purchase_orders(created_at DESC)`: Speeds up recent PO queries on the dashboard and main PO list.
- `purchase_orders(expected_date)`: Speeds up expected delivery tracking and overdue PO detection.
- `purchase_invoices(due_date)`: Accelerates overdue invoice calculations and due date alerts.
- `purchase_invoices(invoice_date)`: Accelerates date range filtering for financial reports.
- `purchase_invoices(created_at DESC)`: Optimizes invoice history sorting.
- `goods_receipts(receipt_date)`: Speeds up inventory receiving timeline reports.
- `goods_receipts(created_at DESC)`: Optimizes goods receipts sorting.
- `suppliers(name)`: Speeds up alphabetical supplier searches and sorting.
- `suppliers(created_at DESC)`: Speeds up supplier chronological listing.

### 4. Composite Indexes
- `purchase_orders(supplier_id, status)`: Optimizes multi-column filtering by supplier and status.
- `purchase_invoices(supplier_id, status)`: Optimizes supplier billing lookups.
- `purchase_invoices(status, due_date)`: Optimizes checking unpaid/overdue invoices.

## Safety
- Purely additive: Uses `CREATE INDEX IF NOT EXISTS` for all statements.
- Zero table lock / downtime risk.
- Fully idempotent and backward compatible.
*/

-- ===== 1. FOREIGN KEY INDEXES =====

-- Goods receipt items -> Purchase order items
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_po_item_id ON goods_receipt_items(po_item_id);

-- Goods receipt items -> Goods receipts (ensure existing)
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_grn_id ON goods_receipt_items(grn_id);

-- Purchase order items -> Purchase orders (ensure existing)
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(po_id);

-- Purchase orders -> Suppliers (ensure existing)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

-- Goods receipts -> Purchase orders (ensure existing)
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po_id ON goods_receipts(po_id);

-- Goods receipts -> Suppliers (ensure existing)
CREATE INDEX IF NOT EXISTS idx_goods_receipts_supplier_id ON goods_receipts(supplier_id);

-- Purchase invoices -> Suppliers (ensure existing)
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_id ON purchase_invoices(supplier_id);

-- Purchase invoices -> Purchase orders (ensure existing)
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_po_id ON purchase_invoices(po_id);


-- ===== 2. STATUS FIELD INDEXES =====

-- Suppliers status (e.g. 'active', 'inactive')
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

-- Goods receipts status (e.g. 'partial', 'complete')
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON goods_receipts(status);

-- Purchase orders status (e.g. 'draft', 'pending_approval', 'approved', etc.)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Purchase invoices status (e.g. 'unpaid', 'partially_paid', 'paid', 'overdue')
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);

-- Profiles role (e.g. 'admin', 'manager', 'staff')
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);


-- ===== 3. DATE AND SORTING INDEXES =====

-- Purchase orders date filtering and sorting
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_date ON purchase_orders(expected_date);

-- Purchase invoices date filtering and sorting
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_created_at ON purchase_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_invoice_date ON purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_due_date ON purchase_invoices(due_date);

-- Goods receipts date filtering and sorting
CREATE INDEX IF NOT EXISTS idx_goods_receipts_created_at ON goods_receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_receipt_date ON goods_receipts(receipt_date);

-- Suppliers name and created_at sorting
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at DESC);


-- ===== 4. COMPOSITE INDEXES FOR COMMON QUERIES =====

-- POs by supplier + status (e.g. find all open POs for a specific supplier)
CREATE INDEX IF NOT EXISTS idx_po_supplier_status ON purchase_orders(supplier_id, status);

-- Invoices by supplier + status (e.g. find unpaid invoices for a supplier)
CREATE INDEX IF NOT EXISTS idx_pi_supplier_status ON purchase_invoices(supplier_id, status);

-- Invoices by status + due date (e.g. batch query for overdue invoices)
CREATE INDEX IF NOT EXISTS idx_pi_status_due_date ON purchase_invoices(status, due_date);
