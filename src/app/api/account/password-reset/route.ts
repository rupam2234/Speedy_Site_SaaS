import { getAdminSupabase } from "./helper";

const baseurl =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_BASE_URL
    : process.env.NEXT_PUBLIC_PROD_BASE_URL;

export async function POST(req: Request) {
  const supabase = getAdminSupabase();

  const { email }: any = await req.json();

  if (!email) {
    return Response.json({ error: "Email is missing" }, { status: 400 });
  }

  const { data, error: PasswordError } =
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseurl}/password-reset`,
    });

  if (PasswordError) {
    return Response.json({ error: PasswordError.message }, { status: 500 });
  }

  return Response.json({ data }, { status: 200 });
}
