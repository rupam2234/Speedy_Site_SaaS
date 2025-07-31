"use client";

import React, { useEffect, useState } from "react";
import { Copy, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteContext } from "../siteContext";

type Tab = "wordpress" | "other";

export default function TrackingIntegration() {
  const { selectedSite } = useSiteContext();
  const [, setCopied] = useState(false);
  const [usage, setRowCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("wordpress");

  const trackingScript = `<script src="https://rum.thespeedysite.workers.dev/rum.js?v=0.0.1" defer></script>`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Script copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toast.error(`Copy failed: ${err}`);
    }
  };

  function formatNumber(value: number) {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "B";
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
    return value?.toString();
  }

  useEffect(() => {
    if (!selectedSite) return;

    fetch("/api/rum/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domain_name: selectedSite }),
    })
      .then((res) => res.json())
      .then((data) => {
        setRowCount(data.row_count);
      })
      .catch((err) => {
        console.error("Error fetching row count:", err);
        setRowCount(null);
      });
  }, [selectedSite]);

  return (
    <div className="m-5 border rounded-sm p-4 bg-primary-foreground dark:bg-secondary-background">
      <span className="flex gap-2 items-center">
        <Settings2 />
        <h2 className="my-3 font-bold text-2xl">RUM Integration</h2>
      </span>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left side: Tabs + mini status */}
        <div className="flex-1">
          {/* Tabs + Status container */}
          <div className="flex items-center justify-between border-b border-muted-foreground mb-6">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "wordpress"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-300 dark:text-blue-300"
                    : "text-primary hover:text-blue-600"
                }`}
                onClick={() => setActiveTab("wordpress")}
                aria-selected={activeTab === "wordpress"}
                role="tab"
              >
                WordPress
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "other"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-300 dark:text-blue-300"
                    : "text-primary hover:text-blue-600"
                }`}
                onClick={() => setActiveTab("other")}
                aria-selected={activeTab === "other"}
                role="tab"
              >
                Other Sites
              </button>
            </div>

            {/* Tiny status card */}
            <div className="ml-4 px-3 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-semibold shadow-sm select-none">
              Events tracked:{" "}
              {usage !== null ? formatNumber(usage) : "Loading..."}
            </div>
          </div>

          {/* Content for tabs */}
          {activeTab === "wordpress" && (
            <div
              role="tabpanel"
              aria-labelledby="wordpress-tab"
              className="mb-6"
            >
              <p className="mb-4 text-sm text-primary">
                For WordPress sites, you can add the tracking script directly in
                your theme’s{" "}
                <code className="font-mono bg-gray-100 dark:bg-secondary-background px-1 rounded">
                  header.php
                </code>{" "}
                file or use a{" "}
                <a
                  href="https://wordpress.org/plugins/search/header+and+footer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  header & footer plugin
                </a>{" "}
                to insert the script safely.
              </p>
              <div className="relative">
                <textarea
                  className="w-full rounded-md p-4 text-sm font-mono pr-10 bg-gray-100 dark:bg-gray-800 border border-primary/20 resize-none"
                  value={trackingScript}
                  readOnly
                  aria-label="Tracking script for WordPress"
                />
                <Copy
                  size={20}
                  className="absolute right-3 top-3 cursor-pointer hover:text-blue-600 text-primary"
                  onClick={() => handleCopy(trackingScript)}
                  aria-label="Copy tracking script"
                />
              </div>
            </div>
          )}

          {activeTab === "other" && (
            <div role="tabpanel" aria-labelledby="other-tab" className="mb-6">
              <p className="mb-4 text-sm text-primary">
                For other websites, add the script inside your site’s{" "}
                <code className="font-mono bg-gray-100 dark:bg-secondary-background px-1 rounded">
                  &lt;head&gt;
                </code>{" "}
                tag. This will automatically capture real user performance data.
              </p>
              <div className="relative">
                <textarea
                  className="w-full rounded-md p-4 text-sm font-mono pr-10 bg-gray-100 dark:bg-gray-800 border border-primary/20 resize-none"
                  value={trackingScript}
                  readOnly
                  aria-label="Tracking script for other sites"
                />
                <Copy
                  size={20}
                  className="absolute right-3 top-3 cursor-pointer hover:text-blue-600 text-primary"
                  onClick={() => handleCopy(trackingScript)}
                  aria-label="Copy tracking script"
                />
              </div>
            </div>
          )}

          {/* Global Section */}
          <div className="mt-8 text-sm text-primary space-y-3 max-w-lg">
            <p className="font-semibold text-base">
              What this script captures:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>CLS, INP, LCP, FCP, TTFB performance metrics</li>
              <li>Long tasks over 50ms &amp; slow APIs over 500ms</li>
              <li>Layout shift &amp; rendering instability</li>
              <li>Third-party script and domain analysis</li>
              <li>Device specs: memory, CPU, connection type</li>
              <li>User language, timezone, and country</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
