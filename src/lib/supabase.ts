
// Re-export from the integrations file to ensure consistency
export { supabase } from "@/integrations/supabase/client";
export { default as supabaseUrl } from "@/integrations/supabase/client";
export { default as supabaseAnonKey } from "@/integrations/supabase/client";

// Add a console log to confirm supabase is initialized
console.log('Supabase client re-exported in supabase.ts');
