import { NextRequest, NextResponse } from "next/server";
import { resolveInjection } from "@/lib/wordpress/injection";
import { normalizeDomain } from "@/lib/wordpress/domain";

export const runtime = "nodejs";

// In-memory per-domain limiter (pattern reused from api/emails/contact): keeps this
// route stateless across instances and cheap; the plugin caches 5 min server-side,
// so legit traffic is ~12 calls/hour per site.
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 100;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(domain: string): boolean {
  const now = Date.now();
  const entry = hits.get(domain);
  if (!entry || now > entry.resetAt) {
    hits.set(domain, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const domain = normalizeDomain(body?.domain);
    const key: string = typeof body?.key === "string" ? body.key : "";

    if (!domain || !key) {
      return NextResponse.json(
        { inject: false, message: "Bad request" },
        { status: 400 },
      );
    }

    if (rateLimited(domain)) {
      return NextResponse.json(
        { inject: false, message: "Too many requests" },
        { status: 429 },
      );
    }

    const result = await resolveInjection(body.domain, key);

    switch (result.outcome) {
      case "inject":
        return NextResponse.json({ inject: true, scriptUrl: result.scriptUrl });
      case "unauthorized":
        return NextResponse.json({ inject: false }, { status: 401 });
      default:
        // not-connected / not-entitled: the plugin simply no-ops (CrUX only).
        return NextResponse.json({ inject: false });
    }
  } catch {
    // Fail closed: any error means the collector is not injected.
    return NextResponse.json({ inject: false });
  }
}
