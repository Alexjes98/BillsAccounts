import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CategoryForm } from "@/components/CategoryForm";
import { Category } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";
import { Card, CardContent } from "@/components/ui/card";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const api = useApi();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCategoryCreated = () => {
    setIsModalOpen(false);
    fetchData();
  };

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Income</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {incomeCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
            {incomeCategories.length === 0 && (
              <p className="text-muted-foreground italic">
                No income categories.
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Expenses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {expenseCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
            {expenseCategories.length === 0 && (
              <p className="text-muted-foreground italic">
                No expense categories.
              </p>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Category"
      >
        <CategoryForm
          onSuccess={handleCategoryCreated}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
            style={{ backgroundColor: category.color || "#f0f0f0" }}
          >
            {category.icon || (category.type === "INCOME" ? "💰" : "💸")}
          </div>
          <div>
            <div className="font-semibold">{category.name}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
