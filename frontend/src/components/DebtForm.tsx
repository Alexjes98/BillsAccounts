import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Person, CreateDebtPayload, Category, Account } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";
import { useUser } from "@/context/UserContext";
import { z } from "zod";

interface DebtFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type DebtType = "DELAYED_PAYMENT" | "PASSIVE_DEBT" | "LOAN";

const debtSchema = z
  .object({
    activeTab: z.enum(["DELAYED_PAYMENT", "PASSIVE_DEBT", "LOAN"]),
    description: z.string().optional(),
    amount: z.string().min(1, "Amount is required"),
    dueDate: z.string().optional(),
    selectedPersonId: z.string().min(1, "Person is required"),
    selectedCategoryId: z.string().optional(),
    selectedAccountId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.activeTab === "DELAYED_PAYMENT" && !data.selectedCategoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category is required for Delayed Payment.",
        path: ["selectedCategoryId"],
      });
    }
    if (data.activeTab === "PASSIVE_DEBT" && !data.selectedCategoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expense Category is required for Passive Debt.",
        path: ["selectedCategoryId"],
      });
    }
    if (data.activeTab === "LOAN" && !data.selectedAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source Account is required for Loan.",
        path: ["selectedAccountId"],
      });
    }
  });

type DebtFormData = z.infer<typeof debtSchema>;

export function DebtForm({ onSuccess, onCancel }: DebtFormProps) {
  const { user } = useUser();
  const api = useApi();

  const [formData, setFormData] = useState<DebtFormData>({
    activeTab: "DELAYED_PAYMENT",
    description: "",
    amount: "",
    dueDate: new Date().toISOString().split("T")[0],
    selectedPersonId: "",
    selectedCategoryId: "",
    selectedAccountId: "",
  });

  const [persons, setPersons] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

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

    const validation = debtSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setIsSubmitting(false);
      return;
    }

    // Construct Payload
    let creditor_id = "";
    let debtor_id = "";

    if (formData.activeTab === "DELAYED_PAYMENT") {
      creditor_id = user?.person_id || "local-user";
      debtor_id = formData.selectedPersonId;
    } else if (formData.activeTab === "PASSIVE_DEBT") {
      creditor_id = formData.selectedPersonId;
      debtor_id = user?.person_id || "local-user";
    } else if (formData.activeTab === "LOAN") {
      creditor_id = user?.person_id || "local-user";
      debtor_id = formData.selectedPersonId;
    }

    try {
      const payload: CreateDebtPayload = {
        creditor_id,
        debtor_id,
        total_amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        due_date: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : undefined,
        type: formData.activeTab,
        category_id: formData.selectedCategoryId || undefined,
        account_id: formData.selectedAccountId || undefined,
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
            type="button"
            key={tab.id}
            onClick={() =>
              setFormData({
                ...formData,
                activeTab: tab.id,
                selectedCategoryId: "",
                selectedAccountId: "",
              })
            }
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              formData.activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground px-1">
        {tabs.find((t) => t.id === formData.activeTab)?.desc}
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
            value={formData.selectedPersonId}
            onChange={(e) =>
              setFormData({ ...formData, selectedPersonId: e.target.value })
            }
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
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="e.g. Dinner, Project X"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Amount *</label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
          />
        </div>

        {/* Conditional Fields */}
        {(formData.activeTab === "DELAYED_PAYMENT" ||
          formData.activeTab === "PASSIVE_DEBT") && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {formData.activeTab === "DELAYED_PAYMENT"
                ? "Income Category *"
                : "Expense Category *"}
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.selectedCategoryId}
              onChange={(e) =>
                setFormData({ ...formData, selectedCategoryId: e.target.value })
              }
              required
            >
              <option value="">Select Category</option>
              {categories
                .filter((c) =>
                  formData.activeTab === "DELAYED_PAYMENT"
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

        {formData.activeTab === "LOAN" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Source Account (Equity) *
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.selectedAccountId}
              onChange={(e) =>
                setFormData({ ...formData, selectedAccountId: e.target.value })
              }
              required
            >
              <option value="">Select Account</option>
              {accounts.map((a) => (
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
