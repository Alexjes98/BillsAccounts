import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Category,
  CreateTransactionPayload,
  Account,
  SavingsGoal,
  Transaction,
} from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";
import { useUser } from "@/context/UserContext";
import { CategorySelector } from "@/components/CategorySelector";

interface TransactionFormProps {
  initialData?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  initialData,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { user } = useUser();
  const api = useApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoadingSavingsGoals, setIsLoadingSavingsGoals] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(""); // keeping as string for input
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("default-account-id"); // Placeholder

  const [savingsGoalId, setSavingsGoalId] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const data = await api.getCategories();
        setCategories(data);
        if (data.length > 0 && !initialData) {
          setCategoryId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
        setError("Failed to load categories. Please try again.");
      } finally {
        setIsLoadingCategories(false);
      }
    };
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        //TODO: Modify this to filter in the function not the frontend
        const data = await api.getAccounts();
        const equityAccounts = data.filter(
          (acc) => acc.classification === "EQUITY",
        );
        setAccounts(equityAccounts);
        if (equityAccounts.length > 0 && !initialData) {
          setAccountId(equityAccounts[0].id);
        }
      } catch (err) {
        console.error("Failed to load accounts", err);
        setError("Failed to load accounts. Please try again.");
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    const fetchSavingsGoals = async () => {
      setIsLoadingSavingsGoals(true);
      try {
        const data = await api.getSavingsGoals();
        setSavingsGoals(data);
      } catch (err) {
        console.error("Failed to load savings goals", err);
        setError("Failed to load savings goals. Please try again.");
      } finally {
        setIsLoadingSavingsGoals(false);
      }
    };
    fetchCategories();
    fetchAccounts();

    fetchSavingsGoals();
  }, []);

  // Populate form if initialData is provided
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription("");

      const desc = (initialData as any).description || "";
      setDescription(desc);

      setAmount(initialData.amount.toString());
      setDate(
        new Date(initialData.transaction_date).toISOString().split("T")[0],
      );
      setCategoryId(initialData.category_id);
      setAccountId(initialData.account_id || "default-account-id");

      setSavingsGoalId(initialData.savings_goal_id || "");
    }
  }, [initialData]);

  const handleCreateCategory = async (
    name: string,
    type: "INCOME" | "EXPENSE",
  ) => {
    try {
      const newCategory = await api.createCategory({
        name,
        type,
        icon: type === "INCOME" ? "💰" : "💸", // Default icons
        color: type === "INCOME" ? "green" : "red", // Default colors
      });
      setCategories((prev) => [...prev, newCategory]);
      setCategoryId(newCategory.id);
    } catch (error) {
      console.error("Failed to create category", error);
      // Optional: set error state if you want to show it in the form error block
      // setError("Failed to create category");
      throw error; // Re-throw so CategorySelector knows it failed
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!name || !amount || !categoryId || !date) {
      setError("Please fill in all required fields.");
      setIsSubmitting(false);
      return;
    }

    if (!user?.person_id) {
      setError("User not found. Please login again.");
      setIsSubmitting(false);
      return;
    }

    // Debt Validation Logic

    try {
      const payload: CreateTransactionPayload = {
        name,
        description: description || undefined,
        amount: parseFloat(amount),
        transaction_date: new Date(`${date}T12:00:00`).toISOString(),
        category_id: categoryId,
        account_id: accountId === "default-account-id" ? null : accountId, // Handle placeholder logic

        savings_goal_id: savingsGoalId || null,
        person_id: user?.person_id || "",
      };

      if (initialData) {
        await api.updateTransaction(initialData.id, payload);
      } else {
        await api.createTransaction(payload);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to create transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name *
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Grocery Shopping"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">
          Amount *
        </label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "" || parseFloat(val) <= 1000000000) {
              setAmount(val);
            }
          }}
          onKeyDown={(e) => {
            if (["e", "E", "-", "+"].includes(e.key)) {
              e.preventDefault();
            }
          }}
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="date" className="text-sm font-medium">
          Date *
        </label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category *
        </label>
        <CategorySelector
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          onCreate={handleCreateCategory}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      {/* Placeholders for other relationships */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="account"
            className="text-sm font-medium text-muted-foreground"
          >
            Account
          </label>
          <select
            autoComplete="off"
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
          >
            {isLoadingAccounts ? (
              <option>Loading accounts...</option>
            ) : (
              accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="savings"
            className="text-sm font-medium text-muted-foreground"
          >
            Savings Goal (Optional)
          </label>
          <select
            autoComplete="off"
            id="savings"
            value={savingsGoalId}
            onChange={(e) => setSavingsGoalId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
          >
            <option value="">None</option>
            {isLoadingSavingsGoals ? (
              <option>Loading savings goals...</option>
            ) : (
              savingsGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingCategories}>
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Update Transaction"
              : "Create Transaction"}
        </Button>
      </div>
    </form>
  );
}
