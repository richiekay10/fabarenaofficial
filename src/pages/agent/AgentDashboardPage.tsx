import { useEffect, useState, useCallback } from 'react';
import { PiggyBank, TrendingUp, ClipboardList, Calendar, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { StatCard, Spinner, EmptyState } from '@/components/ui/StatCard';
import { navigate } from '@/lib/router';

interface AgentData {
  todayTotal: number;
  todayCount: number;
  weekTotal: number;
  monthTotal: number;
  totalAllTime: number;
  activeAccounts: number;
  recentCollections: any[];
}

export function AgentDashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [collectionsRes, accountsRes] = await Promise.all([
        supabase.from('susu_collections')
          .select('id, amount, collection_date, customers(full_name), susu_accounts(account_number)')
          .eq('field_agent_id', profile.id)
          .order('collection_date', { ascending: false }),
        supabase.from('susu_accounts')
          .select('id, status, daily_amount, customers(full_name)')
          .eq('field_agent_id', profile.id),
      ]);

      const collections = collectionsRes.data ?? [];
      const accounts = accountsRes.data ?? [];

      const todayStr = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);

      const todayCollections = collections.filter((c: any) => c.collection_date === todayStr);
      const weekCollections = collections.filter((c: any) => new Date(c.collection_date) >= weekAgo);
      const monthCollections = collections.filter((c: any) => new Date(c.collection_date) >= monthAgo);

      setData({
        todayTotal: todayCollections.reduce((s: number, c: any) => s + Number(c.amount), 0),
        todayCount: todayCollections.length,
        weekTotal: weekCollections.reduce((s: number, c: any) => s + Number(c.amount), 0),
        monthTotal: monthCollections.reduce((s: number, c: any) => s + Number(c.amount), 0),
        totalAllTime: collections.reduce((s: number, c: any) => s + Number(c.amount), 0),
        activeAccounts: accounts.filter((a: any) => a.status === 'active').length,
        recentCollections: collections.slice(0, 8),
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [profile]);

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

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="card p-6 bg-gradient-to-br from-accent-600 to-accent-800 text-white">
        <h2 className="text-xl font-bold">Welcome, {profile?.full_name?.split(' ')[0] ?? 'Agent'}</h2>
        <p className="text-accent-100 text-sm mt-1">
          {data.todayCount > 0
            ? `You have recorded ${data.todayCount} collection${data.todayCount === 1 ? '' : 's'} today.`
            : 'You have not recorded any collections today yet.'}
        </p>
        <button
          onClick={() => navigate('/agent-collections')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-medium transition"
        >
          <PiggyBank size={16} />
          Record a Collection
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Collected Today" value={formatCurrency(data.todayTotal)} icon={<TrendingUp size={24} />} color="green" />
        <StatCard label="This Week" value={formatCurrency(data.weekTotal)} icon={<PiggyBank size={24} />} color="blue" />
        <StatCard label="This Month" value={formatCurrency(data.monthTotal)} icon={<Calendar size={24} />} color="amber" />
        <StatCard label="Active Accounts" value={data.activeAccounts.toString()} icon={<ClipboardList size={24} />} color="blue" />
      </div>

      {/* All-time summary */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">All-Time Total Collected</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(data.totalAllTime)}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <PiggyBank size={28} />
          </div>
        </div>
      </div>

      {/* Recent collections */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">My Recent Collections</h3>
          <button onClick={() => navigate('/agent-collections')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </button>
        </div>
        {data.recentCollections.length === 0 ? (
          <EmptyState icon={<PiggyBank size={24} />} title="No collections yet" description="Start recording your daily susu collections." />
        ) : (
          <div className="space-y-3">
            {data.recentCollections.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <PiggyBank size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.customers?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{c.susu_accounts?.account_number ?? '—'} · {formatDate(c.collection_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-accent-600">
                  <ArrowUpRight size={14} />
                  <span className="text-sm font-semibold">{formatCurrency(Number(c.amount))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
