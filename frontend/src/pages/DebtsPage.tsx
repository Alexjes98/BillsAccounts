import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DebtForm } from "@/components/DebtForm";
import { format } from "date-fns";
import {
  getDebts,
  getDebtsSummary,
  getPersons,
  DebtSummary,
  Debt,
  Person,
} from "@/api/api";

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [debtsRes, summaryRes, personsRes] = await Promise.all([
        getDebts(),
        getDebtsSummary(),
        getPersons(),
      ]);

      setDebts(debtsRes);
      setSummary(summaryRes);
      setPersons(personsRes);
    } catch (err) {
      console.error("Failed to fetch debts data", err);
      setError("Failed to load debts data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDebtCreated = () => {
    setIsModalOpen(false);
    fetchData();
  };

  const getPersonName = (id: string) => {
    const person = persons.find((p) => p.id === id);
    return person ? person.name : id.substring(0, 8) + "...";
  };

  if (isLoading) {
    return <div>Loading debts dashboard...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  const activeDebts = debts.filter((d) => !d.is_settled);
  const settledDebts = debts.filter((d) => d.is_settled);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Debts Dashboard</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Debt
        </Button>
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summary.map((item, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.creditor_name} → {item.debtor_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {item.total_amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.count} debt{item.count !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
        {summary.length === 0 && (
          <div className="text-muted-foreground">
            No debt summaries available.
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Debt"
      >
        <DebtForm
          onSuccess={handleDebtCreated}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Active Debts Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Debts</h2>
        {activeDebts.length === 0 ? (
          <p className="text-muted-foreground">No active debts.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium">Creditor/Debtor</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {activeDebts.map((debt) => (
                  <tr key={debt.id} className="border-t">
                    <td className="p-4">
                      {debt.created_at
                        ? format(new Date(debt.created_at), "PPP")
                        : "-"}
                    </td>
                    <td className="p-4">
                      {debt.description || "No description"}
                    </td>
                    <td className="p-4">
                      <span className="font-medium">
                        {getPersonName(debt.creditor_id)}
                      </span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">
                        {getPersonName(debt.debtor_id)}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-red-600">
                      ${debt.total_amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      ${debt.remaining_amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settled Debts Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Settled Debts</h2>
        {settledDebts.length === 0 ? (
          <p className="text-muted-foreground">No settled debts.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm text-left opacity-60">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium text-right">
                    Original Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {settledDebts.map((debt) => (
                  <tr key={debt.id} className="border-t">
                    <td className="p-4">
                      {debt.created_at
                        ? format(new Date(debt.created_at), "PPP")
                        : "-"}
                    </td>
                    <td className="p-4">{debt.description}</td>
                    <td className="p-4 text-right">
                      ${debt.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
