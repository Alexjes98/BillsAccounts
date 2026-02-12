import { useState } from "react";
import { Category } from "@/api/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X } from "lucide-react";

interface CategorySelectorProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  onCreate: (name: string, type: "INCOME" | "EXPENSE") => Promise<void>;
}

export function CategorySelector({
  categories,
  value,
  onChange,
  onCreate,
}: CategorySelectorProps) {
  const [creatingType, setCreatingType] = useState<"INCOME" | "EXPENSE" | null>(
    null,
  );
  const [newCategoryName, setNewCategoryName] = useState("");

  // Group categories
  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  const handleStartCreate = (type: "INCOME" | "EXPENSE") => {
    setCreatingType(type);
    setNewCategoryName("");
  };

  const handleCancelCreate = () => {
    setCreatingType(null);
    setNewCategoryName("");
  };

  const handleSubmitCreate = async () => {
    if (!newCategoryName.trim() || !creatingType) return;

    try {
      await onCreate(newCategoryName, creatingType);

      // Show toast notification
      // Note: We'll need to use a toast hook here or pass a callback for it
      // For now, we'll rely on the parent component or a simple alert if toast isn't available
      // But looking at the plan, we said "Display a message".
      // I'll add a simple inline message or use window.alert temporarily if no toast system is visible.
      // Wait, there is no toast system visible in the file list I saw.
      // I'll use a temporary visual indicator or assume usage of a global toast if it exists.
      // Checking imports in other files... FreeTransactionsPage uses `alert` in one catch block.
      // I will implement a custom small notification or use `alert` for now as agreed.
      // Actually, the plan says "Display a message: Category created!...", I can emit an event or return success.

      alert(
        "Category created! You can change the emoji in the Categories page.",
      );

      handleCancelCreate();
    } catch (error) {
      console.error("Failed to create category", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission if inside a form
      handleSubmitCreate();
    } else if (e.key === "Escape") {
      handleCancelCreate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Income Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Income
        </label>
        <div className="flex overflow-x-auto p-2 gap-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-200">
          {incomeCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onChange(category.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full border whitespace-nowrap transition-colors
                ${
                  value === category.id
                    ? "bg-green-100 border-green-500 text-green-700 ring-1 ring-green-500"
                    : "bg-background border-input hover:bg-accent/50"
                }
              `}
              type="button"
            >
              <span>{category.icon}</span>
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}

          {creatingType === "INCOME" ? (
            <div className="flex items-center gap-1 min-w-[200px]">
              <Input
                autoFocus
                placeholder="New Income..."
                className="h-9 text-sm"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleSubmitCreate}
                type="button"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleCancelCreate}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="rounded-full border-dashed border-muted-foreground/50 text-muted-foreground hover:border-green-500 hover:text-green-600"
              onClick={() => handleStartCreate("INCOME")}
              type="button"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Expense Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Expense
        </label>
        <div className="flex overflow-x-auto p-2 gap-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-200">
          {expenseCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onChange(category.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full border whitespace-nowrap transition-colors
                ${
                  value === category.id
                    ? "bg-red-100 border-red-500 text-red-700 ring-1 ring-red-500"
                    : "bg-background border-input hover:bg-accent/50"
                }
              `}
              type="button"
            >
              <span>{category.icon}</span>
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}

          {creatingType === "EXPENSE" ? (
            <div className="flex items-center gap-1 min-w-[200px]">
              <Input
                autoFocus
                placeholder="New Expense..."
                className="h-9 text-sm"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleSubmitCreate}
                type="button"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleCancelCreate}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="rounded-full border-dashed border-muted-foreground/50 text-muted-foreground hover:border-red-500 hover:text-red-600"
              onClick={() => handleStartCreate("EXPENSE")}
              type="button"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
