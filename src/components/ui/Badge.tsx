import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'gray';
  className?: string;
}

const colorClasses: Record<string, string> = {
  green: 'bg-accent-50 text-accent-700 border-accent-200',
  blue: 'bg-primary-50 text-primary-700 border-primary-200',
  amber: 'bg-warning-50 text-warning-700 border-warning-200',
  red: 'bg-error-50 text-error-700 border-error-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  gray: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function Badge({ children, color = 'slate', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]} ${className}`}>
      {children}
    </span>
  );
}
