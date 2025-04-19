
import { createClient } from '@supabase/supabase-js';

// Create a single Supabase client instance
export const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: localStorage
    },
    global: {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    }
  }
);

// Add console log to confirm the client is properly initialized
console.log('Supabase client initialized');
