import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { authorizeRumSite } from "@/lib/rum/siteAccess";

const worker = setupDB();
const ALLOWED_STATUSES = new Set([
  "detected",
  "reviewed",
  "in_progress",
  "fixed",
  "verified",
  "resolved",
  "dismissed",
]);

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("site_id");
  const requestedStatus = req.nextUrl.searchParams.get("status");
  const access = await authorizeRumSite(siteId);

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, message: access.message },
      { status: access.status },
    );
  }

  if (requestedStatus && !ALLOWED_STATUSES.has(requestedStatus)) {
    return NextResponse.json(
      {
        error: "invalid_status",
        message: "The requested issue status is invalid.",
      },
      { status: 400 },
    );
  }

  const query = worker
    .from("rum_issue_documents")
    .select(
      "id, site_id, domain_name, fingerprint, issue_type, status, severity, confidence, title, symptom, root_cause, affected_scope, sample_count, session_count, metric_summary, evidence_summary, recommended_fix, expected_impact, verification_plan, provenance, first_seen_at, last_seen_at, resolved_at",
    )
    .eq("site_id", access.site.siteId)
    .eq("is_published", true)
    .order("last_seen_at", { ascending: false })
    .limit(100);

  if (requestedStatus) {
    query.eq("status", requestedStatus);
  }

  const { data, error } = await query;
  if (error) {
    console.error("rum issue list failed", {
      siteId: access.site.siteId,
      error: error.message,
    });
    return NextResponse.json(
      {
        error: "issue_query_failed",
        message: "Unable to load detected issues.",
      },
      { status: 500 },
    );
  }

  const severityRank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sortedData = [...(data ?? [])].sort((left, right) => {
    const severityDifference =
      (severityRank[left.severity] ?? 4) - (severityRank[right.severity] ?? 4);
    if (severityDifference !== 0) {
      return severityDifference;
    }
    return right.last_seen_at.localeCompare(left.last_seen_at);
  });

  return NextResponse.json({ data: sortedData }, { status: 200 });
}
