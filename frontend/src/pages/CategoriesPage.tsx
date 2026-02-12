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

  const [editingCategory, setEditingCategory] = useState<Category | undefined>(
    undefined,
  );

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

  const handleCategorySaved = () => {
    setIsModalOpen(false);
    setEditingCategory(undefined);
    fetchData();
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (
      !window.confirm(`Are you sure you want to delete "${category.name}"?`)
    ) {
      return;
    }
    try {
      await api.deleteCategory(category.id);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          err.message ||
          "Failed to delete category.",
      );
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(undefined);
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
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={() => handleEdit(category)}
                onDelete={() => handleDelete(category)}
              />
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
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={() => handleEdit(category)}
                onDelete={() => handleDelete(category)}
              />
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
        onClose={handleCloseModal}
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <CategoryForm
          onSuccess={handleCategorySaved}
          onCancel={handleCloseModal}
          category={editingCategory}
        />
      </Modal>
    </div>
  );
}

import { Pencil, Trash2 } from "lucide-react";

function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-3xl shadow-sm"
            style={{ backgroundColor: category.color || "#f0f0f0" }}
          >
            {category.icon || (category.type === "INCOME" ? "💰" : "💸")}
          </div>
          <div>
            <div className="font-semibold">{category.name}</div>
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
