import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { authorizeRumSite } from "@/lib/rum/siteAccess";

const worker = setupDB();
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;
  if (!UUID_PATTERN.test(issueId)) {
    return NextResponse.json(
      { error: "invalid_issue_id", message: "A valid issue ID is required." },
      { status: 400 },
    );
  }

  const siteId = req.nextUrl.searchParams.get("site_id");
  const access = await authorizeRumSite(siteId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, message: access.message },
      { status: access.status },
    );
  }

  const { data: issue, error: issueError } = await worker
    .from("rum_issue_documents")
    .select("*")
    .eq("id", issueId)
    .eq("site_id", access.site.siteId)
    .eq("is_published", true)
    .maybeSingle();

  if (issueError) {
    console.error("rum issue detail failed", {
      siteId: access.site.siteId,
      issueId,
      error: issueError.message,
    });
    return NextResponse.json(
      {
        error: "issue_query_failed",
        message: "Unable to load the detected issue.",
      },
      { status: 500 },
    );
  }

  if (!issue) {
    return NextResponse.json(
      { error: "issue_not_found", message: "Issue not found." },
      { status: 404 },
    );
  }

  const [{ data: evidence, error: evidenceError }, { data: history, error: historyError }] =
    await Promise.all([
      worker
        .from("rum_issue_evidence")
        .select("*")
        .eq("issue_id", issueId)
        .eq("site_id", access.site.siteId)
        .order("observed_at", { ascending: false })
        .limit(100),
      worker
        .from("rum_issue_history")
        .select("*")
        .eq("issue_id", issueId)
        .eq("site_id", access.site.siteId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (evidenceError || historyError) {
    console.error("rum issue evidence failed", {
      siteId: access.site.siteId,
      issueId,
      error: evidenceError?.message ?? historyError?.message,
    });
    return NextResponse.json(
      {
        error: "evidence_query_failed",
        message: "Unable to load issue evidence.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: { ...issue, evidence: evidence ?? [], history: history ?? [] } },
    { status: 200 },
  );
}
