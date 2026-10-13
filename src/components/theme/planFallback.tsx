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
        <h2 className="text-lg font-semibold text-primary">Upgrade Required</h2>
        <p className="text-sm text-primary/80">
          This feature requires the{" "}
          <span className="font-medium">WordPress Performance Optimization</span>{" "}
          service. One payment, one year, no auto-renewal.
        </p>
        <button
          className="mt-2 cursor-pointer w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? "Starting checkout..." : "Upgrade Now"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

