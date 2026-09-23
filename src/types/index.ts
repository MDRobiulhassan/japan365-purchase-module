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
