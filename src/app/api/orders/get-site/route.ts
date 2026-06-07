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

  if (!user?.id) {
    return NextResponse.json(
      { message: "User unauthorized" },
      { status: 401 }
    );
  }

  if (!domain) {
    return NextResponse.json(
      {
        message: "Bad request",
      },
      { status: 400 }
    );
  }

  try {
    const { error, data } = await worker
      .from("orders")
      .select("*")
      .eq("website_name", domain);

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(
      { data: data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error },
      { status: 500 }
    );
  }
}
