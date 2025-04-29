// src/interfaces/mystery.ts
// Add these interfaces if they don't already exist

export interface MysteryData {
  title?: string;
  theme?: string;
  playerCount?: number;
  hasAccomplice?: boolean;
  scriptType?: 'full' | 'summary';
  additionalDetails?: string;
  status?: "draft" | "purchased" | "archived";
  [key: string]: any;
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
  has_complete_package?: boolean;
  needs_package_generation?: boolean;
  package_generated_at?: string;
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
  ai_title?: string;
  premise?: string;
  package_generation_status?: {
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    currentStep: string;
    sections?: {
      hostGuide: boolean;
      characters: boolean;
      clues: boolean;
    };
  };
  purchase_date?: string;
}

export interface MysteryCharacter {
  id: string;
  package_id: string;
  character_name: string;
  description?: string;
  background?: string;
  relationships: RelationshipInfo[];
  secrets: string[];
  round_scripts?: {
    introduction?: string;
    round2?: ScriptOptions;
    round3?: ScriptOptions;
    round4?: ScriptOptions;
    final?: ScriptOptions;
  };
  created_at: string;
  updated_at: string;
}

interface RelationshipInfo {
  character: string;
  description: string;
}

interface ScriptOptions {
  innocent?: string;
  guilty?: string;
  accomplice?: string;
}
