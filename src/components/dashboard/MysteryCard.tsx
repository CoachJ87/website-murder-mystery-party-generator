
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, Edit, Archive, Trash, Eye, CheckCircle2 } from "lucide-react";
import { Mystery } from "@/interfaces/mystery";
import { toast } from "@/hooks/use-toast";

interface MysteryCardProps {
  mystery: Mystery;
  onStatusChange: (id: string, status: "draft" | "purchased" | "archived") => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export const MysteryCard = ({ mystery, onStatusChange, onDelete, onEdit }: MysteryCardProps) => {
  // Check multiple status indicators for purchase status
  const isPurchased = mystery.status === "purchased" || 
                      mystery.is_purchased === true;

  // Handle navigation with error handling
  const handleViewMystery = () => {
    try {
      // Check if the mystery has a complete package first
      if (mystery.has_complete_package) {
        window.location.href = `/mystery/${mystery.id}`;
      } else {
        // If no complete package, go to the preview/generation page
        window.location.href = `/mystery/preview/${mystery.id}`;
        toast({
          title: "Package generation required",
          description: "Your mystery needs to be generated first before viewing the full package.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast({
        title: "Navigation error",
        description: "There was a problem navigating to your mystery. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={`${isPurchased ? "border-primary border-2" : ""}`}>
      <CardHeader>
        <CardTitle className="flex justify-between items-start gap-2">
          <span className="truncate">{mystery.title}</span>
          <div>
            {isPurchased ? (
              <Badge variant="default" className="bg-primary font-semibold">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Purchased
              </Badge>
            ) : mystery.status === "archived" ? (
              <Badge variant="outline">Archived</Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Calendar className="inline-block h-4 w-4 mr-1" />
          Created: {new Date(mystery.created_at).toLocaleDateString()}
        </p>
        <p className="text-sm text-muted-foreground">
          <Clock className="inline-block h-4 w-4 mr-1" />
          Updated: {new Date(mystery.updated_at).toLocaleDateString()}
        </p>
        {mystery.theme && (
          <p className="text-sm text-muted-foreground truncate">
            Theme: {mystery.theme}
          </p>
        )}
        {mystery.guests && (
          <p className="text-sm text-muted-foreground">
            Guests: {mystery.guests}
          </p>
        )}
        {mystery.purchase_date && (
          <p className="text-sm text-primary-foreground font-medium">
            <CheckCircle2 className="inline-block h-4 w-4 mr-1 text-primary" />
            Purchased: {new Date(mystery.purchase_date).toLocaleDateString()}
          </p>
        )}
        
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {/* For purchased mysteries */}
          {isPurchased ? (
            <>
              {/* Delete button on left */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex-1 min-w-[80px]"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your mystery from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(mystery.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {/* Archive button on right */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(mystery.id, "archived")}
                className="flex-1 min-w-[80px]"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              
              {/* View Mystery button at the bottom (full width) */}
              <Button
                size="sm"
                variant="default"
                onClick={handleViewMystery}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Mystery
              </Button>
            </>
          ) : mystery.status === "archived" ? (
            <>
              {/* For archived mysteries - delete on left, unarchive on right */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex-1 min-w-[80px]"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your mystery from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(mystery.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {/* Unarchive button on right */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(mystery.id, "draft")}
                className="flex-1 min-w-[80px]"
              >
                <Edit className="h-4 w-4 mr-2" />
                Unarchive
              </Button>
            </>
          ) : (
            <>
              {/* For draft mysteries */}
              {/* Delete button on left */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex-1 min-w-[80px]"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your mystery from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(mystery.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {/* Archive button on right */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(mystery.id, "archived")}
                className="flex-1 min-w-[80px]"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              
              {/* Edit button at the bottom (full width) */}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onEdit(mystery.id)}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
