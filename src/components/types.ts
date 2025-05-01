
export interface Message {
  id: string;
  content: string;
  is_ai: boolean;
  timestamp: Date;
  role?: string; // Add optional role property
}

// Add FormValues interface for MysteryForm component
export interface FormValues {
  title?: string;
  theme?: string;
  numberOfGuests?: number;
  playerCount?: number;
  timeFrame?: string;
  hasAccomplice?: boolean;
  scriptType?: 'full' | 'summary';
  additionalDetails?: string;
  [key: string]: any;
}

export interface QuestionOption {
  target: string;
  question: string;
}

export interface CharacterScript {
  introduction?: string;
  round1?: string;
  round2?: {
    innocent?: string;
    guilty?: string;
    accomplice?: string;
  };
  round3?: {
    innocent?: string;
    guilty?: string;
    accomplice?: string;
  };
  final?: {
    innocent?: string;
    guilty?: string;
    accomplice?: string;
  };
}
