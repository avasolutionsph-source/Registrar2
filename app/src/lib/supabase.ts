import { createClient } from '@supabase/supabase-js';

// Shared NPS Supabase project (same one the staff portal uses). Credentials
// come from .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). The anon
// key is public by design — access is enforced by RLS + the registrar role.
const env = import.meta.env as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
