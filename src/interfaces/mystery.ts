
export interface MysteryData {
  title: string;
  theme?: string;
  playerCount?: number;
  hasAccomplice?: boolean;
  scriptType?: 'full' | 'summary';
  additionalDetails?: string;
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
}
