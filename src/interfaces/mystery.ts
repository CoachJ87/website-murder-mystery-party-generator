
export interface MysteryData {
  title: string;
  theme?: string;
  playerCount?: number;
  hasAccomplice?: boolean;
  scriptType?: 'full' | 'pointForm';
  additionalDetails?: string;
  status?: 'draft' | 'published' | 'archived';
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
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id?: string;
  content: string;
  role: "user" | "assistant";
  created_at?: string;
  timestamp?: Date;
  is_ai?: boolean;
}

export interface Mystery {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "published" | "archived";
  theme?: string;
  guests?: number;
  is_purchased?: boolean;
}
