
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Eye, CheckCircle2, MoreVertical, Archive, Trash2 } from "lucide-react";
import { Mystery } from "@/interfaces/mystery";
import { formatRelativeTime } from "@/utils/formatDate";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface HomeMysteryCardProps {
  mystery: Mystery;
  onViewMystery: (id: string) => void;
  onMysteryUpdated?: () => void;
}

export function HomeMysteryCard({ mystery, onViewMystery, onMysteryUpdated }: HomeMysteryCardProps) {
  const isPurchased = mystery.status === "purchased" || mystery.is_purchased === true;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Truncate title if longer than 40 characters
  const displayTitle = mystery.title && mystery.title.length > 40 
    ? `${mystery.title.substring(0, 40)}...` 
    : mystery.title;

  const handleArchiveMystery = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from("conversations")
        .update({
          display_status: "archived",
          updated_at: new Date().toISOString()
        })
        .eq("id", mystery.id);

      if (error) {
        throw error;
      }

      toast.success("Mystery archived successfully");
      if (onMysteryUpdated) {
        onMysteryUpdated();
      }
    } catch (error) {
      console.error("Error archiving mystery:", error);
      toast.error("Failed to archive mystery");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteMystery = async () => {
    setIsLoading(true);
    
    try {
      // First delete all messages associated with the conversation
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", mystery.id);

      if (messagesError) {
        throw messagesError;
      }

      // Then delete the conversation itself
      const { error: conversationError } = await supabase
        .from("conversations")
        .delete()
        .eq("id", mystery.id);

      if (conversationError) {
        throw conversationError;
      }

      toast.success("Mystery deleted successfully");
      if (onMysteryUpdated) {
        onMysteryUpdated();
      }
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error("Failed to delete mystery");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };
  
  return (
    <>
      <Card 
        className={`${isPurchased ? "border-primary border-2" : ""} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => onViewMystery(mystery.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              {isPurchased ? (
                <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full inline-flex items-center whitespace-nowrap">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Purchased
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full inline-flex items-center whitespace-nowrap">
                  Draft
                </span>
              )}
            </div>
            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveMystery(e);
                    }}
                    disabled={isLoading}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive focus:text-destructive"
                    disabled={isLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardTitle className="mt-2">
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Edited {formatRelativeTime(mystery.updated_at)}
          </p>
          
          <Button 
            size="sm" 
            variant={isPurchased ? "default" : "secondary"}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onViewMystery(mystery.id);
            }}
          >
            {isPurchased ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                View Mystery
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit Mystery
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this mystery and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteMystery();
              }}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
