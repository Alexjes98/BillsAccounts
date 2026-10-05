import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Category,
  CreateTransactionPayload,
  Account,
} from "@/api/repository";
import { useApi } from "@/context/ApiContext";
import { useUser } from "@/context/UserContext";
import {
  Plus,
  Trash2,
  Copy,
  Calendar,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface BatchTransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export interface BatchMovementRow {
  id: string;
  date: string;
  name: string;
  categoryId: string;
  amount: string;
  accountId: string;
  description: string;
}

export function BatchTransactionForm({
  onSuccess,
  onCancel,
}: BatchTransactionFormProps) {
  const { user } = useUser();
  const api = useApi();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  const [rows, setRows] = useState<BatchMovementRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, { name?: boolean; amount?: boolean }>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk tool state
  const [bulkDate, setBulkDate] = useState("");
  const [bulkAccount, setBulkAccount] = useState("");
  const [showBulkTools, setShowBulkTools] = useState(false);

  const todayStr = new Date().toLocaleDateString("en-CA");

  const createInitialRow = (
    defaultDate: string,
    defaultCatId: string,
    defaultAccId: string,
  ): BatchMovementRow => ({
    id: crypto.randomUUID(),
    date: defaultDate || todayStr,
    name: "",
    categoryId: defaultCatId,
    amount: "",
    accountId: defaultAccId,
    description: "",
  });

  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingMetadata(true);
      try {
        const [cats, accs] = await Promise.all([
          api.getCategories(),
          api.getAccounts(),
        ]);
        setCategories(cats);

        const equityAccounts = accs.filter(
          (acc) => acc.classification === "EQUITY",
        );
        setAccounts(equityAccounts);

        const defaultCatId = cats.length > 0 ? cats[0].id : "";
        const defaultAccId =
          equityAccounts.length > 0
            ? equityAccounts[0].id
            : "default-account-id";

        // Initialize with 3 rows
        setRows([
          createInitialRow(todayStr, defaultCatId, defaultAccId),
          createInitialRow(todayStr, defaultCatId, defaultAccId),
          createInitialRow(todayStr, defaultCatId, defaultAccId),
        ]);
      } catch (err) {
        console.error("Failed to load metadata", err);
        setGeneralError("Failed to load categories or accounts.");
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [api]);

  const defaultCatId = categories.length > 0 ? categories[0].id : "";
  const defaultAccId =
    accounts.length > 0 ? accounts[0].id : "default-account-id";

  const handleAddRow = (count: number = 1) => {
    setRows((prev) => {
      const lastRow = prev[prev.length - 1];
      const newRows: BatchMovementRow[] = [];
      const inheritDate = lastRow?.date || todayStr;
      const inheritAccount = lastRow?.accountId || defaultAccId;
      const inheritCategory = lastRow?.categoryId || defaultCatId;

      for (let i = 0; i < count; i++) {
        newRows.push({
          id: crypto.randomUUID(),
          date: inheritDate,
          name: "",
          categoryId: inheritCategory,
          amount: "",
          accountId: inheritAccount,
          description: "",
        });
      }
      return [...prev, ...newRows];
    });
  };

  const handleDuplicateRow = (id: string) => {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (index === -1) return prev;
      const target = prev[index];
      const duplicated: BatchMovementRow = {
        ...target,
        id: crypto.randomUUID(),
      };
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        // If it's the last row, reset its values instead of removing
        return [createInitialRow(todayStr, defaultCatId, defaultAccId)];
      }
      return prev.filter((r) => r.id !== id);
    });

    setRowErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleClearAll = () => {
    setRows([
      createInitialRow(todayStr, defaultCatId, defaultAccId),
      createInitialRow(todayStr, defaultCatId, defaultAccId),
      createInitialRow(todayStr, defaultCatId, defaultAccId),
    ]);
    setRowErrors({});
    setGeneralError(null);
  };

  const handleUpdateRow = (
    id: string,
    field: keyof BatchMovementRow,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

    // Clear error for field if user fixed it
    if (rowErrors[id]) {
      setRowErrors((prev) => {
        const rowErr = prev[id];
        if (!rowErr) return prev;
        const updated = { ...rowErr };
        if (field === "name" && value.trim()) delete updated.name;
        if (field === "amount" && value.trim() && parseFloat(value) > 0)
          delete updated.amount;
        if (!updated.name && !updated.amount) {
          const allErrors = { ...prev };
          delete allErrors[id];
          return allErrors;
        }
        return { ...prev, [id]: updated };
      });
    }
  };

  const handleApplyDateToAll = () => {
    if (!bulkDate) return;
    setRows((prev) => prev.map((r) => ({ ...r, date: bulkDate })));
  };

  const handleApplyAccountToAll = () => {
    if (!bulkAccount) return;
    setRows((prev) => prev.map((r) => ({ ...r, accountId: bulkAccount })));
  };

  // Grouped categories for the dropdown
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  // Summary calculations
  const summary = rows.reduce(
    (acc, row) => {
      const amt = parseFloat(row.amount);
      const isFilled = row.name.trim() !== "" && !isNaN(amt) && amt > 0;
      if (isFilled) {
        acc.validCount += 1;
        const cat = categories.find((c) => c.id === row.categoryId);
        if (cat?.type === "INCOME") {
          acc.totalIncome += amt;
        } else {
          acc.totalExpense += amt;
        }
      }
      return acc;
    },
    { validCount: 0, totalIncome: 0, totalExpense: 0 },
  );

  const netBalance = summary.totalIncome - summary.totalExpense;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!user?.person_id) {
      setGeneralError("User profile is not loaded. Please refresh.");
      return;
    }

    const personId = user.person_id;

    // Identify rows that have at least some input
    const newRowErrors: Record<string, { name?: boolean; amount?: boolean }> = {};
    const filledRows: BatchMovementRow[] = [];

    rows.forEach((row) => {
      const hasName = row.name.trim() !== "";
      const hasAmount = row.amount.trim() !== "";
      const hasNotes = row.description.trim() !== "";

      // If row is completely blank, ignore it
      if (!hasName && !hasAmount && !hasNotes) {
        return;
      }

      const errors: { name?: boolean; amount?: boolean } = {};
      if (!hasName) {
        errors.name = true;
      }

      const parsedAmt = parseFloat(row.amount);
      if (!hasAmount || isNaN(parsedAmt) || parsedAmt <= 0) {
        errors.amount = true;
      }

      if (Object.keys(errors).length > 0) {
        newRowErrors[row.id] = errors;
      } else {
        filledRows.push(row);
      }
    });

    if (Object.keys(newRowErrors).length > 0) {
      setRowErrors(newRowErrors);
      setGeneralError(
        "Please fix the highlighted fields in invalid rows before saving.",
      );
      return;
    }

    if (filledRows.length === 0) {
      setGeneralError(
        "Please enter at least one movement with a name and amount greater than 0.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payloads: CreateTransactionPayload[] = filledRows.map((r) => ({
        name: r.name.trim(),
        description: r.description.trim() || undefined,
        amount: parseFloat(r.amount),
        transaction_date: new Date(`${r.date}T12:00:00`).toISOString(),
        category_id: r.categoryId,
        account_id:
          r.accountId === "default-account-id" || !r.accountId
            ? null
            : r.accountId,
        person_id: personId,
      }));

      if (api.createTransactionsBatch) {
        await api.createTransactionsBatch(payloads);
      } else {
        // Fallback sequential creation
        for (const payload of payloads) {
          await api.createTransaction(payload);
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error("Batch creation failed", err);
      setGeneralError(
        err.response?.data?.error ||
          err.message ||
          "Failed to create movements in batch.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading categories and accounts...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Description header & bulk toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/60">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Add multiple movements in rows and insert them all at once into your local offline database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowBulkTools(!showBulkTools)}
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {showBulkTools ? "Hide Bulk Tools" : "Bulk Tools"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-8 text-destructive hover:bg-destructive/10"
          >
            Reset Form
          </Button>
        </div>
      </div>

      {/* Bulk Helpers Panel */}
      {showBulkTools && (
        <div className="p-3 bg-muted/40 rounded-lg border border-border/80 flex flex-wrap items-center gap-4 text-xs animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Set Date for All:
            </span>
            <Input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="h-8 w-36 text-xs bg-background"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!bulkDate}
              onClick={handleApplyDateToAll}
              className="h-8 text-xs"
            >
              Apply
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />
              Set Account for All:
            </span>
            <select
              value={bulkAccount}
              onChange={(e) => setBulkAccount(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Select account...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!bulkAccount}
              onClick={handleApplyAccountToAll}
              className="h-8 text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {generalError && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Interactive Rows Table */}
      <div className="border border-border rounded-lg overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/70 text-muted-foreground font-semibold border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                <th className="py-2.5 px-2 w-10 text-center">#</th>
                <th className="py-2.5 px-2 w-36 min-w-[130px]">Date *</th>
                <th className="py-2.5 px-2 min-w-[160px]">Movement Name *</th>
                <th className="py-2.5 px-2 w-48 min-w-[150px]">Category *</th>
                <th className="py-2.5 px-2 w-32 min-w-[110px]">Amount ($) *</th>
                <th className="py-2.5 px-2 w-40 min-w-[130px]">Account</th>
                <th className="py-2.5 px-2 min-w-[130px]">Notes</th>
                <th className="py-2.5 px-2 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => {
                const selectedCat = categories.find((c) => c.id === row.categoryId);
                const isIncome = selectedCat?.type === "INCOME";
                const isExpense = selectedCat?.type === "EXPENSE";
                const errors = rowErrors[row.id];

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-accent/30 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-2 px-2 text-center text-xs text-muted-foreground font-mono">
                      {index + 1}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) =>
                          handleUpdateRow(row.id, "date", e.target.value)
                        }
                        className="h-8 text-xs py-1 px-2"
                        required
                      />
                    </td>

                    {/* Name */}
                    <td className="py-2 px-2">
                      <Input
                        value={row.name}
                        onChange={(e) =>
                          handleUpdateRow(row.id, "name", e.target.value)
                        }
                        placeholder="e.g. Groceries"
                        className={`h-8 text-xs py-1 px-2 ${
                          errors?.name
                            ? "border-destructive ring-1 ring-destructive bg-destructive/5"
                            : ""
                        }`}
                      />
                    </td>

                    {/* Category */}
                    <td className="py-2 px-2">
                      <div className="relative">
                        <select
                          value={row.categoryId}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "categoryId", e.target.value)
                          }
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <optgroup label="💸 Expenses">
                            {expenseCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="💰 Income">
                            {incomeCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-2">
                      <div className="relative flex items-center">
                        <span
                          className={`absolute left-2.5 text-xs font-semibold ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={row.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || parseFloat(val) <= 1000000000) {
                              handleUpdateRow(row.id, "amount", val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (["e", "E", "-", "+"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`h-8 text-xs py-1 pl-6 pr-2 font-mono font-medium ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isExpense
                                ? "text-rose-600 dark:text-rose-400"
                                : ""
                          } ${
                            errors?.amount
                              ? "border-destructive ring-1 ring-destructive bg-destructive/5"
                              : ""
                          }`}
                        />
                      </div>
                    </td>

                    {/* Account */}
                    <td className="py-2 px-2">
                      <select
                        value={row.accountId}
                        onChange={(e) =>
                          handleUpdateRow(row.id, "accountId", e.target.value)
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Notes */}
                    <td className="py-2 px-2">
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          handleUpdateRow(row.id, "description", e.target.value)
                        }
                        placeholder="Optional note"
                        className="h-8 text-xs py-1 px-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && index === rows.length - 1) {
                            e.preventDefault();
                            handleAddRow(1);
                          }
                        }}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(row.id)}
                          title="Duplicate row"
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          title="Delete row"
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Row control toolbar */}
        <div className="p-2.5 bg-muted/30 border-t border-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddRow(1)}
              className="h-8 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Row
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddRow(3)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              +3 Rows
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAddRow(5)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              +5 Rows
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "row" : "rows"} in table
          </div>
        </div>
      </div>

      {/* Real-time Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-card border border-border rounded-lg shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Valid Movements</span>
          <span className="text-base font-semibold flex items-center gap-1.5 mt-0.5">
            <Layers className="w-4 h-4 text-primary" />
            {summary.validCount}
            <span className="text-xs font-normal text-muted-foreground">
              / {rows.length}
            </span>
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Total Income</span>
          <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
            <ArrowUpRight className="w-4 h-4" />
            ${summary.totalIncome.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Total Expenses</span>
          <span className="text-base font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
            <ArrowDownRight className="w-4 h-4" />
            ${summary.totalExpense.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Net Flow</span>
          <span
            className={`text-base font-semibold flex items-center gap-1 mt-0.5 ${
              netBalance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {netBalance >= 0 ? "+" : "-"}${Math.abs(netBalance).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Form Submission Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || summary.validCount === 0}
            className="font-medium shadow-sm min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving {summary.validCount} Movements...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add All Movements ({summary.validCount})
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
