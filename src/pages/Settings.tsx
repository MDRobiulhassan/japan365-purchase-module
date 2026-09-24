import { useAuth, type UserRole } from '@/lib/auth';
import { PageContainer } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  User,
  Shield,
  Mail,
  Calendar,
  Key,
  CheckCircle2,
  Lock,
  Building,
  BadgeCheck,
} from 'lucide-react';

const roleBadges: Record<UserRole, { label: string; color: 'blue' | 'green' | 'amber' }> = {
  admin: { label: 'System Administrator', color: 'blue' },
  manager: { label: 'Procurement Manager', color: 'green' },
  staff: { label: 'Purchasing Staff', color: 'amber' },
};

const rolePermissions: Record<
  UserRole,
  { title: string; desc: string; permissions: string[] }
> = {
  admin: {
    title: 'Administrator Access',
    desc: 'Full administrative access across all modules, analytics, and user settings.',
    permissions: [
      'Manage Supplier Directory (Create, Edit, Delete)',
      'Create, Edit, Approve, & Cancel Purchase Orders',
      'Record & Manage Goods Receipts',
      'Create, Edit, & Record Invoice Payments',
      'Access Executive Financial Reports & Analytics',
    ],
  },
  manager: {
    title: 'Managerial Access',
    desc: 'Management access to approve purchase orders and review procurement reports.',
    permissions: [
      'Manage Supplier Directory (Create, Edit)',
      'Create, Edit, & Approve Purchase Orders',
      'Record & Manage Goods Receipts',
      'Record & Review Supplier Invoices',
      'Access Procurement Reports & Analytics',
    ],
  },
  staff: {
    title: 'Standard Staff Access',
    desc: 'Operational purchasing access to manage daily orders and receipts.',
    permissions: [
      'View Supplier Directory',
      'Create & Submit Purchase Orders for Approval',
      'Record Received Goods (GRN)',
      'Create & View Supplier Invoices',
    ],
  },
};

export function Settings() {
  const { user, profile } = useAuth();
  const role = profile?.role ?? 'staff';
  const roleInfo = roleBadges[role];
  const permissionsInfo = rolePermissions[role];

  const initials = (profile?.full_name ?? user?.email ?? 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Account Profile & Settings</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          View your personal user profile, assigned role, and module permissions
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white shadow-md">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {profile?.full_name || 'User Profile'}
                  </h3>
                  <Badge color={roleInfo.color}>{roleInfo.label}</Badge>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email || 'N/A'}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Authenticated Account</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <User className="h-4 w-4 text-slate-400" /> Full Name
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-800">
                {profile?.full_name || 'Not specified'}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Mail className="h-4 w-4 text-slate-400" /> Email Address
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-800">{user?.email || 'N/A'}</p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Shield className="h-4 w-4 text-slate-400" /> Assigned Role
              </div>
              <p className="mt-1.5 text-sm font-semibold capitalize text-slate-800">{role}</p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Key className="h-4 w-4 text-slate-400" /> User ID
              </div>
              <p className="mt-1.5 text-xs font-mono text-slate-600 truncate">{user?.id || 'N/A'}</p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Calendar className="h-4 w-4 text-slate-400" /> Created At
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-800">
                {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Building className="h-4 w-4 text-slate-400" /> Organization
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-800">Japan 365 Procurement</p>
            </div>
          </div>
        </div>

        {/* Permissions Breakdown Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{permissionsInfo.title}</h3>
              <p className="text-xs text-slate-500">{permissionsInfo.desc}</p>
            </div>
          </div>

          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Role Capabilities
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {permissionsInfo.permissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-700 font-medium"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
