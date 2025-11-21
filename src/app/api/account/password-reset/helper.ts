import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
