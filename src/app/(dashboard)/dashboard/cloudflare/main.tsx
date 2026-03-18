"use client";

import { useEffect, useState } from "react";
import { useSiteContext } from "../siteContext";
import CloudflareConfigurations from "./configurations";
import { PlusIcon } from "lucide-react";
import { UpgradeFallback } from "@/components/theme";

export default function Main() {
  const { selectedSite, plan } = useSiteContext();
  const CACHE_PREXIF = "cf_rules";
  const cachekey = `${CACHE_PREXIF}:${selectedSite}`; // will use this to cache cloudflare rules

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

  if (plan === "Free") {
    return <UpgradeFallback />;
  }

  return (
    <div className="p-5 space-y-4">
      <h2 className="font-bold text-primary/80 text-lg">Cache Rules</h2>
      <div className="flex items-center gap-2 text-primary/80">
        Select to view/edit available configurations or create new cloudflare
        rules
      </div>
      {isLoading ? (
        // loading skeleton
        <div className="space-y-3">
          <div className="border border-primary/30 rounded-md overflow-auto">
            <table className="w-full text-left text-sm [&_th]:px-4 [&_th]:font-medium [&_th]:py-3">
              <thead className="bg-primary/5 w-full">
                <tr className="border-b border-primary/20">
                  <th className="w-10">
                    <button className="py-1 cursor-pointer">
                      <PlusIcon size={16} />
                    </button>
                  </th>
                  <th>Rules</th>
                  <th>Updated on</th>
                  <th>Edge TTL</th>
                  <th>Browser TTL</th>
                  <th>Status</th>
                  <th className="w-10 py-3"></th>
                </tr>
              </thead>
              <tbody className="animate-pulse bg-primary/5">
                <tr className="border-b last:border-b-0 border-primary/20">
                  <td className="px-4 py-4">
                    <div className="h-4 w-4 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-28 rounded bg-primary/20" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-24 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-5 w-24 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-12 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-12 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="ml-auto h-4 w-4 rounded bg-primary/20" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : isConfigured ? (
        <CloudflareConfigurations
          site={selectedSite ? selectedSite : ""}
          cachekey={cachekey}
        />
      ) : !isLoading && !isConfigured ? (
        <div className="flex items-start mt-2 gap-4 border bg-primary/5 dark:bg-secondary-background p-6">
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
      ) : (
        <></>
      )}
    </div>
  );
}
