import { cn } from '@/lib/utils';

type BadgeColor =
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'slate'
  | 'purple'
  | 'cyan'
  | 'orange';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colorMap: Record<BadgeColor, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
};

export function Badge({ children, color = 'slate', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusColor(status: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    draft: 'slate',
    pending_approval: 'amber',
    approved: 'blue',
    partially_received: 'cyan',
    received: 'green',
    closed: 'slate',
    cancelled: 'red',
    active: 'green',
    inactive: 'slate',
    unpaid: 'amber',
    partially_paid: 'cyan',
    paid: 'green',
    overdue: 'red',
    partial: 'orange',
    complete: 'green',
  };
  return map[status] ?? 'slate';
}

export function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
