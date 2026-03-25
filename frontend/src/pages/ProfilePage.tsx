import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useApi } from "../context/ApiContext";
import { useLLM } from "../context/LLMContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Download } from "lucide-react";
import { useLocation } from "react-router-dom";

export function ProfilePage() {
  const { user, loading, refreshUser } = useUser();
  const api = useApi();
  const location = useLocation();
  const isOffline = location.pathname.includes("/free");
  const [downloading, setDownloading] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);

  const {
    provider,
    ollamaModel,
    setProvider,
    setApiKey,
    setOllamaModel,
    clearConfig,
  } = useLLM();
  // Start empty — never pre-fill the input with the stored/decrypted key to avoid leaking it.
  const [tempKey, setTempKey] = useState("");
  // Separate state for the Ollama model name so it never shares state with the API key field.
  const [tempModelName, setTempModelName] = useState("");

  useEffect(() => {
    // If we need to fetch user details that might not be in context fully or refreshed
    // In online mode, context usually holds it. In offline, check if we need to fetch manually?
    // UserContext wraps getUser, so 'user' should be populated.
    // However, for verify specific fields or debug, we can rely on 'user' object.

    // If online, 'user' comes from /users/me, which now includes person details.
    // If offline, 'user' comes from IndexedDB 'user' store.

    if (user) {
      setDbUser(user);
    }
  }, [user]);

  const handleDownload = async () => {
    if (!api.getAllData) {
      alert("Export functionality is not available in this mode.");
      return;
    }

    try {
      setDownloading(true);
      if (api.updateUser && dbUser) {
        await api.updateUser(dbUser.id, {
          lastBackupDate: new Date().toISOString(),
        });
        if (refreshUser) {
          await refreshUser();
        }
      }
      const data = await api.getAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!api.loadData) {
      alert("Import functionality is not available in this mode.");
      return;
    }

    if (
      !window.confirm(
        "This will overwrite your current local data. Are you sure?",
      )
    ) {
      return;
    }

    try {
      setDownloading(true); // Reuse loading state
      const text = await file.text();
      const data = JSON.parse(text);

      await api.loadData(data);
      alert("Data imported successfully! The application will reload.");
      window.location.reload();
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import data. Please check the file format.");
    } finally {
      setDownloading(false);
      // Reset input
      event.target.value = "";
    }
  };

  const getLastBackupText = () => {
    if (!dbUser?.lastBackupDate) {
      return (
        <span className="text-muted-foreground text-sm">
          No backup recorded
        </span>
      );
    }
    const lastBackup = new Date(dbUser.lastBackupDate);
    const today = new Date();
    // Use setHours(0,0,0,0) to compare calendar days
    today.setHours(0, 0, 0, 0);
    lastBackup.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - lastBackup.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 15) {
      return (
        <span className="text-red-500 font-medium text-sm">
          {diffDays} days without a backup
        </span>
      );
    }
    return (
      <span className="text-muted-foreground text-sm">
        {diffDays} days without a backup
      </span>
    );
  };

  if (loading) {
    return <div className="p-4">Loading profile...</div>;
  }

  if (!dbUser) {
    return <div className="p-4">User not found.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight animate-fade-in-up">
        User Profile
      </h1>

      <Card className="animate-fade-in-up delay-100">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <div className="text-lg font-medium">
                {dbUser.name || (dbUser.person && dbUser.person.name) || "-"}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <div className="text-lg font-medium">{dbUser.email || "-"}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Base Currency
              </label>
              <div className="text-lg font-medium">{dbUser.base_currency}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 animate-fade-in-up delay-200">
        <h2 className="text-xl font-semibold">Data Management</h2>
        <Card>
          <CardContent className="pt-6">
            {isOffline ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium mb-1">Export Data</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Download a copy of your local data in JSON format. This file
                  includes all your transactions, debts, and settings.
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-fit"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloading ? "Exporting..." : "Download Data (JSON)"}
                  </Button>
                  {getLastBackupText()}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Data export is currently only available in offline mode.
              </div>
            )}

            {isOffline && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-1">Import Data</h3>
                <p className="text-sm text-muted-foreground mb-2 text-destructive">
                  Warning: Importing data will <strong>overwrite</strong> all
                  your current local data.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    className="w-fit"
                    disabled={downloading}
                    onClick={() =>
                      document.getElementById("import-file")?.click()
                    }
                    variant="outline"
                  >
                    Import JSON File
                  </Button>
                  <input
                    type="file"
                    id="import-file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                    disabled={downloading}
                  />
                </div>
              </div>
            )}

            {isOffline && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-1 text-destructive">
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Permanently delete all your local data. This action cannot be
                  undone.
                </p>
                <Button
                  variant="destructive"
                  className="w-fit"
                  disabled={downloading}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Are you absolutely sure you want to delete all your data? This action cannot be undone.",
                      )
                    ) {
                      try {
                        if (api.clearAllData) {
                          await api.clearAllData();
                          // Clear localStorage and force reload to clear all states and contextual data
                          localStorage.clear();
                          window.location.href = "/";
                        } else {
                          alert("Delete functionality is not available.");
                        }
                      } catch (error) {
                        console.error("Delete failed:", error);
                        alert("Failed to delete data.");
                      }
                    }
                  }}
                >
                  Delete All Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 animate-fade-in-up delay-300">
        <h2 className="text-xl font-semibold">Application Settings</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium mb-1">Mode Preference</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Reset your default mode preference (Online/Offline). You will be
                asked to select again next time.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("mode-preference");
                  window.location.href = "/";
                }}
                className="w-fit"
              >
                Reset Mode Preference
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 animate-fade-in-up delay-400">
        <h2 className="text-xl font-semibold">AI Assistant Configuration</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">LLM Provider</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
              >
                <option value="None">None</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Gemini">Gemini</option>
                <option value="DeepSeek">DeepSeek</option>
                <option value="Ollama">Ollama (Local)</option>
              </select>
            </div>

            {provider !== "None" && provider !== "Ollama" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  API Key{" "}
                  <span className="text-muted-foreground font-normal">
                    (Stored locally in your browser - Not sent to any backend)
                  </span>
                </label>
                <input
                  type="password"
                  name="api-key"
                  id="api-key"
                  autoComplete="new-password"
                  data-1p-ignore
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={`Enter your ${provider} API Key`}
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() => {
                      setApiKey(tempKey);
                      alert("API Key saved to your browser securely!");
                    }}
                  >
                    Save Key
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setApiKey("");
                      setTempKey("");
                      clearConfig();
                      alert("Configuration cleared!");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {provider === "Ollama" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Ollama Model Name{" "}
                    <span className="text-muted-foreground font-normal">
                      (e.g. llama3.1, qwen2.5, mistral-nemo)
                    </span>
                  </label>
                  <input
                    type="text"
                    name="ollamaModel"
                    id="ollamaModel"
                    autoComplete="off"
                    data-1p-ignore
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={ollamaModel || "llama3.1"}
                    value={tempModelName}
                    onChange={(e) => setTempModelName(e.target.value)}
                  />
                  <div className="flex gap-2 mt-1">
                    <Button
                      onClick={() => {
                        const modelToSave =
                          tempModelName || ollamaModel || "llama3.1";
                        setOllamaModel(modelToSave);
                        setTempModelName("");
                        alert(`Ollama model "${modelToSave}" saved!`);
                      }}
                    >
                      Save Model
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setApiKey("");
                        setTempKey("");
                        setTempModelName("");
                        clearConfig();
                        alert("Configuration cleared!");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-3 bg-muted rounded-md text-sm">
                  <p>
                    <strong>Ollama (Local)</strong> connects directly to your
                    machine. Because this site is hosted online, cross-origin
                    requests (CORS) are blocked by default. You{" "}
                    <strong>must</strong> configure Ollama to allow CORS to use
                    it here.
                  </p>

                  <div className="text-muted-foreground space-y-4 mt-2">
                    <div className="space-y-2">
                      <p className="font-semibold text-foreground text-base border-b pb-1">
                        Permanent Setup (Recommended)
                      </p>
                      <p>
                        Configure this once, and you can just use the normal
                        Ollama desktop app seamlessly.
                      </p>

                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Windows:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-1 text-xs sm:text-sm">
                          <li>Quit the Ollama app from the system tray.</li>
                          <li>
                            Open Windows Start menu, search for{" "}
                            <strong>"Environment Variables"</strong>.
                          </li>
                          <li>
                            Click "Edit environment variables for your account".
                          </li>
                          <li>
                            Click <strong>New...</strong> under User variables.
                          </li>
                          <li>
                            Name:{" "}
                            <code className="bg-background px-1 rounded border">
                              OLLAMA_ORIGINS
                            </code>{" "}
                            | Value:{" "}
                            <code className="bg-background px-1 rounded border">
                              *
                            </code>
                          </li>
                          <li>Click OK, then open the Ollama app normally.</li>
                        </ol>
                      </div>
                      <div className="space-y-1 pt-2">
                        <p className="font-medium text-foreground">Mac:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-1 text-xs sm:text-sm">
                          <li>Quit the Ollama app (from the menu bar).</li>
                          <li>
                            Open Terminal and run:{" "}
                            <code className="bg-background px-1 rounded border">
                              launchctl setenv OLLAMA_ORIGINS "*"
                            </code>
                          </li>
                          <li>Restart the Ollama app.</li>
                        </ol>
                      </div>

                      <div className="space-y-1 pt-2">
                        <p className="font-medium text-foreground">
                          Linux (Systemd):
                        </p>
                        <ol className="list-decimal list-inside space-y-1 ml-1 text-xs sm:text-sm">
                          <li>
                            Run:{" "}
                            <code className="bg-background px-1 rounded border">
                              sudo systemctl edit ollama.service
                            </code>
                          </li>
                          <li>
                            Add:{" "}
                            <code className="bg-background px-1 rounded border">
                              Environment="OLLAMA_ORIGINS=*"
                            </code>{" "}
                            under{" "}
                            <code className="bg-background px-1 rounded border">
                              [Service]
                            </code>
                          </li>
                          <li>
                            Run:{" "}
                            <code className="bg-background px-1 rounded border">
                              sudo systemctl daemon-reload
                            </code>{" "}
                            &amp;{" "}
                            <code className="bg-background px-1 rounded border">
                              sudo systemctl restart ollama
                            </code>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <p className="font-semibold text-foreground text-base pb-1">
                        Temporary Setup (Terminal)
                      </p>
                      <p>
                        If you prefer running{" "}
                        <code className="bg-background px-1 rounded border">
                          ollama serve
                        </code>{" "}
                        manually via terminal instead of using the background
                        app, you must set the variable every time:
                      </p>
                      <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:text-sm">
                        <div>
                          <p className="font-medium text-foreground">
                            Windows (PowerShell):
                          </p>
                          <code className="block bg-background px-2 py-1.5 rounded border mt-1">
                            $env:OLLAMA_ORIGINS="*"
                            <br />
                            ollama serve
                          </code>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Mac / Linux:
                          </p>
                          <code className="block bg-background px-2 py-1.5 rounded border mt-1">
                            OLLAMA_ORIGINS="*" ollama serve
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800 rounded-md text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-400">
                    ⚠️ Tool-Calling Compatibility
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-500">
                    The AI assistant uses tools to search your transactions and
                    create entries.{" "}
                    <strong>Not all Ollama models support tool-calling</strong>{" "}
                    — using an incompatible model will cause the agent to fail.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
