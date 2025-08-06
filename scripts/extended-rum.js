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
  document.cookie = `${name}=${value}; path=/; max-age=2592000`; // 30 days
}

let sessionId = getCookie("sessionId");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  setCookie("sessionId", sessionId);
}

const batchedData = [];
const latestMetrics = {
  CLS: null,
  INP: null,
  LCP: null,
  FCP: null,
  TTFB: null,
};

const AI_CITATION_WEIGHTS = {
  domContentLoaded: 0.3,
  ttfb: 0.25,
  contentTypeScore: 0.1,
  semanticMarkupScore: 0.2,
  docSizeScore: 0.15,
};

const aiCitationMetrics = {
  domContentLoaded: null,
  ttfb: null,
  contentType: null,
  semanticMarkupScore: null,
  docSize: null,
};

// === Initialize Web Vitals (final values only) ===

function initializeWebVitals() {
  onCLS(handleMetric, { reportAllChanges: true });
  onINP(handleMetric, { reportAllChanges: true });
  onLCP(handleMetric, { reportAllChanges: true });
  onFCP(handleMetric);
  onTTFB((metric) => {
    handleMetric(metric);
    aiCitationMetrics.ttfb = metric.value;
    runAICitation();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  aiCitationMetrics.domContentLoaded = performance.now();
});

initializeWebVitals();

function computeSemanticMarkupScore() {
  const tags = ["article", "main", "header", "footer", "nav", "section"];
  return tags.filter((tag) => document.querySelector(tag)).length / tags.length;
}

function getDocSizeScore() {
  const size = document.documentElement.outerHTML.length;
  return size < 50000 ? 1 : size < 150000 ? 0.5 : 0.2;
}

function computeAICitationScore(m) {
  const dom = 1 - Math.min(m.domContentLoaded ?? 10000, 10000) / 10000;
  const ttfb = 1 - Math.min(m.ttfb ?? 2000, 2000) / 2000;
  const type =
    m.contentType?.includes("text/html") ||
    m.contentType?.includes("application/json")
      ? 1
      : 0;
  const semantic = m.semanticMarkupScore ?? 0;
  const doc = m.docSize ?? 1;

  return Number(
    (
      dom * AI_CITATION_WEIGHTS.domContentLoaded +
      ttfb * AI_CITATION_WEIGHTS.ttfb +
      type * AI_CITATION_WEIGHTS.contentTypeScore +
      semantic * AI_CITATION_WEIGHTS.semanticMarkupScore +
      doc * AI_CITATION_WEIGHTS.docSizeScore
    ).toFixed(2) * 100
  );
}

function runAICitation() {
  if (aiCitationMetrics.ttfb == null) return;
  if (aiCitationMetrics.domContentLoaded == null) {
    aiCitationMetrics.domContentLoaded = performance.now();
  }

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
}

function classifyMetric(value, thresholds) {
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "needs improvement";
  return "poor";
}

function queueEvent(event) {
  batchedData.push({ ...event, sessionId });
}

function handleMetric(metric) {
  const { name, value, delta, id, attribution } = metric;

  let rating;
  switch (name) {
    case "CLS":
      latestMetrics.CLS = value;
      rating = classifyMetric(value, CLSThresholds);
      break;
    case "INP":
      latestMetrics.INP = value;
      rating = classifyMetric(value, INPThresholds);
      break;
    case "LCP":
      latestMetrics.LCP = value;
      rating = classifyMetric(value, LCPThresholds);
      break;
    case "FCP":
      latestMetrics.FCP = value;
      rating = classifyMetric(value, FCPThresholds);
      break;
    case "TTFB":
      latestMetrics.TTFB = value;
      rating = classifyMetric(value, TTFBThresholds);
      break;
    default:
      return;
  }

  let safeAttribution = {};
  const resourceEntries = performance.getEntriesByType("resource");

  if (name === "CLS") {
    safeAttribution = {
      largestShiftTarget: attribution?.largestShiftTarget,
      largestShiftTime: attribution?.largestShiftTime,
    };
  } else if (name === "INP") {
    safeAttribution = {
      target: attribution?.target,
      eventType: attribution?.eventType,
      inputDelay: attribution?.inputDelay,
      processingTime: attribution?.processingTime,
      presentationDelay: attribution?.presentationDelay,
    };
  } else if (name === "LCP") {
    const isImage =
      attribution?.target?.tagName?.toLowerCase() === "img" ||
      attribution?.url?.match(/\.(jpe?g|png|webp|gif|avif|svg)$/i);

    const entryByExactUrl =
      attribution?.url &&
      resourceEntries.find((e) => e.name === attribution.url);

    // due to cdn sometimes the url may change
    const entryByLooseMatch =
      !entryByExactUrl &&
      resourceEntries.find((e) =>
        e.name.includes(attribution?.url?.split("/").pop())
      );

    const matchedEntry = entryByExactUrl || entryByLooseMatch;

    // find image exact element
    const findImage =
      isImage && attribution?.target instanceof HTMLImageElement
        ? attribution.target
        : (attribution?.url &&
            document?.querySelector(`img[src="${attribution?.url}"]`)) ||
          null;

    safeAttribution = {
      target: attribution?.target,
      resourceLoadDelay: attribution?.resourceLoadDelay,
      resourceLoadDuration: attribution?.resourceLoadDuration,
      elementRenderDelay: attribution?.elementRenderDelay,
      timeToFirstByte: attribution?.timeToFirstByte,
      url: attribution?.url,
      ...(isImage && {
        decodedBodySize: matchedEntry?.decodedBodySize ?? null,
        transferSize: matchedEntry?.transferSize ?? null,
        width: findImage?.width ?? null,
        height: findImage?.height ?? null,
        isLazy:
          findImage?.classList.contains("lazyloaded") ||
          findImage?.classList.contains("lazyload"),
      }),
    };
  } else if (name === "TTFB") {
    const navEntry = performance.getEntriesByType("navigation")[0];

    safeAttribution = {
      dnsLookup: navEntry?.domainLookupEnd - navEntry?.domainLookupStart,
      tcpConnection: navEntry?.connectEnd - navEntry?.connectStart,
      responseStart: navEntry?.responseStart,
      requestStart: navEntry?.requestStart,
    };
  }

  queueEvent({
    type: "web-vital",
    siteDomain,
    name,
    value,
    rating,
    id,
    delta,
    attribution: safeAttribution,
    timestamp: Date.now(),
  });
}

// === Asset Summary ===
const thirdPartyAssetDomains = new Set();
const thirdPartyAssetTypes = new Set();

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (
      entry.name.includes("://") &&
      !entry.name.includes(location.hostname) &&
      ["script", "img", "link", "iframe", "font", "video", "audio"].includes(
        entry.initiatorType
      )
    ) {
      try {
        const url = new URL(entry.name);
        thirdPartyAssetDomains.add(url.hostname);
        thirdPartyAssetTypes.add(entry.initiatorType);
      } catch {}
    }
  }
}).observe({ type: "resource", buffered: true });

function getDeviceType() {
  const w = window.innerWidth;
  return w <= 768 ? "mobile" : w <= 1024 ? "tablet" : "desktop";
}

(function collectClientMeta() {
  queueEvent({
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
  });

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

queueEvent({
  type: "privacy-data",
  storageUsage: {
    cookies: document.cookie.length,
    localStorage: Object.keys(localStorage).length,
    sessionStorage: Object.keys(sessionStorage).length,
  },
  siteDomain,
  timestamp: Date.now(),
});

let assetSummarySent = false;

function flushMetrics() {
  if (!assetSummarySent && thirdPartyAssetDomains.size > 0) {
    queueEvent({
      type: "third-party-asset-summary",
      count: thirdPartyAssetDomains.size,
      assetTypes: Array.from(thirdPartyAssetTypes),
      domains: Array.from(thirdPartyAssetDomains),
      siteDomain,
      timestamp: Date.now(),
    });

    assetSummarySent = true;
  }

  if (batchedData.length > 0) {
    navigator.sendBeacon(
      "https://event-buffer.thespeedysite.workers.dev/collect",
      JSON.stringify({
        sessionId,
        siteDomain,
        currentPage,
        previousPage,
        data: batchedData,
      })
    );

    batchedData.length = 0; // clear after sending
  }
}

window.addEventListener("beforeunload", flushMetrics);
