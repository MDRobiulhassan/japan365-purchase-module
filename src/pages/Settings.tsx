import { useState } from 'react';
import { User, Mail, Shield, Calendar, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, statusColor, statusLabel } from '@/components/ui/Badge';
import { PageContainer } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';

const roleDescriptions: Record<string, string> = {
  admin: 'Full access to all modules including deletion of records and access to reports.',
  manager: 'Can create and edit all records but cannot delete. Has access to reports.',
  staff: 'Read-only access to all modules. Cannot create, edit, or delete records.',
};

export function Settings() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <p className="mt-0.5 text-sm text-slate-500">View your account details and update your name</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Account Information</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <User className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">{profile.full_name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
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
        </div>

        {/* Role Card */}
        <div className="space-y-6">
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

              <div className="rounded-lg bg-slate-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions Summary</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2 text-slate-700">
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.role === 'admin' || profile.role === 'manager' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Create and edit records
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.role === 'admin' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Delete records
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.role === 'admin' || profile.role === 'manager' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Access reports
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    View all modules
                  </li>
                </ul>
              </div>

              <p className="text-xs text-slate-400">
                Role assignment is managed by an administrator. Contact your admin if you need a role change.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
