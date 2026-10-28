import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { NextResponse } from "next/server";

const worker = setupDB();

const FREE_SITE_LIMIT = 3;

export async function GET() {
  const { user, error } = await getSupabaseServerUser();
  const user_id = user?.id ? user?.id : null;

  if (error || !user_id) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all of the user's services once and derive the governing limit
    const { data: services, error: serviceError } = await worker
      .from("user_services")
      .select("id, service_type, status, metadata")
      .eq("user_id", user_id);

    if (serviceError) {
      throw new Error(serviceError?.message ?? "Couldn't fetch user services");
    }

    const activeManaged = services?.find(
      (s) => s.service_type === "managed_wp" && s.status === "active"
    );

    if (activeManaged) {
      // Paid tier: site limit comes from the managed_wp service metadata
      const siteLimit =
        (activeManaged.metadata as Record<string, any>)?.site_limit ?? 1;

      const { error: siteError, count } = await worker
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("product_type", "managed_wp");

      if (siteError) {
        throw new Error(siteError?.message ?? "failed to fetch site count");
      }

      const reached = count !== null && count >= siteLimit;
      return NextResponse.json(
        { reachedLimit: reached, limit: siteLimit, current: count },
        { status: 200 }
      );
    }

    // Free tier: one connected site with CrUX web vitals
    const { error: siteError, count } = await worker
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (siteError) {
      throw new Error(siteError?.message ?? "failed to fetch site count");
    }

    const reached = count !== null && count >= FREE_SITE_LIMIT;
    return NextResponse.json(
      { reachedLimit: reached, limit: FREE_SITE_LIMIT, current: count },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message ?? "Server error" }, { status: 500 });
  }
}
