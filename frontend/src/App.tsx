import { UserProvider } from "@/context/UserContext";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import { ApiProvider } from "@/contexts/ApiContext";
import { Layout } from "@/components/Layout";

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
  const isOfflineMode = location.pathname.includes("free");

  return <ApiProvider isAuthenticated={!isOfflineMode}>{children}</ApiProvider>;
}

export default App;
