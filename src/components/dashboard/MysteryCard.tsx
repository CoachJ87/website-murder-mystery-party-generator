
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, Edit, Trash2, Users, Calendar } from "lucide-react";
import { formatDate } from "@/utils/formatDate";

interface MysteryCardProps {
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
  onDelete: (id: string) => void;
}

export default function MysteryCard({ mystery, onView, onEdit, onDelete }: MysteryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'purchased': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'draft': return 'Draft';
      case 'purchased': return 'Purchased';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-2">
            {mystery.title}
          </CardTitle>
          <Badge className={getStatusColor(mystery.display_status)}>
            {getStatusText(mystery.display_status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {mystery.mystery_data?.playerCount && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{mystery.mystery_data.playerCount} players</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(mystery.created_at)}</span>
          </div>
        </div>
        
        {mystery.mystery_data?.theme && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            Theme: {mystery.mystery_data.theme}
          </p>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(mystery.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(mystery.id)}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(mystery.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
