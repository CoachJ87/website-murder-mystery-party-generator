import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, Edit, Archive, Trash, Eye } from "lucide-react";
import { Mystery } from "@/interfaces/mystery";

interface MysteryCardProps {
  mystery: Mystery;
  onStatusChange: (id: string, status: "draft" | "purchased" | "archived") => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export const MysteryCard = ({ mystery, onStatusChange, onDelete, onEdit }: MysteryCardProps) => {
  const isPurchased = mystery.status === "purchased" || mystery.is_purchased;

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex justify-between items-start gap-2">
          <span className="truncate">{mystery.title}</span>
          <div>
            {mystery.status === "draft" && <Badge variant="secondary">Draft</Badge>}
            {mystery.status === "purchased" && <Badge>Purchased</Badge>}
            {mystery.status === "archived" && <Badge variant="outline">Archived</Badge>}
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
        
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => isPurchased ? window.location.href = `/mystery/view/${mystery.id}` : onEdit(mystery.id)}
            className="flex-1 min-w-[80px]"
          >
            {isPurchased ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                View
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
          {mystery.status !== "archived" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(mystery.id, "archived")}
              className="flex-1 min-w-[80px]"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(mystery.id, "draft")}
              className="flex-1 min-w-[80px]"
            >
              <Edit className="h-4 w-4 mr-2" />
              Unarchive
            </Button>
          )}
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
        </div>
      </CardContent>
    </Card>
  );
};
