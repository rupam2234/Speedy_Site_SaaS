import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser } from "../..";
import { setupDB } from "@/lib/db";

const worker = setupDB();

interface Props {
  pluginAudit: boolean;
}

export async function POST(req: NextRequest) {
  const { user } = await getSupabaseServerUser();

  if (!user?.id)
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });

  const { pluginAudit }: Props = await req.json();

  // backup audit limits
  const limits = {
    pro: 20,
    basic: 5,
    agency: 100,
  };

  try {
    if (!pluginAudit) {
      // Return current quota
      const { error, data } = await worker
        .from("wp_plugin_scans")
        .select("audit_completed, audit_limit")
        .eq("user_id", user.id)
        .single();

      if (error)
        throw new Error(error.message ?? "Unable to fetch audit quota");

      return NextResponse.json({ data }, { status: 200 });
    }

    // Fetch current value
    const { data: subscriptionData, error: fetchError } = await worker
      .from("subscriptions")
      .select("wp_plugin_audits")
      .eq("user_id", user.id)
      .single();

    if (fetchError)
      throw new Error(fetchError.message ?? "Unable to fetch audit count");

    const currentAudits = subscriptionData?.wp_plugin_audits || 0;

    // Increment by 1
    const { error: updateError, data: newSubData } = await worker
      .from("subscriptions")
      .update({ wp_plugin_audits: currentAudits + 1 })
      .eq("user_id", user.id)
      .select("wp_plugin_audits, plan")
      .single();

    if (updateError)
      throw new Error(updateError.message ?? "Failed to update audit count");

    return NextResponse.json(
      {
        used: newSubData.wp_plugin_audits,
        limit: limits[newSubData.plan.toLowerCase() as keyof typeof limits],
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
