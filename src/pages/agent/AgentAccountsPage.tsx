import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Search, Calendar, Phone, PiggyBank } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { SusuAccountWithDetails } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { navigate } from '@/lib/router';

export function AgentAccountsPage() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<(SusuAccountWithDetails & { _collected?: number; _collectionCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [accRes, collRes] = await Promise.all([
      supabase.from('susu_accounts')
        .select('*, customers(id, full_name, phone), field_agents(id, full_name, zone)')
        .eq('field_agent_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('susu_collections')
        .select('id, susu_account_id, amount, collection_date')
        .eq('field_agent_id', profile.id),
    ]);

    const accs = (accRes.data as SusuAccountWithDetails[]) ?? [];
    const colls = (collRes.data as { susu_account_id: string; amount: number }[]) ?? [];

    const collByAccount: Record<string, { total: number; count: number }> = {};
    for (const c of colls) {
      if (!collByAccount[c.susu_account_id]) collByAccount[c.susu_account_id] = { total: 0, count: 0 };
      collByAccount[c.susu_account_id].total += Number(c.amount);
      collByAccount[c.susu_account_id].count += 1;
    }

    setAccounts(accs.map((a) => ({
      ...a,
      _collected: collByAccount[a.id]?.total ?? 0,
      _collectionCount: collByAccount[a.id]?.count ?? 0,
    })));
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      return !search ||
        (a.customers?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.account_number ?? '').toLowerCase().includes(search.toLowerCase());
    });
  }, [accounts, search]);

  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const totalCollected = accounts.reduce((s, a) => s + (a._collected ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Accounts" value={accounts.length.toString()} icon={<ClipboardList size={24} />} color="blue" />
        <StatCard label="Active Accounts" value={activeCount.toString()} icon={<ClipboardList size={24} />} color="green" />
        <StatCard label="Total Collected" value={formatCurrency(totalCollected)} icon={<PiggyBank size={24} />} color="amber" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by customer or account number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="No accounts assigned"
            description={search ? 'Try adjusting your search.' : 'No susu accounts have been assigned to you yet. Contact an administrator.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((account) => (
            <div key={account.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-400">{account.account_number}</p>
                  <h3 className="text-sm font-semibold text-slate-800 mt-0.5">
                    <button onClick={() => navigate(`/customers/${account.customer_id}`)} className="text-primary-600 hover:text-primary-700">
                      {account.customers?.full_name ?? 'Unknown'}
                    </button>
                  </h3>
                </div>
                <Badge color={account.status === 'active' ? 'green' : 'slate'}>{account.status}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                {account.customers?.phone && (
                  <p className="flex items-center gap-2 text-slate-500"><Phone size={12} /> {account.customers.phone}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Daily Target</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(Number(account.daily_amount))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Collected</span>
                  <span className="font-semibold text-accent-600">{formatCurrency(account._collected ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Collections</span>
                  <span className="text-slate-700">{account._collectionCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Started</span>
                  <span className="text-slate-600 flex items-center gap-1"><Calendar size={12} /> {formatDate(account.start_date)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/agent-collections')}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-accent-50 text-accent-700 hover:bg-accent-100 py-2 text-sm font-medium transition"
              >
                <PiggyBank size={16} />
                Record Collection
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
