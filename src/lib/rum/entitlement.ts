import { setupDB } from "@/lib/db";

const worker = setupDB();

/**
 * Confirms the tenant holds a live managed WordPress entitlement for the site.
 * The assistant is a managed WordPress remediation surface, so it is gated on
 * the service that the remediation guidance applies to.
 */
export async function hasLiveRumEntitlement(
  siteId: string,
  tenantId: string,
  domainName: string,
): Promise<boolean> {
  const { data, error } = await worker
    .from("user_services")
    .select("id, order_id, website_name, expires_at")
    .eq("user_id", tenantId)
    .eq("service_type", "managed_wp")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  return (data ?? []).some(
    (service) =>
      (service.order_id === siteId || service.website_name === domainName) &&
      (!service.expires_at || Date.parse(service.expires_at) > Date.now()),
  );
}
