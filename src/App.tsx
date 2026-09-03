import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRoute } from '@/lib/router';
import { AppLayout } from '@/components/AppLayout';
import { AgentLayout } from '@/components/AgentLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage, CustomerDetailPage } from '@/pages/CustomersPage';
import { LoansPage, LoanDetailPage } from '@/pages/LoansPage';
import { RepaymentsPage } from '@/pages/RepaymentsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { SusuCollectionsPage } from '@/pages/SusuCollectionsPage';
import { FieldAgentsPage } from '@/pages/FieldAgentsPage';
import { CalculatorPage } from '@/pages/CalculatorPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AgentDashboardPage } from '@/pages/agent/AgentDashboardPage';
import { AgentCollectionsPage } from '@/pages/agent/AgentCollectionsPage';
import { AgentAccountsPage } from '@/pages/agent/AgentAccountsPage';
import { FullPageSpinner } from '@/components/ui/StatCard';
import { AlertCircle } from 'lucide-react';

function AdminRoutes() {
  const route = useRoute();

  switch (route.name) {
    case 'dashboard':
      return <DashboardPage />;
    case 'customers':
      return <CustomersPage />;
    case 'customer-detail':
      return <CustomerDetailPage customerId={route.id} />;
    case 'loans':
      return <LoansPage />;
    case 'loan-detail':
      return <LoanDetailPage loanId={route.id} />;
    case 'repayments':
      return <RepaymentsPage />;
    case 'transactions':
      return <TransactionsPage />;
    case 'susu':
      return <SusuCollectionsPage />;
    case 'field-agents':
      return <FieldAgentsPage />;
    case 'calculator':
      return <CalculatorPage />;
    case 'reports':
      return <ReportsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

function AgentRoutes() {
  const route = useRoute();

  switch (route.name) {
    case 'agent-dashboard':
      return <AgentDashboardPage />;
    case 'agent-collections':
      return <AgentCollectionsPage />;
    case 'agent-accounts':
      return <AgentAccountsPage />;
    default:
      return <AgentDashboardPage />;
  }
}

function AppContent() {
  const { session, loading, passwordRecovery, role, profileLoaded, signOut } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (!session || passwordRecovery) return <LoginPage />;

  // Profile fetch completed but no profile found — show error with sign-out
  if (profileLoaded && role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-error-600 mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account profile not found</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your account exists but your user profile could not be loaded. Please contact an administrator or try signing in again.
          </p>
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Profile still loading
  if (role === null) return <FullPageSpinner />;

  if (role === 'agent') {
    return (
      <AgentLayout>
        <AgentRoutes />
      </AgentLayout>
    );
  }

  return (
    <AppLayout>
      <AdminRoutes />
    </AppLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
