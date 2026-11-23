import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

export const runtime = "nodejs";

// In-memory per-user+domain limiter (same pattern as api/wordpress/injection).
// Re-downloading the plugin is a rare action, so the ceiling is deliberately
// low: it stops a scripted loop from hammering the key endpoint.
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/**
 * Mints a plugin access key with the platform's CSPRNG.
 */
function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns the plugin access key for a site, creating one only when the site
 * has never had a key.
 *
 * The existing key is always reused: the installed plugin holds that key, so
 * handing out a new one would silently break the connection for a site that
 * is already running the plugin. Only the owner of the site can ask for it.
 */
export async function POST(req: NextRequest) {
  try {
    // The database client is created here rather than at module scope: an
    // initialisation failure then becomes a JSON error response instead of
    // Next's plain-text "Internal Server Error".
    const worker = setupDB();
    const { user, error } = await getSupabaseServerUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const normalized = normalizeDomain(body?.domain);

    if (!normalized) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    if (rateLimited(`${user.id}:${normalized}`)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Verify the user owns this domain
    const { data: order, error: orderError } = await worker
      .from("orders")
      .select("website_name")
      .eq("user_id", user.id)
      .eq("website_name", normalized)
      .maybeSingle();

    if (orderError) throw new Error(orderError.message);

    if (!order) {
      return NextResponse.json(
        { error: "Connect this site to your account first" },
        { status: 403 },
      );
    }

    // Reuse the key the plugin already knows about.
    const { data: existing, error: existingError } = await worker
      .from("wp_key")
      .select("wp_secret")
      .eq("domain", normalized)
      .limit(1)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing?.wp_secret) {
      return NextResponse.json(
        { key: existing.wp_secret, generated: false },
        { status: 200 },
      );
    }

    // The HMAC flow can create a wp_key row before a plugin key exists. Fill
    // that row without replacing a key another request may have stored.
    const key = generateSecret();
    const { error: updateError } = await worker
      .from("wp_key")
      .update({ wp_secret: key })
      .eq("domain", normalized)
      .is("wp_secret", null);

    if (updateError) throw new Error(updateError.message);

    // Read the stored value after the conditional update. Concurrent requests
    // therefore converge on one key, and the unique secret index prevents two
    // sites from sharing it.
    const { data: stored, error: storedError } = await worker
      .from("wp_key")
      .select("wp_secret")
      .eq("domain", normalized)
      .limit(1)
      .maybeSingle();

    if (storedError) throw new Error(storedError.message);

    if (!stored?.wp_secret) {
      const { error: insertError } = await worker
        .from("wp_key")
        .insert({ domain: normalized, wp_secret: key });

      if (insertError) {
        const code = (insertError as { code?: string }).code;
        if (code !== "23505") throw new Error(insertError.message);
      }

      const { data: winner, error: winnerError } = await worker
        .from("wp_key")
        .select("wp_secret")
        .eq("domain", normalized)
        .limit(1)
        .maybeSingle();

      if (winnerError) throw new Error(winnerError.message);
      if (!winner?.wp_secret) throw new Error("Failed to store the plugin key");

      return NextResponse.json(
        { key: winner.wp_secret, generated: winner.wp_secret === key },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { key: stored.wp_secret, generated: stored.wp_secret === key },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to prepare plugin key", message: err?.message },
      { status: 500 },
    );
  }
}
