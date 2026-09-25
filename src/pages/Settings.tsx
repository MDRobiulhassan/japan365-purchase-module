import { useState, useEffect } from 'react';
import { Mail, Shield, Calendar, Save, CheckCircle2, Lock, Bell, Activity, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, statusColor } from '@/components/ui/Badge';
import { PageContainer } from '@/components/ui/States';
import { formatDate, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const roleDescriptions: Record<string, string> = {
  admin: 'Full access to all modules including deletion of records and access to reports.',
  manager: 'Can create and edit all records but cannot delete. Has access to reports.',
  staff: 'Read-only access to all modules. Cannot create, edit, or delete records.',
};

const modulePermissions = [
  { name: 'Dashboard', admin: true, manager: true, staff: true },
  { name: 'Suppliers', admin: 'Full', manager: 'Full', staff: 'View' },
  { name: 'Purchase Orders', admin: 'Full', manager: 'Full', staff: 'View' },
  { name: 'Goods Receipts', admin: 'Full', manager: 'Full', staff: 'View' },
  { name: 'Invoices', admin: 'Full', manager: 'Full', staff: 'View' },
  { name: 'Reports', admin: 'Full', manager: 'Full', staff: 'No access' },
  { name: 'Delete Records', admin: 'Yes', manager: 'No', staff: 'No' },
];

export function Settings() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    pendingApprovals: true,
    overdueInvoices: true,
    weeklySummary: false,
    newSuppliers: false,
  });
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Activity stats
  const [stats, setStats] = useState<{ poCount: number; invoiceCount: number; supplierCount: number; totalSpend: number } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [poRes, invRes, supRes] = await Promise.all([
        supabase.from('purchase_orders').select('total_amount', { count: 'exact' }),
        supabase.from('purchase_invoices').select('total_amount', { count: 'exact' }),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
      ]);
      const poSpend = (poRes.data ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0);
      setStats({
        poCount: poRes.count ?? 0,
        invoiceCount: invRes.count ?? 0,
        supplierCount: supRes.count ?? 0,
        totalSpend: poSpend,
      });
    } catch {
      // ignore
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile.id);
      if (err) throw err;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (err) throw err;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  }

  function handleSavePrefs() {
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 3000);
  }

  if (!profile) {
    return (
      <PageContainer>
        <p className="text-sm text-slate-500">Unable to load profile.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Profile and Settings</h2>
        <p className="mt-0.5 text-sm text-slate-500">Manage your account, security, and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Profile + Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Account Information</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xl font-bold text-white shadow-md">
                  {profile.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{profile.full_name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <div className="mt-1">
                    <Badge color={statusColor(profile.role === 'admin' ? 'active' : profile.role === 'manager' ? 'pending' : 'inactive')}>
                      {profile.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email Address</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{user?.email}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Email cannot be changed here</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Member Since</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{formatDate(profile.created_at)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving || fullName.trim() === profile.full_name}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Profile updated
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Security</h3>
              </div>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {showPasswordForm ? 'Cancel' : 'Change password'}
              </button>
            </div>
            <div className="p-6 space-y-4">
              {passwordSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Password changed successfully
                </div>
              )}

              {passwordError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{passwordError}</div>
              )}

              {showPasswordForm ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                      type="button"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Input
                    label="Confirm New Password"
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                  <Button onClick={handlePasswordChange} disabled={passwordSaving || !newPassword || !confirmPassword}>
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                      <Lock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Password</p>
                      <p className="text-xs text-slate-500">Last set when account was created</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400">Secured</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Stats */}
          {stats && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Account Activity</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{stats.poCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Purchase Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{stats.invoiceCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Invoices</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{stats.supplierCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Suppliers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-slate-900">{formatCurrency(stats.totalSpend).replace('.00', '')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Total Spend</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Role + Notifications */}
        <div className="space-y-6">
          {/* Role Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Role and Permissions</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Badge color={statusColor(profile.role === 'admin' ? 'active' : profile.role === 'manager' ? 'pending' : 'inactive')}>
                    {profile.role}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-slate-600">{roleDescriptions[profile.role] ?? 'Custom role.'}</p>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Module</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-500">Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modulePermissions.map((m) => {
                      const access = m[profile.role as keyof typeof m] as string | boolean;
                      const hasAccess = access !== 'No access' && access !== false;
                      return (
                        <tr key={m.name}>
                          <td className="px-3 py-2 text-slate-700">{m.name}</td>
                          <td className={cn('px-3 py-2 text-center font-medium', hasAccess ? 'text-emerald-600' : 'text-slate-400')}>
                            {typeof access === 'string' ? access : hasAccess ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-400">
                Role assignment is managed by an administrator. Contact your admin if you need a role change.
              </p>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Notification Preferences</h3>
            </div>
            <div className="p-6 space-y-3">
              {[
                { key: 'pendingApprovals' as const, label: 'Pending approvals', desc: 'POs awaiting action' },
                { key: 'overdueInvoices' as const, label: 'Overdue invoices', desc: 'Past due date alerts' },
                { key: 'weeklySummary' as const, label: 'Weekly summary', desc: 'Digest every Monday' },
                { key: 'newSuppliers' as const, label: 'New suppliers', desc: 'When a supplier is added' },
              ].map((item) => (
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
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={handleSavePrefs}>
                  {prefsSaved ? 'Saved!' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
