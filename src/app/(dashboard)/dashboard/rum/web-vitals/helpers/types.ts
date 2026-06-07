export const ASSET_TYPES = [
  "image",
  "font",
  "script",
  "document",
  "other",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export enum LcpElements {
  font = "a FONT",
  image = "an IMAGE",
  script = "a SCRIPT",
  document = "a DOCUMENT",
  other = "an ASSET",
}

export const METRICS = [
  "ttfb",
  "load_delay",
  "load_duration",
  "render_delay",
] as const;

export type MetricName = (typeof METRICS)[number];

type MetricByResources = Record<AssetType, number>;

export type LcpSegmentTimings = Record<MetricName, MetricByResources>;

type DiagnosticDetail = {
  reasons: string[];
  solutions: string[];
};

type DiagnosticsByAsset = Record<AssetType, DiagnosticDetail>;

export type Diagnostics = Record<MetricName, DiagnosticsByAsset>;

export const diagnostics: Diagnostics = {
  ttfb: {
    image: {
      reasons: [
        "High server response time (TTFB) at the origin",
        "No CDN or poor edge coverage",
        "Image URL behind redirects",
        "Cold start in image optimization service",
      ],
      solutions: [
        "Use a global CDN",
        "Avoid redirects",
        "Optimize caching strategy",
        "Reduce DNS + TLS overhead",
      ],
    },
    font: {
      reasons: [
        "Font hosted on slow third-party origin",
        "Connection latency to font server",
        "Delayed font CSS delivery",
      ],
      solutions: [
        "Self-host fonts",
        "Preconnect to font origin",
        "Cache aggressively",
      ],
    },
    script: {
      reasons: ["Slow server response for JS", "Uncached JS delivery"],
      solutions: ["Enable CDN caching", "Reduce server processing time"],
    },
    document: {
      reasons: ["Slow HTML response", "Backend latency"],
      solutions: ["Optimize server", "Use edge rendering / caching"],
    },
    other: {
      reasons: ["Slow network response"],
      solutions: ["Improve delivery via CDN"],
    },
  },

  load_delay: {
    image: {
      reasons: [
        "Image not in initial HTML",
        "Lazy-loaded LCP image",
        "Missing preload or fetchpriority",
        "Late discovery via CSS",
      ],
      solutions: [
        "Remove lazy loading",
        "Add preload + fetchpriority='high'",
        "Ensure early HTML discovery",
      ],
    },
    font: {
      reasons: ["Font blocked by CSS", "@import usage", "No preload"],
      solutions: ["Preload font", "Inline font-face", "Avoid @import"],
    },
    script: {
      reasons: ["Script discovered late", "Low priority fetch"],
      solutions: ["Preload critical scripts", "Adjust priority hints"],
    },
    document: {
      reasons: ["Delayed HTML parsing"],
      solutions: ["Reduce blocking resources"],
    },
    other: {
      reasons: ["Late discovery"],
      solutions: ["Preload resource"],
    },
  },

  load_duration: {
    image: {
      reasons: ["Large file size", "Inefficient format", "Oversized image"],
      solutions: ["Use AVIF/WebP", "Resize properly", "Compress"],
    },
    font: {
      reasons: ["Heavy font file", "No subsetting"],
      solutions: ["Subset fonts", "Use WOFF2"],
    },
    script: {
      reasons: ["Large JS bundle"],
      solutions: ["Code splitting", "Minification"],
    },
    document: {
      reasons: ["Large HTML payload"],
      solutions: ["Reduce HTML size"],
    },
    other: {
      reasons: ["Large resource size"],
      solutions: ["Compress resource"],
    },
  },

  render_delay: {
    image: {
      reasons: ["Main thread blocked", "Heavy decoding", "Hidden by CSS"],
      solutions: [
        "Use decoding='async'",
        "Reduce JS blocking",
        "Reserve layout space",
      ],
    },
    font: {
      reasons: [
        "font-display not swap",
        "Layout recalculations",
        "JS font loaders",
      ],
      solutions: [
        "Use font-display: swap",
        "Reduce layout shifts",
        "Avoid JS font loaders",
      ],
    },
    script: {
      reasons: ["Main thread blocking JS"],
      solutions: ["Defer or async scripts"],
    },
    document: {
      reasons: ["Heavy DOM / layout work"],
      solutions: ["Simplify DOM structure"],
    },
    other: {
      reasons: ["Rendering bottleneck"],
      solutions: ["Reduce complexity"],
    },
  },
};

export enum ColorCodes {
  good = "text-emerald-600",
  average = "text-orange-500",
  poor = "text-red-500",
}

export interface Contributor {
  device_type: "Desktop" | "Mobile" | "Tablet" | string;

  element_target: string;
  page_url: string;

  lcp_asset_url: string | null;

  font_family: string | null;
  font_weight: string | number | null;
  font_size: string | null;

  network_transfer_bytes: number | null;
  memory_usage_bytes: number | null;
  ttfb_ms: number | null;
  loading_priority: "high" | "low" | "auto" | string | null;
  device_memory_gb: string | number | null;

  occurrence_count: number;

  avg_lcp_value: number;
  p75_lcp_value: number;

  avg_resource_load_delay: number;
  avg_resource_load_duration: number;
  avg_element_render_delay: number;

  top_3_render_blockers: string | null;

  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}
