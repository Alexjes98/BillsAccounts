import { Dashboard } from "@/pages/Dashboard";
import { RequireAuth } from "@/components/RequireAuth";
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
import { OnboardingPage } from "@/pages/OnboardingPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ModeSelectionPage } from "@/pages/ModeSelectionPage";

import { useAppStore } from "@/store/useAppStore";
import { useUser } from "@/context/UserContext";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { FreeOnboardingPage } from "@/pages/free/FreeOnboardingPage";

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

export function Layout() {
  const { error } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const isOfflineMode = location.pathname.includes("/free");

  useEffect(() => {
    if (loading) return;

    const path = location.pathname;

    // Allow access to mode selection without checks
    if (path === "/mode-selection") return;

    // Allow RootRedirector to handle the root path
    if (path === "/") return;

    if (isOfflineMode) {
      // Offline Mode Logic
      if (!user) {
        // No user found in IndexedDB -> Go to Onboarding
        if (path !== "/free/onboarding") {
          navigate("/free/onboarding");
        }
      } else {
        // User found -> Go to Dashboard (if currently on onboarding)
        if (path === "/free/onboarding") {
          navigate("/free/dashboard");
        }
      }
    } else {
      // Online Mode Logic
      if (!user) {
        // No user found in Backend -> Go to Onboarding
        if (path !== "/onboarding") {
          navigate("/onboarding");
        }
      } else {
        // User found -> Go to Dashboard (if currently on onboarding)
        if (path === "/onboarding") {
          navigate("/dashboard");
        }
      }
    }
  }, [loading, user, isOfflineMode, location.pathname, navigate]);

  const getPath = (path: string) => {
    if (isOfflineMode) {
      if (path === "/") return "/free/dashboard";
      return `/free${path}`;
    }
    return path;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      {location.pathname !== "/mode-selection" && (
        <header className="border-b sticky top-0 bg-background z-10">
          <div className="flex h-16 items-center px-4 max-w-7xl mx-auto gap-6">
            <div className="font-bold text-xl mr-4">MyFinance App</div>
            <nav className="flex items-center gap-6">
              <NavLink to={getPath("/dashboard")}>Dashboard</NavLink>
              <NavLink to={getPath("/transactions")}>Transactions</NavLink>
              <NavLink to={getPath("/debts")}>Debts</NavLink>
              <NavLink to={getPath("/persons")}>Persons</NavLink>
              <NavLink to={getPath("/categories")}>Categories</NavLink>
              <NavLink to={getPath("/accounts")}>Accounts</NavLink>
              <NavLink to={getPath("/year-resume")}>Year Resume</NavLink>
              <NavLink to={getPath("/profile")}>Profile</NavLink>
            </nav>
            <div className="ml-auto text-sm text-muted-foreground flex items-center gap-2">
              <UserDisplay />
              {isOfflineMode && <span>Beta (Free Mode)</span>}
            </div>
          </div>
        </header>
      )}
      <main
        className={
          location.pathname === "/mode-selection"
            ? ""
            : "py-6 px-4 max-w-7xl mx-auto"
        }
      >
        {error && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        <Routes>
          {/* Free routes */}
          <Route path="/free/onboarding" element={<FreeOnboardingPage />} />
          <Route path="/free/dashboard" element={<FreeDashboard />} />
          <Route path="/free/transactions" element={<FreeTransactionsPage />} />
          {/* Free routes */}
          <Route path="/free/persons" element={<PersonsPage />} />
          <Route path="/free/debts" element={<FreeDebtsPage />} />
          <Route path="/free/categories" element={<CategoriesPage />} />
          <Route path="/free/accounts" element={<AccountsPage />} />
          <Route path="/free/year-resume" element={<FreeYearResume />} />
          <Route path="/free/profile" element={<ProfilePage />} />
          {/* Free routes */}
          {/* Free routes */}
          <Route path="/" element={<RootRedirector />} />
          <Route path="/mode-selection" element={<ModeSelectionPage />} />

          {/* Online Routes - Protected by Amplify */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions"
            element={
              <RequireAuth>
                <TransactionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/persons"
            element={
              <RequireAuth>
                <PersonsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/debts"
            element={
              <RequireAuth>
                <DebtsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/categories"
            element={
              <RequireAuth>
                <CategoriesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/accounts"
            element={
              <RequireAuth>
                <AccountsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/year-resume"
            element={
              <RequireAuth>
                <YearResume />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function RootRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    const preference = localStorage.getItem("mode-preference");

    if (preference === "online") {
      navigate("/dashboard");
    } else if (preference === "offline") {
      navigate("/free/dashboard");
    } else {
      navigate("/mode-selection");
    }
  }, [navigate]);

  return null;
}

function UserDisplay() {
  const { user, loading } = useUser();

  if (loading) return <span>Loading...</span>;
  if (!user) return null;

  return (
    <span className="font-medium text-foreground">
      {user.name || user.email}
    </span>
  );
}
