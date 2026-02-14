import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useApi } from "../contexts/ApiContext";
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
  const { user, loading } = useUser();
  const api = useApi();
  const location = useLocation();
  const isOffline = location.pathname.includes("/free");
  const [downloading, setDownloading] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);

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

  if (loading) {
    return <div className="p-4">Loading profile...</div>;
  }

  if (!dbUser) {
    return <div className="p-4">User not found.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>

      <Card>
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

      <div className="space-y-4">
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
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-fit"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading ? "Exporting..." : "Download Data (JSON)"}
                </Button>
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
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
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
    </div>
  );
}
