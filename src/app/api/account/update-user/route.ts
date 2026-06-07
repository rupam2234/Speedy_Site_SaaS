import { getSupabaseServerUser } from "../..";

export async function POST(req: Request) {
  const { supabase, user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { phone, email, name }: any = body;

  if (!phone && !email && !name) {
    return Response.json({ error: "Missing user data" }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      email,
      phone,
      user_metadata: { name },
    }
  );

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ message: "User updated" }, { status: 200 });
}
