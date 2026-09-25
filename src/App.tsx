import { useState, useEffect } from 'react';
import { Sidebar, type PageKey } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Dashboard } from '@/pages/Dashboard';
import { Suppliers } from '@/pages/Suppliers';
import { PurchaseOrders } from '@/pages/PurchaseOrders';
import { GoodsReceipts } from '@/pages/GoodsReceipts';
import { Invoices } from '@/pages/Invoices';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { LoginPage } from '@/pages/LoginPage';
import { AuthProvider, useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const pageTitles: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Procurement overview' },
  suppliers: { title: 'Suppliers', subtitle: 'Manage supplier directory' },
  'purchase-orders': { title: 'Purchase Orders', subtitle: 'Create and track orders' },
  'goods-receipts': { title: 'Goods Receipts', subtitle: 'Record received goods' },
  invoices: { title: 'Invoices', subtitle: 'Supplier invoices and payments' },
  reports: { title: 'Reports', subtitle: 'Analytics and insights' },
  settings: { title: 'Profile & Settings', subtitle: 'User account details and role permissions' },
};

const STORAGE_KEY = 'japan365_current_page';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as PageKey | null;
      if (saved && saved in pageTitles) return saved;
    } catch {
      // localStorage not available
    }
    return 'dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, page);
    } catch {
      // ignore
    }
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={setPage} searchQuery={searchQuery} />;
      case 'suppliers':
        return <Suppliers />;
      case 'purchase-orders':
        return <PurchaseOrders />;
      case 'goods-receipts':
        return <GoodsReceipts />;
      case 'invoices':
        return <Invoices />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
    }
  };

  const { title, subtitle } = pageTitles[page];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar current={page} onNavigate={setPage} collapsed={sidebarCollapsed} />
      <div className={cn('transition-all duration-200', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        <TopBar
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          onNavigate={setPage}
          onSearch={setSearchQuery}
        />
        <main className="min-h-[calc(100vh-4rem)]" key={page}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
