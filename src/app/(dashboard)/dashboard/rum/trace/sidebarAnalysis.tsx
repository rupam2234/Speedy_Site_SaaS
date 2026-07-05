"use client";

import { CacheHitMiss } from "@/app/api/network-and-server/cache-hit-miss/route";
import { StarsIcon, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";

interface SidebarAnalysisProps {
  networkServerData: any;
  cacheHitMissData: CacheHitMiss[];
}

interface AnalysisProps {
  totalSample: number;
  totalRequests: number;
  originMissRate: number;
  cacheHitRate: number;
  ttfb_75: number;
}

type AnalysisData = {
  url: string;
  startTime: number | null;
  duration: number | null;
  type: string;
};

export default function SidebarAnalysis({
  cacheHitMissData,
  networkServerData,
}: SidebarAnalysisProps) {
  const { selectedSite } = useSiteContext();

  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [assets, setAssets] = useState<any[]>([]);
  const siteRef = useRef<string>("");

  useEffect(() => {
    if (siteRef.current !== selectedSite) {
      setAnalysisResult("");
    }

    siteRef.current = selectedSite;
  }, [selectedSite]);

  // network and server metrics
  const metrics = useMemo(() => {
    const totalSample = cacheHitMissData.length;

    const totalRequests = cacheHitMissData.reduce(
      (acc, curr) => acc + (Number(curr.total_origin_events) || 0),
      0,
    );

    const avgOriginMissRaw = cacheHitMissData.reduce(
      (acc, curr) =>
        acc + curr.total_origin_events * (curr.origin_hit_percentage / 100),
      0,
    );

    const originMissRate =
      totalRequests > 0 ? (avgOriginMissRaw / totalRequests) * 100 : 0;

    const cacheHitRate = 100 - originMissRate;

    const filteredTtfbData =
      networkServerData?.filter(
        (x: { ttfb: null | undefined }) =>
          x.ttfb !== null && x.ttfb !== undefined && typeof x.ttfb === "number",
      ) || [];

    const ttfb_75 = percentile(
      75,
      filteredTtfbData.map((x: { ttfb: any }) => x.ttfb),
    );

    return {
      totalSample,
      totalRequests,
      originMissRate,
      cacheHitRate,
      ttfb_75,
    };
  }, [cacheHitMissData, networkServerData]);

  const parsedLines = useMemo(() => {
    return analysisResult
      ?.split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^•\s?/, ""))
      .map((l) => {
        let result = l;
        assets.forEach((a) => {
          const host = safeHostname(a.url);
          if (
            host &&
            result.includes(host) &&
            !result.includes(`\`${host}\``)
          ) {
            result = result.replaceAll(host, `\`${host}\``);
          }
        });
        return result;
      });
  }, [analysisResult, assets]);

  useEffect(() => {
    if (networkServerData.length === 0) return;

    const seen = new Set<string>();
    const collected: AnalysisData[] = [];

    networkServerData.forEach((x: any) => {
      const asset = x.har_data.slowest;

      for (let i = 0; i < asset.length; i++) {
        const item = asset[i];

        if (!item?.url) continue;

        const hostname: string | null = safeHostname(item.url);

        if (
          hostname !== selectedSite &&
          item?.start < 1500 &&
          item?.duration > 500 &&
          !seen.has(hostname !== null ? hostname : "")
        ) {
          seen.add(hostname !== null ? hostname : "");
          collected.push({
            url: item.url,
            duration: item.duration,
            startTime: item.start,
            type: item.type,
          });
        }
      }
    });

    setAssets(collected);
  }, [selectedSite, networkServerData]);

  return (
    <>
      <div className="space-y-4 mt-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap size={14} className="opacity-70" />
              <span>Cache Hit Rate</span>
            </div>

            <span className="font-medium text-foreground">
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
          </div>

          <div className="flex h-2 cursor-pointer w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${metrics.cacheHitRate}%` }}
              title={`Cache Hit ${metrics.cacheHitRate?.toFixed(2)}%`}
            />

            <div
              className="bg-amber-500/80 transition-all"
              style={{ width: `${metrics.originMissRate}%` }}
              title={`Cache Miss ${metrics.originMissRate?.toFixed(2)}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Hit</span>
              </div>

              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-amber-500/80" />
                <span>Miss</span>
              </div>
            </div>

            <span className="font-mono text-sm">
              {metrics.totalRequests.toLocaleString()} requests
            </span>
          </div>
        </div>

        {/* Stats Summary Table */}
        <div className="pt-2 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time Bucket</span>
            <span className="font-mono font-medium">
              {metrics.totalSample} hrs
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">TTFB (75 Percentile)</span>
            <span className="font-mono font-medium">
              {metrics.ttfb_75?.toFixed(0)} ms
            </span>
          </div>

          <button
            onClick={() => {
              setAnalysisResult("");
              analyzeServerPerformance({
                analysisProps: metrics,
                networkServerData: networkServerData,
              });
            }}
            // disabled={analysisResult.length > 0}
            className="mt-5 rounded-sm bg-purple-600 text-xs px-3 py-1 cursor-pointer hover:bg-purple-800 text-primary-foreground font-medium flex gap-2 items-center"
          >
            <StarsIcon
              size={14}
              className={`fill-yellow-200 ${analyzing ? "animate-spin duration-500" : ""}`}
            />
            {analyzing && analysisResult.length === 0
              ? "Analyzing..."
              : "Analyze Assets That Can Be Optimized"}
          </button>

          {parsedLines.length > 0 && (
            <div className="space-y-2 mt-3">
              {parsedLines.map((line, i) => (
                <div
                  key={i}
                  className="p-2 rounded-sm border border-primary/10 text-sm text-primary/80 wrap-break-word whitespace-normal"
                >
                  {renderLineWithCode(line)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  async function analyzeServerPerformance({
    networkServerData,
    analysisProps,
  }: {
    networkServerData: any;
    analysisProps: AnalysisProps;
  }) {
    const navigation_timing_data = [...networkServerData].map(
      (x) => x.navigation_timing,
    );

    if (navigation_timing_data.length === 0 || !analysisProps) return;

    setAnalyzing(true);
    setAnalysisResult("");

    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch("/api/analysis/server", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: assets,
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(error ?? "Unable to get analysis result");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
          const x = await reader?.read();

          if (x?.done) {
            setAnalyzing(false);
            break;
          }

          buffer += decoder.decode(x?.value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          // data comes as  ---
          // data: {"choices":[{"delta":{"content":"Hello"}}]}
          // data: {"choices":[{"delta":{"content":" world"}}]}

          for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed.startsWith("data:")) continue;

            const json = trimmed.replace("data:", "").trim();

            if (json === "[DONE]") continue;

            const parsed = JSON.parse(json);

            const content = parsed.choices?.[0]?.delta?.content ?? "";

            setAnalysisResult((prev) => (prev || "") + content);
          }
        }

        setAnalyzing(false);
        return; // return if success
      } catch (error: any) {
        if (attempt < maxRetries - 1) {
          await sleep(3000 * (attempt + 1));
          continue;
        }

        setAnalyzing(false);

        console.error(
          error.message ?? "Unexpacted error occured during analysis",
        );
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const percentile = (p: number, values: number[]) => {
  if (!values) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const p75_index = Math.ceil((p / 100) * sorted.length) - 1; // p75 formula
  return sorted[Math.max(0, p75_index)];
};

function safeHostname(url: string): string | null {
  if (!url) {
    return null;
  } else if (url.includes("rum.speedy.site/rum.js")) {
    return null;
  } else if (url.startsWith("//")) {
    url = `https:${url}`;
  } else if (url.startsWith("/")) {
    return null;
  }

  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalized).hostname;
  } catch {
    return null;
  }
}

function renderLineWithCode(line: string) {
  const parts = line.split(/(`[^`]+`)/g);

  return parts.flatMap((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={`b-${idx}`}
          className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono break-all"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const domainRegex = /\b([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?\b/gi;
    const matches = [...part.matchAll(domainRegex)];

    if (matches.length === 0) {
      return <span key={`s-${idx}`}>{part}</span>;
    }

    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((m, mIdx) => {
      const matchStart = m.index ?? 0;
      if (matchStart > lastIndex) {
        result.push(
          <span key={`t-${idx}-${mIdx}`}>
            {part.slice(lastIndex, matchStart)}
          </span>,
        );
      }
      result.push(
        <code
          key={`d-${idx}-${mIdx}`}
          className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono break-all"
        >
          {m[0]}
        </code>,
      );
      lastIndex = matchStart + m[0].length;
    });

    if (lastIndex < part.length) {
      result.push(<span key={`e-${idx}`}>{part.slice(lastIndex)}</span>);
    }

    return result;
  });
}
