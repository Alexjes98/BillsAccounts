import { Dashboard } from "@/components/Dashboard";
import { useAppStore } from "@/store/useAppStore";

function App() {
  const { error } = useAppStore();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      {/* Simple Header */}
      <header className="border-b">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <div className="font-bold text-xl">MyFinance App</div>
          <div className="ml-auto text-sm text-muted-foreground">
            Beta (Free Mode)
          </div>
        </div>
      </header>

      <main className="py-6">
        {error && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
