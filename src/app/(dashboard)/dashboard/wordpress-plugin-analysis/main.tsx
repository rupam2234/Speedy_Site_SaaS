"use client";

import { useEffect, useState } from "react";
import { AnalysisDashboard, ConnectionPlugin, wpSecret } from ".";
import { ArrowRight, Loader2Icon, Search, Sparkles, Play } from "lucide-react";
import { useSiteContext } from "../siteContext";
import { PluginAnalysis } from "./types";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import { LoadingAnimation, UpgradeFallback } from "@/components/theme";

type AuditQuota = {
  audit_completed: number | null;
  audit_limit: number;
};

export default function Main() {
  const { selectedSite, plan } = useSiteContext();

  const [isReady, setIsReady] = useState(false);
  const [showCompanion, setShowCompanion] = useState(false);
  const [pluginStatus, setPluginStatus] = useState<{
    isConnected: boolean;
    loading: boolean;
  }>({
    isConnected: false,
    loading: false,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PluginAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pluginScanQuota, setPluginScanQuota] = useState<AuditQuota | null>(
    null,
  );

  // Set ready state once site and plan are loaded
  useEffect(() => {
    setIsReady(!!selectedSite && !!plan);
  }, [selectedSite, plan]);

  // Check plugin connection only for Agency plan
  useEffect(() => {
    if (!selectedSite || plan === "Free") return;

    setResult([]);
    cleanExpiredCache({ prefix: `wp-plugins`, session_Storage: false }); // clear localstorage cache
    cleanExpiredCache({ prefix: `wp-plugin-quota`, session_Storage: true }); // clear sessionStorage cache
    checkPluginConnection(selectedSite);
    getAuditQuota();

    // display cached analysis if any
    const cachedPluginAnalysisData = localStorage.getItem(
      `wp-plugins:${selectedSite}`,
    );

    // if available > display cached analysis
    if (cachedPluginAnalysisData) {
      setResult(JSON.parse(cachedPluginAnalysisData).data);
    }
  }, [selectedSite, plan]);

  // Handle "Run Analysis"
  const runValidatedPluginAnalysis = async () => {
    setError(null);

    if (!selectedSite) {
      setError("Please select a domain first.");
      return;
    }

    let rawKey = localStorage.getItem(`plugin_analysis_secret:${selectedSite}`);
    let secret: string | null = null;

    // ensures we have a key
    if (!rawKey) {
      rawKey = await wpSecret(selectedSite);
    }

    if (!rawKey) {
      setError("Scan key not found. Please reconnect your plugin.");
      return;
    }

    try {
      const parsed = JSON.parse(rawKey);

      if (typeof parsed === "string") {
        secret = parsed;
      } else if (parsed?.data?.wp_secret) {
        secret = parsed.data.wp_secret;
      } else {
        secret = null;
      }
    } catch {
      // fallback: raw string
      secret = rawKey;
    }

    if (!secret) {
      setError("Scan key is corrupted. Reconnect your plugin.");
      return;
    }

    handleNewScans(secret, selectedSite);
  };

  if (!isReady || !selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  if (plan === "Free") {
    return <UpgradeFallback />;
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-sm border border-primary/20 bg-primary-foreground dark:bg-secondary-background p-6 transition-all">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/80 text-primary-foreground shadow-primary/20 shadow-lg">
              <Search size={24} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[18px] font-semibold text-primary flex items-center gap-2">
                Audit Your WP Plugins
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <Sparkles size={12} className="mr-1" />
                  New
                </span>
              </h2>
              <p className="text-sm leading-relaxed text-primary/80">
                Scan and identify heavy plugins, their database queries, and
                external requests.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 flex-col md:items-center md:flex-row">
            <p className="text-primary/60 text-xs md:mr-10">
              Analysis Quota:{" "}
              {pluginScanQuota && (
                <span>
                  {pluginScanQuota.audit_completed} /{" "}
                  {pluginScanQuota.audit_limit}
                </span>
              )}
            </p>

            {pluginStatus.isConnected && (
              <button
                onClick={runValidatedPluginAnalysis}
                disabled={loading}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2Icon size={16} className="animate-spin" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                {loading ? "Analyzing..." : "Run New Analysis"}
              </button>
            )}

            <button
              onClick={() => setShowCompanion(true)}
              className={`${
                pluginStatus.isConnected
                  ? "bg-green-600/10 text-green-600 border border-green-600/20"
                  : "text-primary/40"
              } inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-80 focus:outline-none`}
            >
              {pluginStatus.loading ? (
                <Loader2Icon size={18} className="animate-spin" />
              ) : pluginStatus.isConnected ? (
                <>Connected</>
              ) : (
                !pluginStatus.loading &&
                !pluginStatus.isConnected && (
                  <>
                    <ArrowRight size={16} /> Connect
                  </>
                )
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>

      {showCompanion && !pluginStatus.isConnected && (
        <ConnectionPlugin onClose={() => setShowCompanion(false)} />
      )}

      <AnalysisDashboard analysisResult={result} loading={loading} />
    </div>
  );

  // helper functions
  async function checkPluginConnection(domain: string) {
    setPluginStatus({ isConnected: false, loading: true });
    try {
      const res = await fetch("/api/wordpress/check-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const data: any = await res.json();

      if (!res.ok)
        throw new Error(data.message ?? "Failed to check WP connection.");

      setPluginStatus({
        isConnected: !!data?.found?.key && !!data?.found?.plugin,
        loading: false,
      });
    } catch (e: any) {
      setPluginStatus({ isConnected: false, loading: false });
      console.error(e.message ?? "Error fetching WP connection");
    }
  }

  /**
   * returns new WP plugin scan analysis
   * @param key wordpress plugin key to validate scan
   * @param domain domain to run scan for
   */
  async function handleNewScans(key: string, domain: string) {
    const cacheKey = `wp-plugins:${domain}`;

    // if quota exceeded, set error
    if (
      pluginScanQuota &&
      pluginScanQuota.audit_completed &&
      pluginScanQuota.audit_limit
    ) {
      if (pluginScanQuota?.audit_completed >= pluginScanQuota?.audit_limit) {
        setError("Plugin audit quota exceeded! You can purchase more quotas");
        return;
      }
    }

    setLoading(true);

    try {
      const { response } = await cachedData({
        fn: () => analysisApi(key, domain),
        key: cacheKey,
        session_Storage: false,
        ttl: 30 * 60 * 1000, // 30 min cache
        useCache: false, // means we don't need cached data, however it stores the result in cache
      });

      // update quota
      await updateQuota();

      setResult(response);
    } catch (err: any) {
      setError(err.message || "Failed to complete scan");
    } finally {
      setLoading(false);
    }
  }

  async function analysisApi(key: string, domain: string) {
    if (!domain || !key) return;

    const res = await fetch("/api/wordpress/plugin-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, key }),
    });

    const body: any = await res.json();

    if (!res.ok) throw new Error(body.message ?? "Failed to fetch plugin data");
    return body.result;
  }

  /**
   * returns cached version of plugin audit quota
   */
  async function getAuditQuota() {
    const key = `wp-plugin-quota`;

    const { response } = await cachedData({
      fn: innerFunc,
      key: key,
      session_Storage: true,
      ttl: 5 * 60 * 1000, // 5 minutes
    });

    setPluginScanQuota(response);

    async function innerFunc() {
      const res = await fetch("/api/wordpress/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginAudit: false }), // pluginAudit: false means no scan run yet, we just need the quota info
      });

      const body: any = await res.json();

      if (!res.ok) {
        throw new Error(body.message);
      }

      return body.data as AuditQuota;
    }
  }

  /**
   *
   * @returns updated plugin analysis quota (removes previous cached quota)
   */
  async function updateQuota() {
    const res = await fetch("/api/wordpress/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pluginAudit: true }), // pluginAudit: TRUE means add one more scan to quota
    });

    const body: any = await res.json();

    if (!res.ok) {
      throw new Error(body.message);
    }

    // Update state first
    setPluginScanQuota({
      audit_completed: body.used,
      audit_limit: body.limit,
    });

    // Cache for future reads
    sessionStorage.setItem(
      "wp-plugin-quota",
      JSON.stringify({
        data: { audit_completed: body.used, audit_limit: body.limit },
        expiry: Date.now() + 5 * 60 * 1000,
      }),
    );
  }
}
