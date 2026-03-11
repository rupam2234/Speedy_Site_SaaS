"use client";

import { useEffect, useState } from "react";
import { AnalysisDashboard, CompanionPlugin } from ".";
import { ArrowRight, Loader2Icon, Search, Sparkles, Play } from "lucide-react";
import { useSiteContext } from "../siteContext";
import { PluginAnalysis } from "./types";
import { cachedData, cleanExpiredCache } from "@/components/utils";

export default function Main() {
  const [showCompanion, setShowCompanion] = useState(false);
  const [pluginStatus, setPluginStatus] = useState<{
    isConnected: boolean;
    loading: boolean;
  }>({ isConnected: false, loading: false });

  const { selectedSite } = useSiteContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PluginAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSite) return;
    setResult([]);
    cleanExpiredCache({ prefix: `wp-plugins`, session_Storage: true });
    checkPlugin(selectedSite);
  }, [selectedSite]);

  // Function to handle the "Run Analysis" click
  const handleRunAnalysis = () => {
    setError(null);
    if (!selectedSite) {
      setError("Please select a domain first.");
      return;
    }

    const key = localStorage.getItem(`plugin_analysis_secret:${selectedSite}`);

    if (key) {
      try {
        const parsed = JSON.parse(key);
        const secret = parsed.data?.wp_secret;
        if (secret) {
          handleScans(secret, selectedSite); // trigger scan
        } else {
          setError(
            "Scan key not found. Please click 'Connected' to re-enter your key.",
          );
          setShowCompanion(true);
        }
      } catch (err) {
        setError(
          "Scan key is corrupted. Please click 'Connected' to re-enter your key.",
        );
        setShowCompanion(true);
      }
    } else {
      setError(
        "Scan key not found. Please click 'Connected' to re-enter your key.",
      );
      setShowCompanion(true);
    }
  };

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
                Scan and identify heavy plugins, their database queries and
                external requests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pluginStatus.isConnected && (
              <button
                onClick={handleRunAnalysis}
                disabled={loading}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2Icon size={16} className="animate-spin" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                {loading ? "Analyzing..." : "Run Analysis"}
              </button>
            )}

            <button
              onClick={() => setShowCompanion(true)}
              className={`${
                pluginStatus.isConnected
                  ? "bg-green-600/10 text-green-600 border border-green-600/20"
                  : "bg-primary text-primary-foreground"
              } inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-80 focus:outline-none`}
            >
              {pluginStatus.loading ? (
                <Loader2Icon size={16} className="animate-spin" />
              ) : pluginStatus.isConnected ? (
                <>Connected</>
              ) : (
                <>
                  <ArrowRight size={16} /> Connect
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>

      {showCompanion && !pluginStatus.isConnected && (
        <CompanionPlugin onClose={() => setShowCompanion(false)} />
      )}

      <AnalysisDashboard analysisResult={result} loading={loading} />
    </div>
  );

  async function checkPlugin(domain: string) {
    setPluginStatus({ isConnected: false, loading: true });
    try {
      const res = await fetch("/api/wordpress/check-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain }),
      });

      const data: any = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? "Failed to check WP connection.");
      }

      if (data?.found?.key && data?.found?.plugin) {
        setPluginStatus({ isConnected: true, loading: false });
      } else {
        setPluginStatus({ isConnected: false, loading: false });
      }
    } catch (e: any) {
      setPluginStatus({ isConnected: false, loading: false });
      console.error(e.message ?? "Error fetching WP connection");
    }
  }

  async function handleScans(key: string, domain: string) {
    const cacheKey = `wp-plugins:${domain}`;
    setLoading(true);
    try {
      const { response } = await cachedData({
        fn: () => fetchAnalysis(key, domain),
        key: cacheKey,
        session_Storage: true,
        ttl: 30 * 60 * 1000,
      });

      setResult(response);
    } catch (err: any) {
      setError(err.message || "Failed to complete scan");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnalysis(key: string, domain: string) {
    if (!domain || !key) return;

    const res = await fetch("/api/wordpress/plugin-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domain, key: key }),
    });

    const body: any = await res.json();

    if (!res.ok) {
      throw new Error(body.message ?? "Failed to fetch plugin data");
    }

    return body.result;
  }
}
