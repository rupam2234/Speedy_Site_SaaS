import { setupDB } from "@/lib/db";
import { createRouteSupabaseClient } from "@/lib/db/server";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain: string;
}

export async function POST(req: NextRequest) {

  const res = NextResponse.next();
  const supabase = createRouteSupabaseClient(req, res);

  const { domain }: Props = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  if (!domain) {
    return NextResponse.json(
      { message: "Bad request" },
      { status: 400 }
    );
  }

  try {

    // validate the domain for user
    const { data: verifiedDomain, error: validationError } = await worker.from("orders").select("website_name").eq("website_name", domain).eq("user_id", user.id).maybeSingle();

    if (validationError || verifiedDomain?.website_name !== domain) {
      throw new Error(validationError?.message || "Unauthorised")
    }

    // then delete the site
    const { error } = await worker
      .from("orders")
      .delete()
      .eq("website_name", verifiedDomain.website_name);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ message: "website deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error deleting website" },
      { status: 500 }
    );
  }
}
