import { UserProvider } from "@/context/UserContext";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import { ApiProvider } from "@/contexts/ApiContext";
import { Layout } from "@/components/Layout";
import { MascotProvider } from "@/context/MascotContext";
import { Mascot } from "@/components/Mascot";
import { LLMProvider } from "@/context/LLMContext";

function App() {
  return (
    <Router>
      <ApiWrapper>
        <UserProvider>
          <LLMProvider>
            <MascotProvider>
              <Layout />
              <Mascot />
            </MascotProvider>
          </LLMProvider>
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
