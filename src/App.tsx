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
  const { session, loading, passwordRecovery, role } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (!session || passwordRecovery) return <LoginPage />;

  // Profile not loaded yet — show spinner while we fetch the user's role
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
