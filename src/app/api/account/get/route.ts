import { GetServerSupabase } from "@/lib/db/getUser";

export async function GET() {
  const { user, error } = await GetServerSupabase();

  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user });
}
