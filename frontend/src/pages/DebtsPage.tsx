import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DebtForm } from "@/components/DebtForm";
import { format } from "date-fns";
import { getDebts, getDebtsSummary, DebtSummary, Debt } from "@/api/api";

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const debtsRes = await getDebts();
      const summaryRes = await getDebtsSummary();

      setDebts(debtsRes);
      setSummary(summaryRes);
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
                      {/* We might strictly need person names here, but the Debt object only has IDs currently in the interface. 
                            If we want names, we have to fetch persons or rely on backend to populate. 
                            For now, I will assume we might need to fetch persons map or just show IDs if names aren't available 
                            Wait, the Debt model in backend 'get_debts' returns DebtOut which might not include nested names unless specified.
                            Let's check DebtOut schema if possible, or just default to showing something simple.
                            Actually, for now I'll skip showing names in the list to avoid N+1 difficulty on frontend without store.
                            Or I can trust the user knows who is who if I just show description.
                            Let's try to be safe.
                         */}
                      <span
                        className="text-xs font-mono"
                        title={debt.creditor_id}
                      >
                        {debt.creditor_id.substring(0, 8)}...
                      </span>{" "}
                      →{" "}
                      <span
                        className="text-xs font-mono"
                        title={debt.debtor_id}
                      >
                        {debt.debtor_id.substring(0, 8)}...
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
