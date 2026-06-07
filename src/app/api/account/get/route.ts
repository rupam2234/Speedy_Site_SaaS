import { getSupabaseServerUser } from "../..";

export async function GET() {
  const { user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user });
}
