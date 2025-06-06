
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Edit, MoreVertical, CheckCircle2, Archive, Trash2, Clock } from "lucide-react";
import { formatDate } from "@/utils/formatDate";

interface HomeMysteryCardProps {
  mystery: {
    id: string;
    title: string;
    mystery_data: any;
    display_status: string;
    created_at: string;
    is_completed: boolean;
  };
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function HomeMysteryCard({ mystery, onView, onEdit, onArchive, onDelete }: HomeMysteryCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isPurchased = mystery.display_status === 'purchased';
  const isGenerating = mystery.display_status === 'generating';
  
  const truncateTitle = (title: string, maxLength: number = 80) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  const handleAction = () => {
    if (isPurchased || isGenerating) {
      onView(mystery.id);
    } else {
      // Navigate directly to chat interface for editing existing mysteries
      onEdit(mystery.id);
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive(mystery.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(mystery.id);
    }
    setDeleteDialogOpen(false);
  };

  const getStatusBadge = () => {
    if (isGenerating) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-1">
          <Clock className="h-3 w-3 animate-pulse" />
          <span className="hidden sm:inline">Generating...</span>
          <span className="sm:hidden">Gen...</span>
        </Badge>
      );
    } else if (isPurchased) {
      return (
        <Badge variant="default" className="flex items-center gap-1 text-xs px-2 py-1">
          <CheckCircle2 className="h-3 w-3" />
          <span className="hidden sm:inline">Purchased</span>
          <span className="sm:hidden">Bought</span>
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-xs px-2 py-1">
          Draft
        </Badge>
      );
    }
  };

  const getActionButton = () => {
    if (isGenerating) {
      return (
        <Button onClick={handleAction} className="w-full min-h-[44px] text-sm" variant="outline">
          <Clock className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">View Progress</span>
          <span className="sm:hidden">Progress</span>
        </Button>
      );
    } else if (isPurchased) {
      return (
        <Button onClick={handleAction} className="w-full min-h-[44px] text-sm" variant="default">
          <Eye className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">View Mystery</span>
          <span className="sm:hidden">View</span>
        </Button>
      );
    } else {
      return (
        <Button onClick={handleAction} className="w-full min-h-[44px] text-sm" variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Edit Mystery</span>
          <span className="sm:hidden">Edit</span>
        </Button>
      );
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        {/* Top Row: Status Badge and Three Dots Menu */}
        <div className="flex items-center justify-between gap-2">
          {getStatusBadge()}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {!isGenerating && (
                <DropdownMenuItem onClick={handleArchive} className="min-h-[44px]">
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600 min-h-[44px]">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Second Row: Mystery Title */}
        <div className="mt-2">
          <h3 className="text-base sm:text-lg font-semibold leading-tight line-clamp-3">
            {truncateTitle(mystery.title)}
          </h3>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Bottom Section */}
        <div className="space-y-3 flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground flex-1">
            {isGenerating ? "Generation in progress..." : `Edited ${formatDate(mystery.created_at)}`}
          </p>
          
          <div className="mt-auto">
            {getActionButton()}
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Mystery</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete this mystery? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px] w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px] w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
