
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, MoreVertical, CheckCircle2, Archive, Trash2 } from "lucide-react";
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
  const isPurchased = mystery.display_status === 'purchased';
  
  const truncateTitle = (title: string, maxLength: number = 80) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  const handleAction = () => {
    if (isPurchased) {
      onView(mystery.id);
    } else {
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
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        {/* Top Row: Status Badge and Three Dots Menu */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={isPurchased ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {isPurchased && <CheckCircle2 className="h-3 w-3" />}
            {isPurchased ? "Purchased" : "Draft"}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
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
            Edited {formatDate(mystery.created_at)}
          </p>
          
          <Button
            onClick={handleAction}
            className="w-full"
            variant={isPurchased ? "default" : "outline"}
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
        </div>
      </CardContent>
    </Card>
  );
}
