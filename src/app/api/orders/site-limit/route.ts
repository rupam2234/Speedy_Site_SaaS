import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { NextResponse } from "next/server";

const worker = setupDB();

export async function GET() {
  const { user, error } = await getSupabaseServerUser();
  const user_id = user?.id ? user?.id : null;

  if (error || !user_id) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  try {
    // Check if user has an active managed_wp service
    const { data: service, error: serviceError } = await worker
      .from("user_services")
      .select("id, metadata")
      .eq("user_id", user_id)
      .eq("service_type", "managed_wp")
      .eq("status", "active")
      .maybeSingle();

    if (serviceError) {
      throw new Error(serviceError?.message ?? "Couldn't fetch user service");
    }

    if (!service) {
      // No active service - limit is 0 (or free tier limit)
      return NextResponse.json({ reachedLimit: true, limit: 0 }, { status: 200 });
    }

    // Get site limit from service metadata (default to 1 for managed_wp)
    const siteLimit = (service.metadata as Record<string, any>)?.site_limit ?? 1;

    // Now check the active sites for the user
    const { error: siteError, count } = await worker
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("product_type", "managed_wp");

    if (siteError) {
      throw new Error(siteError?.message ?? "failed to fetch site count");
    }

    if (count !== null && count < siteLimit) {
      return NextResponse.json({ reachedLimit: false, limit: siteLimit, current: count }, { status: 200 });
    }

    return NextResponse.json({ reachedLimit: true, limit: siteLimit, current: count }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message ?? "Server error" }, { status: 500 });
  }
}