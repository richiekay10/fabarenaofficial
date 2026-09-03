import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCog, Plus, Search, Trash2, Phone, MapPin, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FieldAgent, AgentStatus } from '@/lib/types';
import { formatDateTime, formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { Input, Select } from '@/components/ui/Input';

interface AgentFormData {
  full_name: string;
  phone: string;
  email: string;
  zone: string;
  status: AgentStatus;
}

const emptyForm: AgentFormData = {
  full_name: '',
  phone: '',
  email: '',
  zone: '',
  status: 'active',
};

interface AgentStats {
  totalCollections: number;
  totalAmount: number;
  activeAccounts: number;
}

export function FieldAgentsPage() {
  const [agents, setAgents] = useState<(FieldAgent & { _stats?: AgentStats })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FieldAgent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [agentsRes, collectionsRes, accountsRes] = await Promise.all([
      supabase.from('field_agents').select('*').order('created_at', { ascending: false }),
      supabase.from('susu_collections').select('field_agent_id, amount'),
      supabase.from('susu_accounts').select('field_agent_id, status'),
    ]);

    const agents = (agentsRes.data as FieldAgent[]) ?? [];
    const collections = (collectionsRes.data as { field_agent_id: string; amount: number }[]) ?? [];
    const accounts = (accountsRes.data as { field_agent_id: string; status: string }[]) ?? [];

    const statsMap: Record<string, AgentStats> = {};
    for (const c of collections) {
      if (!statsMap[c.field_agent_id]) statsMap[c.field_agent_id] = { totalCollections: 0, totalAmount: 0, activeAccounts: 0 };
      statsMap[c.field_agent_id].totalCollections += 1;
      statsMap[c.field_agent_id].totalAmount += Number(c.amount);
    }
    for (const a of accounts) {
      if (!statsMap[a.field_agent_id]) statsMap[a.field_agent_id] = { totalCollections: 0, totalAmount: 0, activeAccounts: 0 };
      if (a.status === 'active') statsMap[a.field_agent_id].activeAccounts += 1;
    }

    setAgents(agents.map((ag) => ({ ...ag, _stats: statsMap[ag.id] ?? { totalCollections: 0, totalAmount: 0, activeAccounts: 0 } })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      return !search ||
        a.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (a.zone ?? '').toLowerCase().includes(search.toLowerCase()) ||
        a.phone.includes(search);
    });
  }, [agents, search]);

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const totalCollected = agents.reduce((s, a) => s + (a._stats?.totalAmount ?? 0), 0);

  const openAdd = () => {
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim() || !formData.phone.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('field_agents').insert({
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email || null,
      zone: formData.zone || null,
      status: formData.status,
    });
    setSubmitting(false);
    if (error) return;
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('field_agents').delete().eq('id', deleteTarget.id);
    if (error) return;
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Agents" value={agents.length.toString()} icon={<UserCog size={24} />} color="blue" />
        <StatCard label="Active Agents" value={activeCount.toString()} icon={<UserCog size={24} />} color="green" />
        <StatCard label="Total Susu Collected" value={formatCurrency(totalCollected)} icon={<UserCog size={24} />} color="amber" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, zone, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openAdd} variant="primary">
          <Plus size={18} />
          Add Field Agent
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<UserCog size={24} />}
            title="No field agents found"
            description={search ? 'Try adjusting your search.' : 'Add your first field agent to get started.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <div key={agent.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                    {agent.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{agent.full_name}</h3>
                    <Badge color={agent.status === 'active' ? 'green' : 'slate'}>{agent.status}</Badge>
                  </div>
                </div>
                <button onClick={() => setDeleteTarget(agent)} className="p-1.5 rounded-lg text-slate-400 hover:bg-error-50 hover:text-error-600 transition" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {agent.phone}</p>
                {agent.email && <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {agent.email}</p>}
                {agent.zone && <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {agent.zone}</p>}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-800">{agent._stats?.totalCollections ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Collections</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{agent._stats?.activeAccounts ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Accounts</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-accent-600">{formatCurrency(agent._stats?.totalAmount ?? 0)}</p>
                  <p className="text-[10px] text-slate-500">Collected</p>
                </div>
              </div>

              <p className="mt-3 text-[10px] text-slate-400 text-center">Joined {formatDateTime(agent.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Field Agent" size="md">
        <div className="space-y-4">
          <Input
            label="Full Name *"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="e.g. Kwame Mensah"
          />
          <Input
            label="Phone *"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g. 024 000 0000"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Optional"
          />
          <Input
            label="Assigned Zone / Area"
            value={formData.zone}
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            placeholder="e.g. East Legon, Madina..."
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as AgentStatus })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formData.full_name || !formData.phone}>
              {submitting ? 'Saving...' : 'Add Agent'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Field Agent" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to remove <span className="font-semibold">{deleteTarget?.full_name}</span>? All their susu collection records will also be deleted. This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

