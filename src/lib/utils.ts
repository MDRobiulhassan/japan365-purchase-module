export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

import { supabase } from '@/lib/supabase';

export async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true });
  const seq = (count ?? 0) + 1;
  return `PO-${year}-${String(seq).padStart(4, '0')}`;
}

export async function generateGrnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('goods_receipts')
    .select('*', { count: 'exact', head: true });
  const seq = (count ?? 0) + 1;
  return `GRN-${year}-${String(seq).padStart(4, '0')}`;
}

export async function generateSupplierCode(): Promise<string> {
  const { count } = await supabase
    .from('suppliers')
    .select('*', { count: 'exact', head: true });
  const seq = (count ?? 0) + 1;
  return `SUP-${String(seq).padStart(3, '0')}`;
}
