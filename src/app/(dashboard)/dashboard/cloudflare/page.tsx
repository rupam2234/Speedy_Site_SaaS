"use client";

import { useEffect, useState } from "react";
import { useSiteContext } from "../siteContext";

export default function CloudflareEnhancements() {
  const { selectedSite } = useSiteContext();

  const [isConfigured, setConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedSite) return;

    const checkSiteConnection = async () => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/cloudflare/site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site: selectedSite }),
        });

        setConfigured(res.ok);
      } catch (error) {
        console.error("Failed to check site connection", error);
        setConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSiteConnection();
  }, [selectedSite]);

  return (
    <div className="p-5">
      {isLoading ? (
        // loading skeleton
        <div className="animate-pulse rounded-lg border bg-gray-100 dark:bg-gray-800 p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-700" />
              <div className="h-3 w-full rounded bg-gray-300 dark:bg-gray-700" />
              <div className="h-3 w-2/3 rounded bg-gray-300 dark:bg-gray-700" />
              <div className="h-8 w-40 rounded bg-gray-300 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      ) : isConfigured ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          Cloudflare Enhancements Done Here
        </div>
      ) : (
        <div className="flex items-start gap-4 border bg-primary/5 dark:bg-secondary-background p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/40">
            ☁️
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-orange-500">
              Cloudflare connection required
            </h3>

            <p className="mt-1 text-sm text-primary/80">
              To enable this feature, you must connect the selected website
              (zone) in your Cloudflare account by configuring an API token.
            </p>

            <a
              href={`/dashboard/settings?site=${selectedSite}`}
              rel="nofollow"
              className="mt-4 inline-flex items-center rounded-md bg-primary/80 px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/40 focus:outline-none"
            >
              Configure API Token
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
