import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }
  return supabaseUrl;
}

// Public client — browser-safe, used for Realtime Broadcast subscriptions only
// We do NOT use Supabase as a database — MySQL (PlanetScale) is the source of truth
export function getBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const env = getSupabaseEnv();
  if (!env) return null;

  const { supabaseUrl, supabaseAnonKey } = env;
  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      persistSession: false, // Auth is handled by NextAuth, not Supabase
      autoRefreshToken: false,
    },
  });

  return browserClient;
}

// Server-side admin client for broadcasting updates from API routes
// Never expose this to the client bundle
export function createAdminSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Consistent channel name factory — publisher and subscriber must use the same name
export const REALTIME_CHANNELS = {
  userBasket: (userId: string) => `basket:${userId}`,
  adminBroadcast: "admin:broadcast",
} as const;
