import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CreditCard,
  Calculator,
  BarChart3,
  Settings,
  Building2,
  LogOut,
  Menu,
  X,
  ArrowLeftRight,
  PiggyBank,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRoute, navigate, type Route } from '@/lib/router';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  route: Route;
  path: string;
  match: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, route: { name: 'dashboard' }, path: '/dashboard', match: ['dashboard'] },
  { label: 'Customers', icon: Users, route: { name: 'customers' }, path: '/customers', match: ['customers'] },
  { label: 'Loans', icon: Wallet, route: { name: 'loans' }, path: '/loans', match: ['loans'] },
  { label: 'Repayments', icon: CreditCard, route: { name: 'repayments' }, path: '/repayments', match: ['repayments'] },
  { label: 'Transactions', icon: ArrowLeftRight, route: { name: 'transactions' }, path: '/transactions', match: ['transactions'] },
  { label: 'Susu Collections', icon: PiggyBank, route: { name: 'susu' }, path: '/susu', match: ['susu'] },
  { label: 'Field Agents', icon: UserCog, route: { name: 'field-agents' }, path: '/field-agents', match: ['field-agents'] },
  { label: 'Assignments', icon: UserPlus, route: { name: 'assignments' }, path: '/assignments', match: ['assignments'] },
  { label: 'Calculator', icon: Calculator, route: { name: 'calculator' }, path: '/calculator', match: ['calculator'] },
  { label: 'Reports', icon: BarChart3, route: { name: 'reports' }, path: '/reports', match: ['reports'] },
  { label: 'Settings', icon: Settings, route: { name: 'settings' }, path: '/settings', match: ['settings'] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const route = useRoute();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPath = route.name;
  const activeItem = navItems.find((item) => item.match.includes(currentPath));
  const pageTitle = activeItem?.label ?? 'Dashboard';

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - desktop */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Fab Arena</h1>
            <p className="text-[10px] text-slate-400">Ventures</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.match.includes(currentPath);
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
              {(user?.email ?? 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{profile?.full_name ?? user?.email}</p>
              <p className="text-[10px] text-slate-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-error-600 hover:text-white transition-all"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 h-16 flex items-center px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2 className="text-lg font-semibold text-slate-800 ml-2 lg:ml-0">{pageTitle}</h2>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
