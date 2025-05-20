
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
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 min-h-[3rem]">
            {mystery.title}
          </CardTitle>
          <div className="shrink-0">
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
        </div>
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
  );
}
