import { useEffect, useState, useCallback } from 'react';
import { Users, Wallet, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, PiggyBank, ArrowLeftRight, UserPlus, CreditCard, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, formatDateTime, loanTotalPayable } from '@/lib/format';
import { StatCard, Spinner, EmptyState } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { navigate } from '@/lib/router';

interface DashboardData {
  totalCustomers: number;
  activeLoans: number;
  totalDisbursed: number;
  totalRepayments: number;
  overdueLoans: number;
  outstandingAmount: number;
  recentLoans: any[];
  recentRepayments: any[];
  monthlyData: { month: string; disbursed: number; collected: number }[];
  totalDeposits: number;
  totalWithdrawals: number;
  susuTodayTotal: number;
  susuTodayCount: number;
  activeSusuAccounts: number;
  recentSusuCollections: any[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customersRes, loansRes, repaymentsRes, txnRes, susuRes, susuAccRes] = await Promise.all([
        supabase.from('customers').select('id, status'),
        supabase.from('loans').select('id, customer_id, loan_number, principal_amount, interest_rate, term_months, disbursement_date, status, created_at, customers(full_name)'),
        supabase.from('repayments').select('id, loan_id, amount, payment_date, method, created_at, loans(loan_number, customer_id, customers(full_name))'),
        supabase.from('transactions').select('id, type, amount, transaction_date'),
        supabase.from('susu_collections').select('id, amount, collection_date, customers(full_name), field_agents(full_name)').order('collection_date', { ascending: false }).limit(5),
        supabase.from('susu_accounts').select('id, status'),
      ]);

      const customers = customersRes.data ?? [];
      const loans = loansRes.data ?? [];
      const repayments = repaymentsRes.data ?? [];
      const transactions = txnRes.data ?? [];
      const susuCollections = susuRes.data ?? [];
      const susuAccounts = susuAccRes.data ?? [];

      const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
      const overdueLoans = loans.filter((l) => l.status === 'overdue');
      const totalDisbursed = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);
      const totalRepayments = repayments.reduce((sum, r) => sum + Number(r.amount), 0);

      const outstanding = activeLoans.reduce((sum, l) => {
        const totalPayable = loanTotalPayable(Number(l.principal_amount), Number(l.interest_rate), l.term_months);
        const paid = repayments
          .filter((r) => r.loan_id === l.id)
          .reduce((s, r) => s + Number(r.amount), 0);
        return sum + Math.max(0, totalPayable - paid);
      }, 0);

      const recentLoans = [...loans]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const recentRepayments = [...repayments]
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
        .slice(0, 5);

      // Monthly chart data (last 6 months)
      const now = new Date();
      const monthlyData: { month: string; disbursed: number; collected: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        const disbursed = loans
          .filter((l) => {
            const dd = new Date(l.disbursement_date);
            return dd >= d && dd <= monthEnd;
          })
          .reduce((s, l) => s + Number(l.principal_amount), 0);
        const collected = repayments
          .filter((r) => {
            const pd = new Date(r.payment_date);
            return pd >= d && pd <= monthEnd;
          })
          .reduce((s, r) => s + Number(r.amount), 0);
        monthlyData.push({ month: monthLabel, disbursed, collected });
      }

      const totalDeposits = transactions.filter((t: any) => t.type === 'deposit').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const totalWithdrawals = transactions.filter((t: any) => t.type === 'withdrawal').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const todayStr = new Date().toISOString().slice(0, 10);
      const susuToday = susuCollections.filter((c: any) => c.collection_date === todayStr);
      const susuTodayTotal = susuToday.reduce((s: number, c: any) => s + Number(c.amount), 0);

      setData({
        totalCustomers: customers.length,
        activeLoans: activeLoans.length,
        totalDisbursed,
        totalRepayments,
        overdueLoans: overdueLoans.length,
        outstandingAmount: outstanding,
        recentLoans,
        recentRepayments,
        monthlyData,
        totalDeposits,
        totalWithdrawals,
        susuTodayTotal,
        susuTodayCount: susuToday.length,
        activeSusuAccounts: susuAccounts.filter((a: any) => a.status === 'active').length,
        recentSusuCollections: susuCollections.slice(0, 5),
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  if (!data) return null;

  const maxMonthly = Math.max(...data.monthlyData.flatMap((m) => [m.disbursed, m.collected]), 1);

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition shadow-sm">
          <Users size={16} />
          Add Customer
        </button>
        <button onClick={() => navigate('/loans')} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">
          <Wallet size={16} />
          New Loan
        </button>
        <button onClick={() => navigate('/repayments')} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">
          <CreditCard size={16} />
          Record Payment
        </button>
        <button onClick={() => navigate('/assignments')} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">
          <UserPlus size={16} />
          Assign Agent
        </button>
        <button onClick={() => navigate('/susu')} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">
          <PiggyBank size={16} />
          Susu Collection
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate('/customers')} className="text-left">
          <StatCard
            label="Total Customers"
            value={data.totalCustomers.toString()}
            icon={<Users size={24} />}
            color="blue"
          />
        </button>
        <button onClick={() => navigate('/loans')} className="text-left">
          <StatCard
            label="Active Loans"
            value={data.activeLoans.toString()}
            icon={<Wallet size={24} />}
            color="green"
          />
        </button>
        <StatCard
          label="Total Disbursed"
          value={formatCurrency(data.totalDisbursed)}
          icon={<TrendingUp size={24} />}
          color="amber"
        />
        <button onClick={() => navigate('/repayments')} className="text-left">
          <StatCard
            label="Outstanding"
            value={formatCurrency(data.outstandingAmount)}
            icon={<AlertTriangle size={24} />}
            color="red"
          />
        </button>
      </div>

      {/* Second row: cash flow + susu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Deposits"
          value={formatCurrency(data.totalDeposits)}
          icon={<ArrowLeftRight size={24} />}
          color="green"
        />
        <StatCard
          label="Total Withdrawals"
          value={formatCurrency(data.totalWithdrawals)}
          icon={<ArrowLeftRight size={24} />}
          color="red"
        />
        <StatCard
          label="Susu Collected Today"
          value={formatCurrency(data.susuTodayTotal)}
          icon={<PiggyBank size={24} />}
          color="blue"
        />
        <StatCard
          label="Active Susu Accounts"
          value={data.activeSusuAccounts.toString()}
          icon={<PiggyBank size={24} />}
          color="amber"
        />
      </div>

      {/* Chart + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Disbursements vs Collections</h3>
              <p className="text-sm text-slate-500">Last 6 months overview</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary-500" /> Disbursed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-accent-500" /> Collected
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 h-56">
            {data.monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center gap-1.5 h-44">
                  <div
                    className="w-1/2 max-w-[28px] bg-primary-500 rounded-t-md transition-all hover:bg-primary-600 relative group"
                    style={{ height: `${(m.disbursed / maxMonthly) * 100}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {formatCurrency(m.disbursed)}
                    </span>
                  </div>
                  <div
                    className="w-1/2 max-w-[28px] bg-accent-500 rounded-t-md transition-all hover:bg-accent-600 relative group"
                    style={{ height: `${(m.collected / maxMonthly) * 100}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {formatCurrency(m.collected)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Portfolio Summary</h3>
          <div className="space-y-4">
            <SummaryRow label="Total Disbursed" value={formatCurrency(data.totalDisbursed)} color="text-primary-600" />
            <SummaryRow label="Total Collected" value={formatCurrency(data.totalRepayments)} color="text-accent-600" />
            <SummaryRow label="Outstanding" value={formatCurrency(data.outstandingAmount)} color="text-warning-600" />
            <SummaryRow label="Overdue Loans" value={data.overdueLoans.toString()} color="text-error-600" />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Collection Rate</span>
              <span className="text-lg font-bold text-slate-800">
                {data.totalDisbursed > 0
                  ? `${((data.totalRepayments / data.totalDisbursed) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">Recent Loans</h3>
            <button onClick={() => navigate('/loans')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </button>
          </div>
          {data.recentLoans.length === 0 ? (
            <EmptyState icon={<Wallet size={24} />} title="No loans yet" description="Create your first loan to see it here." />
          ) : (
            <div className="space-y-3">
              {data.recentLoans.map((loan) => (
                <button
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{loan.customers?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{loan.loan_number} · {formatDateTime(loan.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(Number(loan.principal_amount))}</p>
                    <Badge color={loan.status === 'active' ? 'green' : loan.status === 'overdue' ? 'red' : 'slate'}>
                      {loan.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">Recent Repayments</h3>
            <button onClick={() => navigate('/repayments')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </button>
          </div>
          {data.recentRepayments.length === 0 ? (
            <EmptyState icon={<TrendingUp size={24} />} title="No repayments yet" description="Record a repayment to see it here." />
          ) : (
            <div className="space-y-3">
              {data.recentRepayments.map((rep) => (
                <div key={rep.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                      <ArrowDownRight size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {rep.loans?.customers?.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{rep.loans?.loan_number} · {formatDateTime(rep.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-accent-600">
                    <ArrowUpRight size={14} />
                    <span className="text-sm font-semibold">{formatCurrency(Number(rep.amount))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent susu collections */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Recent Susu Collections</h3>
          <button onClick={() => navigate('/susu')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </button>
        </div>
        {data.recentSusuCollections.length === 0 ? (
          <EmptyState icon={<PiggyBank size={24} />} title="No susu collections yet" description="Field agents can record their daily collections here." />
        ) : (
          <div className="space-y-3">
            {data.recentSusuCollections.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <PiggyBank size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.customers?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{c.field_agents?.full_name ?? '—'} · {formatDate(c.collection_date)}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-accent-600">{formatCurrency(Number(c.amount))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}
