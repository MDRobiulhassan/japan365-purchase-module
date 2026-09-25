import { useEffect, useState, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  DollarSign,
  Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, generateInvoiceNumber } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, statusColor, statusLabel } from '@/components/ui/Badge';
import { Input, Textarea, Select, CurrencyInput } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingSpinner, EmptyState, ErrorState, PageContainer } from '@/components/ui/States';
import { PrintModal } from '@/components/print/PrintModal';
import type { PurchaseInvoice, PurchaseOrder, Supplier, InvoiceStatus } from '@/types';

export function Invoices() {
  const [invoices, setInvoices] = useState<
    (PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder })[]
  >([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseInvoice | null>(null);
  const [viewing, setViewing] = useState<(PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseInvoice | null>(null);
  const [printTarget, setPrintTarget] = useState<(PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder }) | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
  const [form, setForm] = useState({
    invoice_number: '',
    supplier_id: '',
    po_id: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    subtotal: '0',
    tax_amount: '0',
    total_amount: '0',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Execute batch overdue sync in database
      await supabase.rpc('sync_overdue_invoices');
    } catch {
      // Graceful fallback if RPC is not available
    }

    let query = supabase
      .from('purchase_invoices')
      .select('*, supplier:suppliers(*), purchase_order:purchase_orders(*)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      for (const inv of (data as PurchaseInvoice[]) ?? []) {
        if (inv.status === 'unpaid' && inv.due_date < today) {
          await supabase.from('purchase_invoices').update({ status: 'overdue' }).eq('id', inv.id);
        }
      }
      setInvoices(
        (data as (PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder })[]) ?? []
      );
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
    supabase
      .from('purchase_orders')
      .select('*')
      .in('status', ['approved', 'partially_received', 'received', 'closed'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data as PurchaseOrder[]) ?? []));
  }, []);

  const filtered = invoices.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(q) ||
      (i.supplier?.name?.toLowerCase().includes(q) ?? false)
    );
  });

  async function openCreate() {
    setEditing(null);
    const autoNumber = await generateInvoiceNumber();
    setForm({
      invoice_number: autoNumber,
      supplier_id: '',
      po_id: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subtotal: '0',
      tax_amount: '0',
      total_amount: '0',
      notes: '',
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(inv: PurchaseInvoice) {
    setEditing(inv);
    setForm({
      invoice_number: inv.invoice_number,
      supplier_id: inv.supplier_id,
      po_id: inv.po_id ?? '',
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      subtotal: String(inv.subtotal),
      tax_amount: String(inv.tax_amount),
      total_amount: String(inv.total_amount),
      notes: inv.notes ?? '',
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function onPoSelect(poId: string) {
    setForm({ ...form, po_id: poId });
    if (poId) {
      const po = orders.find((p) => p.id === poId);
      if (po) {
        setForm((f) => ({
          ...f,
          po_id: poId,
          supplier_id: po.supplier_id,
          subtotal: String(po.subtotal),
          tax_amount: String(po.tax_amount),
          total_amount: String(po.total_amount),
        }));
      }
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!form.invoice_number.trim()) {
      errors.invoice_number = 'Invoice number is required';
    }
    if (!form.supplier_id) {
      errors.supplier_id = 'Please select a supplier';
    }
    if (!form.invoice_date) {
      errors.invoice_date = 'Invoice date is required';
    }
    if (!form.due_date) {
      errors.due_date = 'Due date is required';
    }

    const totalVal = parseFloat(form.total_amount) || (parseFloat(form.subtotal) || 0) + (parseFloat(form.tax_amount) || 0);
    if (totalVal <= 0) {
      errors.total_amount = 'Total amount must be greater than 0';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the errors in the form.');
      return false;
    }

    setFormError(null);
    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;

    const subtotal = parseFloat(form.subtotal) || 0;
    const taxAmount = parseFloat(form.tax_amount) || 0;
    const totalAmount = parseFloat(form.total_amount) || subtotal + taxAmount;

    setSaving(true);
    setFormError(null);
    try {
      const invData = {
        invoice_number: form.invoice_number,
        supplier_id: form.supplier_id,
        po_id: form.po_id || null,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: form.notes || null,
      };

      if (editing) {
        const { error: err } = await supabase
          .from('purchase_invoices')
          .update(invData)
          .eq('id', editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('purchase_invoices')
          .insert({ ...invData, amount_paid: 0, status: 'unpaid' });
        if (err) throw err;
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  async function viewInvoice(
    inv: PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder }
  ) {
    setViewing(inv);
  }

  function openPayment(inv: PurchaseInvoice) {
    setViewing(inv);
    const remaining = Number(inv.total_amount) - Number(inv.amount_paid);
    setPaymentAmount(String(remaining));
    setPaymentModalOpen(true);
  }

  async function recordPayment() {
    if (!viewing) return;
    const payAmt = parseFloat(paymentAmount) || 0;
    const remaining = Number(viewing.total_amount) - Number(viewing.amount_paid);

    if (payAmt <= 0) {
      setFormError('Enter a valid payment amount greater than 0');
      return;
    }
    if (payAmt > remaining + 0.01) {
      setFormError(`Payment cannot exceed the remaining balance of ${formatCurrency(remaining)}`);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const newAmountPaid = Number(viewing.amount_paid) + payAmt;
      const total = Number(viewing.total_amount);
      const newStatus: InvoiceStatus =
        newAmountPaid >= total ? 'paid' : 'partially_paid';

      const { error: err } = await supabase
        .from('purchase_invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', viewing.id);
      if (err) throw err;

      setPaymentModalOpen(false);
      await load();
      setViewing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('purchase_invoices')
        .delete()
        .eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setSaving(false);
    }
  }

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)), 0);
  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)), 0);

  return (
    <PageContainer>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Invoices</h2>
          <p className="mt-0.5 text-sm text-slate-500">Track supplier invoices and payments</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Receipt className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Total Invoices</span>
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{invoices.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Outstanding</span>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-slate-900">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Overdue</span>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-red-600">{formatCurrency(totalOverdue)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-40"
        >
          <option value="all">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <DataTable
          exportFileName="purchase_invoices_summary"
          columns={[
            {
              key: 'invoice_number',
              header: 'Invoice #',
              exportValue: (i) => i.invoice_number,
              render: (i) => <span className="font-semibold text-slate-800">{i.invoice_number}</span>,
            },
            {
              key: 'supplier',
              header: 'Supplier',
              exportValue: (i) => i.supplier?.name || 'N/A',
              render: (i) => i.supplier?.name ?? 'N/A',
            },
            {
              key: 'invoice_date',
              header: 'Invoice Date',
              exportValue: (i) => formatDate(i.invoice_date),
              render: (i) => formatDate(i.invoice_date),
            },
            {
              key: 'due_date',
              header: 'Due Date',
              exportValue: (i) => formatDate(i.due_date),
              render: (i) => formatDate(i.due_date),
            },
            {
              key: 'total_amount',
              header: 'Total',
              exportValue: (i) => Number(i.total_amount),
              render: (i) => <span className="font-semibold font-mono text-slate-800">{formatCurrency(Number(i.total_amount))}</span>,
            },
            {
              key: 'amount_paid',
              header: 'Paid',
              exportValue: (i) => Number(i.amount_paid),
              render: (i) => <span className="font-mono text-slate-700">{formatCurrency(Number(i.amount_paid))}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              exportValue: (i) => statusLabel(i.status),
              render: (i) => <Badge color={statusColor(i.status)}>{statusLabel(i.status)}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              render: (i) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); viewInvoice(i); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="View Invoice"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPrintTarget(i); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    title="Print Commercial Invoice"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  {i.status !== 'paid' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openPayment(i); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                      title="Record Payment"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(i); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(i); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={filtered}
          rowKey={(i) => i.id}
          onRowClick={(i) => viewInvoice(i)}
          empty={
            <EmptyState
              icon={<Receipt className="h-10 w-10" />}
              title="No invoices found"
              description="Record supplier invoices to track payments and due dates."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" />New Invoice</Button>}
            />
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Invoice' : 'New Invoice'}
        subtitle={editing ? editing.invoice_number : 'Record a supplier invoice'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Invoice Number"
              required
              error={fieldErrors.invoice_number}
              value={form.invoice_number}
              onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
              placeholder="INV-2024-001"
              hint={editing ? undefined : 'Auto-generated'}
            />
            <Select
              label="Link to PO (optional)"
              value={form.po_id}
              onChange={(e) => onPoSelect(e.target.value)}
            >
              <option value="">No linked PO</option>
              {orders.map((p) => (
                <option key={p.id} value={p.id}>{p.po_number}</option>
              ))}
            </Select>
            <Select
              label="Supplier"
              required
              error={fieldErrors.supplier_id}
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <div />
            <Input
              label="Invoice Date"
              required
              error={fieldErrors.invoice_date}
              type="date"
              value={form.invoice_date}
              onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
            />
            <Input
              label="Due Date"
              required
              error={fieldErrors.due_date}
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
            <CurrencyInput
              label="Subtotal"
              value={form.subtotal}
              onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
            />
            <CurrencyInput
              label="Tax Amount"
              value={form.tax_amount}
              onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
            />
            <CurrencyInput
              label="Total Amount"
              required
              error={fieldErrors.total_amount}
              value={form.total_amount}
              onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes..."
          />
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        open={!!viewing && !paymentModalOpen}
        onClose={() => setViewing(null)}
        title={viewing?.invoice_number ?? ''}
        subtitle={viewing?.supplier?.name}
        size="lg"
        footer={
          viewing && (
            <div className="flex w-full items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPrintTarget(viewing)}
              >
                <Printer className="h-3.5 w-3.5 text-emerald-600" /> Print Invoice
              </Button>
              {viewing.status !== 'paid' && (
                <Button onClick={() => openPayment(viewing)}>
                  <DollarSign className="h-4 w-4" /> Record Payment
                </Button>
              )}
            </div>
          )
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge color={statusColor(viewing.status)}>{statusLabel(viewing.status)}</Badge>
              {viewing.purchase_order && (
                <span className="text-sm text-slate-500">Linked PO: {viewing.purchase_order.po_number}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Invoice Date</p>
                <p className="text-sm text-slate-800">{formatDate(viewing.invoice_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Due Date</p>
                <p className="text-sm text-slate-800">{formatDate(viewing.due_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total</p>
                <p className="text-sm font-semibold font-mono text-slate-900">{formatCurrency(Number(viewing.total_amount))}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Balance Due</p>
                <p className="text-sm font-semibold font-mono text-red-600">
                  {formatCurrency(Number(viewing.total_amount) - Number(viewing.amount_paid))}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                <div className="p-4">
                  <p className="text-xs font-medium text-slate-500">Subtotal</p>
                  <p className="mt-1 text-lg font-semibold font-mono text-slate-900">{formatCurrency(Number(viewing.subtotal))}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium text-slate-500">Tax</p>
                  <p className="mt-1 text-lg font-semibold font-mono text-slate-900">{formatCurrency(Number(viewing.tax_amount))}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200">
                <div className="p-4">
                  <p className="text-xs font-medium text-slate-500">Amount Paid</p>
                  <p className="mt-1 text-lg font-semibold font-mono text-emerald-600">{formatCurrency(Number(viewing.amount_paid))}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium text-slate-500">Outstanding</p>
                  <p className="mt-1 text-lg font-semibold font-mono text-red-600">
                    {formatCurrency(Number(viewing.total_amount) - Number(viewing.amount_paid))}
                  </p>
                </div>
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

      {/* Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Payment"
        subtitle={viewing?.invoice_number}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={recordPayment} disabled={saving}>
              {saving ? 'Processing...' : 'Record Payment'}
            </Button>
          </>
        }
      >
        {viewing && (
          <div className="space-y-3">
            {formError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
            )}
            <div className="rounded-lg bg-slate-50 p-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-medium font-mono">{formatCurrency(Number(viewing.total_amount))}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Already Paid</span><span className="font-medium font-mono">{formatCurrency(Number(viewing.amount_paid))}</span></div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-1"><span className="text-slate-700 font-medium">Remaining</span><span className="font-bold font-mono text-red-600">{formatCurrency(Number(viewing.total_amount) - Number(viewing.amount_paid))}</span></div>
            </div>
            <CurrencyInput
              label="Payment Amount"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Invoice"
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
          Are you sure you want to delete invoice <strong>{deleteTarget?.invoice_number}</strong>?
        </p>
        {formError && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
      </Modal>

      {/* Print Modal */}
      {printTarget && (
        <PrintModal
          type="invoice"
          open={!!printTarget}
          onClose={() => setPrintTarget(null)}
          invoice={printTarget}
        />
      )}
    </PageContainer>
  );
}
