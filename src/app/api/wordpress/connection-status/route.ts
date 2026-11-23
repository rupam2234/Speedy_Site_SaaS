import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

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
    pluginActive: boolean;
    rumActive: boolean;
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
  try {
    // The database client is created here rather than at module scope: an
    // initialisation failure then becomes a JSON error response instead of
    // Next's plain-text "Internal Server Error".
    const worker = setupDB();
    // Auth is resolved inside the try block on purpose: a failure here used to
    // escape the handler and Next answered with a plain-text
    // "Internal Server Error", which the client then failed to parse as JSON.
    const { user, error } = await getSupabaseServerUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Probe the site's plugin status endpoint. A missing route means the
    // plugin is not active, even when the database still holds its old key.
    let pluginActive = false;
    let rumActive = false;
    try {
      const probe = await fetch(
        `https://${normalized}/wp-json/speedy-site/v1/status`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        },
      );
      if (probe.ok) {
        const raw = await probe.text();
        const live = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
        pluginActive = live?.pluginActive === true;
        rumActive = pluginActive && live?.rumActive === true;
      } else if (probe.status === 404) {
        // Plugin versions before 1.4 have no status route. Their existing
        // plugins route still proves that the plugin is active when it rejects
        // the discovery request with 401.
        const legacy = await fetch(
          `https://${normalized}/wp-json/speedy-site/v1/plugins`,
          {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          },
        );
        pluginActive = legacy.status === 401;
      }
    } catch (err: any) {
      console.error("WordPress status probe failed:", err?.message ?? err);
    }

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

    // Determine status. The plugin is provably installed when it holds the
    // access secret OR a bound/verified HMAC signature (the onboarding flow
    // verifies via HMAC; wp_secret is only written when the zip is generated).
    const hasStoredKey = !!wpKeyData?.wp_secret;
    const hasSignature = !!wpKeyData?.hmac_signature;
    const signatureExpired = wpKeyData?.hmac_expires_at
      ? Date.parse(wpKeyData.hmac_expires_at) < now
      : false;
    const isVerified = !!wpKeyData?.hmac_verified_at;
    const isRumAssigned = !!wpKeyData?.rum_assigned_at;
    const nowIso = new Date().toISOString();

    // Persist the combined live result so plugin and RUM state always move
    // together. A deactivated plugin clears the active timestamps.
    const { error: statusUpdateError } = await worker
      .from("wp_key" as any)
      .update({
        plugin_active_at: pluginActive ? nowIso : null,
        rum_active_at: rumActive ? nowIso : null,
        last_checked_at: nowIso,
      })
      .eq("domain", normalized);

    if (statusUpdateError) {
      console.error("Failed to persist WordPress status:", statusUpdateError.message);
    }
    // hmac_expires_at is the onboarding handshake window: it bounds how long
    // the user has to finish the tour (prepare -> install -> hand the
    // signature back). It is NOT a lease on a working connection. Once the
    // handshake completed (hmac_verified_at / rum_assigned_at are stamped) the
    // binding is permanent, and the runtime credential is wp_secret, which
    // has no expiry. So an expired window only blocks a handshake that has
    // not happened yet.
    const bindingExpired = signatureExpired && !isVerified;

    let status: "pending" | "connected" | "verified" | "expired" | "error";
    let message: string;

    if (!pluginActive) {
      status = "pending";
      message = "Plugin is not active";
    } else if (!hasSignature) {
      status = "pending";
      message = "Plugin installed, awaiting signature";
    } else if (!isVerified) {
      // The handshake is still open: the binding window decides whether it
      // can still be completed or has to be re-prepared.
      if (bindingExpired) {
        status = "expired";
        message = "Signature expired, please re-prepare";
      } else {
        status = "connected";
        message = "Plugin connected, awaiting verification";
      }
    } else if (!isRumAssigned || !rumActive) {
      status = "verified";
      message = entitled
        ? "Connected - RUM script is not active"
        : "Connected but not entitled for RUM";
    } else {
      status = "verified";
      message = "Fully connected - RUM script active";
    }

    return NextResponse.json({
      domain: normalized,
      status,
      message,
      details: {
        pluginInstalled: pluginActive,
        pluginActive,
        rumActive,
        hasSecret: hasStoredKey,
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