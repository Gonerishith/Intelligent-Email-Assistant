import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable resolution for Supabase credentials
const getSupabaseConfig = () => {
  let supabaseUrl = process.env.SUPABASE_URL || '';
  
  // If DATABASE_URL is an HTTP(S) URL (e.g. Supabase endpoint), use it as fallback
  if (!supabaseUrl && process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('http')) {
    supabaseUrl = process.env.DATABASE_URL;
  }

  const supabaseKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    '';

  return {
    supabaseUrl,
    supabaseKey,
    isConfigured: Boolean(supabaseUrl && supabaseKey),
  };
};

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseKey, isConfigured } = getSupabaseConfig();
  
  if (!isConfigured) {
    return null;
  }

  if (!cachedClient) {
    try {
      cachedClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log(`[Supabase] Initialized client connected to ${supabaseUrl}`);
    } catch (err: any) {
      console.warn('[Supabase] Failed to initialize client:', err.message);
      return null;
    }
  }

  return cachedClient;
}

export function getSupabaseStatus() {
  const { supabaseUrl, isConfigured } = getSupabaseConfig();
  return {
    connected: isConfigured && !!cachedClient,
    supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^/]+).*/, '$1') : null,
    isConfigured,
  };
}
