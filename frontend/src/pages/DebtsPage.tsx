import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, Trash2, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DebtForm } from "@/components/DebtForm";
import { format } from "date-fns";
import {
  DebtSummary,
  Debt,
  Person,
  Transaction,
  ApiRepository,
} from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";

// Component for expandable debt row
function DebtRow({
  debt,
  getPersonName,
  api,
  onRefresh,
}: {
  debt: Debt;
  getPersonName: (id: string) => string;
  api: ApiRepository;
  onRefresh: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "delete" | "settle" | null
  >(null);

  const toggleExpand = async () => {
    if (!isExpanded && transactions.length === 0) {
      setIsLoadingTx(true);
      try {
        const res = await api.getTransactions({
          debt_id: debt.id,
          per_page: 100, // Fetch enough to show
        });
        setTransactions(res.items);
      } catch (err) {
        console.error("Failed to fetch debt transactions", err);
      } finally {
        setIsLoadingTx(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleSettleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction("settle");
    setShowConfirm(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction("delete");
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    try {
      if (confirmAction === "settle") {
        await api.updateDebt(debt.id, { is_settled: true });
      } else if (confirmAction === "delete") {
        await api.deleteDebt(debt.id);
      }
      onRefresh();
    } catch (err) {
      console.error(`Failed to ${confirmAction} debt`, err);
      // Ideally show error toast
    } finally {
      setShowConfirm(false);
    }
  };

  const getConfirmTitle = () => {
    if (confirmAction === "settle") return "Settle Debt";
    if (confirmAction === "delete") return "Delete Debt";
    return "Confirm";
  };

  const getConfirmMessage = () => {
    if (confirmAction === "settle") {
      return "Are you sure you want to mark this debt as fully settled?";
    }
    if (confirmAction === "delete") {
      if (debt.is_settled) {
        return "This debt is already settled. Deleting it will remove it from historical data and reports. Are you sure you want to proceed?";
      }
      return "Has this debt been Written off or Forgiven by the debitor? Please ensure the debt is resolved before deleting to avoid unsettled records.";
    }
    return "";
  };

  return (
    <>
      <tr className="border-t hover:bg-muted/50 transition-colors">
        <td className="p-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </td>
        <td className="p-4">
          {debt.created_at ? format(new Date(debt.created_at), "PPP") : "-"}
        </td>
        <td className="p-4">{debt.description || "No description"}</td>
        <td className="p-4">
          <span className="font-medium">{getPersonName(debt.creditor_id)}</span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span className="font-medium">{getPersonName(debt.debtor_id)}</span>
        </td>
        <td className="p-4 text-right font-medium text-red-600">
          ${debt.total_amount.toLocaleString()}
        </td>
        <td className="p-4 text-right">
          ${debt.remaining_amount.toLocaleString()}
        </td>
        <td className="p-4 text-right">
          <div className="flex justify-end gap-2">
            {!debt.is_settled && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleSettleClick}
                title="Settle Debt"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteClick}
              title="Delete Debt"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/30">
          <td colSpan={7} className="p-4 pl-12">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                Related Transactions
              </h4>
              {isLoadingTx ? (
                <div className="text-sm">Loading transactions...</div>
              ) : transactions.length > 0 ? (
                <div className="border rounded-md bg-background">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left font-medium">Date</th>
                        <th className="p-2 text-left font-medium">Name</th>
                        <th className="p-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b last:border-0">
                          <td className="p-2">
                            {format(new Date(tx.transaction_date), "PP")}
                          </td>
                          <td className="p-2">{tx.name}</td>
                          <td className="p-2 text-right">
                            ${Math.abs(tx.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  No related transactions found.
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={getConfirmTitle()}
      >
        <div className="space-y-4">
          <p>{getConfirmMessage()}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const api = useApi();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [debtsRes, summaryRes, personsRes] = await Promise.all([
        api.getDebts(),
        api.getDebtsSummary(),
        api.getPersons(),
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
                  <th className="p-4 font-medium w-8"></th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium">Creditor/Debtor</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium text-right">Remaining</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeDebts.map((debt) => (
                  <DebtRow
                    key={debt.id}
                    debt={debt}
                    getPersonName={getPersonName}
                    api={api}
                    onRefresh={fetchData}
                  />
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
                  <th className="p-4 font-medium w-8"></th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium text-right">
                    Original Amount
                  </th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settledDebts.map((debt) => (
                  <DebtRow
                    key={debt.id}
                    debt={debt}
                    getPersonName={getPersonName}
                    api={api}
                    onRefresh={fetchData}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
