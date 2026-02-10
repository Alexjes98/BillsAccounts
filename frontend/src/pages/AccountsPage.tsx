import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import {
  Account,
  CreateAccountPayload,
  TransferPayload,
  Category,
} from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { setError } = useAppStore();
  const api = useApi();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState<CreateAccountPayload>({
    name: "",
    type: "",
    current_balance: 0,
    currency: "USD",
  });

  const [transferData, setTransferData] = useState<TransferPayload>({
    from_account_id: "",
    to_account_id: "",
    amount: 0,
    category_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const fetchData = async () => {
    try {
      const [accountsData, categoriesData] = await Promise.all([
        api.getAccounts(),
        api.getCategories(),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (err) {
      console.log(err);
      setError("Failed to fetch accounts");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      current_balance: 0,
      currency: "USD",
    });
    setSelectedAccount(null);
  };

  const handleCreate = async () => {
    try {
      await api.createAccount(formData);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.log(err);
      setError("Failed to create account");
    }
  };

  const handleEdit = async () => {
    if (!selectedAccount) return;
    try {
      await api.updateAccount(selectedAccount.id, {
        name: formData.name,
        type: formData.type,
      });
      setIsEditOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.log(err);
      setError("Failed to update account");
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    try {
      await api.deleteAccount(selectedAccount.id);
      setIsDeleteOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.log(err);
      setError("Failed to delete account");
    }
  };

  const handleTransfer = async () => {
    try {
      // Requirement: "user to move money...". Usually user doesn't care about category for transfer, but systme needs it.
      // Implementation Plan says: "Category (filtered by type TRANSFER)" in UI.

      if (!transferData.category_id) {
        setError("Please select a transfer category.");
        return;
      }

      await api.transfer(transferData);
      setIsTransferOpen(false);
      setTransferData({
        from_account_id: "",
        to_account_id: "",
        amount: 0,
        category_id: "",
        transaction_date: new Date().toISOString().split("T")[0],
        description: "",
      });
      fetchData();
    } catch (err) {
      console.log(err);
      setError("Failed to transfer funds: " + (err as Error).message);
    }
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      current_balance: account.current_balance,
      currency: account.currency,
    });
    setIsEditOpen(true);
  };

  const openDelete = (account: Account) => {
    setSelectedAccount(account);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsTransferOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Create Account
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="relative group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {account.name}
              </CardTitle>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(account)}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  onClick={() => openDelete(account)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: account.currency,
                }).format(account.current_balance)}
              </div>
              <div className="flex justify-between items-center mt-1">
                <CardDescription className="text-xs text-muted-foreground">
                  Current Balance
                </CardDescription>
                <div className="text-xs text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                  {account.type}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-10">
            No accounts found.
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Account"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="E.g. Main Checking"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Input
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              placeholder="E.g. Checking, Savings, Credit Card"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Input
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                placeholder="USD"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Balance</label>
              <Input
                type="number"
                value={formData.current_balance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_balance: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button id="create-account-button" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Account"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Input
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
            />
          </div>
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground flex gap-2 items-start">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>
              Balance and currency cannot be modified after creation to ensure
              data integrity.
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 text-destructive rounded-md flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Warning: Destructive Action</p>
              <p className="text-sm">
                Are you sure you want to delete{" "}
                <strong>{selectedAccount?.name}</strong>? This will{" "}
                <strong>permanently delete</strong> the account and{" "}
                <strong>all associated transactions</strong>. This action cannot
                be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Funds"
      >
        <div className="space-y-4">
          {/* Check if TRANSFER category exists */}
          {!categories.some((c) => c.type === "TRANSFER") && (
            <div className="p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm flex gap-2 items-center">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Warning: No 'TRANSFER' category found. Please create one in
                Categories page first.
              </span>
            </div>
          )}

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
            <label className="text-sm font-medium">Category</label>
            <select
              autoComplete="off"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={transferData.category_id}
              onChange={(e) =>
                setTransferData({
                  ...transferData,
                  category_id: e.target.value,
                })
              }
            >
              <option value="" disabled>
                Select transfer category
              </option>
              {categories
                .filter((c) => c.type === "TRANSFER")
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
            </select>
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
            <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={
                !transferData.from_account_id ||
                !transferData.to_account_id ||
                transferData.amount <= 0 ||
                !transferData.category_id
              }
            >
              Transfer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
