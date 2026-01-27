import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Transaction, getTransactions, deleteTransaction } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TransactionsList } from "@/components/TransactionsList";
import { TransactionForm } from "@/components/TransactionForm";

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<Transaction | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransactionCreated = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    fetchData();
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleDelete = async (t: Transaction) => {
    if (
      //TODO: Show a confirmation modal instead of using window.confirm
      window.confirm(
        `Are you sure you want to delete transaction "${t.name}"?\nThis action cannot be undone.`,
      )
    ) {
      try {
        await deleteTransaction(t.id);
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete transaction.");
      }
    }
  };

  const handleView = (t: Transaction) => {
    setViewingTransaction(t);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Transactions</h1>
        <Button
          onClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      <TransactionsList
        transactions={transactions}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? "Edit Transaction" : "Create Transaction"}
      >
        <TransactionForm
          initialData={editingTransaction || undefined}
          onSuccess={handleTransactionCreated}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={!!viewingTransaction}
        onClose={() => setViewingTransaction(null)}
        title="Transaction Details"
      >
        {viewingTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="font-medium text-muted-foreground">Date</div>
              <div>
                {new Date(
                  viewingTransaction.transaction_date,
                ).toLocaleDateString()}
              </div>

              <div className="font-medium text-muted-foreground">Name</div>
              <div>{viewingTransaction.name}</div>

              <div className="font-medium text-muted-foreground">Amount</div>
              <div
                className={
                  viewingTransaction.amount < 0
                    ? "text-red-600 font-medium"
                    : "text-green-600 font-medium"
                }
              >
                ${Math.abs(viewingTransaction.amount).toFixed(2)}
              </div>

              <div className="font-medium text-muted-foreground">Category</div>
              <div className="flex items-center gap-2">
                <span>{viewingTransaction.category?.icon}</span>
                <span>{viewingTransaction.category?.name}</span>
              </div>

              <div className="font-medium text-muted-foreground">Account</div>
              <div>{viewingTransaction.account?.name || "N/A"}</div>

              {viewingTransaction.debt && (
                <>
                  <div className="font-medium text-muted-foreground">
                    Linked Debt
                  </div>
                  <div>{viewingTransaction.debt.description}</div>
                </>
              )}

              {viewingTransaction.savings_goal && (
                <>
                  <div className="font-medium text-muted-foreground">
                    Savings Goal
                  </div>
                  <div>{viewingTransaction.savings_goal.name}</div>
                </>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setViewingTransaction(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
