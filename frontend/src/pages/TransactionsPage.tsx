import { useEffect, useState } from "react";
import { getTransactions, Transaction } from "@/api/transactions";
import { TransactionsList } from "@/components/TransactionsList";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/TransactionForm";
import { Plus } from "lucide-react";

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Transactions</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      <TransactionsList transactions={transactions} isLoading={isLoading} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Transaction"
      >
        <TransactionForm
          onSuccess={handleTransactionCreated}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
