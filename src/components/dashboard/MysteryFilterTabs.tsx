
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

export function MysteryFilterTabs({ activeTab, onTabChange, counts }: MysteryFilterTabsProps) {
  return (
    <div className="mb-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-2">
          <TabsTrigger value="all" className="relative whitespace-nowrap">
            All Mysteries
            {counts.all > 0 && (
              <Badge variant="secondary" className="ml-2">
                {counts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="draft" className="relative whitespace-nowrap">
            Drafts
            {counts.draft > 0 && (
              <Badge variant="secondary" className="ml-2">
                {counts.draft}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="purchased" className="relative whitespace-nowrap">
            Purchased
            {counts.purchased > 0 && (
              <Badge variant="secondary" className="ml-2">
                {counts.purchased}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="relative whitespace-nowrap">
            Archived
            {counts.archived > 0 && (
              <Badge variant="secondary" className="ml-2">
                {counts.archived}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
