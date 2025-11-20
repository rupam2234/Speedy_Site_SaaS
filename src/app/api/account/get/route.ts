import { getServerSupabase } from "@/lib/db/serverSupabase";

export async function GET() {
  const { user, error } = await getServerSupabase();

  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user });
}
