
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
  displayCounts?: boolean;
}

export function MysteryFilterTabs({
  activeTab,
  onTabChange,
  counts,
  displayCounts = true
}: MysteryFilterTabsProps) {
  return (
    <div className="mb-6">
      <Tabs defaultValue={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            All
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.all}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex-1">
            Draft
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.draft}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="purchased" className="flex-1">
            Purchased
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.purchased}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex-1">
            Archived
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.archived}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
