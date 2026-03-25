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
import { Account, CreateAccountPayload } from "@/api/repository";
import { useApi } from "@/context/ApiContext";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TransferModal } from "@/components/TransferModal";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
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
    classification: "ASSET",
    tags: [],
    current_balance: 0,
    currency: "USD",
  });

  const fetchData = async () => {
    try {
      const accountsData = await api.getAccounts();
      setAccounts(accountsData);
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
      classification: "ASSET",
      tags: [],
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
        classification: formData.classification,
        tags: formData.tags,
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

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      classification: account.classification || "ASSET",
      tags: account.tags || [],
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
      <div className="flex justify-between items-center animate-fade-in-up">
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

      <div className="space-y-8 animate-fade-in-up delay-100">
        {["ASSET", "LIABILITY", "EQUITY"].map((classification) => {
          const filteredAccounts = accounts.filter(
            (a) => (a.classification || "ASSET") === classification,
          );

          if (filteredAccounts.length === 0) return null;

          return (
            <div key={classification} className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {classification === "ASSET"
                  ? "Assets"
                  : classification === "LIABILITY"
                    ? "Liabilities"
                    : "Equity"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAccounts.map((account) => (
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
                      {account.tags && account.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {account.tags.map((tag, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-[10px] px-1 py-0 h-5"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

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
            <label className="text-sm font-medium">Classification</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.classification}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  classification: e.target.value as
                    | "ASSET"
                    | "LIABILITY"
                    | "EQUITY",
                })
              }
            >
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
            </select>
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
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tags (comma separated)
            </label>
            <Input
              value={formData.tags?.join(", ") || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g. business, personal, savings"
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
            <label className="text-sm font-medium">Classification</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.classification}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  classification: e.target.value as
                    | "ASSET"
                    | "LIABILITY"
                    | "EQUITY",
                })
              }
            >
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
            </select>
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
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tags (comma separated)
            </label>
            <Input
              value={formData.tags?.join(", ") || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g. business, personal, savings"
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

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        onSuccess={fetchData}
      />
    </div>
  );
}
