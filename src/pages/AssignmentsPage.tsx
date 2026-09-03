import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Search, Users, UserCog, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer, FieldAgent } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { initials, formatDateTime } from '@/lib/format';
import { navigate } from '@/lib/router';

interface CustomerWithAgent extends Customer {
  field_agents: Pick<FieldAgent, 'id' | 'full_name' | 'zone'> | null;
}

export function AssignmentsPage() {
  const [customers, setCustomers] = useState<CustomerWithAgent[]>([]);
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, aRes] = await Promise.all([
      supabase
        .from('customers')
        .select('*, field_agents(id, full_name, zone)')
        .order('created_at', { ascending: false }),
      supabase.from('field_agents').select('*').order('full_name', { ascending: true }),
    ]);
    setCustomers((cRes.data as CustomerWithAgent[]) ?? []);
    setAgents((aRes.data as FieldAgent[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !search ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchesAgent =
        agentFilter === 'all' ||
        (agentFilter === 'unassigned' && !c.field_agent_id) ||
        c.field_agent_id === agentFilter;
      return matchesSearch && matchesAgent;
    });
  }, [customers, search, agentFilter]);

  const assignedCount = customers.filter((c) => c.field_agent_id).length;
  const unassignedCount = customers.length - assignedCount;

  const openAssign = (customer: CustomerWithAgent) => {
    setAssigningId(customer.id);
    setSelectedAgent(customer.field_agent_id ?? '');
    setError(null);
  };

  const handleAssign = async () => {
    if (!assigningId) return;
    setUpdating(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('customers')
      .update({ field_agent_id: selectedAgent || null })
      .eq('id', assigningId);
    setUpdating(false);
    if (updateError) {
      setError('Could not update the assignment. Please try again.');
      return;
    }
    setAssigningId(null);
    setSelectedAgent('');
    load();
  };

  const handleUnassign = async (customerId: string) => {
    setUpdating(true);
    setError(null);
    await supabase.from('customers').update({ field_agent_id: null }).eq('id', customerId);
    setUpdating(false);
    load();
  };

  const activeAgents = agents.filter((a) => a.status === 'active');
  const assigningCustomer = customers.find((c) => c.id === assigningId);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Customers" value={customers.length.toString()} icon={<Users size={24} />} color="blue" />
        <StatCard label="Assigned" value={assignedCount.toString()} icon={<Check size={24} />} color="green" />
        <StatCard label="Unassigned" value={unassignedCount.toString()} icon={<AlertCircle size={24} />} color="amber" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search customers by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-52" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="all">All Customers</option>
          <option value="unassigned">Unassigned Only</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={24} />}
            title="No customers found"
            description={search || agentFilter !== 'all' ? 'Try adjusting your filters.' : 'Add customers first to assign them to field agents.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Assigned Agent</th>
                  <th className="table-header">Agent Zone</th>
                  <th className="table-header">Added</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                          {initials(c.full_name)}
                        </div>
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="font-medium text-slate-800 hover:text-primary-600 transition"
                        >
                          {c.full_name}
                        </button>
                      </div>
                    </td>
                    <td className="table-cell text-slate-700">{c.phone}</td>
                    <td className="table-cell">
                      {c.field_agents ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-accent-700 text-[10px] font-semibold">
                            {initials(c.field_agents.full_name)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{c.field_agents.full_name}</span>
                        </div>
                      ) : (
                        <Badge color="amber">Unassigned</Badge>
                      )}
                    </td>
                    <td className="table-cell text-slate-500">{c.field_agents?.zone ?? '—'}</td>
                    <td className="table-cell text-slate-500 text-xs">{formatDateTime(c.created_at)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openAssign(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 transition"
                        >
                          <UserPlus size={14} />
                          {c.field_agent_id ? 'Reassign' : 'Assign'}
                        </button>
                        {c.field_agent_id && (
                          <button
                            onClick={() => handleUnassign(c.id)}
                            disabled={updating}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-error-50 hover:text-error-600 transition"
                          >
                            <X size={14} />
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign modal */}
      {assigningCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAssigningId(null)} />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl animate-scale-in flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {assigningCustomer.field_agent_id ? 'Reassign Agent' : 'Assign Agent'}
              </h2>
              <button
                onClick={() => setAssigningId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <div className="mb-5">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="text-sm font-semibold text-slate-800">{assigningCustomer.full_name}</p>
                <p className="text-xs text-slate-400">{assigningCustomer.phone}</p>
              </div>

              {activeAgents.length === 0 ? (
                <div className="rounded-lg bg-warning-50 border border-warning-200 px-4 py-3 text-sm text-warning-700 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>No active field agents available. Add and activate a field agent first.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Select a field agent</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => setSelectedAgent('')}
                      className={`w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition text-left ${
                        selectedAgent === ''
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <X size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">No agent (unassign)</p>
                        <p className="text-xs text-slate-400">Remove current assignment</p>
                      </div>
                    </button>
                    {activeAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                        className={`w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition text-left ${
                          selectedAgent === agent.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">
                          {initials(agent.full_name)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{agent.full_name}</p>
                          <p className="text-xs text-slate-400">
                            {agent.zone ?? 'No zone'} · {agent.phone}
                          </p>
                        </div>
                        {selectedAgent === agent.id && (
                          <Check size={18} className="text-primary-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setAssigningId(null)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={updating || activeAgents.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating && <Loader2 size={16} className="animate-spin" />}
                  {updating ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent workload summary */}
      {agents.length > 0 && !loading && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserCog size={18} className="text-slate-400" />
            Agent Workload
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const count = customers.filter((c) => c.field_agent_id === agent.id).length;
              return (
                <div key={agent.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">
                      {initials(agent.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{agent.full_name}</p>
                      <p className="text-xs text-slate-400">{agent.zone ?? 'No zone'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Assigned customers</span>
                    <Badge color={count === 0 ? 'slate' : 'blue'}>{count}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
