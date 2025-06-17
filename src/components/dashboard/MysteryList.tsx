
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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  
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
      
      toast.success(t("dashboard.mysteries.deleteSuccess"));
      onRefresh();
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error(t("dashboard.mysteries.deleteFailed"));
    }
  };

  // Handle editing a mystery - navigate directly to chat interface
  const handleEditMystery = (mysteryId: string) => {
    navigate(`/mystery/edit/${mysteryId}`);
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
          placeholder={t("dashboard.mysteries.searchPlaceholder")}
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
                id: mystery.id,
                title: mystery.title,
                mystery_data: mystery.mystery_data || {},
                display_status: mystery.display_status || mystery.status,
                created_at: mystery.created_at,
                is_completed: Boolean(mystery.is_completed)
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
              ? t("dashboard.mysteries.empty.searchResult")
              : t("dashboard.welcome.noMysteries")}
          </p>
          <Button onClick={() => navigate("/mystery/new")}>{t("dashboard.buttons.createFirstMystery")}</Button>
        </div>
      )}
      
      {filteredMysteries.length > 0 && filteredMysteries.length < mysteries.length && (
        <div className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t("dashboard.mysteries.showingCount", { count: filteredMysteries.length, total: mysteries.length })}
          </p>
        </div>
      )}
    </div>
  );
};

export default MysteryList;
