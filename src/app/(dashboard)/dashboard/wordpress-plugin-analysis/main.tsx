"use client";

import { useEffect, useState } from "react";
import { CompanionPlugin, PluginScan } from ".";
import { ArrowRight, Loader2Icon, Search, Sparkles } from "lucide-react";
import { useSiteContext } from "../siteContext";

export default function Main() {
  const [showCompanion, setShowCompanion] = useState(false);
  const [pluginStatus, setPluginStatus] = useState<{
    isConnected: boolean;
    loading: boolean;
  }>({ isConnected: false, loading: false });
  const { selectedSite } = useSiteContext();

  useEffect(() => {
    if (!selectedSite) return;

    checkPlugin(selectedSite);
  }, [selectedSite]);

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-sm border border-slate-200 dark:border-primary/20 bg-primary-foreground dark:bg-secondary-background p-6 transition-all">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
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
                Scan your plugins to identify heavy ones and see their estimated
                database queries and external HTTP requests to improve site
                performance.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCompanion(true)}
            className={`${pluginStatus.isConnected ? "bg-green-600 text-primary-foreground" : ""} inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:bg-primary/60 hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2`}
          >
            {pluginStatus.loading ? (
              <>
                <Loader2Icon
                  size={16}
                  className="text-primary/30 animate-spin"
                />
              </>
            ) : !pluginStatus.loading && pluginStatus.isConnected ? (
              <>Connected</>
            ) : !pluginStatus.loading && !pluginStatus.isConnected ? (
              <>
                <ArrowRight size={16} className="" /> Connect
              </>
            ) : (
              <></>
            )}
          </button>
        </div>
      </div>

      {showCompanion && !pluginStatus.isConnected && (
        <CompanionPlugin onClose={() => setShowCompanion(false)} />
      )}

      <PluginScan
        domain={selectedSite}
        onConnect={() => handleScans}
        isConnected={pluginStatus.isConnected}
      />
    </div>
  );

  async function checkPlugin(domain: string) {
    setPluginStatus({ isConnected: false, loading: true });

    const res = await fetch("/api/wordpress/check-connection", {
      method: "POST",
      headers: {
        "Content-Type": "appliaction/json",
      },
      body: JSON.stringify({ domain: domain }),
    });

    const data: any = await res.json();

    if (!res.ok) {
      setPluginStatus({ isConnected: false, loading: false });
      console.error("Unable to check plugin data");
      return;
    }

    if (data?.found?.key && data?.found?.plugin) {
      setPluginStatus({ isConnected: true, loading: false });
    }
  }
}

function handleScans() {}
