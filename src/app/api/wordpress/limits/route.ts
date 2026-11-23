import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser } from "../..";
import { setupDB } from "@/lib/db";

interface Props {
  pluginAudit: boolean;
}

export async function POST(req: NextRequest) {
  try {
    // The database client is created here rather than at module scope: an
    // initialisation failure then becomes a JSON error response instead of
    // Next's plain-text "Internal Server Error".
    const worker = setupDB();
    const { user } = await getSupabaseServerUser();

    if (!user?.id)
      return NextResponse.json({ message: "User unauthorized" }, { status: 401 });

    const { pluginAudit }: Props = await req.json();

    if (!pluginAudit) {
      // Return current quota - check user_services for managed_wp service
      const { data: service, error: serviceError } = await worker
        .from("user_services")
        .select("id, metadata")
        .eq("user_id", user.id)
        .eq("service_type", "managed_wp")
        .eq("status", "active")
        .maybeSingle();

      if (serviceError) {
        throw new Error(serviceError?.message ?? "Unable to fetch user service");
      }

      if (!service) {
        // No active managed_wp service
        return NextResponse.json(
          { data: { audit_completed: 0, audit_limit: 0 } },
          { status: 200 }
        );
      }

      // Get scan count from metadata
      const scansCompleted = (service.metadata as Record<string, any>)?.scans_completed ?? 0;
      const auditLimit = (service.metadata as Record<string, any>)?.scan_limit ?? 3; // Default 3 scans included

      return NextResponse.json(
        { data: { audit_completed: scansCompleted, audit_limit: auditLimit } },
        { status: 200 }
      );
    }

    // Plugin audit requested - check if user has active managed_wp service
    const { data: service, error: serviceError } = await worker
      .from("user_services")
      .select("id, metadata")
      .eq("user_id", user.id)
      .eq("service_type", "managed_wp")
      .eq("status", "active")
      .maybeSingle();

    if (serviceError || !service) {
      return NextResponse.json(
        { message: "No active WordPress Performance Optimization service found" },
        { status: 403 }
      );
    }

    // Check scan limit
    const scansCompleted = (service.metadata as Record<string, any>)?.scans_completed ?? 0;
    const auditLimit = (service.metadata as Record<string, any>)?.scan_limit ?? 3;

    if (scansCompleted >= auditLimit) {
      return NextResponse.json(
        { message: "Plugin audit quota exceeded. Contact support for additional scans." },
        { status: 403 }
      );
    }

    // Increment scan count
    const newScansCompleted = scansCompleted + 1;
    const { error: updateError } = await worker
      .from("user_services")
      .update({
        metadata: {
          ...(service.metadata as Record<string, any>),
          scans_completed: newScansCompleted,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id);

    if (updateError) {
      throw new Error(updateError.message ?? "Failed to update scan count");
    }

    return NextResponse.json(
      {
        used: newScansCompleted,
        limit: auditLimit,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}