import { useCallback, useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Wallet, AlertTriangle, PieChart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, loanTotalPayable } from '@/lib/format';
import { Spinner, StatCard, EmptyState } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';

interface ReportData {
  totalDisbursed: number;
  totalCollected: number;
  totalOutstanding: number;
  totalInterestExpected: number;
  activeLoans: number;
  overdueLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
  totalCustomers: number;
  activeCustomers: number;
  statusBreakdown: { status: string; count: number; amount: number }[];
  topBorrowers: { name: string; total: number; count: number }[];
  monthlyTrend: { month: string; disbursed: number; collected: number }[];
}

export function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [customersRes, loansRes, repaymentsRes] = await Promise.all([
        supabase.from('customers').select('id, status'),
        supabase.from('loans').select('id, customer_id, loan_number, principal_amount, interest_rate, term_months, disbursement_date, status, customers(full_name)'),
        supabase.from('repayments').select('id, loan_id, amount, payment_date'),
      ]);

      const customers = customersRes.data ?? [];
      const loans = loansRes.data ?? [];
      const repayments = repaymentsRes.data ?? [];

      const totalDisbursed = loans.reduce((s, l) => s + Number(l.principal_amount), 0);
      const totalCollected = repayments.reduce((s, r) => s + Number(r.amount), 0);

      const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
      const totalOutstanding = activeLoans.reduce((sum, l) => {
        const payable = loanTotalPayable(Number(l.principal_amount), Number(l.interest_rate), l.term_months);
        const paid = repayments.filter((r) => r.loan_id === l.id).reduce((s, r) => s + Number(r.amount), 0);
        return sum + Math.max(0, payable - paid);
      }, 0);

      const totalInterestExpected = loans.reduce((s, l) => {
        const payable = loanTotalPayable(Number(l.principal_amount), Number(l.interest_rate), l.term_months);
        return s + (payable - Number(l.principal_amount));
      }, 0);

      const statusBreakdown = ['active', 'repaid', 'overdue', 'defaulted'].map((status) => {
        const filtered = loans.filter((l) => l.status === status);
        return {
          status,
          count: filtered.length,
          amount: filtered.reduce((s, l) => s + Number(l.principal_amount), 0),
        };
      });

      // Top borrowers
      const borrowerMap: Record<string, { name: string; total: number; count: number }> = {};
      loans.forEach((l: any) => {
        const name = l.customers?.full_name ?? 'Unknown';
        if (!borrowerMap[l.customer_id]) borrowerMap[l.customer_id] = { name, total: 0, count: 0 };
        borrowerMap[l.customer_id].total += Number(l.principal_amount);
        borrowerMap[l.customer_id].count += 1;
      });
      const topBorrowers = Object.values(borrowerMap).sort((a, b) => b.total - a.total).slice(0, 5);

      // Monthly trend (last 12 months)
      const now = new Date();
      const monthlyTrend: { month: string; disbursed: number; collected: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const disbursed = loans
          .filter((l) => { const dd = new Date(l.disbursement_date); return dd >= d && dd <= monthEnd; })
          .reduce((s, l) => s + Number(l.principal_amount), 0);
        const collected = repayments
          .filter((r) => { const pd = new Date(r.payment_date); return pd >= d && pd <= monthEnd; })
          .reduce((s, r) => s + Number(r.amount), 0);
        monthlyTrend.push({ month: monthLabel, disbursed, collected });
      }

      setData({
        totalDisbursed,
        totalCollected,
        totalOutstanding,
        totalInterestExpected,
        activeLoans: loans.filter((l) => l.status === 'active').length,
        overdueLoans: loans.filter((l) => l.status === 'overdue').length,
        repaidLoans: loans.filter((l) => l.status === 'repaid').length,
        defaultedLoans: loans.filter((l) => l.status === 'defaulted').length,
        totalCustomers: customers.length,
        activeCustomers: customers.filter((c: any) => c.status === 'active').length,
        statusBreakdown,
        topBorrowers,
        monthlyTrend,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  if (!data) return null;

  const maxTrend = Math.max(...data.monthlyTrend.flatMap((m) => [m.disbursed, m.collected]), 1);
  const totalLoanCount = data.activeLoans + data.overdueLoans + data.repaidLoans + data.defaultedLoans;

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Disbursed" value={formatCurrency(data.totalDisbursed)} icon={<Wallet size={24} />} color="blue" />
        <StatCard label="Total Collected" value={formatCurrency(data.totalCollected)} icon={<TrendingUp size={24} />} color="green" />
        <StatCard label="Outstanding" value={formatCurrency(data.totalOutstanding)} icon={<AlertTriangle size={24} />} color="amber" />
        <StatCard label="Expected Interest" value={formatCurrency(data.totalInterestExpected)} icon={<BarChart3 size={24} />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly trend chart */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-1">12-Month Trend</h3>
          <p className="text-sm text-slate-500 mb-6">Disbursements vs Collections over time</p>
          <div className="flex items-end justify-between gap-1.5 h-48">
            {data.monthlyTrend.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="w-full flex items-end justify-center gap-0.5 h-40">
                  <div
                    className="w-1/2 max-w-[16px] bg-primary-500 rounded-t transition-all hover:bg-primary-600 relative"
                    style={{ height: `${(m.disbursed / maxTrend) * 100}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {formatCurrency(m.disbursed)}
                    </span>
                  </div>
                  <div
                    className="w-1/2 max-w-[16px] bg-accent-500 rounded-t transition-all hover:bg-accent-600 relative"
                    style={{ height: `${(m.collected / maxTrend) * 100}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {formatCurrency(m.collected)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Loan status breakdown */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Loan Portfolio Breakdown</h3>
          <p className="text-sm text-slate-500 mb-6">Distribution by status</p>
          <div className="space-y-4">
            {data.statusBreakdown.map((s) => {
              const pct = totalLoanCount > 0 ? (s.count / totalLoanCount) * 100 : 0;
              const colors: Record<string, string> = {
                active: 'bg-accent-500',
                repaid: 'bg-primary-500',
                overdue: 'bg-error-500',
                defaulted: 'bg-slate-400',
              };
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 capitalize">{s.status}</span>
                    <span className="text-sm text-slate-500">{s.count} loans · {formatCurrency(s.amount)}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[s.status]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {totalLoanCount === 0 && (
            <p className="text-sm text-slate-400 text-center mt-4">No loans to analyze yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top borrowers */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Top Borrowers</h3>
          {data.topBorrowers.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="No data yet" description="Top borrowers will appear here." />
          ) : (
            <div className="space-y-3">
              {data.topBorrowers.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.count} loan(s)</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(b.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer stats */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Customer Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-primary-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-primary-600" />
                <span className="text-sm text-slate-600">Total</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{data.totalCustomers}</p>
            </div>
            <div className="rounded-lg bg-accent-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart size={18} className="text-accent-600" />
                <span className="text-sm text-slate-600">Active</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{data.activeCustomers}</p>
            </div>
            <div className="rounded-lg bg-warning-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} className="text-warning-600" />
                <span className="text-sm text-slate-600">Active Loans</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{data.activeLoans}</p>
            </div>
            <div className="rounded-lg bg-error-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-error-600" />
                <span className="text-sm text-slate-600">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{data.overdueLoans}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">Collection Rate</span>
            <Badge color={data.totalDisbursed > 0 && (data.totalCollected / data.totalDisbursed) > 0.7 ? 'green' : 'amber'}>
              {data.totalDisbursed > 0 ? `${((data.totalCollected / data.totalDisbursed) * 100).toFixed(1)}%` : '—'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
