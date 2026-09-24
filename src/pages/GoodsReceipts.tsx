import { useEffect, useState, useCallback } from 'react';
import {
  PackageCheck,
  Plus,
  Search,
  Eye,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, generateGrnNumber } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, statusColor, statusLabel } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingSpinner, EmptyState, ErrorState, PageContainer } from '@/components/ui/States';
import type {
  GoodsReceipt,
  GoodsReceiptItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
} from '@/types';

interface ReceiptItemDraft {
  po_item_id: string;
  description: string;
  unit: string;
  ordered: number;
  alreadyReceived: number;
  quantity_received: string;
}

export function GoodsReceipts() {
  const [receipts, setReceipts] = useState<
    (GoodsReceipt & { supplier?: Supplier; purchase_order?: PurchaseOrder })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<GoodsReceipt | null>(null);
  const [viewItems, setViewItems] = useState<GoodsReceiptItem[]>([]);
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoodsReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
  const [approvedPOs, setApprovedPOs] = useState<
    (PurchaseOrder & { supplier?: Supplier })[]
  >([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [receiptItems, setReceiptItems] = useState<ReceiptItemDraft[]>([]);
  const [grnNumber, setGrnNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptNotes, setReceiptNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('goods_receipts')
      .select('*, supplier:suppliers(*), purchase_order:purchase_orders(*)')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setReceipts(
        (data as (GoodsReceipt & { supplier?: Supplier; purchase_order?: PurchaseOrder })[]) ?? []
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = receipts.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.grn_number.toLowerCase().includes(q) ||
      (r.supplier?.name?.toLowerCase().includes(q) ?? false) ||
      (r.purchase_order?.po_number?.toLowerCase().includes(q) ?? false)
    );
  });

  async function openCreate() {
    setFormError(null);
    setFieldErrors({});
    const num = await generateGrnNumber();
    setGrnNumber(num);
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setReceiptNotes('');
    setSelectedPoId('');
    setPoItems([]);
    setReceiptItems([]);

    const { data: pos } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*)')
      .in('status', ['approved', 'partially_received'])
      .order('created_at', { ascending: false });
    setApprovedPOs((pos as (PurchaseOrder & { supplier?: Supplier })[]) ?? []);
    setModalOpen(true);
  }

  async function onPoSelect(poId: string) {
    setSelectedPoId(poId);
    if (!poId) {
      setPoItems([]);
      setReceiptItems([]);
      return;
    }
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', poId)
      .order('created_at', { ascending: true });
    const itemList = (items as PurchaseOrderItem[]) ?? [];
    setPoItems(itemList);
    setReceiptItems(
      itemList.map((i) => ({
        po_item_id: i.id,
        description: i.description,
        unit: i.unit,
        ordered: Number(i.quantity),
        alreadyReceived: Number(i.received_quantity),
        quantity_received: String(Math.max(0, Number(i.quantity) - Number(i.received_quantity))),
      }))
    );
  }

  function updateReceiptQty(idx: number, value: string) {
    setReceiptItems((items) =>
      items.map((item, i) =>
        i === idx ? { ...item, quantity_received: value } : item
      )
    );
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!selectedPoId) {
      errors.po_id = 'Please select a purchase order';
    }
    if (!receiptDate) {
      errors.receipt_date = 'Receipt date is required';
    }

    const itemsToReceive = receiptItems.filter(
      (i) => parseFloat(i.quantity_received) > 0
    );

    if (itemsToReceive.length === 0) {
      errors.items = 'Enter at least one item quantity to receive (> 0)';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please resolve errors in the form.');
      return false;
    }

    setFormError(null);
    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;
    const itemsToReceive = receiptItems.filter(
      (i) => parseFloat(i.quantity_received) > 0
    );

    setSaving(true);
    setFormError(null);
    try {
      const selectedPo = approvedPOs.find((p) => p.id === selectedPoId);
      const allReceived = receiptItems.every(
        (i) => i.alreadyReceived + (parseFloat(i.quantity_received) || 0) >= i.ordered
      );

      const { data: grn, error: grnErr } = await supabase
        .from('goods_receipts')
        .insert({
          grn_number: grnNumber,
          po_id: selectedPoId,
          supplier_id: selectedPo?.supplier_id,
          receipt_date: receiptDate,
          status: allReceived ? 'complete' : 'partial',
          notes: receiptNotes || null,
        })
        .select()
        .single();
      if (grnErr) throw grnErr;

      const grnItemRows = itemsToReceive.map((i) => ({
        grn_id: grn.id,
        po_item_id: i.po_item_id,
        description: i.description,
        quantity_received: parseFloat(i.quantity_received),
        unit: i.unit,
      }));
      const { error: itemErr } = await supabase
        .from('goods_receipt_items')
        .insert(grnItemRows);
      if (itemErr) throw itemErr;

      for (const item of itemsToReceive) {
        const poItem = poItems.find((p) => p.id === item.po_item_id);
        if (poItem) {
          const newReceivedQty =
            Number(poItem.received_quantity) + parseFloat(item.quantity_received);
          await supabase
            .from('purchase_order_items')
            .update({ received_quantity: newReceivedQty })
            .eq('id', item.po_item_id);
        }
      }

      const newStatus = allReceived ? 'received' : 'partially_received';
      await supabase
        .from('purchase_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedPoId);

      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create goods receipt');
    } finally {
      setSaving(false);
    }
  }

  async function viewReceipt(r: GoodsReceipt & { supplier?: Supplier; purchase_order?: PurchaseOrder }) {
    setViewing(r);
    const { data: items } = await supabase
      .from('goods_receipt_items')
      .select('*')
      .eq('grn_id', r.id)
      .order('created_at', { ascending: true });
    setViewItems((items as GoodsReceiptItem[]) ?? []);
    if (r.purchase_order) setViewPo(r.purchase_order);
    else setViewPo(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { data: grnItems } = await supabase
        .from('goods_receipt_items')
        .select('*')
        .eq('grn_id', deleteTarget.id);
      for (const gi of (grnItems as GoodsReceiptItem[]) ?? []) {
        const { data: poItem } = await supabase
          .from('purchase_order_items')
          .select('*')
          .eq('id', gi.po_item_id)
          .single();
        if (poItem) {
          const restoredQty = Math.max(0, Number(poItem.received_quantity) - Number(gi.quantity_received));
          await supabase
            .from('purchase_order_items')
            .update({ received_quantity: restoredQty })
            .eq('id', gi.po_item_id);
        }
      }
      await supabase
        .from('purchase_orders')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', deleteTarget.po_id);
      await supabase.from('goods_receipts').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete goods receipt');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Goods Receipts</h2>
          <p className="mt-0.5 text-sm text-slate-500">Record goods received against purchase orders</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Receipt
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by GRN number, PO, or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors sm:max-w-md"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <DataTable
          exportFileName="goods_receipts_summary"
          columns={[
            {
              key: 'grn_number',
              header: 'GRN Number',
              exportValue: (r) => r.grn_number,
              render: (r) => <span className="font-semibold text-slate-800">{r.grn_number}</span>,
            },
            {
              key: 'po',
              header: 'PO Number',
              exportValue: (r) => r.purchase_order?.po_number || 'N/A',
              render: (r) => r.purchase_order?.po_number ?? 'N/A',
            },
            {
              key: 'supplier',
              header: 'Supplier',
              exportValue: (r) => r.supplier?.name || 'N/A',
              render: (r) => r.supplier?.name ?? 'N/A',
            },
            {
              key: 'receipt_date',
              header: 'Receipt Date',
              exportValue: (r) => formatDate(r.receipt_date),
              render: (r) => formatDate(r.receipt_date),
            },
            {
              key: 'status',
              header: 'Status',
              exportValue: (r) => statusLabel(r.status),
              render: (r) => <Badge color={statusColor(r.status)}>{statusLabel(r.status)}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              render: (r) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); viewReceipt(r); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={filtered}
          rowKey={(r) => r.id}
          onRowClick={(r) => viewReceipt(r)}
          empty={
            <EmptyState
              icon={<PackageCheck className="h-10 w-10" />}
              title="No goods receipts yet"
              description="Record goods received against approved purchase orders."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" />New Receipt</Button>}
            />
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Goods Receipt"
        subtitle={grnNumber}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Create Receipt'}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Purchase Order"
              required
              error={fieldErrors.po_id}
              value={selectedPoId}
              onChange={(e) => onPoSelect(e.target.value)}
            >
              <option value="">Select approved PO...</option>
              {approvedPOs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.po_number} - {p.supplier?.name}
                </option>
              ))}
            </Select>
            <Input
              label="Receipt Date"
              required
              error={fieldErrors.receipt_date}
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </div>

          {selectedPoId && receiptItems.length > 0 && (
            <div>
              {fieldErrors.items && (
                <p className="mb-2 text-xs font-medium text-red-500">{fieldErrors.items}</p>
              )}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Ordered</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Received</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Qty to Receive *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptItems.map((item, idx) => (
                      <tr key={item.po_item_id}>
                        <td className="px-3 py-2 text-slate-800">{item.description}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.ordered}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.alreadyReceived}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max={item.ordered - item.alreadyReceived}
                            step="any"
                            value={item.quantity_received}
                            onChange={(e) => updateReceiptQty(idx, e.target.value)}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm font-mono text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPoId && receiptItems.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">This PO has no line items.</p>
          )}

          <Textarea
            label="Notes"
            rows={2}
            value={receiptNotes}
            onChange={(e) => setReceiptNotes(e.target.value)}
            placeholder="Optional receipt notes..."
          />
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.grn_number ?? ''}
        subtitle={viewing?.purchase_order?.po_number}
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge color={statusColor(viewing.status)}>{statusLabel(viewing.status)}</Badge>
              <span className="text-sm text-slate-500">Received: {formatDate(viewing.receipt_date)}</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty Received</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-slate-800">{item.description}</td>
                      <td className="px-4 py-2.5 text-right font-medium font-mono text-slate-700">{Number(item.quantity_received)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        title="Delete Goods Receipt"
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
          Deleting <strong>{deleteTarget?.grn_number}</strong> will restore the received quantities back to the purchase order.
        </p>
        {formError && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
      </Modal>
    </PageContainer>
  );
}
