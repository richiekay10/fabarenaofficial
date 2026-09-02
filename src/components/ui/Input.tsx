import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && <label className="input-label">{label}</label>}
      <input className={`input ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <div>
      {label && <label className="input-label">{label}</label>}
      <select className={`input ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className="input-label">{label}</label>}
      <textarea className={`input ${className}`} rows={3} {...props} />
    </div>
  );
}
