import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePersonPayload, Person } from "@/api/repository";
import { useApi } from "@/context/ApiContext";
import { z } from "zod";

const personSchema = z.object({
  name: z.string().min(1, "Name is required."),
  contactInfo: z.string().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

export function PersonForm({
  onSuccess,
  onCancel,
  initialData,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Person;
}) {
  const [formData, setFormData] = useState<PersonFormData>({
    name: initialData?.name || "",
    contactInfo: initialData?.contact_info || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const validation = personSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreatePersonPayload = {
        name: formData.name,
        contact_info: formData.contactInfo || undefined,
      };

      if (initialData) {
        await api.updatePerson(initialData.id, payload);
      } else {
        await api.createPerson(payload);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to save person.");
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
          placeholder="e.g. John Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="contactInfo" className="text-sm font-medium">
          Contact Info
        </label>
        <Input
          id="contactInfo"
          value={formData.contactInfo}
          onChange={(e) =>
            setFormData({ ...formData, contactInfo: e.target.value })
          }
          placeholder="e.g. email@example.com or +123456789"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );
}
