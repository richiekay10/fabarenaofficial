import { useEffect, useState } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'customers' }
  | { name: 'customer-detail'; id: string }
  | { name: 'loans' }
  | { name: 'loan-detail'; id: string }
  | { name: 'repayments' }
  | { name: 'transactions' }
  | { name: 'susu' }
  | { name: 'field-agents' }
  | { name: 'assignments' }
  | { name: 'calculator' }
  | { name: 'reports' }
  | { name: 'settings' }
  | { name: 'agent-dashboard' }
  | { name: 'agent-collections' }
  | { name: 'agent-accounts' };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const parts = clean.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'dashboard' };

  switch (parts[0]) {
    case 'dashboard':
      return { name: 'dashboard' };
    case 'customers':
      if (parts[1]) return { name: 'customer-detail', id: parts[1] };
      return { name: 'customers' };
    case 'loans':
      if (parts[1]) return { name: 'loan-detail', id: parts[1] };
      return { name: 'loans' };
    case 'repayments':
      return { name: 'repayments' };
    case 'transactions':
      return { name: 'transactions' };
    case 'susu':
      return { name: 'susu' };
    case 'field-agents':
      return { name: 'field-agents' };
    case 'assignments':
      return { name: 'assignments' };
    case 'calculator':
      return { name: 'calculator' };
    case 'reports':
      return { name: 'reports' };
    case 'settings':
      return { name: 'settings' };
    case 'agent-dashboard':
      return { name: 'agent-dashboard' };
    case 'agent-collections':
      return { name: 'agent-collections' };
    case 'agent-accounts':
      return { name: 'agent-accounts' };
    default:
      return { name: 'dashboard' };
  }
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return route;
}
