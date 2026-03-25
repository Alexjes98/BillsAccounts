import { UserProvider } from "@/context/UserContext";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ApiProvider } from "@/context/ApiContext";
import { Layout } from "@/components/Layout";
import { MascotProvider } from "@/context/MascotContext";
import { Mascot } from "@/components/Mascot";
import { LLMProvider } from "@/context/LLMContext";
import { CryptoProvider, useCrypto } from "@/context/CryptoContext";
import { LockScreen } from "@/components/LockScreen";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <CryptoProvider>
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
        </CryptoProvider>
      </Router>
    </ThemeProvider>
  );
}

function ApiWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // Heuristic: If path contains "free" or we are explicitly in offline mode, usage IndexedDB.
  // In a real app, this would check the Authentication Context.
  // For now, we assume authenticated unless we are on a "free" route.
  const isOfflineMode = location.pathname.includes("free");

  const { isUnlocked, isInitializing } = useCrypto();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading encryption state...
      </div>
    );
  }

  // Only enforce lock screen in offline mode if not unlocked
  if (isOfflineMode && !isUnlocked) {
    return <LockScreen />;
  }

  return <ApiProvider isAuthenticated={!isOfflineMode}>{children}</ApiProvider>;
}

export default App;
