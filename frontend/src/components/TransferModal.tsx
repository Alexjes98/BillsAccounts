import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Account, TransferPayload } from "@/api/repository";
import { useApi } from "@/context/ApiContext";
import { useAppStore } from "@/store/useAppStore";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export function TransferModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: TransferModalProps) {
  const api = useApi();
  const { setError } = useAppStore();
  const [transferData, setTransferData] = useState<TransferPayload>({
    from_account_id: "",
    to_account_id: "",
    amount: 0,
    transaction_date: new Date().toLocaleDateString("en-CA"),
    description: "",
  });

  const handleTransfer = async () => {
    try {
      if (!transferData.from_account_id || !transferData.to_account_id) {
        setError("Please select both accounts.");
        return;
      }
      if (transferData.amount <= 0) {
        setError("Amount must be greater than zero.");
        return;
      }

      await api.transfer(transferData);
      onClose();
      setTransferData({
        from_account_id: "",
        to_account_id: "",
        amount: 0,
        transaction_date: new Date().toLocaleDateString("en-CA"),
        description: "",
      });
      onSuccess();
    } catch (err) {
      console.log(err);
      setError("Failed to transfer funds: " + (err as Error).message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Funds">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Account</label>
            <select
              autoComplete="off"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={transferData.from_account_id}
              onChange={(e) =>
                setTransferData({
                  ...transferData,
                  from_account_id: e.target.value,
                })
              }
            >
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((acc) => (
                <option
                  key={acc.id}
                  value={acc.id}
                  disabled={acc.id === transferData.to_account_id}
                >
                  {acc.name} ({acc.currency} {acc.current_balance})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To Account</label>
            <select
              autoComplete="off"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={transferData.to_account_id}
              onChange={(e) =>
                setTransferData({
                  ...transferData,
                  to_account_id: e.target.value,
                })
              }
            >
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((acc) => (
                <option
                  key={acc.id}
                  value={acc.id}
                  disabled={acc.id === transferData.from_account_id}
                >
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            value={transferData.amount}
            onChange={(e) =>
              setTransferData({
                ...transferData,
                amount: Number(e.target.value),
              })
            }
            min="0.01"
            step="0.01"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Input
            type="date"
            value={transferData.transaction_date}
            onChange={(e) =>
              setTransferData({
                ...transferData,
                transaction_date: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input
            value={transferData.description || ""}
            onChange={(e) =>
              setTransferData({
                ...transferData,
                description: e.target.value,
              })
            }
            placeholder="Optional description"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={
              !transferData.from_account_id ||
              !transferData.to_account_id ||
              transferData.amount <= 0
            }
          >
            Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
