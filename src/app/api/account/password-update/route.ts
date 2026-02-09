import { GetServerSupabase } from "@/lib/db/getUser";

export async function POST(req: Request) {
  const { supabase, user, error } = await GetServerSupabase();

  if (!user || error) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: any = await req.json();

  const { password }: any = body;

  if (!password) {
    return Response.json({ error: "Missing new password" }, { status: 404 });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      password,
    }
  );

  if (updateError) {
    return Response.json(
      {
        error: updateError.message,
      },
      { status: 500 }
    );
  }

  return Response.json({ message: "password updated" }, { status: 200 });
}
