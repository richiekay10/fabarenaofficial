import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Search, Phone, Mail, MapPin, UserPlus, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFieldAgentId } from '@/lib/useFieldAgentId';
import type { Customer, CustomerStatus } from '@/lib/types';
import { formatCurrency, formatDateTime, initials } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { navigate } from '@/lib/router';

const statusColors: Record<CustomerStatus, 'green' | 'slate' | 'red'> = {
  active: 'green',
  inactive: 'slate',
  blacklisted: 'red',
};

export function AgentCustomersPage() {
  const { fieldAgentId, loading: agentLoading } = useFieldAgentId();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async () => {
    if (!fieldAgentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('field_agent_id', fieldAgentId)
      .order('created_at', { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  }, [fieldAgentId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !search ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const activeCount = customers.filter((c) => c.status === 'active').length;

  if (agentLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="My Customers" value={customers.length.toString()} icon={<Users size={24} />} color="blue" />
        <StatCard label="Active" value={activeCount.toString()} icon={<Users size={24} />} color="green" />
        <StatCard label="Inactive" value={(customers.length - activeCount).toString()} icon={<Users size={24} />} color="amber" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
        <Button onClick={() => navigate('/agent-add-customer')}>
          <UserPlus size={18} />
          Add Customer
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users size={24} />}
            title={search || statusFilter !== 'all' ? 'No customers found' : 'No customers yet'}
            description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first customer to get started.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
                    {initials(c.full_name)}
                  </div>
                  <div>
                    <button
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="text-sm font-semibold text-slate-800 hover:text-primary-600 transition text-left"
                    >
                      {c.full_name}
                    </button>
                    <Badge color={statusColors[c.status]}>{c.status}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-slate-500"><Phone size={12} /> {c.phone}</p>
                {c.email && <p className="flex items-center gap-2 text-slate-500"><Mail size={12} /> {c.email}</p>}
                {c.address && <p className="flex items-center gap-2 text-slate-500"><MapPin size={12} /> {c.address}</p>}
                <p className="text-xs text-slate-400">Added {formatDateTime(c.created_at)}</p>
              </div>

              <button
                onClick={() => navigate(`/customers/${c.id}`)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 py-2 text-sm font-medium transition"
              >
                <Eye size={16} />
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
