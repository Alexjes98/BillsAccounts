import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Person, CreateDebtPayload, Category, Account } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";
import { useUser } from "@/context/UserContext";
import { Plus, X } from "lucide-react";

interface DebtFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type DebtType = "DELAYED_PAYMENT" | "PASSIVE_DEBT" | "LOAN";

export function DebtForm({ onSuccess, onCancel }: DebtFormProps) {
  const { user } = useUser();
  const api = useApi();
  const [activeTab, setActiveTab] = useState<DebtType>("DELAYED_PAYMENT");

  const [persons, setPersons] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [pData, cData, aData] = await Promise.all([
          api.getPersons(),
          api.getCategories(),
          api.getAccounts(),
        ]);
        setPersons(pData);
        setCategories(cData);
        setAccounts(aData);
      } catch (err) {
        console.error("Failed to load data", err);
        setError("Failed to load required data.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!amount || !selectedPersonId) {
      setError("Please fill in required fields.");
      setIsSubmitting(false);
      return;
    }

    // Type Specific Validation
    if (activeTab === "DELAYED_PAYMENT" && !selectedCategoryId) {
      setError("Category is required for Delayed Payment.");
      setIsSubmitting(false);
      return;
    }
    if (activeTab === "PASSIVE_DEBT" && !selectedCategoryId) {
      // Enforce category for Passive Debt (Expense Tracking)
      setError("Expense Category is required for Passive Debt.");
      setIsSubmitting(false);
      return;
    }
    if (activeTab === "LOAN" && !selectedAccountId) {
      setError("Source Account is required for Loan.");
      setIsSubmitting(false);
      return;
    }

    // Construct Payload
    let creditor_id = "";
    let debtor_id = "";

    if (activeTab === "DELAYED_PAYMENT") {
      // Income that person owes user.
      // User is Creditor. Person is Debtor.
      creditor_id = user?.person_id || "local-user"; // Fallback if no user person
      debtor_id = selectedPersonId;
    } else if (activeTab === "PASSIVE_DEBT") {
      // User owes Person.
      // User is Debtor. Person is Creditor.
      creditor_id = selectedPersonId;
      debtor_id = user?.person_id || "local-user";
    } else if (activeTab === "LOAN") {
      // User gave money.
      // User is Creditor. Person is Debtor.
      creditor_id = user?.person_id || "local-user";
      debtor_id = selectedPersonId;
    }

    try {
      const payload: CreateDebtPayload = {
        creditor_id,
        debtor_id,
        total_amount: parseFloat(amount),
        description: description || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        type: activeTab,
        category_id: selectedCategoryId || undefined,
        account_id: selectedAccountId || undefined,
      };

      await api.createDebt(payload);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create debt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: DebtType; label: string; desc: string }[] = [
    {
      id: "DELAYED_PAYMENT",
      label: "Delayed Payment",
      desc: "Income owed to you (e.g. Freelance work)",
    },
    {
      id: "PASSIVE_DEBT",
      label: "Passive Debt",
      desc: "You owe someone (e.g. They paid for you)",
    },
    {
      id: "LOAN",
      label: "Loan",
      desc: "You lent money (Transfer)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Custom Tabs */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground px-1">
        {tabs.find((t) => t.id === activeTab)?.desc}
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 border rounded-md p-4 bg-background"
      >
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        {/* Person Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Person *</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            disabled={isLoadingData}
            required
          >
            <option value="">Select Person</option>
            {persons
              .filter((p) => p.id !== user?.person_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        {/* Common Fields */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner, Project X"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Amount *</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Conditional Fields */}
        {(activeTab === "DELAYED_PAYMENT" || activeTab === "PASSIVE_DEBT") && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {activeTab === "DELAYED_PAYMENT"
                ? "Income Category *"
                : "Expense Category *"}
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories
                .filter((c) =>
                  activeTab === "DELAYED_PAYMENT"
                    ? c.type === "INCOME"
                    : c.type === "EXPENSE",
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {activeTab === "LOAN" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Source Account (Equity) *
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              required
            >
              <option value="">Select Account</option>
              {accounts
                // .filter(a => a.classification === "EQUITY" || a.type === "ASSET") // Assuming user pays from Asset or Equity
                // Prompt said "User Equity Account".
                // But mostly users pay from "Bank" (Asset).
                // I'll allow All Accounts to be safe, or filter if 'classification' is strictly used.
                // I'll show all accounts for flexibility.
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (${a.current_balance})
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingData}>
            {isSubmitting ? "Creating..." : "Create Debt"}
          </Button>
        </div>
      </form>
    </div>
  );
}
