"use client";

import { useEffect, useState } from "react";

interface ConnectionDetails {
  key: string;
}

interface Props {
  onConnect: (details: ConnectionDetails) => void;
  onBack?: () => void;
  isConnected: boolean;
  domain: string;
}

export default function PluginScanForm({
  domain,
  // onBack,
  onConnect,
  isConnected,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [error]);

  return (
    <div className="mt-5 space-y-3">
      <button
        onClick={handleScans}
        className="w-96 cursor-pointer bg-primary/80 text-primary-foreground text-sm px-3 py-1 border-2 border-primary/20 outline-0 hover:bg-primary/60"
      >
        Run Plugin Analysis
      </button>
      {error !== null ? (
        <p className="text-sm h-2 text-red-500 font-medium">{error}</p>
      ) : (
        <p className="h-2" />
      )}
    </div>
  );

  function handleScans() {
    if (!domain) {
      setError(
        "Missing domain validation, make sure you have a domain selected on the top left selector",
      );
      return;
    } else if (!isConnected) {
      setError(
        "Missing connection, have you installed the WordPress plugin that has a key? Click on Connect",
      );
      return;
    }

    // if all good, we will pass the key to initiate scan
    // get key from localstorage
    const key = localStorage.getItem("plugin_analysis_key");

    if (key) {
      onConnect({ key: key });
      return;
    } else {
      setError("Failed to provide scan key");
      return;
    }
  }
}
