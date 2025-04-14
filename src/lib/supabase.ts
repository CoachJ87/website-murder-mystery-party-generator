
// Re-export from the integrations file to ensure consistency
export { supabase } from "@/integrations/supabase/client";

// Add a console log to confirm supabase is initialized
console.log('Supabase client re-exported in supabase.ts');
