import { Dashboard } from "@/components/Dashboard";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { useAppStore } from "@/store/useAppStore";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

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
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto gap-6">
          <div className="font-bold text-xl mr-4">MyFinance App</div>

          <nav className="flex items-center gap-6">
            <NavLink to="/">Dashboard</NavLink>
            <NavLink to="/transactions">Transactions</NavLink>
          </nav>

          <div className="ml-auto text-sm text-muted-foreground">
            Beta (Free Mode)
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
