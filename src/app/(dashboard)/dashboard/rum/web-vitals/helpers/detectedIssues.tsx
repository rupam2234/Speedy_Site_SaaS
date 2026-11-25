"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import IssueAssistant from "./issueAssistant";

type IssueSummary = {
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
};

type IssueDetail = IssueSummary & {
  evidence: Array<{
    id: number;
    evidence_kind: string;
    facts: Record<string, unknown>;
    observed_at: string;
  }>;
};

const severityStyles: Record<string, string> = {
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  critical: "bg-red-500/15 text-red-700 dark:text-red-300",
  low: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

export default function DetectedIssues({ siteId }: { siteId: string | null }) {
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIssues = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/rum/issues?site_id=${encodeURIComponent(siteId)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to load detected issues.");
      }
      setIssues(Array.isArray(body.data) ? body.data : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load detected issues.",
      );
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    setExpandedId(null);
    setDetail(null);
    void loadIssues();
  }, [loadIssues]);

  async function toggleIssue(issueId: string) {
    if (expandedId === issueId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }

    setExpandedId(issueId);
    setDetailLoading(true);
    try {
      const response = await fetch(
        `/api/rum/issues/${issueId}?site_id=${encodeURIComponent(siteId ?? "")}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to load issue evidence.");
      }
      setDetail(body.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load issue evidence.",
      );
    } finally {
      setDetailLoading(false);
    }
  }


  if (!siteId || loading) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary/70">
        <Loader2 className="size-4 animate-spin" />
        Loading detected issues
      </div>
    );
  }

  return (
    <section className="rounded-sm border border-primary/10 bg-primary-foreground dark:bg-secondary-background">
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-primary">Detected issues</h2>
        <p className="mt-1 text-xs text-primary/60">
          Evidence-backed issues identified from recurring patterns in your real visitor data.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 px-4 py-4 text-sm text-red-600 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : issues.length === 0 ? (
        <div className="px-4 py-6 text-sm text-primary/60">
          No published issues are currently available for this site. A new issue
          will appear here after a detection run confirms a recurring pattern in
          real-user data.
        </div>
      ) : (
        <div className="divide-y divide-primary/10">
          {issues.map((issue) => {
            const isExpanded = expandedId === issue.id;
            const scope = issue.affected_scope ?? {};
            const pageTemplate = String(scope.page_template ?? "/");
            const device = String(scope.device ?? "all devices");

            return (
              <article key={issue.id}>
                <button
                  type="button"
                  onClick={() => void toggleIssue(issue.id)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-primary/5"
                  aria-expanded={isExpanded}
                >
                  <span
                    className={`mt-0.5 rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      severityStyles[issue.severity] ?? severityStyles.medium
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-primary">
                      {issue.title}
                    </span>
                    <span className="mt-1 block text-xs text-primary/65">
                      {pageTemplate} | {device} | {issue.sample_count} pageviews |{" "}
                      {issue.session_count} sessions | confidence{" "}
                      {Math.round(issue.confidence * 100)}%
                    </span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="mt-1 size-4 shrink-0 text-primary/60" />
                  ) : (
                    <ChevronDown className="mt-1 size-4 shrink-0 text-primary/60" />
                  )}
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-primary/10 bg-primary/5/40 px-4 py-4">
                    {detailLoading ? (
                      <div className="flex items-center gap-2 text-xs text-primary/60">
                        <Loader2 className="size-4 animate-spin" />
                        Loading authoritative evidence
                      </div>
                    ) : detail ? (
                      <>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/70">
                            What we found
                          </h3>
                          <p className="mt-1 text-sm text-primary/80">
                            {detail.symptom}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/70">
                            Likely cause
                          </h3>
                          <p className="mt-1 text-sm text-primary/80">
                            {detail.root_cause}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/70">
                            Recommended fix
                          </h3>
                          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-primary/80">
                            {detail.recommended_fix.map((fix) => (
                              <li key={fix}>{fix}</li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/70">
                            Expected result
                          </h3>
                          <p className="mt-1 text-sm text-primary/80">
                            {detail.expected_impact}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/70">
                            Verification
                          </h3>
                          <p className="mt-1 text-sm text-primary/80">
                            {detail.verification_plan}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/70">
                            Evidence
                          </h3>
                          <p className="mt-1 text-xs text-primary/60">
                            {detail.evidence.length} bounded evidence records
                            linked to this issue.
                          </p>
                        </div>
                        {siteId ? (
                          <IssueAssistant siteId={siteId} issueId={detail.id} />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

