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
import { z } from "zod";

interface TransactionFormProps {
  initialData?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

const transactionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  accountId: z.string().optional(),
  savingsGoalId: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export function TransactionForm({
  initialData,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { user } = useUser();
  const api = useApi();

  const [formData, setFormData] = useState<TransactionFormData>({
    name: "",
    description: "",
    amount: "",
    date: new Date().toLocaleDateString("en-CA"),
    categoryId: "",
    accountId: "default-account-id",
    savingsGoalId: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoadingSavingsGoals, setIsLoadingSavingsGoals] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const data = await api.getCategories();
        setCategories(data);
        if (data.length > 0 && !initialData) {
          setFormData((prev) => ({ ...prev, categoryId: data[0].id }));
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
        const data = await api.getAccounts();
        const equityAccounts = data.filter(
          (acc) => acc.classification === "EQUITY",
        );
        setAccounts(equityAccounts);
        if (equityAccounts.length > 0 && !initialData) {
          setFormData((prev) => ({ ...prev, accountId: equityAccounts[0].id }));
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
  }, [api, initialData]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: (initialData as any).description || "",
        amount: initialData.amount.toString(),
        date: new Date(initialData.transaction_date)
          .toISOString()
          .split("T")[0],
        categoryId: initialData.category_id,
        accountId: initialData.account_id || "default-account-id",
        savingsGoalId: initialData.savings_goal_id || "",
      });
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
        icon: type === "INCOME" ? "💰" : "💸",
        color: type === "INCOME" ? "green" : "red",
      });
      setCategories((prev) => [...prev, newCategory]);
      setFormData((prev) => ({ ...prev, categoryId: newCategory.id }));
    } catch (error) {
      console.error("Failed to create category", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const validation = transactionSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setIsSubmitting(false);
      return;
    }

    if (!user?.person_id) {
      setError("User not found. Please login again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreateTransactionPayload = {
        name: formData.name,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        transaction_date: new Date(`${formData.date}T12:00:00`).toISOString(),
        category_id: formData.categoryId,
        account_id:
          formData.accountId === "default-account-id"
            ? null
            : formData.accountId,
        savings_goal_id: formData.savingsGoalId || null,
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
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          value={formData.amount}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "" || parseFloat(val) <= 1000000000) {
              setFormData({ ...formData, amount: val });
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
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category *
        </label>
        <CategorySelector
          categories={categories}
          value={formData.categoryId}
          onChange={(val) => setFormData({ ...formData, categoryId: val })}
          onCreate={handleCreateCategory}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Optional notes"
        />
      </div>

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
            value={formData.accountId}
            onChange={(e) =>
              setFormData({ ...formData, accountId: e.target.value })
            }
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
            value={formData.savingsGoalId}
            onChange={(e) =>
              setFormData({ ...formData, savingsGoalId: e.target.value })
            }
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
