
import { Mystery } from "@/interfaces/mystery";
import { MysteryCard } from "./MysteryCard";

interface MysteryListProps {
  mysteries: Mystery[];
  onStatusChange: (id: string, status: "draft" | "purchased" | "archived") => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  loading: boolean;
}

export const MysteryList = ({ mysteries, onStatusChange, onDelete, onEdit, loading }: MysteryListProps) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Loading mysteries...</p>
      </div>
    );
  }

  if (mysteries.length === 0) {
    return (
      <div className="text-center py-8">
        <p>No mysteries found. Try changing your filters or create a new mystery.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mysteries.map((mystery) => (
        <MysteryCard
          key={mystery.id}
          mystery={mystery}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};
