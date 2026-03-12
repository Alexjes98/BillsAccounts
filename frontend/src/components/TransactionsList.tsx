import { useState, useRef, useEffect } from "react";
import { Transaction } from "@/api/repository";
import { Edit, Trash2, Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionsListProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onView: (transaction: Transaction) => void;
}

function ActionMenu({
  transaction,
  onEdit,
  onDelete,
  onView,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onView: (t: Transaction) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        id={`action-menu-${transaction.id}`}
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
      >
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="p-1">
            <button
              id={`view-transaction-${transaction.id}`}
              onClick={() => {
                onView(transaction);
                setIsOpen(false);
              }}
              className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </button>
            {transaction.is_system_generated ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground italic text-center">
                System Generated
              </div>
            ) : (
              <>
                <button
                  id={`edit-transaction-${transaction.id}`}
                  onClick={() => {
                    onEdit(transaction);
                    setIsOpen(false);
                  }}
                  className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </button>
                <button
                  id={`delete-transaction-${transaction.id}`}
                  onClick={() => {
                    onDelete(transaction);
                    setIsOpen(false);
                  }}
                  className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TransactionsList({
  transactions,
  isLoading,
  onEdit,
  onDelete,
  onView,
}: TransactionsListProps) {
  if (isLoading && transactions.length === 0) {
    return <div className="text-center py-4">Loading transactions...</div>;
  }

  if (!isLoading && transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="border rounded-md relative animate-fade-in-up">
      {isLoading && transactions.length > 0 && (
        <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-[1px]">
          <div className="bg-background border rounded-md px-4 py-2 text-sm font-medium shadow-sm">
            Loading...
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3 font-medium first:rounded-tl-md">Date</th>
            <th className="p-3 font-medium">Name</th>
            <th className="p-3 font-medium">Description</th>
            <th className="p-3 font-medium">Category</th>
            <th className="p-3 font-medium">Account</th>
            <th className="p-3 font-medium text-right">Amount</th>
            <th className="p-3 font-medium text-center w-[50px] last:rounded-tr-md">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr
              key={t.id}
              className="border-t hover:bg-muted/10 transition-colors"
            >
              <td className="p-3">
                {new Date(t.transaction_date).toLocaleDateString("en-GB", {
                  timeZone: "UTC",
                })}
              </td>
              <td className="p-3">{t.name}</td>
              <td className="p-3">{t.description}</td>
              <td className="p-3 flex items-center gap-2">
                <span>{t.category?.icon || "📁"}</span>
                <span>{t.category?.name}</span>
              </td>
              <td className="p-3">{t.account?.name}</td>
              <td
                className={`p-3 text-right font-medium ${t.amount < 0 ? "text-red-600" : "text-green-600"}`}
              >
                {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
              </td>
              <td className="p-3 text-center">
                <ActionMenu
                  transaction={t}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
