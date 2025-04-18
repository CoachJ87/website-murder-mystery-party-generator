
// Re-export from the integrations file to ensure consistency
import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseInstance } from "@/integrations/supabase/client";

// Use proper session persistence configuration
export const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Add a console log to confirm supabase is initialized
console.log('Supabase client initialized with proper session persistence');
