import { Dashboard } from "@/pages/Dashboard";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { PersonsPage } from "@/pages/PersonsPage";
import { DebtsPage } from "@/pages/DebtsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { AccountsPage } from "@/pages/AccountsPage";
import { YearResume } from "@/pages/YearResume";
/*
 * Free Mode Pages
 */
import { FreeDashboard } from "@/pages/free/FreeDashboard";
import { FreeTransactionsPage } from "@/pages/free/FreeTransactionsPage";
import { FreeDebtsPage } from "@/pages/free/FreeDebtsPage";
import { FreeYearResume } from "@/pages/free/FreeYearResume";

import { useAppStore } from "@/store/useAppStore";
import { UserProvider, useUser } from "@/context/UserContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { ApiProvider } from "@/contexts/ApiContext";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary" : "text-muted-foreground"}`}
    >
      {children}
    </Link>
  );
}
function Layout() {
  const { error } = useAppStore();
  const location = useLocation();
  const isFreeMode = location.pathname.includes("/free");

  const getPath = (path: string) => {
    if (isFreeMode) {
      if (path === "/") return "/free/dashboard";
      return `/free${path}`;
    }
    return path;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto gap-6">
          <div className="font-bold text-xl mr-4">MyFinance App</div>
          <nav className="flex items-center gap-6">
            <NavLink to={getPath("/")}>Dashboard</NavLink>
            <NavLink to={getPath("/transactions")}>Transactions</NavLink>
            <NavLink to={getPath("/debts")}>Debts</NavLink>
            <NavLink to={getPath("/persons")}>Persons</NavLink>
            <NavLink to={getPath("/categories")}>Categories</NavLink>
            <NavLink to={getPath("/accounts")}>Accounts</NavLink>
            <NavLink to={getPath("/year-resume")}>Year Resume</NavLink>
          </nav>
          <div className="ml-auto text-sm text-muted-foreground flex items-center gap-2">
            <UserDisplay />
            {isFreeMode && <span>Beta (Free Mode)</span>}
          </div>
        </div>
      </header>
      <main className="py-6 px-4 max-w-7xl mx-auto">
        {error && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        <Routes>
          {/* Free routes */}
          <Route path="/free/dashboard" element={<FreeDashboard />} />
          <Route path="/free/transactions" element={<FreeTransactionsPage />} />
          <Route path="/free/persons" element={<PersonsPage />} />
          <Route path="/free/debts" element={<FreeDebtsPage />} />
          <Route path="/free/categories" element={<CategoriesPage />} />
          <Route path="/free/accounts" element={<AccountsPage />} />
          <Route path="/free/year-resume" element={<FreeYearResume />} />
          {/* Free routes */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/persons" element={<PersonsPage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/year-resume" element={<YearResume />} />
        </Routes>
      </main>
    </div>
  );
}
function UserDisplay() {
  const { user, loading } = useUser();

  if (loading) return <span>Loading...</span>;
  if (!user) return null;

  return <span className="font-medium text-foreground">{user.email}</span>;
}

function App() {
  return (
    <Router>
      <ApiWrapper>
        <UserProvider>
          <Layout />
        </UserProvider>
      </ApiWrapper>
    </Router>
  );
}

function ApiWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // Heuristic: If path contains "free" or we are explicitly in offline mode, usage IndexedDB.
  // In a real app, this would check the Authentication Context.
  // For now, we assume authenticated unless we are on a "free" route.
  const isFreeMode = location.pathname.includes("free");

  return <ApiProvider isAuthenticated={!isFreeMode}>{children}</ApiProvider>;
}

export default App;
