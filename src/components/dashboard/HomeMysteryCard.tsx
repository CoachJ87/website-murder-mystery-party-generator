
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Eye, CheckCircle2 } from "lucide-react";
import { Mystery } from "@/interfaces/mystery";
import { formatRelativeTime } from "@/utils/formatDate";

interface HomeMysteryCardProps {
  mystery: Mystery;
  onViewMystery: (id: string) => void;
}

export function HomeMysteryCard({ mystery, onViewMystery }: HomeMysteryCardProps) {
  const isPurchased = mystery.status === "purchased" || mystery.is_purchased === true;
  
  return (
    <Card 
      className={`${isPurchased ? "border-primary border-2" : ""} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onViewMystery(mystery.id)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-start gap-2 line-clamp-2 min-h-[3rem]">
          <span>{mystery.title}</span>
          {isPurchased ? (
            <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full shrink-0">
              <CheckCircle2 className="h-3 w-3 inline-block mr-1" />
              Purchased
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full shrink-0">
              Draft
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Edited {formatRelativeTime(mystery.updated_at)}
        </p>
        
        {mystery.guests && (
          <p className="text-sm text-muted-foreground mb-4">
            Players: {mystery.guests}
          </p>
        )}
        
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
  );
}
