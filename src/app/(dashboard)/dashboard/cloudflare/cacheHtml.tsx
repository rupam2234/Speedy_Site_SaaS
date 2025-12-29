import { useState } from "react";
import { useSiteContext } from "../siteContext";

interface CacheConfigs {
  name?: string;
  description?: string;
  excluded_paths?: string;
  edgeTTL?: number; // in hours
}

export default function CacheHtml() {
  const { selectedSite } = useSiteContext();
  const siteLabel = selectedSite ? selectedSite.replace(".", " ") : "";
  const [cacheConfig, setCacheConfig] = useState<CacheConfigs>({
    name: `Include HTML Cache for ${siteLabel}`,
    description: `Cloudflare HTML cache configuration created at Speedy.site for ${siteLabel}`,
    edgeTTL: 720,
    excluded_paths: "/wp-admin\n/wp-login.php\n/cart\n/checkout",
  });

  console.log(cacheConfig);

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
        <strong>Serving cached HTML from edge</strong> reduces{" "}
        <a
          href={`https://en.wikipedia.org/wiki/Time_to_first_byte`}
          target="_blank"
          className="text-blue-400 hover:text-blue-500"
        >
          TTFB
        </a>
        , make the page render faster and improve web vitals.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <p className="text-[12px]">Custom name for your cache setup</p>
          <input
            className="text-[12px] w-2/5 px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
            value={cacheConfig.name}
            placeholder="Cache Rule Name"
            onChange={(e) =>
              setCacheConfig((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-[12px]">
            Custom description for your cache configuration
          </p>
          <input
            className="text-[12px] w-4/5 px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
            placeholder={`Cloudflare HTML cache configuration created via Speedy.site for ${siteLabel}`}
            value={cacheConfig.description}
            type="text"
            onChange={(e) =>
              setCacheConfig((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-[12px]">
            Exclude paths that contain personalized, sensitive, or dynamic
            content (e.g. wp-login, admin, checkout - each new line)
          </p>
          <textarea
            className="text-[12px] h-40 w-4/5 px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
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
        <div className="space-y-1">
          <p className="text-[12px]">How long cache is valid (in days)</p>
          <input
            className="text-[12px] w-4/5 px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
            placeholder="30"
            value={cacheConfig.edgeTTL ? cacheConfig.edgeTTL / 24 : ""}
            onChange={(e) =>
              setCacheConfig((prev) => ({
                ...prev,
                edgeTTL: Number(e.target.value) * 24,
              }))
            }
          />
        </div>
      </div>
    </>
  );
}
