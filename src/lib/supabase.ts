
import { createClient } from '@supabase/supabase-js';

// Use the actual Supabase URL and anon key
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mhfikaomkmqcndqfohbp.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
