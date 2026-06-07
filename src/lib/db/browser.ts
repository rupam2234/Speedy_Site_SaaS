import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// mainly using this on authentication and auth provider
export const browserClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);
