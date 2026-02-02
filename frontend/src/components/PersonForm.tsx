import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePersonPayload, Person } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";

export function PersonForm({
  onSuccess,
  onCancel,
  initialData,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Person;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [contactInfo, setContactInfo] = useState(
    initialData?.contact_info || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!name) {
      setError("Name is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreatePersonPayload = {
        name,
        contact_info: contactInfo || undefined,
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
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
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
