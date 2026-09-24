import {
  LayoutDashboard,
  Truck,
  FileText,
  PackageCheck,
  Receipt,
  BarChart3,
  Globe2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, type UserRole } from '@/lib/auth';

export type PageKey =
  | 'dashboard'
  | 'suppliers'
  | 'purchase-orders'
  | 'goods-receipts'
  | 'invoices'
  | 'reports';

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  collapsed: boolean;
}

const navItems: { key: PageKey; label: string; icon: typeof LayoutDashboard; roles?: UserRole[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'suppliers', label: 'Suppliers', icon: Truck },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: FileText },
  { key: 'goods-receipts', label: 'Goods Receipts', icon: PackageCheck },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
];

export function Sidebar({ current, onNavigate, collapsed }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const role = profile?.role ?? 'staff';

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-stone-200 bg-[#1c1917] transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-stone-700/50 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
          <Globe2 className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white leading-tight">Japan 365</p>
            <p className="text-xs text-stone-400 leading-tight">Purchase Module</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              title={item.label}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                'focus:outline-none',
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-stone-700/50 px-2 py-2">
        {!collapsed && (
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-medium text-stone-300 truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-stone-500 capitalize">{role}</p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          title="Sign out"
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
            'text-stone-400 hover:bg-red-900/30 hover:text-red-400 transition-all'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
