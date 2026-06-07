import { createServerSupabaseClient } from "@/lib/db/server";

export async function getSupabaseServerUser() {

    const supabase = createServerSupabaseClient();

    const { data: authData, error } = await supabase.auth.getUser();

    if (error || !authData.user) {
        return { supabase, user: null, error: error?.message || "Unauthorized" };
    }

    return { supabase, user: authData.user, error: null };
}
