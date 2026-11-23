import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  domain: string;
  secret?: string;
}

export async function POST(req: NextRequest) {
  try {
    const worker = setupDB();
    const { user, error } = await getSupabaseServerUser();
    if (error || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { domain, secret }: Props = await req.json();
    const normalized = normalizeDomain(domain);

    if (!normalized) {
      return NextResponse.json(
        { message: "Bad request: domain is required" },
        { status: 400 },
      );
    }

    if (secret) {
      return NextResponse.json(
        { message: "Plugin keys are managed by /api/wordpress/plugin-key" },
        { status: 409 },
      );
    }

    const { data: order } = await worker
      .from("orders")
      .select("website_name")
      .eq("user_id", user.id)
      .eq("website_name", normalized)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { message: "Connect this site to your account first" },
        { status: 403 },
      );
    }

    const { error: keyError, data } = await worker
      .from("wp_key")
      .select("wp_secret")
      .eq("domain", normalized)
      .limit(1)
      .maybeSingle();

    if (keyError) throw new Error(keyError.message ?? "Error fetching WP secret");

    if (!data?.wp_secret) {
      return NextResponse.json(
        { message: "No secret found for this site" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Internal Server Error" },
      { status: 500 },
    );
  }
}