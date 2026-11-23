import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "./domain";

const worker = setupDB();

// Binding window for a prepared signature (docs/systems/user-onboarding-flow.md
// tour step 2). After it expires the user re-prepares and reinstalls.
const SIGNATURE_TTL_MS = 24 * 60 * 60 * 1000;

// Same structural guard as injection.ts: the row exists once a signature has
// been prepared for the domain.
type HmacRow = {
  domain: string | null;
  hmac_signature: string | null;
  hmac_expires_at: string | null;
  hmac_verified_at: string | null;
  rum_assigned_at: string | null;
};

export async function fetchHmacRow(domain: string): Promise<HmacRow | null> {
  const { data, error } = await worker
    .from("wp_key" as any)
    .select("domain, hmac_signature, hmac_expires_at, hmac_verified_at, rum_assigned_at")
    .eq("domain", domain)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as HmacRow | null) ?? null;
}

function sign(domain: string, timestamp: string, nonce: string): string {
  const secret = process.env.WP_HMAC_SECRET;
  if (!secret) {
    throw new Error("WP_HMAC_SECRET is not configured");
  }
  return createHmac("sha256", secret)
    .update(`${domain}:${timestamp}:${nonce}`)
    .digest("hex");
}

// Prepares and persists the signature the plugin will carry. The caller must
// already have proven the user owns the domain (orders lookup in the route).
export async function prepareSignature(input: string): Promise<{
  signature: string;
  expiresAt: string;
  domain: string;
}> {
  const domain = normalizeDomain(input);
  if (!domain) throw new Error("Invalid domain");

  const timestamp = Date.now().toString();
  const nonce = randomBytes(12).toString("hex");
  const signature = sign(domain, timestamp, nonce);

  const { error } = await worker
    .from("wp_key" as any)
    .upsert(
      {
        domain,
        hmac_signature: signature,
        hmac_expires_at: new Date(Date.now() + SIGNATURE_TTL_MS).toISOString(),
        hmac_verified_at: null,
        rum_assigned_at: null,
      },
      { onConflict: "domain" },
    );

  if (error) throw new Error(error.message);

  return {
    signature,
    expiresAt: new Date(Date.now() + SIGNATURE_TTL_MS).toISOString(),
    domain,
  };
}

// Constant-time compare; the length guard keeps timingSafeEqual from throwing.
export function signaturesMatch(provided: string, stored: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(stored, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Verifies the signature the plugin emitted and stamps the binding as verified.
// The RUM collector assignment is recorded here; delivery of rum.js stays
// entitlement-gated at the injection API and the edge (GOALS.md: free = CrUX).
export async function verifySignature(
  input: string,
  signature: string,
): Promise<{ verified: boolean; reason?: string }> {
  const domain = normalizeDomain(input);
  if (!domain || !signature) {
    return { verified: false, reason: "Missing domain or signature" };
  }

  const row = await fetchHmacRow(domain);
  if (!row?.hmac_signature) {
    return { verified: false, reason: "No signature bound for this domain" };
  }

  if (
    row.hmac_expires_at &&
    Date.parse(row.hmac_expires_at) < Date.now()
  ) {
    return { verified: false, reason: "Signature expired" };
  }

  if (!signaturesMatch(signature, row.hmac_signature)) {
    return { verified: false, reason: "Signature mismatch" };
  }

  const now = new Date().toISOString();
  const { error } = await worker
    .from("wp_key" as any)
    .update({ hmac_verified_at: now, rum_assigned_at: now })
    .eq("domain", domain);

  if (error) throw new Error(error.message);
  return { verified: true };
}
