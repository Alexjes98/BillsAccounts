import { useState } from "react";
import { useApi } from "@/contexts/ApiContext";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Check, Wallet, CreditCard, Building, Plus, X } from "lucide-react";

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const { refreshUser } = useUser(); // We might need to expose createUser from context or use api directly
  const api = useApi();
  const navigate = useNavigate();

  // Form States
  const [userData, setUserData] = useState({ email: "", currency: "USD" });
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(["Cash"]);
  const [persons, setPersons] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Food",
    "Rent",
    "Salary",
  ]);
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // Initial User Creation (Step 0)
  const handleCreateUser = async () => {
    if (!userData.currency) return;
    setLoading(true);
    try {
      await api.createUser({
        email: userData.email,
        base_currency: userData.currency,
      });
      await refreshUser();
      setStep(1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Accounts Creation (Step 1)
  const handleCreateAccounts = async () => {
    setLoading(true);
    try {
      // "Cash" is often default, but let's create what is selected
      for (const accType of selectedAccounts) {
        let type = "CASH";
        if (accType === "Bank") type = "BANK";
        if (accType === "Paypal" || accType === "Zelle") type = "Wallet"; // Simplify types?

        // If the backend expects specific types, we should map them.
        // Assuming "CASH", "BANK", "WALLET" are common.
        // Or just use the name as type for now if flexible?
        // Checking code: Account types seem to be strings.

        await api.createAccount({
          name: accType,
          type: type,
          current_balance: 0,
          currency: userData.currency,
        });
      }
      setStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Persons Creation (Step 2)
  const handleCreatePersons = async () => {
    setLoading(true);
    try {
      for (const name of persons) {
        await api.createPerson({ name });
      }
      setStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Categories Creation (Step 3)
  const handleCreateCategories = async () => {
    setLoading(true);
    try {
      const allCats = [...selectedCategories, "Others"];
      // We need to guess type? Or ask?
      // "Salary" is Income. Rest are Expenses generally.
      // Heuristic for popular ones.
      for (const catName of allCats) {
        let type = "EXPENSE";
        if (["Salary", "Income", "Freelance", "Dividends"].includes(catName)) {
          type = "INCOME";
        }

        await api.createCategory({
          name: catName,
          type,
          icon: "Circle", // Default icon
          color: type === "INCOME" ? "#10B981" : "#EF4444", // Simple default colors
        });
      }
      setStep(4);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAllSet = () => {
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Indicators could go here */}

        {step === 0 && (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Welcome!
              </CardTitle>
              <CardDescription>
                Let's get you set up. First, tell us a bit about you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email (Optional)</label>
                <Input
                  placeholder="you@example.com"
                  value={userData.email}
                  onChange={(e) =>
                    setUserData({ ...userData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={userData.currency}
                  onChange={(e) =>
                    setUserData({ ...userData, currency: e.target.value })
                  }
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <Button
                className="w-full mt-4"
                onClick={handleCreateUser}
                disabled={loading}
              >
                {loading ? "Creating..." : "Start Setup"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Create Accounts</CardTitle>
              <CardDescription>
                Select the accounts you want to start with.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {["Cash", "Bank", "Paypal", "Zelle"].map((acc) => (
                  <div
                    key={acc}
                    onClick={() => {
                      if (selectedAccounts.includes(acc)) {
                        setSelectedAccounts(
                          selectedAccounts.filter((a) => a !== acc),
                        );
                      } else {
                        setSelectedAccounts([...selectedAccounts, acc]);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${selectedAccounts.includes(acc) ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`}
                  >
                    {acc === "Cash" && <Wallet className="h-6 w-6" />}
                    {acc === "Bank" && <Building className="h-6 w-6" />}
                    {(acc === "Paypal" || acc === "Zelle") && (
                      <CreditCard className="h-6 w-6" />
                    )}
                    <span className="font-medium">{acc}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedAccounts(["Cash"])}
                  className="text-muted-foreground"
                >
                  Only Cash
                </Button>
                <Button
                  onClick={handleCreateAccounts}
                  disabled={loading || selectedAccounts.length === 0}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Add Persons</CardTitle>
              <CardDescription>
                Add people you frequently interact with financially (Partners,
                Kids, etc.). You can skip this.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={newPerson}
                  onChange={(e) => setNewPerson(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPerson) {
                      setPersons([...persons, newPerson]);
                      setNewPerson("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newPerson) {
                      setPersons([...persons, newPerson]);
                      setNewPerson("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {persons.map((p, i) => (
                  <div
                    key={i}
                    className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    <span>{p}</span>
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() =>
                        setPersons(persons.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                ))}
                {persons.length === 0 && (
                  <span className="text-muted-foreground text-sm italic">
                    No extra persons added.
                  </span>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleCreatePersons} disabled={loading}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Select Categories</CardTitle>
              <CardDescription>
                Choose some starting categories. We'll add "Others" for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  "Salary",
                  "Rent",
                  "Groceries",
                  "Food",
                  "Gym",
                  "Home",
                  "Transport",
                  "Utilities",
                  "Entertainment",
                ].map((cat) => (
                  <div
                    key={cat}
                    onClick={() => {
                      if (selectedCategories.includes(cat)) {
                        setSelectedCategories(
                          selectedCategories.filter((c) => c !== cat),
                        );
                      } else {
                        setSelectedCategories([...selectedCategories, cat]);
                      }
                    }}
                    className={`px-4 py-2 rounded-full cursor-pointer border transition-colors ${selectedCategories.includes(cat) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-input"}`}
                  >
                    {cat}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">
                  Custom Category
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Category Name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        customCategory &&
                        !selectedCategories.includes(customCategory)
                      ) {
                        setSelectedCategories([
                          ...selectedCategories,
                          customCategory,
                        ]);
                        setCustomCategory("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleCreateCategories} disabled={loading}>
                  Create & Finish
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-primary/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center text-primary">
              <Check className="h-12 w-12" />
            </div>
            <h1 className="text-4xl font-bold">All Set!</h1>
            <p className="text-xl text-muted-foreground">
              Your finance journey begins now.
            </p>
            <Button size="lg" className="mt-8 px-8" onClick={handleAllSet}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
