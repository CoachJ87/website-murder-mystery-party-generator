
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
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            Drafts
            <Badge variant="secondary" className="ml-1">{counts.draft}</Badge>
          </TabsTrigger>
          <TabsTrigger value="purchased" className="flex items-center gap-2">
            Purchased
            <Badge variant="secondary" className="ml-1">{counts.purchased}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            Archived
            <Badge variant="secondary" className="ml-1">{counts.archived}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
