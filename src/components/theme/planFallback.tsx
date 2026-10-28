"use client";

import { useState } from "react";

export function PlanUpgradeFallback() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey: "managed_wp" }),
      });
      const data: any = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not start checkout. Try again shortly.");
    } catch {
      setError("Could not start checkout. Try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center px-6">
      <div className="max-w-sm p-6 rounded-lg border border-primary/20 bg-primary-foreground dark:bg-secondary-background flex flex-col gap-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">🚀</span>
        </div>

        <h2 className="text-lg font-semibold text-primary">Upgrade Required</h2>

        <p className="text-sm text-primary/80">
          This feature requires the{" "}
          <span className="font-medium">WordPress Performance Optimization</span>{" "}
          service.
        </p>

        <div className="border-t border-primary/10 pt-4 space-y-3 text-left">
          <p className="font-medium text-xs text-primary/90">What you unlock:</p>
          <ul className="space-y-2 pl-4">
            <li className="flex items-center gap-2 text-xs text-primary/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
              <strong>Real-user Core Web Vitals</strong> -- not 28-day averages, actual visitor data
            </li>
            <li className="flex items-center gap-2 text-xs text-primary/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
              <strong>Per-page, per-device, per-browser breakdown</strong> -- know exactly where users struggle
            </li>
            <li className="flex items-center gap-2 text-xs text-primary/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
              <strong>Auto-injected RUM script via plugin</strong> -- no copy-paste, zero maintenance
            </li>
            <li className="flex items-center gap-2 text-xs text-primary/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
              <strong>Issue detection + expert fix service</strong> -- we find and fix bottlenecks for you
            </li>
            <li className="flex items-center gap-2 text-xs text-primary/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
              <strong>Core Web Vitals Pass Guarantee</strong> -- or we keep optimizing until you pass
            </li>
          </ul>
        </div>

        <p className="text-[10px] text-primary/50 text-center">
          One payment, one year, no auto-renewal. Cancel anytime.
        </p>

        <button
          onClick={handleUpgrade}
          className="mt-2 cursor-pointer w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Starting checkout..." : "Upgrade Now -- $299 / year"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

