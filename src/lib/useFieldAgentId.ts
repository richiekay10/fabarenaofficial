import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useFieldAgentId() {
  const { profile } = useAuth();
  const [fieldAgentId, setFieldAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('field_agents')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!cancelled) {
        setFieldAgentId(data?.id ?? null);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [profile]);

  return { fieldAgentId, loading };
}
