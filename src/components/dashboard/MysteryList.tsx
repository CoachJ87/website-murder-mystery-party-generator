
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import MysteryCard from "./MysteryCard";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Mystery } from "@/interfaces/mystery";

interface Message {
  id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}

interface MysteryListProps {
  mysteries: Mystery[];
  isLoading: boolean;
  onRefresh: () => void;
}

const MysteryList = ({ mysteries, isLoading, onRefresh }: MysteryListProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filtered mysteries based on search query
  const filteredMysteries = useMemo(() => {
    if (!searchQuery.trim()) return mysteries;
    
    const query = searchQuery.toLowerCase();
    return mysteries.filter(mystery => {
      // Search in title
      if (mystery.title?.toLowerCase().includes(query)) return true;
      
      // Search in mystery data
      if (mystery.mystery_data?.theme?.toLowerCase().includes(query)) return true;
      
      // Search in messages
      if (mystery.messages?.some(msg => msg.content?.toLowerCase().includes(query))) return true;
      
      return false;
    });
  }, [mysteries, searchQuery]);

  // Handle mystery deletion
  const handleDeleteMystery = async (mysteryId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ display_status: "archived" })
        .eq("id", mysteryId);
      
      if (error) {
        throw error;
      }
      
      toast.success("Mystery moved to archive");
      onRefresh();
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error("Failed to archive mystery");
    }
  };

  // Handle editing a mystery
  const handleEditMystery = (mysteryId: string) => {
    navigate(`/mystery/${mysteryId}`);
  };

  // Handle viewing a mystery
  const handleViewMystery = (mysteryId: string) => {
    navigate(`/mystery/${mysteryId}`);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search mysteries..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMysteries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMysteries.map((mystery) => (
            <MysteryCard
              key={mystery.id}
              mystery={{
                ...mystery,
                is_completed: mystery.is_completed || false
              }}
              onView={() => handleViewMystery(mystery.id)}
              onEdit={() => handleEditMystery(mystery.id)}
              onDelete={() => handleDeleteMystery(mystery.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {mysteries.length > 0
              ? "No mysteries match your search"
              : "You haven't created any mysteries yet"}
          </p>
          <Button onClick={() => navigate("/mystery/new")}>Create Your First Mystery</Button>
        </div>
      )}
      
      {filteredMysteries.length > 0 && filteredMysteries.length < mysteries.length && (
        <div className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Showing {filteredMysteries.length} of {mysteries.length} mysteries
          </p>
        </div>
      )}
    </div>
  );
};

export default MysteryList;
