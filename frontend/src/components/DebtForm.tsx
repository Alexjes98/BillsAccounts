import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPersons, Person, createDebt, CreateDebtPayload } from "@/api/api";

interface DebtFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function DebtForm({ onSuccess, onCancel }: DebtFormProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [creditorId, setCreditorId] = useState("");
  const [debtorId, setDebtorId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPersons = async () => {
      setIsLoadingPersons(true);
      try {
        const data = await getPersons();
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

    if (!amount || !creditorId || !debtorId) {
      setError("Please fill in required fields.");
      setIsSubmitting(false);
      return;
    }

    if (creditorId === debtorId) {
      setError("Creditor and Debtor cannot be the same person.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreateDebtPayload = {
        creditor_id: creditorId,
        debtor_id: debtorId,
        total_amount: parseFloat(amount),
        description: description || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      };

      await createDebt(payload);
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
          <label htmlFor="creditor" className="text-sm font-medium">
            Creditor (Lender) *
          </label>
          <select
            id="creditor"
            value={creditorId}
            onChange={(e) => setCreditorId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoadingPersons}
            required
          >
            <option value="">Select Person</option>
            {/* TODO: THIS SHOWS THE PERSON ID, I WANT IT TO SHOW THE PERSON NAME*/}
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="debtor" className="text-sm font-medium">
            Debtor (Borrower) *
          </label>
          <select
            id="debtor"
            value={debtorId}
            onChange={(e) => setDebtorId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoadingPersons}
            required
          >
            <option value="">Select Person</option>
            {persons.map((p) => (
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
