import { useEffect, useState } from "react";
import { PersonCard } from "@/components/PersonCard";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PersonForm } from "@/components/PersonForm";
import { Person } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";

export function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const api = useApi();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete confirmation state
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit state
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(
    undefined,
  );

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPersons();
      setPersons(data);
      // Clear specific error only if successful, or keep it if it was a delete error?
      // Assuming global error state is for page load mainly.
      if (error && !error.includes("delete")) {
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load persons.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePersonCreated = () => {
    setIsModalOpen(false);
    setEditingPerson(undefined);
    fetchData();
  };

  const handleEditClick = (person: Person) => {
    setEditingPerson(person);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (person: Person) => {
    setPersonToDelete(person);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!personToDelete) return;
    try {
      // 1. Check for active Debts
      const allDebts = await api.getDebts();
      const activeDebts = allDebts.filter(
        (d) =>
          (d.creditor_id === personToDelete.id ||
            d.debtor_id === personToDelete.id) &&
          !d.is_settled &&
          !d.deleted_at,
      );

      if (activeDebts.length > 0) {
        // Prevent deletion
        setIsDeleteModalOpen(false);
        setError(
          `Cannot delete ${personToDelete.name}. They have active debts or liability/asset accounts. Please settle them first.`,
        );
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
        return;
      }

      await api.deletePerson(personToDelete.id);
      setIsDeleteModalOpen(false);
      setPersonToDelete(null);
      setError(null); // Clear any previous errors
      fetchData();
    } catch (err: any) {
      console.error(err);
      setIsDeleteModalOpen(false);
      // Show error message for deletion failure
      setError(err.response?.data?.error || "Failed to delete person.");

      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  if (isLoading && persons.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Persons</h1>
        <Button
          onClick={() => {
            setEditingPerson(undefined);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Person
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {persons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No persons found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {persons.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPerson(undefined);
        }}
        title={editingPerson ? "Edit Person" : "Add Person"}
      >
        <PersonForm
          initialData={editingPerson}
          onSuccess={handlePersonCreated}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingPerson(undefined);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal - Using simple composition or repurposing Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Person"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete{" "}
            <strong>{personToDelete?.name}</strong>? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
