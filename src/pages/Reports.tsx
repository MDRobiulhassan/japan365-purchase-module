import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Truck,
  FileText,
  Receipt,
  PackageCheck,
  DollarSign,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge, statusColor, statusLabel } from '@/components/ui/Badge';
import { LoadingSpinner, PageContainer, ErrorState } from '@/components/ui/States';
import type { PurchaseOrder, PurchaseInvoice, Supplier, GoodsReceipt, POSummaryView } from '@/types';

function getSupplierName(order: POSummaryView | (PurchaseOrder & { supplier?: Supplier })): string {
  if ('supplier_name' in order && order.supplier_name) {
    return order.supplier_name;
  }
  if ('supplier' in order && order.supplier?.name) {
    return order.supplier.name;
  }
  return 'Unknown';
}

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<(POSummaryView | (PurchaseOrder & { supplier?: Supplier }))[]>([]);
  const [invoices, setInvoices] = useState<(PurchaseInvoice & { supplier?: Supplier })[]>([]);
  const [receipts, setReceipts] = useState<(GoodsReceipt & { supplier?: Supplier })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      // First attempt to query the high-performance unified po_summary_view
      const { data: viewData, error: viewError } = await supabase
        .from('po_summary_view')
        .select('*')
        .order('order_date', { ascending: false });

      const [invoicesRes, receiptsRes, suppliersRes] = await Promise.all([
        supabase.from('purchase_invoices').select('*, supplier:suppliers(*)'),
        supabase.from('goods_receipts').select('*, supplier:suppliers(*)'),
        supabase.from('suppliers').select('*'),
      ]);

      if (!viewError && viewData) {
        setOrders(viewData as POSummaryView[]);
      } else {
        // Fallback to direct purchase_orders table query if view is not yet migrated
        const { data: directOrders } = await supabase
          .from('purchase_orders')
          .select('*, supplier:suppliers(*)')
          .order('order_date', { ascending: false });
        setOrders((directOrders as (PurchaseOrder & { supplier?: Supplier })[]) ?? []);
      }

      setInvoices((invoicesRes.data as (PurchaseInvoice & { supplier?: Supplier })[]) ?? []);
      setReceipts((receiptsRes.data as (GoodsReceipt & { supplier?: Supplier })[]) ?? []);
      setSuppliers((suppliersRes.data as Supplier[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorState message={error} onRetry={loadReports} />;


  // Calculations
  const validOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'draft');
  const totalSpend = validOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const avgOrderValue = validOrders.length > 0 ? totalSpend / validOrders.length : 0;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  });

  // Top suppliers by spend
  const supplierSpend: Record<string, { name: string; count: number; total: number }> = {};
  validOrders.forEach((o) => {
    const id = o.supplier_id;
    const sName = getSupplierName(o);
    if (!supplierSpend[id]) {
      supplierSpend[id] = { name: sName, count: 0, total: 0 };
    }
    supplierSpend[id].count += 1;
    supplierSpend[id].total += Number(o.total_amount);
  });
  const topSuppliers = Object.entries(supplierSpend)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Invoice stats
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + Number(i.amount_paid), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  // Monthly spend (last 6 months)
  const now = new Date();
  const monthlyData: { month: string; spend: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthOrders = validOrders.filter((o) => {
      const od = new Date(o.order_date);
      return od >= d && od <= monthEnd;
    });
    const spend = monthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    monthlyData.push({
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      spend,
    });
  }
  const maxMonthlySpend = Math.max(...monthlyData.map((m) => m.spend), 1);

  const summaryCards = [
    {
      label: 'Total Procurement Spend',
      value: formatCurrency(totalSpend),
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    },
    {
      label: 'Average Order Value',
      value: formatCurrency(avgOrderValue),
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600 ring-blue-100',
    },
    {
      label: 'Total Invoiced',
      value: formatCurrency(totalInvoiced),
      icon: Receipt,
      color: 'bg-purple-50 text-purple-600 ring-purple-100',
    },
    {
      label: 'Outstanding Payables',
      value: formatCurrency(totalOutstanding),
      icon: BarChart3,
      color: 'bg-amber-50 text-amber-600 ring-amber-100',
    },
    {
      label: 'Goods Receipts',
      value: String(receipts.length),
      icon: PackageCheck,
      color: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
    },
    {
      label: 'Active Suppliers',
      value: String(suppliers.filter((s) => s.status === 'active').length),
      icon: Truck,
      color: 'bg-slate-100 text-slate-600 ring-slate-200',
    },
  ];

  return (
    <PageContainer>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
        <p className="mt-0.5 text-sm text-slate-500">Procurement insights and spending overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">{card.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Spend Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Monthly Procurement Spend</h3>
          <div className="flex items-end justify-between gap-3 h-48">
            {monthlyData.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400 transition-all hover:from-blue-700 hover:to-cyan-500 relative group"
                    style={{
                      height: `${Math.max((m.spend / maxMonthlySpend) * 100, 2)}%`,
                    }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {formatCurrency(m.spend)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PO Status Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Purchase Order Status</h3>
          <div className="space-y-3">
            {Object.entries(statusCounts).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
            ) : (
              Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge color={statusColor(status)}>{statusLabel(status)}</Badge>
                        <span className="text-sm font-medium text-slate-600">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-800">Top Suppliers by Spend</h3>
          </div>
          {topSuppliers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No supplier spending data yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topSuppliers.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.count} order{s.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(s.total)}</p>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(s.total / topSuppliers[0].total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Recent Purchase Orders</h3>
          </div>
          {validOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No orders yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {validOrders.slice(0, 8).map((o) => {
                const supplierName = getSupplierName(o);
                const fulfillment = 'fulfillment_percentage' in o ? o.fulfillment_percentage : undefined;
                const itemCount = 'total_items_count' in o ? o.total_items_count : undefined;
                return (
                  <div key={o.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{o.po_number}</span>
                        <span className="text-xs text-slate-500">{supplierName}</span>
                      </div>
                      {itemCount !== undefined && fulfillment !== undefined && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {itemCount} item{itemCount !== 1 ? 's' : ''} · {fulfillment}% received
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{formatDate(o.order_date)}</span>
                      <Badge color={statusColor(o.status)}>{statusLabel(o.status)}</Badge>
                      <span className="text-sm font-semibold text-slate-700">{formatCurrency(Number(o.total_amount))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
