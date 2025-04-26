
export interface MysteryData {
  title?: string; // Making title optional to fix the type error
  theme?: string;
  playerCount?: number;
  hasAccomplice?: boolean;
  scriptType?: 'full' | 'summary';
  additionalDetails?: string;
  status?: "draft" | "purchased" | "archived";
  [key: string]: any;  // Allow for additional properties
}

export interface Conversation {
  id: string;
  title: string;
  mystery_data: MysteryData;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_completed?: boolean;
  is_paid?: boolean;
  mystery_id?: string;
  prompt_version?: string;
  messages?: any[];
  theme?: string;
  premise?: string;
  purchase_date?: string;
  is_purchased?: boolean;
  display_status?: "draft" | "purchased" | "archived";
}

export interface Mystery {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "purchased" | "archived";
  theme?: string;
  guests?: number;
  is_purchased?: boolean;
  is_paid?: boolean;  // Added this property to match what's being used in MysteryCard
  ai_title?: string;
  premise?: string;
}
