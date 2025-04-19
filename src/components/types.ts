
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
  timeFrame?: string;
  additionalDetails?: string;
  [key: string]: any;
}
