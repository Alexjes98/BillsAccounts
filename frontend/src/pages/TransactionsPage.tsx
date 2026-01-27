import { useEffect, useState, useCallback } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Transaction,
  getTransactions,
  deleteTransaction,
  getCategories,
  getAccounts,
  Category,
  Account,
} from "@/api/api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { TransactionsList } from "@/components/TransactionsList";
import { TransactionForm } from "@/components/TransactionForm";

export function TransactionsPage() {
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<Transaction | null>(null);

  // Filter & Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTransactions({
        page: currentPage,
        per_page: 12,
        search,
        category_id: categoryFilter || undefined,
        type: typeFilter || undefined,
        account_id: accountFilter || undefined,
        date: dateFilter || undefined,
      });
      setTransactions(response.items);
      setTotalPages(response.pages);
      setTotalItems(response.total);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    search,
    categoryFilter,
    typeFilter,
    accountFilter,
    dateFilter,
  ]);

  const loadMetadata = async () => {
    try {
      const [cats, accs] = await Promise.all([getCategories(), getAccounts()]);
      setCategories(cats);
      setAccounts(accs);
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange =
    (setter: (val: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setCurrentPage(1); // Reset to page 1 on filter change
    };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setTypeFilter("");
    setAccountFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

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
    //TODO: Show a confirmation modal instead of using window.confirm
    if (
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

  // Filtered Categories based on Type Filter
  const availableCategories = typeFilter
    ? categories.filter((c) => c.type === typeFilter)
    : categories;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* Filters Section */}
      <div className="bg-card text-card-foreground rounded-lg border p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={handleFilterChange(setSearch)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={clearFilters}
              size="icon"
              title="Clear Filters"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Type Filter */}
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={typeFilter}
            onChange={handleFilterChange(setTypeFilter)}
          >
            <option value="">All Types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>

          {/* Category Filter */}
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={categoryFilter}
            onChange={handleFilterChange(setCategoryFilter)}
          >
            <option value="">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>

          {/* Account Filter */}
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={accountFilter}
            onChange={handleFilterChange(setAccountFilter)}
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <Input
            type="date"
            value={dateFilter}
            onChange={handleFilterChange(setDateFilter)}
          />
        </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 12 + 1} to{" "}
            {Math.min(currentPage * 12, totalItems)} of {totalItems} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
