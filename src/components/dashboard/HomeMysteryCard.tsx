
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
        <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          <Clock className="h-3 w-3 animate-pulse" />
          Generating...
        </Badge>
      );
    } else if (isPurchased) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Purchased
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          Draft
        </Badge>
      );
    }
  };

  const getActionButton = () => {
    if (isGenerating) {
      return (
        <Button onClick={handleAction} className="w-full" variant="outline">
          <Clock className="h-4 w-4 mr-2" />
          View Progress
        </Button>
      );
    } else if (isPurchased) {
      return (
        <Button onClick={handleAction} className="w-full" variant="default">
          <Eye className="h-4 w-4 mr-2" />
          View Mystery
        </Button>
      );
    } else {
      return (
        <Button onClick={handleAction} className="w-full" variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Mystery
        </Button>
      );
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        {/* Top Row: Status Badge and Three Dots Menu */}
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {!isGenerating && (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Second Row: Mystery Title */}
        <div className="mt-3">
          <h3 className="text-lg font-semibold leading-tight">
            {truncateTitle(mystery.title)}
          </h3>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Bottom Section */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isGenerating ? "Generation in progress..." : `Edited ${formatDate(mystery.created_at)}`}
          </p>
          
          {getActionButton()}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mystery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mystery? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
