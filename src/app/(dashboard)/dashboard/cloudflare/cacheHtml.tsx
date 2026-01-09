"use client";

import { useState } from "react";
import { useSiteContext } from "../siteContext";
import { toast } from "sonner";
import { CacheRule } from "./configurations";
import { CacheConfigs } from "./createNewRule";
import ImageExtensionSelector, {
  IMAGE_EXTENSIONS,
} from "./imageExtensionSelector";

interface Props {
  data: CacheRule[];
  close: () => void;
  cacheKey: string;
}

export default function EditCacheRule({ data, cacheKey, close }: Props) {
  const isDataAvailable = data.length > 0;

  // this gets the active excluded image extensions
  let excludedImageExtensions;
  if (data[0].description === "Cache Images") {
    const match = data[0].expression?.match(/\{([^}]+)\}/);
    const extensions =
      match?.[1]?.match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
    excludedImageExtensions = IMAGE_EXTENSIONS.filter(
      (x) => !extensions.includes(x),
    );
  }

  const { selectedSite } = useSiteContext();
  const siteLabel = selectedSite ? selectedSite.replace(".", " ") : "";
  const [cacheByDevice, setCacheByDevice] = useState<boolean>(false);
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
    excluded_images: isDataAvailable ? excludedImageExtensions : [],
    cacheByDevice: cacheByDevice,
    browserTTL: isDataAvailable
      ? (data?.[0]?.action_parameters?.browser_ttl?.default ?? 72 * 3600) / 3600
      : 72,
    rule_type: "Cache HTML pages",
  }); // default setup
  const [loading, setLoading] = useState<boolean>(false);

  console.log(cacheConfig);

  return (
    <div className="md:w-[800px] h-auto p-2">
      <button
        className="absolute top-1 right-1 rounded-full hover:bg-primary/5 px-2 py-[1px] cursor-pointer"
        onClick={close}
      >
        x
      </button>
      {data[0].description === "Cache HTML pages" ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm">
            HTML caching works best for static or mostly static pages, such as
            landing pages, blogs, marketing pages, or high-traffic sections of a
            website where content doesn&apos;t change per user.
          </p>
          <p className="text-sm">
            Dynamic elements like ads, widgets, or user-specific content are
            loaded separately and remain unaffected.{" "}
            <strong>Serving cached HTML from edge</strong> can significantly
            reduce{" "}
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
                      ? data[0].action_parameters.browser_ttl.mode.replace(
                          "_",
                          " ",
                        )
                      : ""
                  }
                  disabled
                />
              </div>
            </div>
            <div className="text-[12px] text-primary/80 flex items-center gap-2">
              <span>Cache by Device</span>
              <label className="flex gap-1 items-center">
                <input
                  type="radio"
                  value={"on"}
                  checked={cacheByDevice}
                  onChange={() => setCacheByDevice(true)}
                />{" "}
                On
              </label>
              <label className="flex gap-1 items-center">
                <input
                  type="radio"
                  value={"off"}
                  checked={!cacheByDevice}
                  onChange={() => setCacheByDevice(false)}
                />{" "}
                Off
              </label>
              <span className="text-red-500">
                (Only useful when you serve different theme, content per device
                type)
              </span>
            </div>
          </div>
          <div className="flex mt-10 items-center gap-2">
            <button
              onClick={() => updateCacheRule()}
              disabled={loading ? true : false}
              className="px-2 text-sm py-1 bg-green-300 text-primary dark:text-primary-foreground font-medium hover:text-primary/80 hover:bg-green-500 rounded-sm cursor-pointer"
            >
              {loading ? "Saving..." : "Save Rules"}
            </button>
          </div>
        </div>
      ) : data[0].description === "Cache Images" ? (
        <div className="space-y-3">
          <p className="text-sm">
            Image caching stores static image assets (PNG, JPG, WebP, SVG, GIF)
            at the CDN edge so they are delivered from locations closest to your
            visitors. This dramatically reduces load time for image-heavy pages.
          </p>

          <p className="text-sm">
            Serving images from the edge improves{" "}
            <strong>Largest Contentful Paint (LCP)</strong>, reduces bandwidth
            usage on your origin, and speeds up repeat visits. Image caching is
            especially effective for hero images, product images, blog media,
            and marketing assets.
          </p>

          <div className="mt-4 space-y-4">
            <label className="text-sm">
              Only exclude image extensions if you encounter issues after
              applying caching.
            </label>
            <ImageExtensionSelector
              value={
                cacheConfig.excluded_images ? cacheConfig.excluded_images : []
              }
              onChange={(exts) =>
                setCacheConfig((prev) => ({
                  ...prev,
                  excluded_images: exts,
                }))
              }
            />
            <div className="flex gap-2 items-center justify-between">
              <div className="flex gap-2 items-center">
                <p className="text-[12px]">CDN Cache Duration (In Hours):</p>
                <input
                  className="text-[12px] w-[100px] px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
                  placeholder="720"
                  value={cacheConfig.edgeTTL || ""}
                  onChange={(e) =>
                    setCacheConfig((prev) => ({
                      ...prev,
                      edgeTTL: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="flex gap-2 items-center">
                <p className="text-[12px]">Browser TTL (In Hours):</p>
                <input
                  className="text-[12px] w-[100px] px-2 py-1 border border-primary/10 bg-primary/5 rounded-sm outline-none"
                  placeholder="168"
                  value={cacheConfig.browserTTL || ""}
                  onChange={(e) =>
                    setCacheConfig((prev) => ({
                      ...prev,
                      browserTTL: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="text-[12px] text-primary/80 flex items-center gap-2">
              <span>Cache by Device</span>

              <label className="flex gap-1 items-center">
                <input
                  type="radio"
                  checked={cacheByDevice}
                  onChange={() => setCacheByDevice(true)}
                />
                On
              </label>

              <label className="flex gap-1 items-center">
                <input
                  type="radio"
                  checked={!cacheByDevice}
                  onChange={() => setCacheByDevice(false)}
                />
                Off
              </label>

              <span className="text-red-500">
                (Enable only if you serve different images per device type)
              </span>
            </div>

            <p className="text-[11px] text-primary/60">
              This rule automatically targets image file extensions and does not
              cache HTML or API responses.
            </p>
          </div>

          <div className="flex mt-10 items-center gap-2">
            <button
              onClick={() => updateCacheRule()}
              disabled={loading}
              className="px-2 text-sm py-1 bg-green-300 text-primary dark:text-primary-foreground font-medium hover:text-primary/80 hover:bg-green-500 rounded-sm cursor-pointer"
            >
              {loading ? "Updating..." : "Update Rule"}
            </button>
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );

  async function updateCacheRule() {
    setLoading(true);
    try {
      const res = await fetch("/api/cloudflare/zones/set-cache-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_id: data[0].id,
          rule_desc: data[0].description,
          site: selectedSite,
          edgeTTL: cacheConfig.edgeTTL,
          browserTTL: cacheConfig.browserTTL,
          excludedPaths: cacheConfig.excluded_paths,
          cacheByDevice: cacheConfig.cacheByDevice,
          excluded_images: cacheConfig.excluded_images,
        }),
      });

      if (!res.ok) {
        console.error(res.statusText);
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
      localStorage.removeItem(cacheKey); //flush cachekey
      setLoading(false);
    }
  }
}
