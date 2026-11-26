"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { useSiteContext } from "../../../siteContext";
import { LoadingAnimation } from "@/components/theme";

type ContextIssue = {
  id: string;
  issueType: string;
  status: string;
  severity: string;
  confidence: number;
  title: string;
  symptom: string;
  rootCause: string;
  sampleCount: number;
  sessionCount: number;
  metricSummary: Record<string, number>;
  recommendedFix: string[];
  expectedImpact: string;
  verificationPlan: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

type DeviceMetricSummary = {
  metric: string;
  count: number;
  worst: string | null;
};

type DeviceSummary = {
  device: string;
  total: number;
  metrics: DeviceMetricSummary[];
};

type SiteContextPayload = {
  siteId: string;
  domainName: string;
  issueCount: number;
  deviceIssueCount: number;
  issues: ContextIssue[];
  deviceSummary: DeviceSummary[];
};

type AssistantSource = {
  id: string;
  title: string;
  kind: string;
};

type AssistantAnswer = {
  answer: string;
  citations: string[];
  limitations: string[];
  sources: AssistantSource[];
};

type ChatMessage = {
  id: string;
  role: "question" | "answer";
  content: string;
  sources?: AssistantSource[];
  limitations?: string[];
};

const SUGGESTED_QUESTIONS = [
  "What should I fix first?",
  "Which pages are hurting my Core Web Vitals?",
  "How can I verify a fix worked?",
];

const severityStyles: Record<string, string> = {
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  critical: "bg-red-500/15 text-red-700 dark:text-red-300",
  low: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

export default function Main() {
  const { selectedSite, selectedSiteId } = useSiteContext();
  const [context, setContext] = useState<SiteContextPayload | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    if (!selectedSiteId) return;
    setContextLoading(true);
    setContextError(null);

    try {
      const response = await fetch(
        `/api/rum/assistant?site_id=${encodeURIComponent(selectedSiteId)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to load performance context.");
      }
      setContext(body.data as SiteContextPayload);
    } catch (requestError) {
      setContextError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load performance context.",
      );
    } finally {
      setContextLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    setMessages([]);
    setExpandedIssueId(null);
    setFocusedIssueId(null);
    setContext(null);
    void loadContext();
  }, [loadContext]);

  const history = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role === "question" ? "user" : "assistant",
        content: message.content,
      })),
    [messages],
  );

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !selectedSiteId) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "question", content: trimmed },
    ]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rum/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: selectedSiteId,
          question: trimmed,
          issue_id: focusedIssueId,
          history,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to answer this question.");
      }
      const result = body.data as AssistantAnswer;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "answer",
          content: result.answer,
          sources: result.sources.filter((source) =>
            result.citations.includes(source.id),
          ),
          limitations: result.limitations,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to answer this question.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  if (!selectedSite) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center px-4 text-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="m-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <aside className="lg:col-span-5 space-y-3">
        <section className="rounded-sm border border-primary/10 bg-primary-foreground dark:bg-secondary-background">
          <div className="border-b border-primary/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-primary">
              Performance context
            </h2>
            <p className="mt-1 text-xs text-primary/60">
              Measured facts for {selectedSite}, loaded on the server from your
              real visitor data.
            </p>
          </div>

          {contextLoading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-primary/70">
              <Loader2 className="size-4 animate-spin" />
              Loading performance context
            </div>
          ) : contextError ? (
            <div className="flex items-start gap-2 px-4 py-6 text-sm text-red-600 dark:text-red-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{contextError}</span>
            </div>
          ) : context ? (
            <>
              <div className="grid grid-cols-2 divide-x divide-primary/10 border-b border-primary/10">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/55">
                    Published issues
                  </p>
                  <p className="mt-1 text-lg font-semibold text-primary">
                    {context.issueCount}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/55">
                    Device findings
                  </p>
                  <p className="mt-1 text-lg font-semibold text-primary">
                    {context.deviceIssueCount}
                  </p>
                </div>
              </div>
              {context.issues.length === 0 ? (
                <p className="px-4 py-6 text-sm text-primary/60">
                  No published issues are available for this site yet. The
                  assistant explains what is missing rather than guessing.
                </p>
              ) : (
                <div className="divide-y divide-primary/10">
                  {context.issues.map((issue) => {
                    const isExpanded = expandedIssueId === issue.id;
                    const isFocused = focusedIssueId === issue.id;

                    return (
                      <article key={issue.id}>
                        <div className="flex items-start gap-2 px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedIssueId(isExpanded ? null : issue.id)
                            }
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            aria-expanded={isExpanded}
                          >
                            <span
                              className={`mt-0.5 rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                severityStyles[issue.severity] ??
                                severityStyles.medium
                              }`}
                            >
                              {issue.severity}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-primary">
                                {issue.title}
                              </span>
                              <span className="mt-1 block text-xs text-primary/65">
                                {issue.sampleCount} pageviews |{" "}
                                {issue.sessionCount} sessions | confidence{" "}
                                {Math.round(issue.confidence * 100)}%
                              </span>
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="mt-1 size-4 shrink-0 text-primary/60" />
                            ) : (
                              <ChevronDown className="mt-1 size-4 shrink-0 text-primary/60" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFocusedIssueId(isFocused ? null : issue.id)
                            }
                            className={`mt-0.5 shrink-0 rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                              isFocused
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary/20 text-primary/70 hover:bg-primary/5"
                            }`}
                          >
                            {isFocused ? "Focused" : "Focus"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="space-y-3 border-t border-primary/10 bg-primary/5/40 px-4 py-3">
                            <div>
                              <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                                What we found
                              </h3>
                              <p className="mt-1 text-xs text-primary/80">
                                {issue.symptom}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                                Likely cause
                              </h3>
                              <p className="mt-1 text-xs text-primary/80">
                                {issue.rootCause}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                                Recommended fix
                              </h3>
                              <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-primary/80">
                                {issue.recommendedFix.map((fix) => (
                                  <li key={fix}>{fix}</li>
                                ))}
                              </ol>
                            </div>
                            <div>
                              <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                                Verification
                              </h3>
                              <p className="mt-1 text-xs text-primary/80">
                                {issue.verificationPlan}
                              </p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </section>
        <section className="rounded-sm border border-primary/10 bg-primary-foreground dark:bg-secondary-background">
          <div className="border-b border-primary/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-primary">
              Device breakdown
            </h2>
            <p className="mt-1 text-xs text-primary/60">
              Metrics that crossed the Core Web Vitals threshold, grouped by
              device type.
            </p>
          </div>

          {!context || context.deviceSummary.every((device) => device.total === 0) ? (
            <p className="px-4 py-6 text-sm text-primary/60">
              No device level findings are available for this site yet.
            </p>
          ) : (
            <div className="divide-y divide-primary/10">
              {context.deviceSummary.map((device) => (
                <div key={device.device} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/75">
                      {device.device}
                    </p>
                    <p className="text-[11px] text-primary/60">
                      {device.total} findings
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {device.metrics.map((metric) => (
                      <div
                        key={metric.metric}
                        className="rounded-sm border border-primary/10 px-2 py-1.5"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary/55">
                          {metric.metric} ({metric.count})
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-primary/75">
                          {metric.worst ?? "No finding"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
      <section className="lg:col-span-7 rounded-sm border border-primary/10 bg-primary-foreground dark:bg-secondary-background">
        <div className="flex items-start gap-2 border-b border-primary/10 px-4 py-3">
          <span className="rounded-sm bg-primary/10 p-1.5 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-primary">
              Performance assistant
            </h2>
            <p className="mt-1 text-xs text-primary/60">
              Answers use this site&apos;s measured evidence and approved
              WordPress remediation guidance.
            </p>
          </div>
        </div>

        {focusedIssueId ? (
          <div className="flex items-center justify-between gap-2 border-b border-primary/10 bg-primary/5 px-4 py-2">
            <p className="text-[11px] text-primary/70">
              Focused on one issue. The answer uses that issue&apos;s facts only.
            </p>
            <button
              type="button"
              onClick={() => setFocusedIssueId(null)}
              className="shrink-0 rounded-sm border border-primary/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary/70 transition-colors hover:bg-primary/5"
            >
              Clear focus
            </button>
          </div>
        ) : null}

        <div className="space-y-4 px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-primary/70">
                Ask about the performance of {selectedSite}. The assistant
                answers from the published issues and device findings on the
                left, and says what is missing when evidence is thin.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void ask(suggestion)}
                    className="rounded-sm border border-primary/15 px-3 py-1.5 text-xs text-primary/75 transition-colors hover:bg-primary/5"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === "question" ? (
              <div
                key={message.id}
                className="ml-auto max-w-[85%] rounded-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
              >
                {message.content}
              </div>
            ) : (
              <div
                key={message.id}
                className="max-w-[95%] rounded-sm border border-primary/10 bg-primary/5 px-3 py-3"
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary/80">
                  {message.content}
                </p>
                {message.sources?.length ? (
                  <div className="mt-3 border-t border-primary/10 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/55">
                      Sources
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-primary/65">
                      {message.sources.map((source) => (
                        <li key={source.id}>
                          {source.title} ({source.kind.replaceAll("_", " ")})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {message.limitations?.length ? (
                  <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                    {message.limitations.join(" ")}
                  </div>
                ) : null}
              </div>
            ),
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-primary/60">
              <Loader2 className="size-3.5 animate-spin" />
              Analysing your site data
            </div>
          )}

          {error ? (
            <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 border-t border-primary/10 px-4 py-3"
        >
          <label className="sr-only" htmlFor="assistant-question">
            Ask about your site performance
          </label>
          <textarea
            id="assistant-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Ask what to fix first, or how to verify a change"
            className="min-h-16 flex-1 resize-none rounded-sm border border-primary/15 bg-background px-3 py-2 text-sm outline-none placeholder:text-primary/40 focus:border-primary/40"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Send question"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </form>
      </section>
    </div>
  );
}

