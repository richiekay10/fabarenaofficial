import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  color?: 'blue' | 'green' | 'amber' | 'red';
}

const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-primary-50', text: 'text-primary-600' },
  green: { bg: 'bg-accent-50', text: 'text-accent-600' },
  amber: { bg: 'bg-warning-50', text: 'text-warning-600' },
  red: { bg: 'bg-error-50', text: 'text-error-600' },
};

export function StatCard({ label, value, icon, trend, color = 'blue' }: StatCardProps) {
  const c = colorClasses[color];
  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.positive ? 'text-accent-600' : 'text-error-600'}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-primary-500" />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size={32} />
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
    </div>
  );
}
