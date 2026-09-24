import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  prefix?: ReactNode;
}

export function Input({ label, error, hint, required, prefix, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400 text-sm font-semibold select-none">
            {prefix}
          </div>
        )}
        <input
          className={cn(
            'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900',
            'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            'transition-colors disabled:bg-slate-50 disabled:text-slate-500',
            prefix ? 'pl-7' : undefined,
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined,
            className
          )}
          required={required}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export interface CurrencyInputProps extends Omit<InputProps, 'prefix' | 'type'> {
  currencySymbol?: string;
}

export function CurrencyInput({
  label,
  error,
  currencySymbol = '$',
  required,
  className,
  ...props
}: CurrencyInputProps) {
  return (
    <Input
      label={label}
      error={error}
      required={required}
      prefix={currencySymbol}
      type="number"
      min="0"
      step="0.01"
      className={cn('font-mono font-medium', className)}
      {...props}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export function Textarea({ label, error, required, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900',
          'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          'transition-colors',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined,
          className
        )}
        required={required}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Select({ label, error, required, className, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}
      <select
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900',
          'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          'transition-colors',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined,
          className
        )}
        required={required}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
