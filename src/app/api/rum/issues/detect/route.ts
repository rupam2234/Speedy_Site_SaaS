import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { authorizeRumSite } from "@/lib/rum/siteAccess";

const worker = setupDB();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const access = await authorizeRumSite(body?.site_id);

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, message: access.message },
      { status: access.status },
    );
  }

  if (access.site.role !== "admin") {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Only administrators can run issue detection.",
      },
      { status: 403 },
    );
  }

  if (isRateLimited(`${access.site.siteId}:${access.site.tenantId}`)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many detector requests. Try again later.",
      },
      { status: 429 },
    );
  }

  const end = body?.end ?? new Date().toISOString();
  const start =
    body?.start ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const publish = body?.publish === true;

  const { data, error } = await worker.rpc("detect_lcp_issues_v1", {
    p_site_id: access.site.siteId,
    p_start: start,
    p_end: end,
    p_publish: publish,
  });

  if (error) {
    console.error("rum issue detection failed", {
      siteId: access.site.siteId,
      error: error.message,
    });
    return NextResponse.json(
      {
        error: "detection_failed",
        message: "Unable to run issue detection.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: {
        detectedCount: Number(data ?? 0),
        mode: publish ? "published" : "shadow",
      },
    },
    { status: 200 },
  );
}
