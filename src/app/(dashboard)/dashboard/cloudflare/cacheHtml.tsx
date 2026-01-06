"use client";

import { useState } from "react";
import { useSiteContext } from "../siteContext";
import { toast } from "sonner";
import { CacheRule } from "./configurations";

interface CacheConfigs {
  description?: string;
  excluded_paths?: string;
  edgeTTL?: number; // in hours
}

interface Props {
  data: CacheRule[];
  close: () => void;
}

export default function EditCacheRule({ data, close }: Props) {
  const isDataAvailable = data.length > 0;

  const { selectedSite } = useSiteContext();
  const siteLabel = selectedSite ? selectedSite.replace(".", " ") : "";
  const [cacheConfig, setCacheConfig] = useState<CacheConfigs>({
    description: isDataAvailable
      ? data[0].description
      : `HTML Cache for ${siteLabel}`,
    edgeTTL: isDataAvailable
      ? data[0].action_parameters.edge_ttl.default / 3600
      : 24,
    excluded_paths: isDataAvailable
      ? (data[0].expression
          .match(/"\/[^"]+"/g)
          ?.map((p) => p.replace(/"/g, ""))
          .join("\n") ?? "")
      : "/wp-admin\n/wp-login.php\n/cart\n/checkout",
  });
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <>
      <p className="text-sm">
        HTML caching works best for static or mostly static pages, such as
        landing pages, blogs, marketing pages, or high-traffic sections of a
        website where content doesn&apos;t change per user.
      </p>
      <p className="text-sm">
        Dynamic elements like ads, widgets, or user-specific content are loaded
        separately and remain unaffected.{" "}
        <strong>Serving cached HTML from edge</strong> can significantly reduce{" "}
        <a
          href={`https://en.wikipedia.org/wiki/Time_to_first_byte`}
          target="_blank"
          className="text-blue-400 hover:text-blue-500"
        >
          TTFB
        </a>
        , make the page render faster and improve web vitals.
      </p>
      <div className="mt-4">
        <div className="space-y-1">
          <p className="text-[12px]">
            Exclude paths that contain personalized, sensitive, or dynamic
            content (e.g. wp-login, admin, checkout - each new line)
          </p>
          <textarea
            className="text-[12px] h-40 w-full px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
            placeholder="/wp-admin, /wp-login.php, /cart, /checkout"
            value={cacheConfig.excluded_paths}
            onChange={(e) =>
              setCacheConfig((prev) => ({
                ...prev,
                excluded_paths: e.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-1 flex gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            <p className="text-[12px]">CDN Cache Durtation (In Hours):</p>
            <input
              className="text-[12px] w-[100px] px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
              placeholder="24"
              value={cacheConfig.edgeTTL ? cacheConfig.edgeTTL : ""}
              onChange={(e) =>
                setCacheConfig((prev) => ({
                  ...prev,
                  edgeTTL: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="flex gap-2 items-center">
            <p className="text-[12px]">Browser TTL (Read Only):</p>
            <input
              className="text-[12px] capitalize w-[100px] px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
              value={
                isDataAvailable
                  ? data[0].action_parameters.browser_ttl.mode.replace("_", " ")
                  : ""
              }
              disabled
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => saveCacheRule()}
          disabled={loading ? true : false}
          className="px-2 text-sm py-1 bg-green-300 text-primary dark:text-primary-foreground font-medium hover:text-primary/80 hover:bg-green-500 rounded-sm cursor-pointer"
        >
          {loading ? "Saving..." : "Save Rules"}
        </button>
        <button
          onClick={() => close()}
          disabled={loading ? true : false}
          className="px-2 text-sm py-1 bg-blue-300 text-primary dark:text-primary-foreground font-medium hover:text-primary/80 hover:bg-blue-500 rounded-sm cursor-pointer"
        >
          Close
        </button>
      </div>
    </>
  );

  async function saveCacheRule() {
    setLoading(true);
    try {
      const res = await fetch("/api/cloudflare/zones/set-cache-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: selectedSite,
          edgeTTL: cacheConfig.edgeTTL,
          excludedPaths: cacheConfig.excluded_paths,
        }),
      });

      if (!res.ok) {
        console.error("Couldn't set cache rule");
        toast.error("Couldn't set cache rule! Try again.", {
          duration: 5000,
          style: { backgroundColor: "red", color: "white" },
        });
        return;
      }

      toast.success("Cache rule configured", {
        duration: 5000,
        style: { backgroundColor: "green", color: "white" },
      });

      close();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong!", {
        duration: 5000,
        style: { backgroundColor: "red", color: "white" },
      });
    } finally {
      setLoading(false);
    }
  }
}
