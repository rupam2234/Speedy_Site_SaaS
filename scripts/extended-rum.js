import {
  onCLS,
  onINP,
  onLCP,
  onFCP,
  onTTFB,
  CLSThresholds,
  INPThresholds,
  LCPThresholds,
} from "web-vitals/attribution";

const FCPThresholds = [1800, 3000];
const TTFBThresholds = [800, 1800];
const siteDomain = location.hostname;

let previousPage = document.referrer || null;
let currentPage = location.pathname + location.search;

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/`;
}

let sessionId = getCookie("sessionId");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  setCookie("sessionId", sessionId);
}

const batchedData = [];

// Track latest metrics
const latestMetrics = {
  CLS: null,
  INP: null,
  LCP: null,
  FCP: null,
  TTFB: null,
};

//#region AI Citation
const AI_CITATION_WEIGHTS = {
  domContentLoaded: 0.3,
  ttfb: 0.25,
  contentTypeScore: 0.1,
  semanticMarkupScore: 0.2,
  docSizeScore: 0.15,
};

let aiCitationMetrics = {
  domContentLoaded: null,
  ttfb: null,
  contentType: null,
  semanticMarkupScore: null,
  docSize: null,
};

document.addEventListener("DOMContentLoaded", () => {
  aiCitationMetrics.domContentLoaded = performance.now();
});

onTTFB((metric) => {
  aiCitationMetrics.ttfb = metric.value;
});

function computeSemanticMarkupScore() {
  const tags = ["article", "main", "header", "footer", "nav", "section"];
  let score = 0;
  tags.forEach((tag) => {
    if (document.querySelector(tag)) score += 1;
  });
  return score / tags.length;
}

function getDocSizeScore() {
  const htmlLength = document.documentElement.outerHTML.length;
  if (htmlLength < 50000) return 1;
  if (htmlLength < 150000) return 0.5;
  return 0.2;
}

function computeAICitationScore(metrics) {
  const weights = AI_CITATION_WEIGHTS;

  const dcl = metrics.domContentLoaded ?? 10000;
  const ttfb = metrics.ttfb ?? 2000;

  const domScore = 1 - Math.min(dcl, 10000) / 10000;
  const ttfbScore = 1 - Math.min(ttfb, 2000) / 2000;

  const typeScore =
    metrics.contentType?.includes("text/html") ||
    metrics.contentType?.includes("application/json")
      ? 1
      : 0;

  const semanticScore = metrics.semanticMarkupScore ?? 0;
  const docSizeScore = metrics.docSize ?? 1;

  const finalScore =
    domScore * weights.domContentLoaded +
    ttfbScore * weights.ttfb +
    typeScore * weights.contentTypeScore +
    semanticScore * weights.semanticMarkupScore +
    docSizeScore * weights.docSizeScore;

  return Number((finalScore * 100).toFixed(1));
}

setTimeout(() => {
  aiCitationMetrics.semanticMarkupScore = computeSemanticMarkupScore();
  aiCitationMetrics.docSize = getDocSizeScore();
  aiCitationMetrics.contentType =
    document.contentType ||
    document.querySelector("meta[http-equiv='Content-Type']")?.content;

  const score = computeAICitationScore(aiCitationMetrics);

  queueEvent({
    type: "ai-citation-ready",
    siteDomain,
    score,
    domContentLoaded: aiCitationMetrics.domContentLoaded,
    ttfb: aiCitationMetrics.ttfb,
    timestamp: Date.now(),
  });
}, 3000);
//#endregion

//#region Performance Score
function computePagePerformanceScore(metrics) {
  const thresholds = {
    CLS: [0.1, 0.25],
    INP: [200, 500],
    LCP: [2500, 4000],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };

  const weights = {
    CLS: 0.2,
    INP: 0.25,
    LCP: 0.25,
    FCP: 0.15,
    TTFB: 0.15,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, value] of Object.entries(metrics)) {
    if (value == null) continue;

    const [good, poor] = thresholds[key];
    let normalizedScore = 1 - Math.min(value, poor) / poor;

    weightedSum += normalizedScore * weights[key];
    totalWeight += weights[key];
  }

  if (totalWeight === 0) return null;

  const finalScore = (weightedSum / totalWeight) * 100;
  return Number(finalScore.toFixed(1));
}

setTimeout(() => {
  const pagePerfScore = computePagePerformanceScore(latestMetrics);
  if (pagePerfScore !== null) {
    queueEvent({
      type: "page-performance-score",
      siteDomain,
      score: pagePerfScore,
      timestamp: Date.now(),
    });
  }
}, 4000);
//#endregion

function classifyMetric(value, thresholds) {
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "needs improvement";
  return "poor";
}

function enrichEvent(data) {
  return {
    ...data,
    sessionId,
  };
}

function queueEvent(event) {
  batchedData.push(enrichEvent(event));
}

function handleMetric(metric) {
  let rating = "unknown";

  switch (metric.name) {
    case "CLS":
      latestMetrics.CLS = metric.value;
      rating = classifyMetric(metric.value, CLSThresholds);
      break;
    case "INP":
      latestMetrics.INP = metric.value;
      rating = classifyMetric(metric.value, INPThresholds);
      break;
    case "LCP":
      latestMetrics.LCP = metric.value;
      rating = classifyMetric(metric.value, LCPThresholds);
      break;
    case "FCP":
      latestMetrics.FCP = metric.value;
      rating = classifyMetric(metric.value, FCPThresholds);
      break;
    case "TTFB":
      latestMetrics.TTFB = metric.value;
      rating = classifyMetric(metric.value, TTFBThresholds);
      break;
  }

  queueEvent({
    type: "web-vital",
    siteDomain,
    name: metric.name,
    value: metric.value,
    rating,
    id: metric.id,
    delta: metric.delta,
    attribution: metric.attribution,
    timestamp: Date.now(),
  });
}

onCLS(handleMetric, { reportAllChanges: true });
onINP(handleMetric, { reportAllChanges: true });
onLCP(handleMetric);
onFCP(handleMetric);
onTTFB(handleMetric);

// === NEW: Collect third-party assets but do NOT queue individual events ===
const thirdPartyAssetDomains = new Set();
const thirdPartyAssetTypes = new Set();

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (
      entry.name.includes("://") &&
      !entry.name.includes(location.hostname) &&
      // Collect scripts + other resource types you want to count
      [
        "script",
        "img",
        "link",
        "iframe",
        "font",
        "fetch",
        "xmlhttprequest",
        "video",
        "audio",
      ].includes(entry.initiatorType)
    ) {
      try {
        const url = new URL(entry.name);
        thirdPartyAssetDomains.add(url.hostname);
        thirdPartyAssetTypes.add(entry.initiatorType);
      } catch {
        // ignore invalid URLs
      }
    }

    if (
      (entry.initiatorType === "fetch" ||
        entry.initiatorType === "xmlhttprequest") &&
      entry.duration > 500 &&
      !entry.name.includes("/api/collect-web-vitals")
    ) {
      try {
        const domain = new URL(entry.name).hostname;
        queueEvent({
          type: "slow-api-call",
          url: domain, // Only the domain
          duration: entry.duration.toFixed(2),
          startTime: entry.startTime.toFixed(2),
          siteDomain,
          timestamp: Date.now(),
        });
      } catch {
        // Skip invalid URLs
      }
    }
  }
}).observe({ type: "resource", buffered: true });

function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 768) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

(function collectClientMeta() {
  const clientMeta = {
    type: "client-info",
    deviceType: getDeviceType(),
    deviceMemory: navigator.deviceMemory || "unknown",
    hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
    connection: navigator.connection
      ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
        }
      : null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  queueEvent(clientMeta);

  fetch("https://ipapi.co/json/")
    .then((res) => res.json())
    .then((geo) => {
      const { country_code, country_name, region, country, org } = geo;
      queueEvent({
        type: "geo-info",
        country_code,
        country_name,
        region,
        country,
        org,
        siteDomain,
        timestamp: Date.now(),
      });
    })
    .catch(() => {});
})();

(function securityCheck() {
  const thirdPartyDomains = new Set();
  const knownTrackers = [
    "googletagmanager",
    "facebook",
    "google-analytics",
    "hotjar",
    "clarity",
    "segment",
    "hubspot",
  ];

  performance.getEntriesByType("resource").forEach((entry) => {
    if (entry.initiatorType === "script" && entry.name.includes("://")) {
      const url = new URL(entry.name);
      if (!url.hostname.includes(location.hostname)) {
        thirdPartyDomains.add(url.hostname);
        if (knownTrackers.some((tracker) => url.hostname.includes(tracker))) {
          queueEvent({
            type: "tracker-detected",
            url: url.hostname,
            siteDomain,
            timestamp: Date.now(),
          });
        }
      }
    }
  });

  const storageUsage = {
    cookies: document.cookie.length,
    localStorageKeys: Object.keys(localStorage).length,
    sessionStorageKeys: Object.keys(sessionStorage).length,
  };

  queueEvent({
    type: "privacy-data",
    thirdPartyDomains: Array.from(thirdPartyDomains).slice(0, 20), // limit to 20 domains
    storageUsage: {
      cookies: document.cookie.length,
      localStorage: Object.keys(localStorage).length,
      sessionStorage: Object.keys(sessionStorage).length,
    },
    siteDomain,
    timestamp: Date.now(),
  });
})();

window.addEventListener("beforeunload", () => {
  // Send summary of 3rd-party assets only here
  if (thirdPartyAssetDomains.size > 0) {
    queueEvent({
      type: "third-party-asset-summary",
      count: thirdPartyAssetDomains.size,
      assetTypes: Array.from(thirdPartyAssetTypes),
      domains: Array.from(thirdPartyAssetDomains),
      siteDomain,
      timestamp: Date.now(),
    });
  }

  if (batchedData.length > 0) {
    const fullPayload = {
      sessionId,
      siteDomain,
      currentPage,
      previousPage,
      data: batchedData,
    };

    navigator.sendBeacon(
      "https://event-buffer.thespeedysite.workers.dev/collect",
      JSON.stringify(fullPayload)
    );
  }
});
