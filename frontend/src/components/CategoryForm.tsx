import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category, CategoryCreate } from "@/api/repository";
import { useApi } from "@/context/ApiContext";
import EmojiPicker from "emoji-picker-react";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(["EXPENSE", "INCOME"]),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  category?: Category;
}

export function CategoryForm({
  onSuccess,
  onCancel,
  category,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    type: "EXPENSE",
    icon: "",
    color: "#e5e7eb",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const api = useApi();

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type as "EXPENSE" | "INCOME",
        icon: category.icon || "",
        color: category.color || "#e5e7eb",
      });
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const validation = categorySchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CategoryCreate = {
        name: formData.name,
        type: formData.type,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      };

      if (category) {
        await api.updateCategory(category.id, payload);
      } else {
        await api.createCategory(payload);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          `Failed to ${category ? "update" : "create"} category.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name *
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Groceries"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="type" className="text-sm font-medium">
          Type
        </label>
        <select
          autoComplete="off"
          id="type"
          value={formData.type}
          onChange={(e) =>
            setFormData({
              ...formData,
              type: e.target.value as "EXPENSE" | "INCOME",
            })
          }
          disabled={!!category}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 relative">
          <label htmlFor="icon" className="text-sm font-medium">
            Icon (Emoji)
          </label>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-12 h-10 px-0 text-lg"
              ref={emojiButtonRef}
              onClick={() => {
                if (emojiButtonRef.current) {
                  const rect = emojiButtonRef.current.getBoundingClientRect();
                  setPickerPosition({
                    top: rect.bottom + window.scrollY - 200,
                    left: rect.left + window.scrollX,
                  });
                }
                setShowEmojiPicker(!showEmojiPicker);
              }}
            >
              {formData.icon || "😀"}
            </Button>
          </div>
          {showEmojiPicker &&
            createPortal(
              <>
                <div
                  className="fixed inset-0 z-[99]"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: pickerPosition.top,
                    left: pickerPosition.left,
                    zIndex: 100,
                  }}
                >
                  <EmojiPicker
                    onEmojiClick={(emojiObject) => {
                      setFormData({ ...formData, icon: emojiObject.emoji });
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              </>,
              document.body,
            )}
        </div>

        <div className="space-y-2">
          <label htmlFor="color" className="text-sm font-medium">
            Color
          </label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="h-10 w-12 p-1 cursor-pointer flex-none"
            />
            <Input
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="flex-1"
              placeholder="#RRGGBB"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? category
              ? "Updating..."
              : "Creating..."
            : category
              ? "Save Changes"
              : "Add"}
        </Button>
      </div>
    </form>
  );
}
