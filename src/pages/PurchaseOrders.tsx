import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Send,
  PackageCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDate,
  generatePoNumber,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, statusColor, statusLabel } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingSpinner, EmptyState, ErrorState, PageContainer } from '@/components/ui/States';
import type { PurchaseOrder, PurchaseOrderItem, Supplier, PurchaseOrderStatus } from '@/types';

interface LineItemDraft {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

export function PurchaseOrders() {
  const [orders, setOrders] = useState<(PurchaseOrder & { supplier?: Supplier })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [viewing, setViewing] = useState<(PurchaseOrder & { supplier?: Supplier }) | null>(null);
  const [viewItems, setViewItems] = useState<PurchaseOrderItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<{
    po_number: string;
    supplier_id: string;
    order_date: string;
    expected_date: string;
    status: PurchaseOrderStatus;
    tax_rate: string;
    shipping_cost: string;
    notes: string;
  }>({
    po_number: '',
    supplier_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: '',
    status: 'draft',
    tax_rate: '0',
    shipping_cost: '0',
    notes: '',
  });
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setOrders((data as (PurchaseOrder & { supplier?: Supplier })[]) ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase
      .from('suppliers')
      .select('*')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setSuppliers((data as Supplier[]) ?? []));
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.po_number.toLowerCase().includes(q) ||
      (o.supplier?.name?.toLowerCase().includes(q) ?? false)
    );
  });

  async function openCreate() {
    setEditing(null);
    const poNum = await generatePoNumber();
    setForm({
      po_number: poNum,
      supplier_id: '',
      order_date: new Date().toISOString().slice(0, 10),
      expected_date: '',
      status: 'draft',
      tax_rate: '0',
      shipping_cost: '0',
      notes: '',
    });
    setLineItems([
      { id: crypto.randomUUID(), description: '', quantity: '1', unit: 'pcs', unit_price: '0' },
    ]);
    setFormError(null);
    setModalOpen(true);
  }

  async function openEdit(order: PurchaseOrder & { supplier?: Supplier }) {
    setEditing(order);
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', order.id)
      .order('created_at', { ascending: true });
    setForm({
      po_number: order.po_number,
      supplier_id: order.supplier_id,
      order_date: order.order_date,
      expected_date: order.expected_date ?? '',
      status: order.status,
      tax_rate: String(order.tax_rate),
      shipping_cost: String(order.shipping_cost),
      notes: order.notes ?? '',
    });
    setLineItems(
      (items as PurchaseOrderItem[])?.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: String(i.quantity),
        unit: i.unit,
        unit_price: String(i.unit_price),
      })) ?? []
    );
    setFormError(null);
    setModalOpen(true);
  }

  function updateLineItem(id: string, field: keyof LineItemDraft, value: string) {
    setLineItems((items) =>
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      { id: crypto.randomUUID(), description: '', quantity: '1', unit: 'pcs', unit_price: '0' },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((items) => items.filter((i) => i.id !== id));
  }

  const subtotal = lineItems.reduce(
    (sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0),
    0
  );
  const taxAmount = (subtotal * (parseFloat(form.tax_rate) || 0)) / 100;
  const shippingCost = parseFloat(form.shipping_cost) || 0;
  const totalAmount = subtotal + taxAmount + shippingCost;

  async function handleSave() {
    if (!form.supplier_id) {
      setFormError('Please select a supplier');
      return;
    }
    if (lineItems.length === 0 || lineItems.every((i) => !i.description.trim())) {
      setFormError('Add at least one line item with a description');
      return;
    }
    const validItems = lineItems.filter((i) => i.description.trim());
    if (validItems.some((i) => parseFloat(i.quantity) <= 0 || parseFloat(i.unit_price) < 0)) {
      setFormError('Line items must have valid quantities (>0) and prices (>=0)');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const poData = {
        po_number: form.po_number,
        supplier_id: form.supplier_id,
        order_date: form.order_date,
        expected_date: form.expected_date || null,
        status: form.status,
        subtotal: subtotal,
        tax_rate: parseFloat(form.tax_rate) || 0,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error: err } = await supabase
          .from('purchase_orders')
          .update(poData)
          .eq('id', editing.id);
        if (err) throw err;

        // Replace line items
        await supabase.from('purchase_order_items').delete().eq('po_id', editing.id);
        const itemRows = validItems.map((i) => ({
          po_id: editing.id,
          description: i.description,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
          unit: i.unit,
          line_total: parseFloat(i.quantity) * parseFloat(i.unit_price),
        }));
        const { error: itemErr } = await supabase
          .from('purchase_order_items')
          .insert(itemRows);
        if (itemErr) throw itemErr;
      } else {
        const { data: newPo, error: err } = await supabase
          .from('purchase_orders')
          .insert(poData)
          .select()
          .single();
        if (err) throw err;

        const itemRows = validItems.map((i) => ({
          po_id: newPo.id,
          description: i.description,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
          unit: i.unit,
          line_total: parseFloat(i.quantity) * parseFloat(i.unit_price),
        }));
        const { error: itemErr } = await supabase
          .from('purchase_order_items')
          .insert(itemRows);
        if (itemErr) throw itemErr;
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save purchase order');
    } finally {
      setSaving(false);
    }
  }

  async function viewOrder(order: PurchaseOrder & { supplier?: Supplier }) {
    setViewing(order);
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', order.id)
      .order('created_at', { ascending: true });
    setViewItems((items as PurchaseOrderItem[]) ?? []);
  }

  async function updateStatus(order: PurchaseOrder, status: PurchaseOrderStatus) {
    const { error: err } = await supabase
      .from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order.id);
    if (err) {
      setError(err.message);
    } else {
      await load();
      if (viewing?.id === order.id) {
        setViewing({ ...viewing, status });
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await supabase.from('purchase_order_items').delete().eq('po_id', deleteTarget.id);
      const { error: err } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete purchase order');
    } finally {
      setSaving(false);
    }
  }

  const canEdit = (status: PurchaseOrderStatus) =>
    status === 'draft' || status === 'pending_approval';
  const canApprove = (status: PurchaseOrderStatus) => status === 'pending_approval';
  const canCancel = (status: PurchaseOrderStatus) =>
    !['received', 'closed', 'cancelled'].includes(status);
  const canSubmit = (status: PurchaseOrderStatus) => status === 'draft';

  return (
    <PageContainer>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="mt-0.5 text-sm text-slate-500">Create and manage purchase orders</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-44"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="partially_received">Partially Received</option>
          <option value="received">Received</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <DataTable
          columns={[
            {
              key: 'po_number',
              header: 'PO Number',
              render: (o) => <span className="font-semibold text-slate-800">{o.po_number}</span>,
            },
            {
              key: 'supplier',
              header: 'Supplier',
              render: (o) => o.supplier?.name ?? 'N/A',
            },
            {
              key: 'order_date',
              header: 'Order Date',
              render: (o) => formatDate(o.order_date),
            },
            {
              key: 'expected_date',
              header: 'Expected',
              render: (o) => formatDate(o.expected_date),
            },
            {
              key: 'total_amount',
              header: 'Total',
              render: (o) => (
                <span className="font-semibold text-slate-800">{formatCurrency(Number(o.total_amount))}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (o) => <Badge color={statusColor(o.status)}>{statusLabel(o.status)}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              render: (o) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); viewOrder(o); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {canEdit(o.status) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canEdit(o.status) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(o); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          data={filtered}
          rowKey={(o) => o.id}
          onRowClick={(o) => viewOrder(o)}
          empty={
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No purchase orders found"
              description="Create your first purchase order to start procuring."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" />New Purchase Order</Button>}
            />
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Purchase Order' : 'New Purchase Order'}
        subtitle={form.po_number}
        size="xl"
        footer={
          <>
            <div className="mr-auto text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{formatCurrency(totalAmount)}</span>
              <span className="ml-1 text-slate-400">total</span>
            </div>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Order' : 'Create Order'}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Supplier" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </Select>
            <Input
              label="Order Date"
              type="date"
              value={form.order_date}
              onChange={(e) => setForm({ ...form, order_date: e.target.value })}
            />
            <Input
              label="Expected Delivery"
              type="date"
              value={form.expected_date}
              onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Line Items</h4>
              <Button size="sm" variant="secondary" onClick={addLineItem}>
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Unit</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Unit Price</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(item.id, 'unit_price', e.target.value)}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-700">
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                      </td>
                      <td className="px-2 py-2">
                        {lineItems.length > 1 && (
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PurchaseOrderStatus })}
              >
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Textarea
                label="Notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes..."
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Tax</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                    className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                  <span className="text-slate-400">%</span>
                </div>
                <span className="font-medium text-slate-800">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Shipping</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{formatCurrency(shippingCost)}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.shipping_cost}
                    onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
                    className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="border-t border-slate-300 pt-2.5 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">Total</span>
                <span className="text-base font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Order Modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.po_number ?? ''}
        subtitle={viewing?.supplier?.name}
        size="xl"
        footer={
          viewing && (
            <div className="flex w-full items-center justify-between">
              <div className="text-sm text-slate-500">
                Total: <span className="font-bold text-slate-900">{formatCurrency(Number(viewing.total_amount))}</span>
              </div>
              <div className="flex items-center gap-2">
                {canSubmit(viewing.status) && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(viewing, 'pending_approval')}>
                    <Send className="h-3.5 w-3.5" /> Submit for Approval
                  </Button>
                )}
                {canApprove(viewing.status) && (
                  <Button size="sm" onClick={() => updateStatus(viewing, 'approved')}>
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </Button>
                )}
                {canCancel(viewing.status) && (
                  <Button size="sm" variant="danger" onClick={() => updateStatus(viewing, 'cancelled')}>
                    <XCircle className="h-3.5 w-3.5" /> Cancel
                  </Button>
                )}
                {viewing.status === 'approved' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(viewing, 'closed')}>
                    <PackageCheck className="h-3.5 w-3.5" /> Close
                  </Button>
                )}
                {canEdit(viewing.status) && (
                  <Button size="sm" variant="secondary" onClick={() => { openEdit(viewing); setViewing(null); }}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge color={statusColor(viewing.status)}>{statusLabel(viewing.status)}</Badge>
              <span className="text-sm text-slate-500">Ordered: {formatDate(viewing.order_date)}</span>
              {viewing.expected_date && (
                <span className="text-sm text-slate-500">· Expected: {formatDate(viewing.expected_date)}</span>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ordered</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Received</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-slate-800">{item.description}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{Number(item.quantity)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.unit}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(Number(item.unit_price))}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{Number(item.received_quantity)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatCurrency(Number(item.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-medium">{formatCurrency(Number(viewing.subtotal))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Tax ({viewing.tax_rate}%)</span><span className="font-medium">{formatCurrency(Number(viewing.tax_amount))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Shipping</span><span className="font-medium">{formatCurrency(Number(viewing.shipping_cost))}</span></div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold"><span className="text-slate-900">Total</span><span className="text-slate-900">{formatCurrency(Number(viewing.total_amount))}</span></div>
              </div>
            </div>

            {viewing.notes && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Notes</p>
                <p className="mt-1 text-sm text-slate-700">{viewing.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Purchase Order"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <strong>{deleteTarget?.po_number}</strong>? All line items will also be removed.
        </p>
        {formError && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
      </Modal>
    </PageContainer>
  );
}
