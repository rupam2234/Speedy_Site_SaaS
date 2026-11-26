import { setupDB } from "@/lib/db";
import { readDeviceIssueGroups } from "@/lib/rum/deviceIssueReader";
import type { DeviceIssue, DeviceKey } from "@/lib/rum/deviceIssues";

const worker = setupDB();

export type AssistantIssueFact = {
  id: string;
  issue_type: string;
  status: string;
  severity: string;
  confidence: number;
  title: string;
  symptom: string;
  root_cause: string;
  affected_scope: Record<string, unknown>;
  sample_count: number;
  session_count: number;
  metric_summary: Record<string, number>;
  recommended_fix: string[];
  expected_impact: string;
  verification_plan: string;
  first_seen_at: string;
  last_seen_at: string;
};

export type AssistantSiteContext = {
  siteId: string;
  domainName: string;
  issues: AssistantIssueFact[];
  deviceIssues: Record<DeviceKey, DeviceIssue[]>;
  issueCount: number;
  deviceIssueCount: number;
};

const MAX_CONTEXT_ISSUES = 25;

/**
 * Loads the canonical facts the assistant is allowed to reason about. The
 * browser never supplies these values, so the model cannot be fed invented
 * measurements, counts, or scope by a client.
 */
export async function loadAssistantSiteContext(
  siteId: string,
  domainName: string,
): Promise<AssistantSiteContext> {
  const [issueResult, deviceIssues] = await Promise.all([
    worker
      .from("rum_issue_documents")
      .select(
        "id, issue_type, status, severity, confidence, title, symptom, root_cause, affected_scope, sample_count, session_count, metric_summary, recommended_fix, expected_impact, verification_plan, first_seen_at, last_seen_at",
      )
      .eq("site_id", siteId)
      .eq("is_published", true)
      .order("last_seen_at", { ascending: false })
      .limit(MAX_CONTEXT_ISSUES),
    readDeviceIssueGroups(domainName),
  ]);

  if (issueResult.error) throw new Error(issueResult.error.message);

  const issues = (issueResult.data ?? []) as AssistantIssueFact[];
  const deviceIssueCount = Object.values(deviceIssues).reduce(
    (total, group) => total + group.length,
    0,
  );

  return {
    siteId,
    domainName,
    issues,
    deviceIssues,
    issueCount: issues.length,
    deviceIssueCount,
  };
}

/** Compact per device and metric summary used by the assistant context panel. */
export function summarizeDeviceIssues(
  deviceIssues: Record<DeviceKey, DeviceIssue[]>,
): Array<{
  device: DeviceKey;
  total: number;
  metrics: Array<{ metric: string; count: number; worst: string | null }>;
}> {
  const metricOrder = ["LCP", "CLS", "INP", "TTFB"];

  return (Object.keys(deviceIssues) as DeviceKey[]).map((device) => {
    const group = deviceIssues[device];
    const metrics = metricOrder.map((metric) => {
      const matching = group.filter((issue) => issue.metric === metric);
      const worst = matching[0] ?? null;
      return {
        metric,
        count: matching.length,
        worst: worst ? `${worst.valueLabel} on ${worst.page ?? "the site"}` : null,
      };
    });

    return { device, total: group.length, metrics };
  });
}
