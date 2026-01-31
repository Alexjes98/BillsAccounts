import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Person, CreateDebtPayload } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";

interface DebtFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function DebtForm({ onSuccess, onCancel }: DebtFormProps) {
  const user = { person_id: "5048520a-da77-4a94-b5e8-0376829ae095" };
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);
  const api = useApi();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [counterpartyId, setCounterpartyId] = useState("");
  const [direction, setDirection] = useState<"payable" | "receivable">(
    "payable",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPersons = async () => {
      setIsLoadingPersons(true);
      try {
        const data = await api.getPersons();
        setPersons(data);
        if (data.length >= 2) {
          // Optional: Pre-select if we want
        }
      } catch (err) {
        console.error("Failed to load persons", err);
        setError("Failed to load persons.");
      } finally {
        setIsLoadingPersons(false);
      }
    };
    fetchPersons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!amount || !counterpartyId) {
      setError("Please fill in required fields.");
      setIsSubmitting(false);
      return;
    }

    let finalCreditorId = "";
    let finalDebtorId = "";

    if (direction === "payable") {
      // I owe them -> I am the debtor
      finalCreditorId = counterpartyId;
      finalDebtorId = user.person_id;
    } else {
      // They owe me -> I am the creditor
      finalCreditorId = user.person_id;
      finalDebtorId = counterpartyId;
    }

    if (finalCreditorId === finalDebtorId) {
      setError("Creditor and Debtor cannot be the same person.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreateDebtPayload = {
        creditor_id: finalCreditorId,
        debtor_id: finalDebtorId,
        total_amount: parseFloat(amount),
        description: description || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      };

      await api.createDebt(payload);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to create debt.");
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
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Lunch expense"
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
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="dueDate" className="text-sm font-medium">
          Due Date
        </label>
        <Input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="direction" className="text-sm font-medium">
            Type *
          </label>
          <select
            id="direction"
            value={direction}
            onChange={(e) =>
              setDirection(e.target.value as "payable" | "receivable")
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoadingPersons}
            required
          >
            <option value="payable">I owe them</option>
            <option value="receivable">They owe me</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="counterparty" className="text-sm font-medium">
            Person *
          </label>
          <select
            id="counterparty"
            value={counterpartyId}
            onChange={(e) => setCounterpartyId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoadingPersons}
            required
          >
            <option value="">Select Person</option>
            {persons
              .filter((p) => p.id !== user.person_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingPersons}>
          {isSubmitting ? "Creating..." : "Create Debt"}
        </Button>
      </div>
    </form>
  );
}
