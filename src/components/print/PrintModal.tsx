import { Printer, X } from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseInvoice, Supplier } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PrintModalProps {
  open: boolean;
  onClose: () => void;
  type: 'po' | 'invoice';
  order?: PurchaseOrder & { supplier?: Supplier };
  items?: PurchaseOrderItem[];
  invoice?: PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder };
}

export function PrintModal({ open, onClose, type, order, items, invoice }: PrintModalProps) {
  if (!open) return null;

  const handlePrint = () => {
    const printContent = type === 'po' ? generatePOHtml(order!, items ?? []) : generateInvoiceHtml(invoice!);
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(printContent);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:p-6 sm:pt-12">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Printer className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {type === 'po' ? 'Print Purchase Order' : 'Print Invoice'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {type === 'po' && order ? (
            <POPreview order={order} items={items ?? []} />
          ) : invoice ? (
            <InvoicePreview invoice={invoice} />
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function POPreview({ order, items }: { order: PurchaseOrder & { supplier?: Supplier }; items: PurchaseOrderItem[] }) {
  return (
    <div className="space-y-5 text-sm text-slate-800">
      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-lg font-bold text-slate-900">Japan 365</p>
          <p className="text-xs text-slate-500">Purchase Module</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Order</p>
          <p className="text-lg font-bold text-slate-900">{order.po_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</p>
          <p className="font-medium text-slate-900">{order.supplier?.name ?? 'N/A'}</p>
          {order.supplier?.email && <p className="text-slate-600">{order.supplier.email}</p>}
          {order.supplier?.phone && <p className="text-slate-600">{order.supplier.phone}</p>}
          {order.supplier?.address && <p className="text-slate-600">{order.supplier.address}</p>}
          {order.supplier?.city && <p className="text-slate-600">{order.supplier.city}, {order.supplier.country}</p>}
        </div>
        <div className="text-right">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order Date</p>
            <p className="font-medium">{formatDate(order.order_date)}</p>
          </div>
          {order.expected_date && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected Date</p>
              <p className="font-medium">{formatDate(order.expected_date)}</p>
            </div>
          )}
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
            <p className="font-medium capitalize">{order.status.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5 text-slate-800">{item.description}</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-700">{Number(item.quantity)}</td>
                <td className="px-4 py-2.5 text-slate-600">{item.unit}</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatCurrency(Number(item.unit_price))}</td>
                <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-800">{formatCurrency(Number(item.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-full max-w-xs space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-mono font-medium">{formatCurrency(Number(order.subtotal))}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-600">Tax ({order.tax_rate}%)</span><span className="font-mono font-medium">{formatCurrency(Number(order.tax_amount))}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-600">Shipping</span><span className="font-mono font-medium">{formatCurrency(Number(order.shipping_cost))}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold"><span className="text-slate-900">Total</span><span className="font-mono text-slate-900">{formatCurrency(Number(order.total_amount))}</span></div>
      </div>

      {order.notes && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Notes</p>
          <p className="mt-1 text-sm text-slate-700">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

function InvoicePreview({ invoice }: { invoice: PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder } }) {
  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
  return (
    <div className="space-y-5 text-sm text-slate-800">
      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-lg font-bold text-slate-900">Japan 365</p>
          <p className="text-xs text-slate-500">Purchase Module</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Commercial Invoice</p>
          <p className="text-lg font-bold text-slate-900">{invoice.invoice_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Bill To</p>
          <p className="font-medium text-slate-900">{invoice.supplier?.name ?? 'N/A'}</p>
          {invoice.supplier?.email && <p className="text-slate-600">{invoice.supplier.email}</p>}
          {invoice.supplier?.phone && <p className="text-slate-600">{invoice.supplier.phone}</p>}
          {invoice.supplier?.address && <p className="text-slate-600">{invoice.supplier.address}</p>}
          {invoice.supplier?.city && <p className="text-slate-600">{invoice.supplier.city}, {invoice.supplier.country}</p>}
        </div>
        <div className="text-right">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice Date</p>
            <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
          </div>
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Due Date</p>
            <p className="font-medium">{formatDate(invoice.due_date)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
            <p className="font-medium capitalize">{invoice.status.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      {invoice.purchase_order && (
        <div className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
          <span className="text-slate-500">Linked PO: </span>
          <span className="font-medium text-slate-800">{invoice.purchase_order.po_number}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-2.5 text-slate-800">Invoice total for goods and services</td>
              <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-800">{formatCurrency(Number(invoice.subtotal))}</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-slate-600">Tax</td>
              <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatCurrency(Number(invoice.tax_amount))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-full max-w-xs space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-mono font-medium">{formatCurrency(Number(invoice.subtotal))}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-600">Tax</span><span className="font-mono font-medium">{formatCurrency(Number(invoice.tax_amount))}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold"><span className="text-slate-900">Total</span><span className="font-mono text-slate-900">{formatCurrency(Number(invoice.total_amount))}</span></div>
        <div className="flex justify-between text-sm text-emerald-700"><span className="font-medium">Paid</span><span className="font-mono font-medium">{formatCurrency(Number(invoice.amount_paid))}</span></div>
        <div className="flex justify-between text-sm font-bold text-red-600"><span>Balance Due</span><span className="font-mono">{formatCurrency(balance)}</span></div>
      </div>

      {invoice.notes && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Notes</p>
          <p className="mt-1 text-sm text-slate-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}

function generatePOHtml(order: PurchaseOrder & { supplier?: Supplier }, items: PurchaseOrderItem[]): string {
  const rows = items.map((i) => `
    <tr>
      <td>${i.description}</td>
      <td style="text-align:right">${Number(i.quantity)}</td>
      <td>${i.unit}</td>
      <td style="text-align:right">${formatCurrency(Number(i.unit_price))}</td>
      <td style="text-align:right">${formatCurrency(Number(i.line_total))}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><title>${order.po_number}</title>
  <style>
    * { font-family: -apple-system, system-ui, sans-serif; box-sizing: border-box; }
    body { padding: 40px; color: #1e293b; font-size: 14px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: 700; }
    .doc-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    .doc-number { font-size: 22px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .totals { margin-left: auto; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 4px; font-size: 16px; font-weight: 700; }
    .notes { background: #f8fafc; padding: 12px; border-radius: 8px; margin-top: 16px; }
  </style></head><body>
    <div class="header">
      <div><div class="company">Japan 365</div><div style="color:#64748b;font-size:12px">Purchase Module</div></div>
      <div style="text-align:right"><div class="doc-label">Purchase Order</div><div class="doc-number">${order.po_number}</div></div>
    </div>
    <div class="grid">
      <div><div class="label">Supplier</div><div style="font-weight:600">${order.supplier?.name ?? 'N/A'}</div>
        ${order.supplier?.email ? `<div>${order.supplier.email}</div>` : ''}
        ${order.supplier?.phone ? `<div>${order.supplier.phone}</div>` : ''}
        ${order.supplier?.address ? `<div>${order.supplier.address}</div>` : ''}
        ${order.supplier?.city ? `<div>${order.supplier.city}, ${order.supplier.country ?? ''}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div class="label">Order Date</div><div style="font-weight:600;margin-bottom:8px">${formatDate(order.order_date)}</div>
        ${order.expected_date ? `<div class="label">Expected Date</div><div style="font-weight:600;margin-bottom:8px">${formatDate(order.expected_date)}</div>` : ''}
        <div class="label">Status</div><div style="font-weight:600;text-transform:capitalize">${order.status.replace(/_/g, ' ')}</div>
      </div>
    </div>
    <table><thead><tr>
      <th style="text-align:left">Description</th><th style="text-align:right">Qty</th><th style="text-align:left">Unit</th>
      <th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>${formatCurrency(Number(order.subtotal))}</span></div>
      <div><span>Tax (${order.tax_rate}%)</span><span>${formatCurrency(Number(order.tax_amount))}</span></div>
      <div><span>Shipping</span><span>${formatCurrency(Number(order.shipping_cost))}</span></div>
      <div class="grand"><span>Total</span><span>${formatCurrency(Number(order.total_amount))}</span></div>
    </div>
    ${order.notes ? `<div class="notes"><div class="label">Notes</div><div>${order.notes}</div></div>` : ''}
  </body></html>`;
}

function generateInvoiceHtml(invoice: PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder }): string {
  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
  return `<!DOCTYPE html><html><head><title>${invoice.invoice_number}</title>
  <style>
    * { font-family: -apple-system, system-ui, sans-serif; box-sizing: border-box; }
    body { padding: 40px; color: #1e293b; font-size: 14px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: 700; }
    .doc-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    .doc-number { font-size: 22px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .totals { margin-left: auto; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 4px; font-size: 16px; font-weight: 700; }
    .paid { color: #047857; font-weight: 600; }
    .balance { color: #dc2626; font-weight: 700; }
    .po-link { background: #f8fafc; padding: 10px 12px; border-radius: 8px; margin-bottom: 20px; }
    .notes { background: #f8fafc; padding: 12px; border-radius: 8px; margin-top: 16px; }
  </style></head><body>
    <div class="header">
      <div><div class="company">Japan 365</div><div style="color:#64748b;font-size:12px">Purchase Module</div></div>
      <div style="text-align:right"><div class="doc-label">Commercial Invoice</div><div class="doc-number">${invoice.invoice_number}</div></div>
    </div>
    <div class="grid">
      <div><div class="label">Bill To</div><div style="font-weight:600">${invoice.supplier?.name ?? 'N/A'}</div>
        ${invoice.supplier?.email ? `<div>${invoice.supplier.email}</div>` : ''}
        ${invoice.supplier?.phone ? `<div>${invoice.supplier.phone}</div>` : ''}
        ${invoice.supplier?.address ? `<div>${invoice.supplier.address}</div>` : ''}
        ${invoice.supplier?.city ? `<div>${invoice.supplier.city}, ${invoice.supplier.country ?? ''}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div class="label">Invoice Date</div><div style="font-weight:600;margin-bottom:8px">${formatDate(invoice.invoice_date)}</div>
        <div class="label">Due Date</div><div style="font-weight:600;margin-bottom:8px">${formatDate(invoice.due_date)}</div>
        <div class="label">Status</div><div style="font-weight:600;text-transform:capitalize">${invoice.status.replace(/_/g, ' ')}</div>
      </div>
    </div>
    ${invoice.purchase_order ? `<div class="po-link"><span style="color:#64748b">Linked PO: </span><span style="font-weight:600">${invoice.purchase_order.po_number}</span></div>` : ''}
    <table><thead><tr>
      <th style="text-align:left">Description</th><th style="text-align:right">Amount</th>
    </tr></thead><tbody>
      <tr><td>Invoice subtotal</td><td style="text-align:right">${formatCurrency(Number(invoice.subtotal))}</td></tr>
      <tr><td>Tax</td><td style="text-align:right">${formatCurrency(Number(invoice.tax_amount))}</td></tr>
    </tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>${formatCurrency(Number(invoice.subtotal))}</span></div>
      <div><span>Tax</span><span>${formatCurrency(Number(invoice.tax_amount))}</span></div>
      <div class="grand"><span>Total</span><span>${formatCurrency(Number(invoice.total_amount))}</span></div>
      <div class="paid"><span>Paid</span><span>${formatCurrency(Number(invoice.amount_paid))}</span></div>
      <div class="balance"><span>Balance Due</span><span>${formatCurrency(balance)}</span></div>
    </div>
    ${invoice.notes ? `<div class="notes"><div class="label">Notes</div><div>${invoice.notes}</div></div>` : ''}
  </body></html>`;
}
