
export interface Message {
  id: string;
  content: string;
  is_ai: boolean;
  timestamp: Date;
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
