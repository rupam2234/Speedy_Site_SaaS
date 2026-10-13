import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from ".";

class DB {
  private static SERVICE_INSTANCE: SupabaseClient<Database> | null = null;
  private static ANON_INSTANCE: SupabaseClient<Database> | null = null;

  /**
   * Returns a singleton Supabase client using the SERVICE_ROLE_KEY.
   */
  public static setupDB(): SupabaseClient<Database> {
    if (!DB.SERVICE_INSTANCE) {
      // Build-time page-data collection imports this module without env; the
      // placeholder client is never invoked during a build
      DB.SERVICE_INSTANCE = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://build-placeholder.supabase.co",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build-placeholder", // Full access (RLS bypass)
      );
    }
    return DB.SERVICE_INSTANCE;
  }

  /**
   * Returns a singleton Supabase client using the ANON key.
   */
  public static setupAnonDB(): SupabaseClient<Database> {
    if (!DB.ANON_INSTANCE) {
      DB.ANON_INSTANCE = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://build-placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "build-placeholder", // Limited access
      );
    }
    return DB.ANON_INSTANCE;
  }

  public static revokeDB() {
    DB.SERVICE_INSTANCE?.realtime.removeAllChannels();
    DB.ANON_INSTANCE?.realtime.removeAllChannels();
    DB.SERVICE_INSTANCE = null;
    DB.ANON_INSTANCE = null;
  }
}

export const setupDB = DB.setupDB;
export const setupAnonDB = DB.setupAnonDB;
