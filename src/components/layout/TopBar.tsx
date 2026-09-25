import { useEffect, useState, useRef } from 'react';
import { Menu, Bell, Search, ChevronDown, User, Settings as SettingsIcon, LogOut, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseOrder, PurchaseInvoice, Supplier } from '@/types';
import type { PageKey } from '@/components/layout/Sidebar';

interface Notification {
  id: string;
  type: 'pending_approval' | 'overdue_invoice';
  title: string;
  subtitle: string;
  amount?: number;
  read: boolean;
}

interface TopBarProps {
  title: string;
  subtitle?: string;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onNavigate: (page: PageKey) => void;
  onSearch?: (query: string) => void;
}

export function TopBar({ title, subtitle, onToggleSidebar, sidebarCollapsed, onNavigate, onSearch }: TopBarProps) {
  const { profile, signOut } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const [poRes, invRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('*, supplier:suppliers(*)')
          .in('status', ['pending_approval', 'draft'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('purchase_invoices')
          .select('*, supplier:suppliers(*)')
          .eq('status', 'overdue')
          .order('due_date', { ascending: true })
          .limit(10),
      ]);

      const notifs: Notification[] = [];

      for (const po of (poRes.data as (PurchaseOrder & { supplier?: Supplier })[]) ?? []) {
        notifs.push({
          id: `po-${po.id}`,
          type: 'pending_approval',
          title: `${po.po_number} - ${po.status === 'draft' ? 'Draft' : 'Pending Approval'}`,
          subtitle: po.supplier?.name ?? 'Unknown supplier',
          amount: Number(po.total_amount),
          read: false,
        });
      }

      for (const inv of (invRes.data as (PurchaseInvoice & { supplier?: Supplier })[]) ?? []) {
        notifs.push({
          id: `inv-${inv.id}`,
          type: 'overdue_invoice',
          title: `${inv.invoice_number} - Overdue`,
          subtitle: `${inv.supplier?.name ?? 'Unknown'} · Due ${formatDate(inv.due_date)}`,
          amount: Number(inv.total_amount) - Number(inv.amount_paid),
          read: false,
        });
      }

      setNotifications(notifs);
    } catch (err) {
      console.error('Notification load error:', err);
    }
  }

  function handleNotifClick(notif: Notification) {
    setNotifOpen(false);
    markAllRead();
    if (notif.type === 'pending_approval') {
      onNavigate('purchase-orders');
    } else {
      onNavigate('invoices');
    }
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNavigate('dashboard');
    onSearch?.(search);
  }

  const initials = (profile?.full_name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingCount = notifications.filter((n) => n.type === 'pending_approval').length;
  const overdueCount = notifications.filter((n) => n.type === 'overdue_invoice').length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className={cn('flex-1 min-w-0', sidebarCollapsed && 'sm:block')}>
        <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex relative w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search POs, invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
        />
      </form>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pendingCount} pending · {overdueCount} overdue
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors',
                      !notif.read && 'bg-blue-50/40'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        notif.type === 'overdue_invoice'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{notif.title}</p>
                      <p className="text-xs text-slate-500 truncate">{notif.subtitle}</p>
                      {notif.amount !== undefined && notif.amount > 0 && (
                        <p className={cn(
                          'text-xs font-semibold mt-0.5',
                          notif.type === 'overdue_invoice' ? 'text-red-600' : 'text-slate-600'
                        )}>
                          {formatCurrency(notif.amount)}
                        </p>
                      )}
                    </div>
                    {!notif.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Dropdown */}
      <div className="relative border-l border-slate-200 pl-4" ref={userRef}>
        <button
          onClick={() => setUserOpen(!userOpen)}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity focus:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white shadow-sm">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-800 leading-tight">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-slate-500 leading-tight capitalize">{profile?.role ?? 'staff'}</p>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', userOpen && 'rotate-180')} />
        </button>

        {userOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800 truncate">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{profile?.role ?? 'staff'}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setUserOpen(false); onNavigate('settings'); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="h-4 w-4 text-slate-400" />
                My Profile
              </button>
              <button
                onClick={() => { setUserOpen(false); onNavigate('settings'); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <SettingsIcon className="h-4 w-4 text-slate-400" />
                Settings
              </button>
            </div>
            <div className="border-t border-slate-200 py-1">
              <button
                onClick={() => signOut()}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
