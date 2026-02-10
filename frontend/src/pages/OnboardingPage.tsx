import { useState, useRef } from "react";
import { useApi } from "@/contexts/ApiContext";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Check, Wallet, CreditCard, Building, Plus, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { createPortal } from "react-dom";

interface Category {
  name: string;
  type: string;
  icon: string;
  color: string;
}

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const { refreshUser } = useUser();
  const api = useApi();
  const navigate = useNavigate();

  // Form States
  const [userData, setUserData] = useState({ email: "", currency: "USD" });
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(["Cash"]);
  const [persons, setPersons] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState("");

  const defaultCategories: Category[] = [
    { name: "Salary", type: "INCOME", icon: "💰", color: "#10B981" },
    { name: "Food", type: "EXPENSE", icon: "🍔", color: "#EF4444" },
    { name: "Rent", type: "EXPENSE", icon: "🏠", color: "#F59E0B" },
    { name: "Groceries", type: "EXPENSE", icon: "🛒", color: "#3B82F6" },
    { name: "Transport", type: "EXPENSE", icon: "🚗", color: "#6366F1" },
    { name: "Utilities", type: "EXPENSE", icon: "💡", color: "#8B5CF6" },
    { name: "Entertainment", type: "EXPENSE", icon: "🎉", color: "#EC4899" },
    { name: "Shopping", type: "EXPENSE", icon: "🛍️", color: "#F472B6" },
    { name: "Health", type: "EXPENSE", icon: "💊", color: "#14B8A6" },
    { name: "Education", type: "EXPENSE", icon: "🎓", color: "#60A5FA" },
    { name: "Gym", type: "EXPENSE", icon: "🏋️", color: "#6B7280" },
    { name: "Home", type: "EXPENSE", icon: "🏡", color: "#A855F7" },
    { name: "Others", type: "EXPENSE", icon: "❓", color: "#9CA3AF" },
  ];

  const [selectedCategories, setSelectedCategories] = useState<Category[]>([
    defaultCategories[0], // Salary
    defaultCategories[1], // Food
    defaultCategories[2], // Rent
  ]);

  // Custom Category State
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState("EXPENSE");
  const [customIcon, setCustomIcon] = useState("🏷️");
  const [customColor, setCustomColor] = useState("#808080");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const [loading, setLoading] = useState(false);

  // Initial User Creation (Step 0)
  const handleCreateUser = async () => {
    if (!userData.currency) return;
    setLoading(true);
    try {
      await api.createUser({
        email: userData.email,
        base_currency: userData.currency,
      });
      await refreshUser();
      setStep(1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Accounts Creation (Step 1)
  const handleCreateAccounts = async () => {
    setLoading(true);
    try {
      for (const accType of selectedAccounts) {
        let type = "CASH";
        if (accType === "Bank") type = "BANK";
        if (accType === "Paypal" || accType === "Zelle") type = "Wallet";

        await api.createAccount({
          name: accType,
          type: type,
          current_balance: 0,
          currency: userData.currency,
        });
      }
      setStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Persons Creation (Step 2)
  const handleCreatePersons = async () => {
    setLoading(true);
    try {
      for (const name of persons) {
        await api.createPerson({ name });
      }
      setStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomCategory = () => {
    if (!customName) return;

    // Check if name already exists in selected
    if (
      selectedCategories.some(
        (c) => c.name.toLowerCase() === customName.toLowerCase(),
      )
    ) {
      return;
    }

    const newCat: Category = {
      name: customName,
      type: customType,
      icon: customIcon,
      color: customColor,
    };

    setSelectedCategories([...selectedCategories, newCat]);

    // Reset form
    setCustomName("");
    setCustomType("EXPENSE");
    setCustomIcon("🏷️");
    setCustomColor("#808080");
  };

  // Categories Creation (Step 3)
  const handleCreateCategories = async () => {
    setLoading(true);
    try {
      const allCats = [...selectedCategories];

      for (const cat of allCats) {
        await api.createCategory({
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
        });
      }
      setStep(4);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAllSet = () => {
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {step === 0 && (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Welcome!
              </CardTitle>
              <CardDescription>
                Let's get you set up. First, tell us a bit about you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email (Optional)</label>
                <Input
                  placeholder="you@example.com"
                  value={userData.email}
                  onChange={(e) =>
                    setUserData({ ...userData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select
                  autoComplete="off"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={userData.currency}
                  onChange={(e) =>
                    setUserData({ ...userData, currency: e.target.value })
                  }
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <Button
                className="w-full mt-4"
                onClick={handleCreateUser}
                disabled={loading}
              >
                {loading ? "Creating..." : "Start Setup"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Create Accounts</CardTitle>
              <CardDescription>
                Select the accounts you want to start with.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {["Cash", "Bank", "Paypal", "Zelle"].map((acc) => (
                  <div
                    key={acc}
                    onClick={() => {
                      if (selectedAccounts.includes(acc)) {
                        setSelectedAccounts(
                          selectedAccounts.filter((a) => a !== acc),
                        );
                      } else {
                        setSelectedAccounts([...selectedAccounts, acc]);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${selectedAccounts.includes(acc) ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`}
                  >
                    {acc === "Cash" && <Wallet className="h-6 w-6" />}
                    {acc === "Bank" && <Building className="h-6 w-6" />}
                    {(acc === "Paypal" || acc === "Zelle") && (
                      <CreditCard className="h-6 w-6" />
                    )}
                    <span className="font-medium">{acc}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedAccounts(["Cash"])}
                  className="text-muted-foreground"
                >
                  Only Cash
                </Button>
                <Button
                  onClick={handleCreateAccounts}
                  disabled={loading || selectedAccounts.length === 0}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Add Persons</CardTitle>
              <CardDescription>
                Add people you frequently interact with financially (Partners,
                Kids, etc.). You can skip this.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={newPerson}
                  onChange={(e) => setNewPerson(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPerson) {
                      setPersons([...persons, newPerson]);
                      setNewPerson("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newPerson) {
                      setPersons([...persons, newPerson]);
                      setNewPerson("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {persons.map((p, i) => (
                  <div
                    key={i}
                    className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    <span>{p}</span>
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() =>
                        setPersons(persons.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                ))}
                {persons.length === 0 && (
                  <span className="text-muted-foreground text-sm italic">
                    No extra persons added.
                  </span>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleCreatePersons} disabled={loading}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Select Categories</CardTitle>
              <CardDescription>
                Choose some starting categories or add your own.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {defaultCategories.map((cat) => {
                  const isSelected = selectedCategories.some(
                    (c) => c.name === cat.name,
                  );
                  return (
                    <div
                      key={cat.name}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategories(
                            selectedCategories.filter(
                              (c) => c.name !== cat.name,
                            ),
                          );
                        } else {
                          setSelectedCategories([...selectedCategories, cat]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full cursor-pointer border transition-colors flex items-center gap-2 ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-input"}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-3 block">
                  Add Custom Category
                </label>
                <div className="grid gap-3">
                  <div className="flex gap-2">
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-12 h-10 px-0"
                        ref={emojiButtonRef}
                        onClick={() => {
                          if (emojiButtonRef.current) {
                            const rect =
                              emojiButtonRef.current.getBoundingClientRect();
                            setPickerPosition({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                            });
                          }
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                      >
                        {customIcon}
                      </Button>
                      {showEmojiPicker &&
                        createPortal(
                          <div
                            className="fixed inset-0 z-[9999]"
                            onClick={(e) => {
                              if (e.target === e.currentTarget)
                                setShowEmojiPicker(false);
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: pickerPosition.top + 5,
                                left: pickerPosition.left,
                                zIndex: 10000,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EmojiPicker
                                onEmojiClick={(emojiObject) => {
                                  setCustomIcon(emojiObject.emoji);
                                  setShowEmojiPicker(false);
                                }}
                              />
                            </div>
                          </div>,
                          document.body,
                        )}
                    </div>
                    <Input
                      placeholder="Category Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      autoComplete="off"
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                    >
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                    <Input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <Button
                      variant="secondary"
                      onClick={handleAddCustomCategory}
                      disabled={!customName}
                      className="flex-1"
                    >
                      Add Custom
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleCreateCategories}
                  disabled={loading || selectedCategories.length === 0}
                >
                  Create & Finish
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-primary/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center text-primary">
              <Check className="h-12 w-12" />
            </div>
            <h1 className="text-4xl font-bold">All Set!</h1>
            <p className="text-xl text-muted-foreground">
              Your finance journey begins now.
            </p>
            <Button size="lg" className="mt-8 px-8" onClick={handleAllSet}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
