
// src/interfaces/mystery.ts

export interface MysteryData {
  title?: string;
  theme?: string;
  playerCount?: number;
  scriptType?: 'full' | 'summary';
  additionalDetails?: string;
  status?: "draft" | "purchased" | "archived" | "generating";
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
  display_status?: "draft" | "purchased" | "archived" | "generating";
  has_complete_package?: boolean;
  needs_package_generation?: boolean;
  package_generated_at?: string;
}

export interface Mystery {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "purchased" | "archived" | "generating";
  display_status?: "draft" | "purchased" | "archived" | "generating";
  mystery_data?: MysteryData;
  is_paid?: boolean;
  messages?: any[];
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
  has_complete_package?: boolean;
  is_completed?: boolean;
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
    round1?: string | RoundScriptOptions;
    round2?: RoundScriptOptions;
    round3?: RoundScriptOptions;
    final?: RoundScriptOptions;
  };
  introduction?: string;
  whereabouts?: string;
  round1_statement?: string;
  round2_statement?: string;
  round3_statement?: string;
  questioning_options?: QuestionOption[];
  created_at?: string; // Make created_at optional
  updated_at?: string; // Make updated_at optional
  [key: string]: any; // To allow for additional properties
}

interface RelationshipInfo {
  character: string;
  description: string;
}

interface RoundScriptOptions {
  innocent?: string;
  guilty?: string;
}

interface QuestionOption {
  target: string;
  question: string;
}

// Add helper function to normalize character data
export function normalizeCharacterRelationships(relationships: any[]): RelationshipInfo[] {
  if (!relationships || !Array.isArray(relationships)) {
    return [];
  }
  
  return relationships.map(rel => {
    if (typeof rel === 'string') {
      const parts = rel.split(':').map(p => p.trim());
      return {
        character: parts[0] || '',
        description: parts.slice(1).join(':') || ''
      };
    }
    
    // Handle object with potentially different property names
    if (typeof rel === 'object') {
      return {
        character: rel.character || rel.name || '',
        description: rel.description || rel.relation || ''
      };
    }
    
    return { character: '', description: '' };
  }).filter(r => r.character || r.description);
}

// Helper to normalize secrets
export function normalizeCharacterSecrets(secrets: any): string[] {
  if (!secrets) {
    return [];
  }
  
  if (typeof secrets === 'string') {
    return [secrets];
  }
  
  if (Array.isArray(secrets)) {
    return secrets.map(s => typeof s === 'object' ? JSON.stringify(s) : String(s));
  }
  
  if (typeof secrets === 'object') {
    return Object.entries(secrets).map(([key, value]) => `${key}: ${value}`);
  }
  
  return [];
}
