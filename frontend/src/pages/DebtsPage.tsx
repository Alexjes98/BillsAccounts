import { useEffect, useState, use, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  DollarSign,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DebtForm } from "@/components/DebtForm";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  DebtSummary,
  GroupedDebts,
  Debt,
  Person,
  Transaction,
  ApiRepository,
  Category,
  Account,
  TransferPayload,
} from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";
import { useUser } from "@/context/UserContext";
import Loading from "@/components/ui/loading";

// Component for expandable debt row
function DebtRow({
  debt,
  getPersonName,
  api,
  onPay,
  onDelete,
}: {
  debt: Debt;
  getPersonName: (id: string) => string;
  api: ApiRepository;
  onPay: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  const toggleExpand = async () => {
    if (!isExpanded && transactions.length === 0) {
      setIsLoadingTx(true);
      try {
        const res = await api.getTransactions({
          debt_id: debt.id,
          per_page: 100,
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
        <td className="p-4">
          <div className="flex flex-col">
            <span>{debt.description || "No description"}</span>
            <span className="text-xs text-muted-foreground">
              {debt.type ? debt.type.replace("_", " ") : "Legacy"}
            </span>
          </div>
        </td>
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
            {!debt.is_settled && debt.type && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onPay(debt);
                }}
                title="Record Payment"
              >
                <DollarSign className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(debt);
              }}
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
    </>
  );
}

export function DebtsPage() {
  const api = useApi();
  const [refreshKey, setRefreshKey] = useState(0);
  const [dataPromise, setDataPromise] = useState<Promise<
    [GroupedDebts, DebtSummary[], Person[], Category[], Account[]]
  > | null>(null);

  useEffect(() => {
    setDataPromise(
      Promise.all([
        api.getGroupedDebts(),
        api.getDebtsSummary(),
        api.getPersons(),
        api.getCategories(),
        api.getAccounts(),
      ]),
    );
  }, [api, refreshKey]);

  if (!dataPromise) return null;

  return (
    <Suspense fallback={<Loading isPage />}>
      <DebtsDashboardContent
        dataPromise={dataPromise}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />
    </Suspense>
  );
}

function DebtsDashboardContent({
  dataPromise,
  onRefresh,
}: {
  dataPromise: Promise<
    [GroupedDebts, DebtSummary[], Person[], Category[], Account[]]
  >;
  onRefresh: () => void;
}) {
  const [debts, summary, persons, categories, accounts] = use(dataPromise);
  const api = useApi();
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [payDescription, setPayDescription] = useState("");

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  const handleDebtCreated = () => {
    setIsModalOpen(false);
    onRefresh();
  };

  const getPersonName = (id: string) => {
    const person = persons.find((p) => p.id === id);
    return person ? person.name : "Me";
  };

  const handlePayClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setPayAmount(debt.remaining_amount.toString());
    setPayAccountId("");
    setPayDescription(`Repayment for ${debt.description || "debt"}`);
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !payAmount || !payAccountId || !selectedDebt.type)
      return;

    setIsPaying(true);
    try {
      const amountVal = parseFloat(payAmount);
      const transferCat = categories.find((c) => c.type === "TRANSFER");
      if (!transferCat) throw new Error("Transfer Category not found");

      let fromAccountId = "";
      let toAccountId = "";

      if (
        selectedDebt.type === "DELAYED_PAYMENT" ||
        selectedDebt.type === "LOAN"
      ) {
        // User receives money (Repayment of Asset)
        // From: Person Asset Account (Derived)
        // To: User Selected Account (payAccountId)
        fromAccountId = `${selectedDebt.user_id}-${selectedDebt.debtor_id}-${selectedDebt.type}`;
        toAccountId = payAccountId;
      } else if (selectedDebt.type === "PASSIVE_DEBT") {
        // User pays money (Reducing Liability)
        // From: User Selected Account (payAccountId)
        // To: Liability Account (Derived)
        // Liability ID: user_id + creditor_id + debt_id
        fromAccountId = payAccountId;
        toAccountId = `${selectedDebt.user_id}-${selectedDebt.creditor_id}-${selectedDebt.type}`;
      }

      if (fromAccountId && toAccountId) {
        const payload: TransferPayload = {
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          amount: amountVal,
          category_id: transferCat.id,
          transaction_date: new Date().toISOString(),
          description: payDescription,
          debt_id: selectedDebt.id, // Updates debt remaining amount
        };
        await api.transfer(payload);
      }

      setPayModalOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error("Payment failed", err);
      alert("Payment failed: " + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeleteClick = (debt: Debt) => {
    setDebtToDelete(debt);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!debtToDelete) return;
    try {
      await api.deleteDebt(debtToDelete.id);
      setDeleteModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const {
    delayed_payments,
    loans,
    passive_debts,
    others: otherDebts,
    settled: settledDebts,
  } = debts;

  const hasActiveDebts =
    delayed_payments.length > 0 ||
    loans.length > 0 ||
    passive_debts.length > 0 ||
    otherDebts.length > 0;

  const renderDebtTable = (debtList: Debt[]) => (
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
          {debtList.map((debt) => (
            <DebtRow
              key={debt.id}
              debt={debt}
              getPersonName={getPersonName}
              api={api}
              onPay={handlePayClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">Debts Dashboard</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Debt
        </Button>
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up delay-100">
        {summary.map((item, index) => {
          const isUserCreditor = user?.person_id === item.creditor_id;
          const isUserDebtor = user?.person_id === item.debtor_id;

          let cardColorClass = "";
          let statusText = "";

          if (isUserCreditor) {
            cardColorClass = "border-l-4 border-l-green-500";
            statusText = "Owes You";
          } else if (isUserDebtor) {
            cardColorClass = "border-l-4 border-l-red-500";
            statusText = "You Owe";
          }

          // types is now from API
          const typesList = item.types
            ? item.types.map((t) => t.replace("_", " ")).join(", ")
            : "";

          return (
            <Card key={index} className={cardColorClass}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {item.creditor_name} → {item.debtor_name}
                </CardTitle>
                {statusText && (
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${isUserCreditor ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {statusText}
                  </span>
                )}
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
                {typesList && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Includes: {typesList}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {summary.length === 0 && (
          <div className="text-muted-foreground col-span-full">
            No active debt summaries available.
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

      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Register Repayment"
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {selectedDebt && selectedDebt.type === "PASSIVE_DEBT"
                ? "Pay From Account (Bank/Equity)"
                : "Deposit To Account (Bank/Equity)"}
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={payAccountId}
              onChange={(e) => setPayAccountId(e.target.value)}
              required
            >
              <option value="">Select Account</option>
              {accounts
                .filter((a) => a.classification === "EQUITY")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (${a.current_balance})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={payDescription}
              onChange={(e) => setPayDescription(e.target.value)}
              placeholder="Enter payment description"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPaying}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Debt"
      >
        <div className="space-y-4">
          <p>
            All transactions related to this debt will be deleted. Are you sure
            you want to delete this debt? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      {/* Active Debts Section */}
      <div className="space-y-8 animate-fade-in-up delay-200">
        {delayed_payments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-green-700">
              Delayed Payments (To Wait For)
            </h2>
            {renderDebtTable(delayed_payments)}
          </div>
        )}

        {loans.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-emerald-700">
              Loans (Given)
            </h2>
            {renderDebtTable(loans)}
          </div>
        )}

        {passive_debts.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-red-700">
              Passive Debts (To Pay)
            </h2>
            {renderDebtTable(passive_debts)}
          </div>
        )}

        {otherDebts.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Other / Unclassified Debts
            </h2>
            {renderDebtTable(otherDebts)}
          </div>
        )}

        {!hasActiveDebts && (
          <p className="text-muted-foreground">No active debts.</p>
        )}
      </div>

      {/* Settled Debts Section */}
      <div className="animate-fade-in-up delay-300">
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
                  <th className="p-4 font-medium">Creditor/Debtor</th>
                  <th className="p-4 font-medium text-right">
                    Original Amount
                  </th>
                  <th className="p-4 font-medium text-right">Remaining</th>
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
                    onPay={handlePayClick}
                    onDelete={handleDeleteClick}
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
