import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

// Type for wp_key row
type WpKeyRow = {
  domain: string | null;
  wp_secret: string | null;
  hmac_signature: string | null;
  hmac_expires_at: string | null;
  hmac_verified_at: string | null;
  rum_assigned_at: string | null;
};

// Exported interface for connection status
export interface ConnectionStatus {
  domain: string;
  status: "pending" | "connected" | "verified" | "expired" | "error";
  message: string;
  details: {
    pluginInstalled: boolean;
    hasSecret: boolean;
    hasSignature: boolean;
    signatureExpired: boolean;
    hmacVerifiedAt: string | null;
    rumAssignedAt: string | null;
    entitled: boolean;
    hmacExpiresAt: string | null;
  };
}

export async function POST(req: NextRequest) {
  const { user, error } = await getSupabaseServerUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { domain }: { domain?: string } = await req.json();
    const normalized = normalizeDomain(domain);

    if (!normalized) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Verify user owns this domain
    const { data: order } = await worker
      .from("orders")
      .select("website_name")
      .eq("user_id", user.id)
      .eq("website_name", normalized)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { error: "Connect this site to your account first" },
        { status: 403 },
      );
    }

    // Get full connection status from wp_key
    const { data: wpKey, error: keyError } = await worker
      .from("wp_key")
      .select(
        "domain, wp_secret, hmac_signature, hmac_expires_at, hmac_verified_at, rum_assigned_at",
      )
      .eq("domain", normalized)
      .maybeSingle();

    if (keyError) throw new Error(keyError.message);

    const wpKeyData = wpKey as WpKeyRow | null;

    // Check entitlement
    const now = Date.now();
    const { data: services } = await worker
      .from("user_services")
      .select("website_name, service_type, status, expires_at")
      .eq("service_type", "managed_wp")
      .eq("status", "active");

    const entitled = (services ?? []).some((service) => {
      const serviceDomain = normalizeDomain(service.website_name);
      if (serviceDomain !== normalized) return false;
      const expires = service.expires_at ? Date.parse(service.expires_at) : NaN;
      return Number.isNaN(expires) || expires > now;
    });

    // Determine status
    const hasPlugin = !!wpKeyData?.wp_secret;
    const hasSignature = !!wpKeyData?.hmac_signature;
    const signatureExpired = wpKeyData?.hmac_expires_at
      ? Date.parse(wpKeyData.hmac_expires_at) < now
      : false;
    const isVerified = !!wpKeyData?.hmac_verified_at;
    const isRumAssigned = !!wpKeyData?.rum_assigned_at;

    let status: "pending" | "connected" | "verified" | "expired" | "error";
    let message: string;

    if (!hasPlugin) {
      status = "pending";
      message = "Plugin not installed";
    } else if (!hasSignature) {
      status = "pending";
      message = "Plugin installed, awaiting signature";
    } else if (signatureExpired) {
      status = "expired";
      message = "Signature expired, please re-prepare";
    } else if (!isVerified) {
      status = "connected";
      message = "Plugin connected, awaiting verification";
    } else if (!isRumAssigned) {
      status = "verified";
      message = "Verified, RUM script assignment pending";
    } else {
      status = "verified";
      message = entitled
        ? "Fully connected - RUM script active"
        : "Verified but not entitled for RUM";
    }

    return NextResponse.json({
      domain: normalized,
      status,
      message,
      details: {
        pluginInstalled: hasPlugin,
        hasSecret: hasPlugin,
        hasSignature,
        signatureExpired,
        hmacVerifiedAt: wpKeyData?.hmac_verified_at ?? null,
        rumAssignedAt: wpKeyData?.rum_assigned_at ?? null,
        entitled,
        hmacExpiresAt: wpKeyData?.hmac_expires_at ?? null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to check connection", message: err?.message },
      { status: 500 },
    );
  }
}