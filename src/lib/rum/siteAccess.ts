import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";

const worker = setupDB();
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RumAccessRole = "user" | "admin" | "expert";

export type AuthorizedRumSite = {
  siteId: string;
  tenantId: string;
  domainName: string;
  role: RumAccessRole;
};

export type RumSiteAccess =
  | { ok: true; site: AuthorizedRumSite }
  | { ok: false; status: 400 | 401 | 403 | 404 | 500; error: string; message: string };

export function isValidSiteId(siteId: unknown): siteId is string {
  return typeof siteId === "string" && UUID_PATTERN.test(siteId);
}

export async function authorizeRumSite(
  siteId: unknown,
): Promise<RumSiteAccess> {
  if (!isValidSiteId(siteId)) {
    return {
      ok: false,
      status: 400,
      error: "invalid_site_id",
      message: "A valid site_id is required.",
    };
  }

  const { user } = await getSupabaseServerUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Authentication is required.",
    };
  }

  const [{ data: profile, error: profileError }, { data: site, error: siteError }] =
    await Promise.all([
      worker.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      worker
        .from("orders")
        .select("order_id, user_id, website_name, order_status")
        .eq("order_id", siteId)
        .maybeSingle(),
    ]);

  if (profileError) {
    return {
      ok: false,
      status: 500,
      error: "authorization_failed",
      message: "Unable to resolve the current user role.",
    };
  }

  if (siteError) {
    return {
      ok: false,
      status: 500,
      error: "authorization_failed",
      message: "Unable to resolve site access.",
    };
  }

  if (!site || !site.order_status) {
    return {
      ok: false,
      status: 404,
      error: "site_not_found",
      message: "Site not found.",
    };
  }

  const role = (profile?.role ?? "user") as RumAccessRole;
  let authorized = site.user_id === user.id;

  if (role === "admin") {
    authorized = true;
  } else if (role === "expert") {
    const { data: assignment, error: assignmentError } = await worker
      .from("order_assignments")
      .select("id")
      .eq("order_id", siteId)
      .eq("expert_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (assignmentError) {
      return {
        ok: false,
        status: 500,
        error: "authorization_failed",
        message: "Unable to resolve the expert assignment.",
      };
    }
    authorized = Boolean(assignment);
  }

  if (!authorized) {
    return {
      ok: false,
      status: 403,
      error: "forbidden",
      message: "You do not have access to this site.",
    };
  }

  return {
    ok: true,
    site: {
      siteId: site.order_id,
      tenantId: site.user_id,
      domainName: site.website_name,
      role,
    },
  };
}


export async function authorizeRumDomain(
  domainName: unknown,
): Promise<RumSiteAccess> {
  if (typeof domainName !== "string" || domainName.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      error: "invalid_domain",
      message: "A domain is required.",
    };
  }

  const { user } = await getSupabaseServerUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "Authentication is required.",
    };
  }

  const { data: site, error: siteError } = await worker
    .from("orders")
    .select("order_id, user_id, website_name, order_status")
    .eq("website_name", domainName.trim().toLowerCase())
    .maybeSingle();

  if (siteError) {
    return {
      ok: false,
      status: 500,
      error: "authorization_failed",
      message: "Unable to resolve site access.",
    };
  }

  if (!site || !site.order_status) {
    return {
      ok: false,
      status: 404,
      error: "site_not_found",
      message: "Site not found.",
    };
  }

  const access = await authorizeRumSite(site.order_id);
  if (!access.ok) return access;

  return {
    ok: true,
    site: { ...access.site, domainName: site.website_name },
  };
}
