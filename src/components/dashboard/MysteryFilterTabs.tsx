
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface MysteryFilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    all: number;
    draft: number;
    purchased: number;
    archived: number;
  };
}

export function MysteryFilterTabs({
  activeTab,
  onTabChange,
  counts
}: MysteryFilterTabsProps) {
  return (
    <div className="mb-6">
      <Tabs defaultValue={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">
            All <Badge variant="outline" className="ml-2">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts <Badge variant="outline" className="ml-2">{counts.draft}</Badge>
          </TabsTrigger>
          <TabsTrigger value="purchased">
            Purchased <Badge variant="outline" className="ml-2">{counts.purchased}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived <Badge variant="outline" className="ml-2">{counts.archived}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
