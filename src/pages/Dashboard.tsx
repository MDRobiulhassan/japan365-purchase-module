import { useEffect, useState } from 'react';
import {
  FileText,
  Truck,
  Receipt,
  DollarSign,
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge, statusColor, statusLabel } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import type { PageKey } from '@/components/layout/Sidebar';
import type { PurchaseOrder, PurchaseInvoice, Supplier } from '@/types';

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
}

interface KpiData {
  totalOrders: number;
  pendingApproval: number;
  totalSpend: number;
  activeSuppliers: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingReceipts: number;
  openAmount: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [recentOrders, setRecentOrders] = useState<(PurchaseOrder & { supplier?: Supplier })[]>([]);
  const [overdueInv, setOverdueInv] = useState<(PurchaseInvoice & { supplier?: Supplier })[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes, invoicesRes, poReceiptsRes] = await Promise.all([
        supabase.from('purchase_orders').select('*, supplier:suppliers(*)').order('created_at', { ascending: false }).limit(8),
        supabase.from('suppliers').select('*', { count: 'exact' }).eq('status', 'active'),
        supabase.from('purchase_invoices').select('*, supplier:suppliers(*)'),
        supabase.from('goods_receipts').select('po_id').eq('status', 'partial'),
      ]);

      const orders = ordersRes.data ?? [];
      const suppliers = suppliersRes.data ?? [];
      const invoices = invoicesRes.data ?? [];
      const partialReceiptPoIds = (poReceiptsRes.data ?? []).map((r) => r.po_id);

      const totalSpend = orders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'draft')
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const openAmount = invoices
        .filter((i) => i.status !== 'paid')
        .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)), 0);

      const overdue = invoices
        .filter((i) => i.status === 'overdue')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5);

      setKpis({
        totalOrders: orders.length,
        pendingApproval: orders.filter((o) => o.status === 'pending_approval' || o.status === 'draft').length,
        totalSpend,
        activeSuppliers: suppliers.length,
        pendingInvoices: invoices.filter((i) => i.status !== 'paid').length,
        overdueInvoices: overdue.length,
        pendingReceipts: partialReceiptPoIds.length,
        openAmount,
      });

      setRecentOrders(orders as (PurchaseOrder & { supplier?: Supplier })[]);
      setOverdueInv(overdue as (PurchaseInvoice & { supplier?: Supplier })[]);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  const kpiCards = [
    {
      label: 'Total Purchase Orders',
      value: kpis?.totalOrders?.toString() ?? '0',
      icon: FileText,
      color: 'blue',
      onClick: () => onNavigate('purchase-orders'),
    },
    {
      label: 'Pending Approval',
      value: kpis?.pendingApproval?.toString() ?? '0',
      icon: Clock,
      color: 'amber',
      onClick: () => onNavigate('purchase-orders'),
    },
    {
      label: 'Active Suppliers',
      value: kpis?.activeSuppliers?.toString() ?? '0',
      icon: Truck,
      color: 'cyan',
      onClick: () => onNavigate('suppliers'),
    },
    {
      label: 'Total Spend',
      value: formatCurrency(kpis?.totalSpend ?? 0),
      icon: DollarSign,
      color: 'green',
      onClick: () => onNavigate('reports'),
    },
    {
      label: 'Open Invoice Amount',
      value: formatCurrency(kpis?.openAmount ?? 0),
      icon: Receipt,
      color: 'purple',
      onClick: () => onNavigate('invoices'),
    },
    {
      label: 'Overdue Invoices',
      value: kpis?.overdueInvoices?.toString() ?? '0',
      icon: AlertTriangle,
      color: 'red',
      onClick: () => onNavigate('invoices'),
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-100' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100' },
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name?.split(' ')[0] ?? 'User'}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Here's what's happening with your procurement operations today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const c = colorClasses[kpi.color];
          return (
            <button
              key={kpi.label}
              onClick={kpi.onClick}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-slate-300"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ring-1 ${c.ring}`}>
                <Icon className={`h-5 w-5 ${c.text}`} />
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{kpi.value}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Purchase Orders */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-800">Recent Purchase Orders</h3>
            </div>
            <button
              onClick={() => onNavigate('purchase-orders')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <EmptyState icon={<FileText className="h-10 w-10" />} title="No purchase orders yet" description="Create your first purchase order to get started." />
            ) : (
              recentOrders.slice(0, 6).map((order) => (
                <div
                  key={order.id}
                  onClick={() => onNavigate('purchase-orders')}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{order.po_number}</span>
                      <Badge color={statusColor(order.status)}>{statusLabel(order.status)}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {order.supplier?.name ?? 'Unknown supplier'} · {formatDate(order.order_date)}
                    </p>
                  </div>
                  <span className="ml-3 text-sm font-semibold text-slate-700">
                    {formatCurrency(Number(order.total_amount))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-800">Overdue Invoices</h3>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {overdueInv.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <PackageCheck className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-400">No overdue invoices. All caught up!</p>
              </div>
            ) : (
              overdueInv.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => onNavigate('invoices')}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{inv.invoice_number}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {inv.supplier?.name ?? 'Unknown'} · Due {formatDate(inv.due_date)}
                    </p>
                  </div>
                  <span className="ml-3 text-sm font-semibold text-red-600">
                    {formatCurrency(Number(inv.total_amount) - Number(inv.amount_paid))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
