export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_date: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  line_total: number;
  received_quantity: number;
}

export interface GoodsReceipt {
  id: string;
  grn_number: string;
  po_id: string;
  supplier_id: string;
  receipt_date: string;
  status: 'partial' | 'complete';
  notes: string | null;
  created_at: string;
  supplier?: Supplier;
  purchase_order?: PurchaseOrder;
  items?: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
  id: string;
  grn_id: string;
  po_item_id: string;
  description: string;
  quantity_received: number;
  unit: string;
}

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  po_id: string | null;
  supplier_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
  supplier?: Supplier;
  purchase_order?: PurchaseOrder;
}

export interface POSummaryView {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_date: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Supplier Details
  supplier_name: string | null;
  supplier_code: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_city: string | null;
  supplier_country: string | null;
  supplier_status: 'active' | 'inactive' | null;

  // Line Item Aggregates
  total_items_count: number;
  total_ordered_qty: number;
  total_received_qty: number;
  fulfillment_percentage: number;
  is_fully_received: boolean;

  // Goods Receipts Aggregates
  receipts_count: number;
  last_receipt_date: string | null;

  // Invoices & Payment Aggregates
  invoices_count: number;
  total_invoiced_amount: number;
  total_paid_amount: number;
  outstanding_balance: number;
  payment_status: 'unbilled' | 'unpaid' | 'partially_paid' | 'paid';
}

export interface SupplierSummaryView {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;

  // Aggregated metrics
  total_orders_count: number;
  active_orders_count: number;
  total_spend: number;
  last_order_date: string | null;
  total_invoices_count: number;
  total_invoiced_amount: number;
  total_paid_amount: number;
  outstanding_payables: number;
  total_receipts_count: number;
}

export interface DashboardMetricsView {
  total_orders: number;
  pending_approval_orders: number;
  active_suppliers: number;
  total_spend: number;
  open_invoice_amount: number;
  overdue_invoices_count: number;
  partial_receipts_count: number;
}


