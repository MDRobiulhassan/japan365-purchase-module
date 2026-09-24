import { Printer, Globe2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseInvoice, Supplier } from '@/types';

interface PoPrintProps {
  type: 'po';
  order: PurchaseOrder & { supplier?: Supplier };
  items: PurchaseOrderItem[];
}

interface InvoicePrintProps {
  type: 'invoice';
  invoice: PurchaseInvoice & { supplier?: Supplier; purchase_order?: PurchaseOrder };
}

type PrintModalProps = (PoPrintProps | InvoicePrintProps) & {
  open: boolean;
  onClose: () => void;
};

export function PrintModal(props: PrintModalProps) {
  const { open, onClose, type } = props;

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={type === 'po' ? `Print ${props.order.po_number}` : `Print ${props.invoice.invoice_number}`}
      subtitle="Print-friendly view formatted for paper/PDF export"
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between no-print">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print Document
          </Button>
        </div>
      }
    >
      <div className="printable-document bg-white p-6 rounded-lg text-slate-900 border border-slate-200">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-300 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Globe2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Japan 365 Inc.</h2>
              <p className="text-xs text-slate-500">100 Shibuya Crossing, Tokyo, Japan</p>
              <p className="text-xs text-slate-500">procurement@japan365.com | +81 3 1234 5678</p>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
              {type === 'po' ? 'Purchase Order' : 'Commercial Invoice'}
            </h1>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">
              {type === 'po' ? props.order.po_number : props.invoice.invoice_number}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              Status: <span className="font-semibold text-slate-700">{type === 'po' ? props.order.status.replace('_', ' ') : props.invoice.status.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="my-6 grid grid-cols-2 gap-6 text-sm">
          {/* Supplier Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Vendor / Supplier</p>
            {type === 'po' ? (
              <>
                <p className="font-bold text-slate-900 text-base">{props.order.supplier?.name || 'N/A'}</p>
                <p className="text-xs text-slate-600 mt-1">Code: {props.order.supplier?.code || 'N/A'}</p>
                <p className="text-xs text-slate-600">Contact: {props.order.supplier?.contact_person || 'N/A'}</p>
                <p className="text-xs text-slate-600">Email: {props.order.supplier?.email || 'N/A'}</p>
                <p className="text-xs text-slate-600">Phone: {props.order.supplier?.phone || 'N/A'}</p>
                <p className="text-xs text-slate-600">Address: {[props.order.supplier?.address, props.order.supplier?.city, props.order.supplier?.country].filter(Boolean).join(', ') || 'N/A'}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-slate-900 text-base">{props.invoice.supplier?.name || 'N/A'}</p>
                <p className="text-xs text-slate-600 mt-1">Code: {props.invoice.supplier?.code || 'N/A'}</p>
                <p className="text-xs text-slate-600">Contact: {props.invoice.supplier?.contact_person || 'N/A'}</p>
                <p className="text-xs text-slate-600">Email: {props.invoice.supplier?.email || 'N/A'}</p>
                <p className="text-xs text-slate-600">Phone: {props.invoice.supplier?.phone || 'N/A'}</p>
              </>
            )}
          </div>

          {/* Document Meta Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Document Details</p>
            {type === 'po' ? (
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">Order Date:</span> <span className="font-semibold">{formatDate(props.order.order_date)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Expected Delivery:</span> <span className="font-semibold">{formatDate(props.order.expected_date)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Payment Terms:</span> <span className="font-semibold">{props.order.supplier?.payment_terms || 'Net 30'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tax ID:</span> <span className="font-semibold">{props.order.supplier?.tax_id || 'N/A'}</span></div>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">Invoice Date:</span> <span className="font-semibold">{formatDate(props.invoice.invoice_date)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Due Date:</span> <span className="font-semibold">{formatDate(props.invoice.due_date)}</span></div>
                {props.invoice.purchase_order && (
                  <div className="flex justify-between"><span className="text-slate-500">Linked PO:</span> <span className="font-semibold">{props.invoice.purchase_order.po_number}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-500">Payment Terms:</span> <span className="font-semibold">{props.invoice.supplier?.payment_terms || 'Net 30'}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table (for POs) */}
        {type === 'po' && (
          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-left">Unit</th>
                  <th className="px-3 py-2.5 text-right">Unit Price</th>
                  <th className="px-3 py-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {props.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{item.description}</td>
                    <td className="px-3 py-2 text-right">{Number(item.quantity)}</td>
                    <td className="px-3 py-2 text-slate-600">{item.unit}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unit_price))}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(Number(item.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoice Table Breakdown (for Invoices) */}
        {type === 'invoice' && (
          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="px-4 py-2.5">Item / Breakdown</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    Subtotal for Commercial Invoice {props.invoice.invoice_number}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                    {formatCurrency(Number(props.invoice.subtotal))}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-600">Tax Amount</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {formatCurrency(Number(props.invoice.tax_amount))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 rounded-lg border border-slate-300 bg-slate-50 p-4 space-y-2 text-xs">
            {type === 'po' ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(Number(props.order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({props.order.tax_rate}%)</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(Number(props.order.tax_amount))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping Cost</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(Number(props.order.shipping_cost))}</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">{formatCurrency(Number(props.order.total_amount))}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(Number(props.invoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Amount</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(Number(props.invoice.tax_amount))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(Number(props.invoice.amount_paid))}</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>Balance Due</span>
                  <span className="text-red-600">
                    {formatCurrency(Number(props.invoice.total_amount) - Number(props.invoice.amount_paid))}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
                  <span>Total Invoice Amount</span>
                  <span className="font-semibold">{formatCurrency(Number(props.invoice.total_amount))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes & Terms */}
        {((type === 'po' && props.order.notes) || (type === 'invoice' && props.invoice.notes)) && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-bold text-slate-700">Notes & Terms:</p>
            <p className="mt-1 text-slate-600">
              {type === 'po' ? props.order.notes : props.invoice.notes}
            </p>
          </div>
        )}

        {/* Signature Footer */}
        <div className="mt-12 grid grid-cols-2 gap-12 text-xs border-t border-slate-300 pt-8">
          <div>
            <div className="border-b border-slate-400 h-10 mb-2"></div>
            <p className="font-bold text-slate-800">Prepared By</p>
            <p className="text-slate-500">Authorized Purchasing Agent</p>
          </div>
          <div>
            <div className="border-b border-slate-400 h-10 mb-2"></div>
            <p className="font-bold text-slate-800">Authorized Approval</p>
            <p className="text-slate-500">Management / Finance Manager</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
