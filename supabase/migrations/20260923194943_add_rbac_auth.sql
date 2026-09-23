/*
# Add RBAC Authentication to Purchase Module

## Overview
This migration adds role-based access control (RBAC) to the Premier ERP purchase module.
It creates a profiles table linked to Supabase auth, a helper function to get the current
user's role, and updates all RLS policies from open (anon) to authenticated-only with
role-based write permissions.

## Roles
- **admin**: Full CRUD on all tables (suppliers, POs, items, receipts, invoices)
- **manager**: Read all, create/update all, but cannot delete records
- **staff**: Read-only access to all tables

## New Tables
### profiles
- `id` (uuid, PK, FK to auth.users): Links to Supabase auth user
- `full_name` (text): User's display name
- `role` (text): 'admin', 'manager', or 'staff' (default 'staff')
- `created_at` (timestamptz): Record creation time

## New Functions
### user_role()
- SECURITY DEFINER function that returns the current user's role from profiles
- Used in RLS policies to enforce role-based access

## Security Changes
### profiles table
- RLS enabled
- SELECT: authenticated users can read all profiles (team directory)
- INSERT: authenticated users can insert their own profile (on signup)
- UPDATE: admin can update any profile; users can update their own
- DELETE: admin only

### All purchase module tables (suppliers, purchase_orders, purchase_order_items, 
goods_receipts, goods_receipt_items, purchase_invoices)
- Old anon policies DROPPED
- SELECT: TO authenticated USING (true) — all authenticated users can see all ERP data
- INSERT: TO authenticated WITH CHECK (user_role() IN ('admin', 'manager'))
- UPDATE: TO authenticated USING (user_role() IN ('admin', 'manager')) WITH CHECK (same)
- DELETE: TO authenticated USING (user_role() = 'admin')

## Important Notes
1. The app now requires sign-in. An auth flow (login/signup) is built in the frontend.
2. The first user should sign up with the 'admin' role to have full access.
3. Email confirmation is OFF — users can sign in immediately after signup.
*/

-- ===== PROFILES TABLE =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'User',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profiles: SELECT — all authenticated users can see all profiles
DROP POLICY IF EXISTS "authed_select_profiles" ON profiles;
CREATE POLICY "authed_select_profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- profiles: INSERT — users can insert their own profile
DROP POLICY IF EXISTS "authed_insert_own_profile" ON profiles;
CREATE POLICY "authed_insert_own_profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- profiles: UPDATE — admin can update any, users can update own
DROP POLICY IF EXISTS "authed_update_profiles" ON profiles;
CREATE POLICY "authed_update_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- profiles: DELETE — admin only
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ===== USER_ROLE FUNCTION =====
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'staff');
$$;

-- ===== UPDATE RLS ON SUPPLIERS =====
DROP POLICY IF EXISTS "anon_select_suppliers" ON suppliers;
DROP POLICY IF EXISTS "anon_insert_suppliers" ON suppliers;
DROP POLICY IF EXISTS "anon_update_suppliers" ON suppliers;
DROP POLICY IF EXISTS "anon_delete_suppliers" ON suppliers;

DROP POLICY IF EXISTS "authed_select_suppliers" ON suppliers;
CREATE POLICY "authed_select_suppliers" ON suppliers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mgr_insert_suppliers" ON suppliers;
CREATE POLICY "mgr_insert_suppliers" ON suppliers
  FOR INSERT TO authenticated WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "mgr_update_suppliers" ON suppliers;
CREATE POLICY "mgr_update_suppliers" ON suppliers
  FOR UPDATE TO authenticated
  USING (user_role() IN ('admin', 'manager'))
  WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "admin_delete_suppliers" ON suppliers;
CREATE POLICY "admin_delete_suppliers" ON suppliers
  FOR DELETE TO authenticated USING (user_role() = 'admin');

-- ===== UPDATE RLS ON PURCHASE_ORDERS =====
DROP POLICY IF EXISTS "anon_select_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "anon_insert_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "anon_update_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "anon_delete_purchase_orders" ON purchase_orders;

DROP POLICY IF EXISTS "authed_select_purchase_orders" ON purchase_orders;
CREATE POLICY "authed_select_purchase_orders" ON purchase_orders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mgr_insert_purchase_orders" ON purchase_orders;
CREATE POLICY "mgr_insert_purchase_orders" ON purchase_orders
  FOR INSERT TO authenticated WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "mgr_update_purchase_orders" ON purchase_orders;
CREATE POLICY "mgr_update_purchase_orders" ON purchase_orders
  FOR UPDATE TO authenticated
  USING (user_role() IN ('admin', 'manager'))
  WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "admin_delete_purchase_orders" ON purchase_orders;
CREATE POLICY "admin_delete_purchase_orders" ON purchase_orders
  FOR DELETE TO authenticated USING (user_role() = 'admin');

-- ===== UPDATE RLS ON PURCHASE_ORDER_ITEMS =====
DROP POLICY IF EXISTS "anon_select_po_items" ON purchase_order_items;
DROP POLICY IF EXISTS "anon_insert_po_items" ON purchase_order_items;
DROP POLICY IF EXISTS "anon_update_po_items" ON purchase_order_items;
DROP POLICY IF EXISTS "anon_delete_po_items" ON purchase_order_items;

DROP POLICY IF EXISTS "authed_select_po_items" ON purchase_order_items;
CREATE POLICY "authed_select_po_items" ON purchase_order_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mgr_insert_po_items" ON purchase_order_items;
CREATE POLICY "mgr_insert_po_items" ON purchase_order_items
  FOR INSERT TO authenticated WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "mgr_update_po_items" ON purchase_order_items;
CREATE POLICY "mgr_update_po_items" ON purchase_order_items
  FOR UPDATE TO authenticated
  USING (user_role() IN ('admin', 'manager'))
  WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "admin_delete_po_items" ON purchase_order_items;
CREATE POLICY "admin_delete_po_items" ON purchase_order_items
  FOR DELETE TO authenticated USING (user_role() = 'admin');

-- ===== UPDATE RLS ON GOODS_RECEIPTS =====
DROP POLICY IF EXISTS "anon_select_goods_receipts" ON goods_receipts;
DROP POLICY IF EXISTS "anon_insert_goods_receipts" ON goods_receipts;
DROP POLICY IF EXISTS "anon_update_goods_receipts" ON goods_receipts;
DROP POLICY IF EXISTS "anon_delete_goods_receipts" ON goods_receipts;

DROP POLICY IF EXISTS "authed_select_goods_receipts" ON goods_receipts;
CREATE POLICY "authed_select_goods_receipts" ON goods_receipts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mgr_insert_goods_receipts" ON goods_receipts;
CREATE POLICY "mgr_insert_goods_receipts" ON goods_receipts
  FOR INSERT TO authenticated WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "mgr_update_goods_receipts" ON goods_receipts;
CREATE POLICY "mgr_update_goods_receipts" ON goods_receipts
  FOR UPDATE TO authenticated
  USING (user_role() IN ('admin', 'manager'))
  WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "admin_delete_goods_receipts" ON goods_receipts;
CREATE POLICY "admin_delete_goods_receipts" ON goods_receipts
  FOR DELETE TO authenticated USING (user_role() = 'admin');

-- ===== UPDATE RLS ON GOODS_RECEIPT_ITEMS =====
DROP POLICY IF EXISTS "anon_select_grn_items" ON goods_receipt_items;
DROP POLICY IF EXISTS "anon_insert_grn_items" ON goods_receipt_items;
DROP POLICY IF EXISTS "anon_update_grn_items" ON goods_receipt_items;
DROP POLICY IF EXISTS "anon_delete_grn_items" ON goods_receipt_items;

DROP POLICY IF EXISTS "authed_select_grn_items" ON goods_receipt_items;
CREATE POLICY "authed_select_grn_items" ON goods_receipt_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mgr_insert_grn_items" ON goods_receipt_items;
CREATE POLICY "mgr_insert_grn_items" ON goods_receipt_items
  FOR INSERT TO authenticated WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "mgr_update_grn_items" ON goods_receipt_items;
CREATE POLICY "mgr_update_grn_items" ON goods_receipt_items
  FOR UPDATE TO authenticated
  USING (user_role() IN ('admin', 'manager'))
  WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "admin_delete_grn_items" ON goods_receipt_items;
CREATE POLICY "admin_delete_grn_items" ON goods_receipt_items
  FOR DELETE TO authenticated USING (user_role() = 'admin');

-- ===== UPDATE RLS ON PURCHASE_INVOICES =====
DROP POLICY IF EXISTS "anon_select_purchase_invoices" ON purchase_invoices;
DROP POLICY IF EXISTS "anon_insert_purchase_invoices" ON purchase_invoices;
DROP POLICY IF EXISTS "anon_update_purchase_invoices" ON purchase_invoices;
DROP POLICY IF EXISTS "anon_delete_purchase_invoices" ON purchase_invoices;

DROP POLICY IF EXISTS "authed_select_purchase_invoices" ON purchase_invoices;
CREATE POLICY "authed_select_purchase_invoices" ON purchase_invoices
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mgr_insert_purchase_invoices" ON purchase_invoices;
CREATE POLICY "mgr_insert_purchase_invoices" ON purchase_invoices
  FOR INSERT TO authenticated WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "mgr_update_purchase_invoices" ON purchase_invoices;
CREATE POLICY "mgr_update_purchase_invoices" ON purchase_invoices
  FOR UPDATE TO authenticated
  USING (user_role() IN ('admin', 'manager'))
  WITH CHECK (user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "admin_delete_purchase_invoices" ON purchase_invoices;
CREATE POLICY "admin_delete_purchase_invoices" ON purchase_invoices
  FOR DELETE TO authenticated USING (user_role() = 'admin');
