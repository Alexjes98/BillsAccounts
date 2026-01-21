import { Transaction } from "@/api/transactions";

interface TransactionsListProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function TransactionsList({
  transactions,
  isLoading,
}: TransactionsListProps) {
  if (isLoading) {
    return <div className="text-center py-4">Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3 font-medium">Date</th>
            <th className="p-3 font-medium">Name</th>
            <th className="p-3 font-medium">Category</th>
            <th className="p-3 font-medium">Account</th>
            <th className="p-3 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr
              key={t.id}
              className="border-t hover:bg-muted/10 transition-colors"
            >
              <td className="p-3">
                {new Date(t.transaction_date).toLocaleDateString()}
              </td>
              <td className="p-3">{t.name}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
