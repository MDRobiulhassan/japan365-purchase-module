import { useState } from 'react';
import { Bell, CheckCircle2, Settings as SettingsIcon, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/States';
import { cn } from '@/lib/utils';

export function Settings() {
  const [notifPrefs, setNotifPrefs] = useState({
    pendingApprovals: true,
    overdueInvoices: true,
    weeklySummary: false,
    newSuppliers: false,
  });
  const [prefsSaved, setPrefsSaved] = useState(false);

  const [displayPrefs, setDisplayPrefs] = useState({
    compactTables: false,
    showGrnCol: true,
    autoRefresh: true,
  });
  const [displaySaved, setDisplaySaved] = useState(false);

  function handleSavePrefs() {
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 3000);
  }

  function handleSaveDisplay() {
    setDisplaySaved(true);
    setTimeout(() => setDisplaySaved(false), 3000);
  }

  const notifItems = [
    { key: 'pendingApprovals' as const, label: 'Pending approvals', desc: 'POs awaiting action' },
    { key: 'overdueInvoices' as const, label: 'Overdue invoices', desc: 'Past due date alerts' },
    { key: 'weeklySummary' as const, label: 'Weekly summary', desc: 'Digest every Monday' },
    { key: 'newSuppliers' as const, label: 'New suppliers', desc: 'When a supplier is added' },
  ];

  const displayItems = [
    { key: 'compactTables' as const, label: 'Compact tables', desc: 'Reduce row spacing in data tables' },
    { key: 'showGrnCol' as const, label: 'Show GRN column', desc: 'Display GRN count in PO list' },
    { key: 'autoRefresh' as const, label: 'Auto-refresh dashboard', desc: 'Update dashboard stats every 30 seconds' },
  ];

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="mt-0.5 text-sm text-slate-500">Manage your notification and display preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notification Preferences */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Notification Preferences</h3>
          </div>
          <div className="p-6 space-y-3">
            {notifItems.map((item) => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifPrefs({ ...notifPrefs, [item.key]: !notifPrefs[item.key] })}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    notifPrefs[item.key] ? 'bg-emerald-500' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      notifPrefs[item.key] ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </label>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={handleSavePrefs}>
                {prefsSaved ? 'Saved!' : 'Save Preferences'}
              </Button>
              {prefsSaved && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Preferences saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Display Preferences</h3>
          </div>
          <div className="p-6 space-y-3">
            {displayItems.map((item) => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayPrefs({ ...displayPrefs, [item.key]: !displayPrefs[item.key] })}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    displayPrefs[item.key] ? 'bg-emerald-500' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      displayPrefs[item.key] ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </label>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={handleSaveDisplay}>
                {displaySaved ? 'Saved!' : 'Save Display Settings'}
              </Button>
              {displaySaved && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">System Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Application</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Japan 365</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Module</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Purchase Management</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Version</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">1.0.0</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Database</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Supabase</p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
