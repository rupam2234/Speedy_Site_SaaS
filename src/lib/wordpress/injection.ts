import { timingSafeEqual } from "crypto";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "./domain";

// Collector is served publicly; entitlement is enforced at the edge, so no secret
// and no id belong in the URL (docs/systems/site-metadata-worker.md).
export const RUM_SCRIPT_URL = "https://rum.speedy.site/rum.js";

export type InjectionResult =
  | { outcome: "inject"; scriptUrl: string }
  | { outcome: "not-connected" }
  | { outcome: "unauthorized" }
  | { outcome: "not-entitled" };

const worker = setupDB();

// Constant-time compare; the length guard keeps timingSafeEqual from throwing.
export function secretsMatch(provided: string, stored: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(stored, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Same rule as site-metadata buildDesiredMap: managed_wp + active + unexpired.
async function isEntitledDomain(normalized: string): Promise<boolean> {
  const now = Date.now();
  const { data, error } = await worker
    .from("user_services")
    .select("website_name, service_type, status, expires_at")
    .eq("service_type", "managed_wp")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  return (data ?? []).some((service) => {
    if (normalizeDomain(service.website_name) !== normalized) return false;
    const expires = service.expires_at ? Date.parse(service.expires_at) : NaN;
    return Number.isNaN(expires) || expires > now;
  });
}

export async function resolveInjection(
  domainInput: string,
  key: string,
): Promise<InjectionResult> {
  const normalized = normalizeDomain(domainInput);
  if (!normalized || !key) throw new Error("Missing domain or key");

  // Candidate labels keep the lookup index-backed while tolerating apex vs www
  // in how the site was registered; the authoritative check is the normalize match.
  const candidates = Array.from(
    new Set([normalized, `www.${normalized}`, domainInput.trim().toLowerCase()]),
  );

  const { data: keys, error } = await worker
    .from("wp_key")
    .select("domain, wp_secret")
    .in("domain", candidates);

  if (error) throw new Error(error.message);

  const match = (keys ?? []).find(
    (row) => normalizeDomain(row.domain) === normalized,
  );
  if (!match || !match.wp_secret) return { outcome: "not-connected" };
  if (!secretsMatch(key, match.wp_secret)) return { outcome: "unauthorized" };

  return (await isEntitledDomain(normalized))
    ? { outcome: "inject", scriptUrl: RUM_SCRIPT_URL }
    : { outcome: "not-entitled" };
}
