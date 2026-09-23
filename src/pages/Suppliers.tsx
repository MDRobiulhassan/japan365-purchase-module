import { useEffect, useState, useCallback } from 'react';
import { Truck, Plus, Pencil, Trash2, Search, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, generateSupplierCode } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, statusColor, statusLabel } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingSpinner, EmptyState, ErrorState, PageContainer } from '@/components/ui/States';
import type { Supplier, PurchaseOrder } from '@/types';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [viewOrders, setViewOrders] = useState<PurchaseOrder[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setSuppliers((data as Supplier[]) ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.contact_person?.toLowerCase().includes(q) ?? false) ||
      (s.email?.toLowerCase().includes(q) ?? false)
    );
  });

  async function openCreate() {
    setEditing(null);
    const code = await generateSupplierCode();
    setForm({
      code,
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'United States',
      tax_id: '',
      payment_terms: 'Net 30',
      status: 'active',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ ...s });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      setFormError('Supplier name is required');
      return;
    }
    if (!form.code?.trim()) {
      setFormError('Supplier code is required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const { error: err } = await supabase
          .from('suppliers')
          .update({
            code: form.code,
            name: form.name,
            contact_person: form.contact_person || null,
            email: form.email || null,
            phone: form.phone || null,
            address: form.address || null,
            city: form.city || null,
            country: form.country || 'United States',
            tax_id: form.tax_id || null,
            payment_terms: form.payment_terms || 'Net 30',
            status: form.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('suppliers').insert({
          code: form.code,
          name: form.name,
          contact_person: form.contact_person || null,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          country: form.country || 'United States',
          tax_id: form.tax_id || null,
          payment_terms: form.payment_terms || 'Net 30',
          status: form.status || 'active',
        });
        if (err) throw err;
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error: err } = await supabase.from('suppliers').delete().eq('id', deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete supplier');
    } finally {
      setSaving(false);
    }
  }

  async function viewSupplier(s: Supplier) {
    setViewing(s);
    const { data } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', s.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setViewOrders((data as PurchaseOrder[]) ?? []);
  }

  const totalSpend = viewOrders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'draft')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <PageContainer>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Suppliers</h2>
          <p className="mt-0.5 text-sm text-slate-500">Manage your supplier directory</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code, contact..."
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
              key: 'code',
              header: 'Code',
              render: (s) => <span className="font-medium text-slate-800">{s.code}</span>,
            },
            {
              key: 'name',
              header: 'Supplier',
              render: (s) => (
                <div>
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.contact_person || 'No contact'}</p>
                </div>
              ),
            },
            {
              key: 'email',
              header: 'Email',
              render: (s) => s.email || '—',
            },
            {
              key: 'phone',
              header: 'Phone',
              render: (s) => s.phone || '—',
            },
            {
              key: 'payment_terms',
              header: 'Payment Terms',
              render: (s) => s.payment_terms || '—',
            },
            {
              key: 'status',
              header: 'Status',
              render: (s) => (
                <Badge color={statusColor(s.status)}>{statusLabel(s.status)}</Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              render: (s) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(s);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(s);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={filtered}
          rowKey={(s) => s.id}
          onRowClick={(s) => viewSupplier(s)}
          empty={
            <EmptyState
              icon={<Truck className="h-10 w-10" />}
              title="No suppliers found"
              description="Add your first supplier to start creating purchase orders."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Add Supplier</Button>}
            />
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        subtitle={editing ? editing.code : 'Create a new supplier record'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Supplier Code"
            value={form.code ?? ''}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            disabled={!!editing}
          />
          <Input
            label="Supplier Name"
            value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Acme Corp."
          />
          <Input
            label="Contact Person"
            value={form.contact_person ?? ''}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            placeholder="John Smith"
          />
          <Input
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="contact@acme.com"
          />
          <Input
            label="Phone"
            value={form.phone ?? ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555-0100"
          />
          <Input
            label="Tax ID / VAT"
            value={form.tax_id ?? ''}
            onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
            placeholder="XX123456"
          />
          <Input
            label="Address"
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Main Street"
          />
          <Input
            label="City"
            value={form.city ?? ''}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="New York"
          />
          <Input
            label="Country"
            value={form.country ?? ''}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <Input
            label="Payment Terms"
            value={form.payment_terms ?? ''}
            onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
            placeholder="Net 30"
          />
          <Select
            label="Status"
            value={form.status ?? 'active'}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </Modal>

      {/* View Supplier Modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle={viewing?.code}
        size="lg"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge color={statusColor(viewing.status)}>{statusLabel(viewing.status)}</Badge>
              <span className="text-sm text-slate-500">{viewing.payment_terms}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={viewing.email} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={viewing.phone} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={[viewing.address, viewing.city, viewing.country].filter(Boolean).join(', ')} />
              <InfoRow icon={<Truck className="h-4 w-4" />} label="Tax ID" value={viewing.tax_id} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Orders</p>
                  <p className="text-lg font-bold text-slate-900">{viewOrders.length}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Spend</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalSpend)}</p>
                </div>
              </div>
            </div>

            {viewOrders.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Recent Orders</h4>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {viewOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{o.po_number}</span>
                        <span className="ml-2 text-xs text-slate-500">{formatDate(o.order_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={statusColor(o.status)}>{statusLabel(o.status)}</Badge>
                        <span className="text-sm font-semibold text-slate-700">
                          {formatCurrency(Number(o.total_amount))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Supplier"
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
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          If this supplier has existing purchase orders, deletion will fail.
        </p>
        {formError && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
      </Modal>
    </PageContainer>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm text-slate-800">{value || '—'}</p>
      </div>
    </div>
  );
}
