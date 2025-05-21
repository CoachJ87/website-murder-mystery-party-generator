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
  return <div className="mb-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        
      </Tabs>
    </div>;
}