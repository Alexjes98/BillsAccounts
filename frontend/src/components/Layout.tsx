import { Dashboard } from "@/pages/Dashboard";
import { RequireAuth } from "@/components/RequireAuth";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { PersonsPage } from "@/pages/PersonsPage";
import { DebtsPage } from "@/pages/DebtsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { AccountsPage } from "@/pages/AccountsPage";
import { YearResume } from "@/pages/YearResume";
import { ChatPage } from "@/pages/ChatPage";
/*
 * Free Mode Pages
 */
import { FreeDashboard } from "@/pages/free/FreeDashboard";
import { FreeTransactionsPage } from "@/pages/free/FreeTransactionsPage";
import { FreeDebtsPage } from "@/pages/free/FreeDebtsPage";
import { FreeYearResume } from "@/pages/free/FreeYearResume";
import { FreeMonthlySummaryPage } from "@/pages/free/FreeMonthlySummaryPage";
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
import { useEffect, useState } from "react";
import { FreeOnboardingPage } from "@/pages/free/FreeOnboardingPage";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  LayoutDashboard,
  ArrowRightLeft,
  CreditCard,
  Settings,
  BarChart3,
  MessageSquare,
  User,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Users,
  Wallet,
  Tags,
  CalendarDays,
  PieChart,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

function SidebarGroup({
  title,
  icon: Icon,
  children,
  isOpen,
  onToggle,
  isCollapsed,
  id,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-1" id={id}>
      <button
        onClick={onToggle}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent/50 hover:text-foreground text-muted-foreground w-full cursor-pointer ${isCollapsed ? "justify-center" : "justify-between"}`}
        title={isCollapsed ? title : undefined}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>{title}</span>}
        </div>
        {!isCollapsed &&
          (isOpen ? (
            <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 ml-2 flex-shrink-0" />
          ))}
      </button>
      {isOpen && !isCollapsed && (
        <div className="flex flex-col gap-1 ml-6 pl-2 border-l border-border mt-1 transition-all duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  children,
  onClick,
  isCollapsed,
  title,
  id,
}: {
  to: string;
  icon?: React.ElementType;
  children?: React.ReactNode;
  onClick?: () => void;
  isCollapsed?: boolean;
  title?: string;
  id?: string;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      id={id}
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? "bg-primary/10 text-primary" : "hover:bg-accent/50 hover:text-foreground text-muted-foreground"} ${isCollapsed ? "justify-center" : ""}`}
      title={isCollapsed ? title : undefined}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      {!isCollapsed && children && <span>{children}</span>}
    </Link>
  );
}

export function Layout() {
  const { error } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const isOfflineMode = location.pathname.includes("/free");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setIsSidebarAnimating } = useAppStore();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    manage: false,
    insights: false,
  });

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("has-seen-tour");

    // Only run the tour if the user is fully logged in and hasn't seen it yet
    // Skip running on onboarding / mode-selection
    const path = location.pathname;
    const isSpecialPage =
      path === "/mode-selection" || path.includes("/onboarding");
    const isOnlineLoading = !isOfflineMode && loading;
    const isReady = !isSpecialPage && !isOnlineLoading && user != null;

    if (!hasSeenTour && isReady) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          {
            element: "#tour-dashboard",
            popover: {
              title: "Dashboard",
              description: "Get a quick overview of your finances here.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-transactions",
            popover: {
              title: "Transactions",
              description: "View and manage all your income and expenses.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-manage",
            popover: {
              title: "Manage",
              description:
                "Organize your accounts, categories, and people here.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-insights",
            popover: {
              title: "Insights",
              description:
                "Analyze your financial trends and summaries over time.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-assistant",
            popover: {
              title: "Assistant",
              description:
                "Chat with your AI financial assistant for personalized help.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-profile",
            popover: {
              title: "Profile",
              description: "Manage your settings and preferences.",
              side: "right",
              align: "start",
            },
          },
        ],
        onDestroyStarted: () => {
          if (
            !driverObj.hasNextStep() ||
            confirm("Are you sure you want to skip the tour?")
          ) {
            localStorage.setItem("has-seen-tour", "true");
            driverObj.destroy();
          }
        },
      });

      // Small delay to ensure DOM is ready and sidebar is rendered
      const timer = setTimeout(() => {
        driverObj.drive();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [loading, user, isOfflineMode, location.pathname]);

  const toggleGroup = (group: string) => {
    // If collapsed, automatically expand the sidebar so the group items are visible
    if (isCollapsed) {
      handleToggleCollapse();
    }
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleToggleCollapse = () => {
    setIsSidebarAnimating(true);
    setIsCollapsed((prev) => !prev);
    setTimeout(() => {
      setIsSidebarAnimating(false);
    }, 300); // match CSS duration-300
  };

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
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans antialiased flex">
      {location.pathname !== "/mode-selection" && (
        <>
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "w-20" : "w-64"}`}
          >
            <div className="flex h-16 items-center px-4 border-b border-border justify-between whitespace-nowrap overflow-hidden">
              <div
                className={`font-bold text-xl text-primary transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 px-2"}`}
              >
                MyFinance App
              </div>
              {/* Expand/Collapse Toggle Desktop */}
              <button
                className="hidden lg:flex p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors mx-auto"
                onClick={handleToggleCollapse}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>
              {/* Close Sidebar Mobile */}
              <button
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 flex flex-col gap-2">
              <SidebarLink
                to={getPath("/dashboard")}
                icon={LayoutDashboard}
                onClick={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                title="Dashboard"
                id="tour-dashboard"
              >
                Dashboard
              </SidebarLink>
              <SidebarLink
                to={getPath("/transactions")}
                icon={ArrowRightLeft}
                onClick={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                title="Transactions"
                id="tour-transactions"
              >
                Transactions
              </SidebarLink>
              <SidebarLink
                to={getPath("/debts")}
                icon={CreditCard}
                onClick={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                title="Debts"
              >
                Debts
              </SidebarLink>

              <SidebarGroup
                title="Manage"
                icon={Settings}
                isOpen={openGroups.manage}
                onToggle={() => toggleGroup("manage")}
                isCollapsed={isCollapsed}
                id="tour-manage"
              >
                <SidebarLink
                  to={getPath("/accounts")}
                  icon={Wallet}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  Accounts
                </SidebarLink>
                <SidebarLink
                  to={getPath("/categories")}
                  icon={Tags}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  Categories
                </SidebarLink>
                <SidebarLink
                  to={getPath("/persons")}
                  icon={Users}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  Persons
                </SidebarLink>
              </SidebarGroup>

              <SidebarGroup
                title="Insights"
                icon={BarChart3}
                isOpen={openGroups.insights}
                onToggle={() => toggleGroup("insights")}
                isCollapsed={isCollapsed}
                id="tour-insights"
              >
                <SidebarLink
                  to={getPath("/monthly-summary")}
                  icon={CalendarDays}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  Monthly Summary
                </SidebarLink>
                <SidebarLink
                  to={getPath("/year-resume")}
                  icon={PieChart}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  Year Resume
                </SidebarLink>
              </SidebarGroup>

              <SidebarLink
                to={getPath("/chat")}
                icon={MessageSquare}
                onClick={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                title="Assistant"
                id="tour-assistant"
              >
                Assistant
              </SidebarLink>
            </nav>

            <div className="p-4 border-t border-border mt-auto overflow-hidden">
              <SidebarLink
                to={getPath("/profile")}
                icon={User}
                onClick={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                title="Profile"
                id="tour-profile"
              >
                {!isCollapsed && (
                  <div className="flex flex-col gap-1 items-start whitespace-nowrap w-full overflow-hidden">
                    <span>Profile</span>
                    <div className="text-xs text-muted-foreground font-normal flex items-center gap-1 w-full overflow-hidden text-ellipsis">
                      <UserDisplay />
                      {isOfflineMode && <span>(Free Mode)</span>}
                    </div>
                  </div>
                )}
              </SidebarLink>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {location.pathname !== "/mode-selection" && (
          <header className="h-16 border-b border-border bg-background flex items-center px-4 lg:hidden sticky top-0 z-30">
            <button
              className="p-2 -ml-2 mr-2 text-muted-foreground hover:text-foreground rounded-md"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="font-bold text-lg text-primary">MyFinance App</div>
          </header>
        )}

        <main
          className={`flex-1 overflow-y-auto ${location.pathname === "/mode-selection" ? "" : "p-4 lg:p-8"}`}
        >
          <div className="max-w-7xl mx-auto w-full">
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
            <Routes>
              {/* Free routes */}
              <Route path="/free/onboarding" element={<FreeOnboardingPage />} />
              <Route path="/free/dashboard" element={<FreeDashboard />} />
              <Route
                path="/free/transactions"
                element={<FreeTransactionsPage />}
              />
              {/* Free routes */}
              <Route path="/free/persons" element={<PersonsPage />} />
              <Route path="/free/debts" element={<FreeDebtsPage />} />
              <Route path="/free/categories" element={<CategoriesPage />} />
              <Route path="/free/accounts" element={<AccountsPage />} />
              <Route
                path="/free/monthly-summary"
                element={<FreeMonthlySummaryPage />}
              />
              <Route path="/free/year-resume" element={<FreeYearResume />} />
              <Route path="/free/chat" element={<ChatPage />} />
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
                path="/chat"
                element={
                  <RequireAuth>
                    <ChatPage />
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
          </div>
        </main>
      </div>
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
