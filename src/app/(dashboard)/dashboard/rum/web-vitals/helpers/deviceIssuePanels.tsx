"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Braces,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileType2,
  Globe,
  ImageIcon,
  Layers,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useSiteContext } from "../../../siteContext";
import {
  type AssetMarkType,
  type DeviceIssue,
  type DeviceKey,
  type IssueMetric,
  issuePageCount,
  paginateIssues,
} from "@/lib/rum/deviceIssues";

const DEVICES: Array<{
  key: DeviceKey;
  label: string;
  icon: typeof Monitor;
}> = [
  { key: "desktop", label: "Desktop", icon: Monitor },
  { key: "mobile", label: "Mobile", icon: Smartphone },
  { key: "tablet", label: "Tablet", icon: Tablet },
];

const METRIC_ORDER: IssueMetric[] = ["LCP", "INP", "CLS", "TTFB"];

const METRIC_STYLES: Record<IssueMetric, string> = {
  LCP: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  INP: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  CLS: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  TTFB: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const RATING_STYLES: Record<DeviceIssue["rating"], string> = {
  poor: "text-red-600 dark:text-red-400",
  "needs-improvement": "text-amber-600 dark:text-amber-400",
  good: "text-emerald-600 dark:text-emerald-400",
};

const ASSET_ICONS: Record<AssetMarkType, typeof ImageIcon> = {
  image: ImageIcon,
  font: FileType2,
  script: Braces,
  stylesheet: Layers,
  element: Layers,
  page: Globe,
  other: Globe,
};

type DeviceIssueResponse = Record<DeviceKey, DeviceIssue[]>;

function resolvePageHref(
  site: string | null,
  page: string | null,
): string | null {
  if (!page) return null;
  if (page.startsWith("http://") || page.startsWith("https://")) return page;
  if (!site) return null;
  return `https://${site}${page.startsWith("/") ? page : `/${page}`}`;
}

export default function DeviceIssuePanels({ domain }: { domain: string }) {
  const { selectedSite } = useSiteContext();
  const [issues, setIssues] = useState<DeviceIssueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closedMetrics, setClosedMetrics] = useState<
    Record<string, IssueMetric[]>
  >({});
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [metricPages, setMetricPages] = useState<Record<string, number>>({});

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rum/device-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to load performance issues.");
      }
      setIssues(body.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load performance issues.",
      );
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    setOpenIssueId(null);
    setClosedMetrics({});
    setMetricPages({});
    void loadIssues();
  }, [loadIssues]);

  const grouped = useMemo(() => {
    if (!issues) return null;

    return DEVICES.map((device) => {
      const deviceIssues = issues[device.key] ?? [];
      const byMetric = METRIC_ORDER.map((metric) => {
        const metricIssues = deviceIssues.filter(
          (issue) => issue.metric === metric,
        );
        const pageKey = `${device.key}:${metric}`;
        const page = metricPages[pageKey] ?? 0;
        const pageCount = issuePageCount(metricIssues.length);

        return {
          metric,
          pageKey,
          page,
          pageCount,
          total: metricIssues.length,
          issues: paginateIssues(metricIssues, page),
        };
      }).filter((group) => group.total > 0);

      return { ...device, byMetric, total: deviceIssues.length };
    });
  }, [issues, metricPages]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary/70">
        <Loader2 className="size-4 animate-spin" />
        Loading performance issues
      </div>
    );
  }

  return (
    <section className="rounded-sm border border-primary/10 bg-primary-foreground dark:bg-secondary-background">
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-primary">
          Performance issues
        </h2>
        <p className="mt-1 text-xs text-primary/60">
          Issue list per device, based on real visitor data from the last 7
          days. Expand an issue to see the affected asset and the recommended
          fix.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 px-4 py-4 text-sm text-red-600 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-primary/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {grouped?.map((device) => {
            const DeviceIcon = device.icon;
            const closed = closedMetrics[device.key] ?? [];

            return (
              <div key={device.key} className="min-w-0">
                <div className="flex items-center justify-between gap-2 border-b border-primary/10 bg-primary/5/40 px-4 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
                    <DeviceIcon className="size-4" />
                    {device.label}
                  </span>
                  <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary/70">
                    {device.total} {device.total === 1 ? "issue" : "issues"}
                  </span>
                </div>

                {device.byMetric.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-primary/60">
                    No performance issues detected for{" "}
                    {device.label.toLowerCase()}.
                  </p>
                ) : (
                  <div className="divide-y divide-primary/10">
                    {device.byMetric.map((group) => {
                      const isOpen = !closed.includes(group.metric);

                      return (
                        <div key={group.metric}>
                          <div className="flex items-center gap-1 pr-2">
                            <button
                              type="button"
                              onClick={() =>
                                setClosedMetrics((current) => {
                                  const deviceClosed =
                                    current[device.key] ?? [];
                                  const nextClosed = deviceClosed.includes(
                                    group.metric,
                                  )
                                    ? deviceClosed.filter(
                                        (metric) => metric !== group.metric,
                                      )
                                    : [...deviceClosed, group.metric];

                                  return {
                                    ...current,
                                    [device.key]: nextClosed,
                                  };
                                })
                              }
                              className="flex min-w-0 flex-1 items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-primary/5"
                              aria-expanded={isOpen}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${METRIC_STYLES[group.metric]}`}
                                >
                                  {group.metric}
                                </span>
                                <span className="text-xs text-primary/70">
                                  {group.total}{" "}
                                  {group.total === 1 ? "issue" : "issues"}
                                </span>
                              </span>
                              <ChevronDown
                                className={`size-4 shrink-0 text-primary/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              />
                            </button>

                            {group.pageCount > 1 ? (
                              <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenIssueId(null);
                                    setMetricPages((current) => ({
                                      ...current,
                                      [group.pageKey]: Math.max(
                                        0,
                                        (current[group.pageKey] ?? 0) - 1,
                                      ),
                                    }));
                                  }}
                                  disabled={group.page === 0}
                                  aria-label={`Previous ${group.metric} issues`}
                                  className="rounded-sm p-1 text-primary/70 transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                  <ChevronLeft className="size-4" />
                                </button>
                                <span className="min-w-9 text-center text-[10px] font-medium tabular-nums text-primary/60">
                                  {group.page + 1}/{group.pageCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenIssueId(null);
                                    setMetricPages((current) => ({
                                      ...current,
                                      [group.pageKey]: Math.min(
                                        group.pageCount - 1,
                                        (current[group.pageKey] ?? 0) + 1,
                                      ),
                                    }));
                                  }}
                                  disabled={group.page >= group.pageCount - 1}
                                  aria-label={`Next ${group.metric} issues`}
                                  className="rounded-sm p-1 text-primary/70 transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                  <ChevronRight className="size-4" />
                                </button>
                              </div>
                            ) : null}
                          </div>

                          {isOpen ? (
                            <div className="divide-y divide-primary/10 border-t border-primary/10">
                              {group.issues.map((issue) => (
                                <IssueRow
                                  key={issue.id}
                                  issue={issue}
                                  site={selectedSite}
                                  expanded={openIssueId === issue.id}
                                  onToggle={() =>
                                    setOpenIssueId((current) =>
                                      current === issue.id ? null : issue.id,
                                    )
                                  }
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function IssueRow({
  issue,
  site,
  expanded,
  onToggle,
}: {
  issue: DeviceIssue;
  site: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const AssetIcon = ASSET_ICONS[issue.asset?.type ?? "other"];
  const assetUrl = issue.asset?.url ?? null;
  const pageHref = resolvePageHref(site, issue.page);

  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-primary">
              {issue.title}
            </span>
            {issue.summary ? (
              <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary/70">
                Device wide
              </span>
            ) : null}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex max-w-full items-center gap-1 rounded-sm border border-primary/15 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary/70">
              <AssetIcon className="size-3 shrink-0" />
              <span className="truncate">
                {issue.asset?.label ?? "unknown asset"}
              </span>
            </span>
            {issue.page ? (
              <span className="truncate text-[10px] text-primary/55">
                {issue.page}
              </span>
            ) : null}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className={`block text-xs font-bold tabular-nums ${RATING_STYLES[issue.rating]}`}
          >
            {issue.valueLabel}
          </span>
          <span className="mt-0.5 block text-[10px] text-primary/55">
            {issue.metric}
          </span>
        </span>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 rounded-sm border border-primary/10 bg-primary/5/40 p-3">
          <p className="text-xs text-primary/75">{issue.impact}</p>

          <div className="grid grid-cols-2 gap-2">
            {issue.details.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-primary/55">
                  {detail.label}
                </p>
                <p className="truncate text-xs font-medium text-primary/85">
                  {detail.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
              How to fix
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-primary/80">
              {issue.fixes.map((fix) => (
                <li key={fix}>{fix}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {pageHref ? (
              <Link
                href={pageHref}
                target="_blank"
                className="text-primary/80 underline underline-offset-2 hover:text-primary"
              >
                Open affected page
              </Link>
            ) : null}
            {assetUrl ? (
              <Link
                href={assetUrl}
                target="_blank"
                className="text-primary/80 underline underline-offset-2 hover:text-primary"
              >
                View asset
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
