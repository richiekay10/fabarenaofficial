import { useCallback, useEffect, useState } from 'react';
import { Building2, Save, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Settings as SettingsType } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/StatCard';

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    setSettings(data as SettingsType | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(false);
    const { error } = await supabase.from('settings').update({
      company_name: settings.company_name,
      company_email: settings.company_email,
      company_phone: settings.company_phone,
      company_address: settings.company_address,
      default_interest_rate: settings.default_interest_rate,
      currency: settings.currency,
    }).eq('id', 1);
    setSaving(false);
    if (error) {
      setSaveError(true);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">Company Information</h3>
            <p className="text-sm text-slate-500">Update your company details and preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Company Name"
            value={settings.company_name}
            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={settings.company_email ?? ''}
              onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
            />
            <Input
              label="Phone"
              value={settings.company_phone ?? ''}
              onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
            />
          </div>

          <Input
            label="Address"
            value={settings.company_address ?? ''}
            onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Interest Rate (%)"
              type="number"
              step="0.01"
              value={settings.default_interest_rate.toString()}
              onChange={(e) => setSettings({ ...settings, default_interest_rate: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Currency Code"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-accent-600 animate-fade-in">
              <Check size={16} />
              Saved successfully
            </span>
          )}
          {saveError && (
            <span className="flex items-center gap-1.5 text-sm text-error-600 animate-fade-in">
              <Check size={16} />
              Could not save changes
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
          </Button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-2">About Fab Arena Ventures</h3>
        <p className="text-sm text-slate-500">
          This microfinance management system helps you track customers, manage loans, record repayments, and analyze your portfolio performance. All data is securely stored and accessible only to authenticated administrators.
        </p>
      </div>
    </div>
  );
}
