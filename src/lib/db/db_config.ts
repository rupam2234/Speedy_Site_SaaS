import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

// Create a single supabase client for interacting with your database and supabase storage

class DB {
  private static INSTANCE: null | SupabaseClient = null;
  /**
   * Creates a singleton instance of DB client.
   * @return {SupabaseClient} DB client.
   */
  public static setupDB() {
    return (DB.INSTANCE =
      DB.INSTANCE ??
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL! as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY! as string // service role key helps to access supabase when RLS is enabled
      )) as SupabaseClient<Database>;
  }

  // this method is where supabase anon key is needed
  public static setupAnonDB() {
    return (DB.INSTANCE =
      DB.INSTANCE ??
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL! as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! as string // service role key helps to access supabase when RLS is enabled
      )) as SupabaseClient<Database>;
  }

  /**
   * Destroys the DB client instance.
   */
  public static revokeDB() {
    DB.INSTANCE?.realtime.removeAllChannels();
    DB.INSTANCE = null;
  }
}

export const setupDB = DB.setupDB;
export const setupAnonDB = DB.setupAnonDB;
