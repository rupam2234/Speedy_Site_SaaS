"use client";

import React, { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface TrackingIntegrationProps {
  siteId: string;
  usage: number;
  quota: number;
}

export default function TrackingIntegration({
  siteId,
}: TrackingIntegrationProps) {
  const [, setCopied] = useState(false);

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

  const trackingScript = `<script
  src="https://web-vital-public-script.thespeedysite.workers.dev/web-vitals-extended.js?domain=${siteId}"
  defer
></script>`;
  // const percentUsed = Math.min((usage / quota) * 100, 100).toFixed(0);
  // const remaining = quota - usage;

  return (
    <div className="m-5 border rounded-sm p-4 bg-primary-foreground dark:bg-secondary-background">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4">
        {/* Left Column */}
        <div className="col-span-1 md:col-span-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Real User Monitoring Integration
          </h3>

          <p className="text-sm text-muted-foreground mb-4">
            Add this script inside your site’s{" "}
            <code className="font-mono">&lt;head&gt;</code> tag. It captures
            real user performance data automatically.
          </p>

          <div className="relative mb-2">
            <div className="relative">
              <textarea
                className="w-full rounded-sm p-4 text-sm font-mono pr-10 bg-gray-100 dark:bg-gray-800 border-0 focus-visible:ring-0 resize-none overflow-auto"
                value={trackingScript}
                readOnly
                rows={Math.max(6, trackingScript.split("\n").length)} // auto-adjusts based on line count
                aria-label="Tracking script"
              />
              <Copy
                size={16}
                className="absolute right-2 top-2.5 cursor-pointer hover:text-blue-500"
                onClick={() => handleCopy(trackingScript)}
              />
            </div>
          </div>
          {/* {copied && (
            <p className="text-green-500 text-xs mt-1" role="alert">
              Script copied to clipboard!
            </p>
          )} */}

          <div className="mt-6 text-sm text-muted-foreground space-y-2">
            <p className="font-semibold">What this script captures:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>CLS, INP, LCP, FCP, TTFB performance metrics</li>
              <li>Long tasks over 50ms & slow APIs over 500ms</li>
              <li>Layout shift & rendering instability</li>
              <li>Third-party script and domain analysis</li>
              <li>Device specs: memory, CPU, connection type</li>
              <li>User language, timezone, and geolocation</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Quota Usage */}
        {/* <div className="col-span-1 md:col-span-4 order-2 border border-muted rounded-md p-4 bg-muted/30 dark:bg-muted/20">
          <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
            Quota Usage
          </h4>

          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex justify-between font-medium text-primary">
              <span>
                {usage.toLocaleString()} / {quota.toLocaleString()} events
              </span>
              <span className="text-green-500">
                {remaining.toLocaleString()} left
              </span>
            </div>

            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="flex justify-between">
              <span>Quota used:</span>
              <span className="text-primary">{percentUsed}%</span>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
