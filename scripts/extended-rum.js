import {
  onCLS,
  onLCP,
  onFCP,
  onTTFB,
  CLSThresholds,
  INPThresholds,
  LCPThresholds,
} from "web-vitals/attribution";

const CONFIG = {
  API_URL: "https://event-buffer.thespeedysite.workers.dev/collect",
  COOKIE_MAX_AGE: 2592000, // 30 days
  MAX_EVENTS_PER_SESSION: 100,
  FCP_THRESHOLDS: [1800, 3000],
  TTFB_THRESHOLDS: [800, 1800],
  AI_CITATION_WEIGHTS: {
    domContentLoaded: 0.3,
    ttfb: 0.25,
    contentTypeScore: 0.1,
    semanticMarkupScore: 0.2,
    docSizeScore: 0.15,
  },
};

const FCPThresholds = CONFIG.FCP_THRESHOLDS;
const TTFBThresholds = CONFIG.TTFB_THRESHOLDS;
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
  document.cookie = `${name}=${value}; path=/; max-age=${CONFIG.COOKIE_MAX_AGE}; Secure; SameSite=Strict`;
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

const aiCitationMetrics = {
  domContentLoaded: null,
  ttfb: null,
  contentType: null,
  semanticMarkupScore: null,
  docSize: null,
};

// === Initialize Web Vitals ===
function initializeWebVitals() {
  onCLS(handleCLS, { reportAllChanges: true });
  onLCP(handleLCP, { reportAllChanges: true });
  onFCP(handleFCP);
  onTTFB(handleTTFB);

  if (
    "PerformanceObserver" in window &&
    PerformanceObserver.supportedEntryTypes.includes("event")
  ) {
    let maxINP = null;

    function summarizeElement(el) {
      if (!el || !el.tagName) return "(unknown)";

      function isSignificantElement(element) {
        if (!element || !element.tagName) return false;
        const tagName = element.tagName.toLowerCase();
        const hasId = !!element.id;
        const hasClass =
          element.className &&
          typeof element.className === "string" &&
          element.className.trim() !== "";
        const isSemantic = [
          "article",
          "main",
          "header",
          "footer",
          "nav",
          "section",
          "aside",
        ].includes(tagName);
        return hasId || hasClass || isSemantic;
      }

      let currentEl = el;
      while (
        currentEl &&
        currentEl.tagName &&
        !isSignificantElement(currentEl) &&
        currentEl.parentElement
      ) {
        currentEl = currentEl.parentElement;
      }

      if (!currentEl || !currentEl.tagName) return "(unknown)";

      let summary = `<${currentEl.tagName.toLowerCase()}`;
      if (currentEl.id) summary += ` id="${currentEl.id}"`;
      if (currentEl.className && typeof currentEl.className === "string")
        summary += ` class="${currentEl.className}"`;
      summary += ">";
      return summary;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          [
            "click",
            "mousedown",
            "mouseup",
            "pointerdown",
            "pointerup",
            "keydown",
            "keyup",
            "touchstart",
            "touchend",
          ].includes(entry.name)
        ) {
          if (!maxINP || entry.duration > maxINP.duration) {
            maxINP = entry;
            latestMetrics.INP = {
              name: "INP",
              value: entry.duration,
              delta: entry.duration,
              id: sessionId,
              currentPage: location.pathname + location.search,
              attribution: {
                target: summarizeElement(entry.target),
                eventType: entry.name,
                inputDelay: entry.processingStart - entry.startTime,
                processingTime:
                  entry.duration - (entry.processingStart - entry.startTime),
                presentationDelay: 0,
              },
            };
          }
        }
      }
    });

    observer.observe({
      type: "event",
      buffered: true,
      durationThreshold: 0,
    });
  } else {
    console.warn(
      "PerformanceObserver or 'event' entry type not supported; INP tracking disabled."
    );
    queueEvent({
      type: "error",
      message: "PerformanceObserver or 'event' entry type not supported",
      siteDomain,
      timestamp: Date.now(),
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  aiCitationMetrics.domContentLoaded = performance.now();
});

initializeWebVitals();

let cachedSemanticScore = null;
function computeSemanticMarkupScore() {
  if (cachedSemanticScore !== null) return cachedSemanticScore;
  const tags = ["article", "main", "header", "footer", "nav", "section"];
  cachedSemanticScore =
    tags.filter((tag) => document.querySelector(tag)).length / tags.length;
  return cachedSemanticScore;
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
      dom * CONFIG.AI_CITATION_WEIGHTS.domContentLoaded +
      ttfb * CONFIG.AI_CITATION_WEIGHTS.ttfb +
      type * CONFIG.AI_CITATION_WEIGHTS.contentTypeScore +
      semantic * CONFIG.AI_CITATION_WEIGHTS.semanticMarkupScore +
      doc * CONFIG.AI_CITATION_WEIGHTS.docSizeScore
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
    document.querySelector("meta[http-equiv='Content-Type']")?.content ||
    "unknown";

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
  console.debug("Queuing event:", event);
  if (batchedData.length >= CONFIG.MAX_EVENTS_PER_SESSION) {
    console.warn("Event queue limit reached; flushing early.");
    flushMetrics();
  }
  batchedData.push({ ...event, sessionId });
}

function handleCLS(metric) {
  latestMetrics.CLS = metric.value;
  const rating = classifyMetric(metric.value, CLSThresholds);
  queueEvent({
    type: "web-vital",
    siteDomain,
    name: "CLS",
    value: metric.value,
    rating,
    id: metric.id,
    delta: metric.delta,
    attribution: {
      largestShiftTarget: metric.attribution?.largestShiftTarget,
      largestShiftTime: metric.attribution?.largestShiftTime,
    },
    timestamp: Date.now(),
  });
}

// final INP is being handled on flushMetrics before unloading data

function handleLCP(metric) {
  latestMetrics.LCP = metric.value;
  const rating = classifyMetric(metric.value, LCPThresholds);
  const resourceEntries = performance.getEntriesByType("resource");
  const isImage =
    metric.attribution?.target?.tagName?.toLowerCase() === "img" ||
    metric.attribution?.url?.match(/\.(jpe?g|png|webp|gif|avif|svg)$/i);

  const entryByExactUrl =
    metric.attribution?.url &&
    resourceEntries.find((e) => e.name === metric.attribution.url);

  const entryByLooseMatch =
    !entryByExactUrl &&
    resourceEntries.find((e) =>
      e.name.includes(metric.attribution?.url?.split("/").pop())
    );

  const matchedEntry = entryByExactUrl || entryByLooseMatch;

  const findImage =
    isImage && metric.attribution?.target instanceof HTMLImageElement
      ? metric.attribution.target
      : (metric.attribution?.url &&
          document?.querySelector(`img[src="${metric.attribution?.url}"]`)) ||
        null;

  queueEvent({
    type: "web-vital",
    siteDomain,
    name: "LCP",
    value: metric.value,
    rating,
    id: metric.id,
    delta: metric.delta,
    attribution: {
      target: metric.attribution?.target,
      resourceLoadDelay: metric.attribution?.resourceLoadDelay,
      resourceLoadDuration: metric.attribution?.resourceLoadDuration,
      elementRenderDelay: metric.attribution?.elementRenderDelay,
      timeToFirstByte: metric.attribution?.timeToFirstByte,
      url: metric.attribution?.url,
      ...(isImage && {
        decodedBodySize: matchedEntry?.decodedBodySize ?? null,
        transferSize: matchedEntry?.transferSize ?? null,
        width: findImage?.width ?? null,
        height: findImage?.height ?? null,
        isLazy:
          findImage?.classList.contains("lazyloaded") ||
          findImage?.classList.contains("lazyload"),
      }),
    },
    timestamp: Date.now(),
  });
}

function handleFCP(metric) {
  latestMetrics.FCP = metric.value;
  const rating = classifyMetric(metric.value, FCPThresholds);
  queueEvent({
    type: "web-vital",
    siteDomain,
    name: "FCP",
    value: metric.value,
    rating,
    id: metric.id,
    delta: metric.delta,
    attribution: {},
    timestamp: Date.now(),
  });
}

function handleTTFB(metric) {
  latestMetrics.TTFB = metric.value;
  const rating = classifyMetric(metric.value, TTFBThresholds);
  const navEntry = performance.getEntriesByType("navigation")[0];
  queueEvent({
    type: "web-vital",
    siteDomain,
    name: "TTFB",
    value: metric.value,
    rating,
    id: metric.id,
    delta: metric.delta,
    attribution: {
      dnsLookup: navEntry?.domainLookupEnd - navEntry?.domainLookupStart,
      tcpConnection: navEntry?.connectEnd - navEntry?.connectStart,
      responseStart: navEntry?.responseStart,
      requestStart: navEntry?.requestStart,
    },
    timestamp: Date.now(),
  });
  aiCitationMetrics.ttfb = metric.value;
  runAICitation();
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
        if (url.hostname) {
          thirdPartyAssetDomains.add(url.hostname);
          thirdPartyAssetTypes.add(entry.initiatorType);
        }
      } catch (error) {
        console.warn(`Invalid URL in resource entry: ${entry.name}`, error);
      }
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
    .then((res) => {
      if (!res.ok) throw new Error("Geo API request failed");
      return res.json();
    })
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
    .catch((error) => {
      console.error("Geo API fetch failed:", error);
      queueEvent({
        type: "error",
        message: `Geo API fetch failed: ${error.message}`,
        siteDomain,
        timestamp: Date.now(),
      });
    });
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
let isFlushing = false;

function flushMetrics() {
  if (isFlushing) return;
  isFlushing = true;

  try {
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

    // Queue the maximum INP event if it exists
    if (latestMetrics.INP) {
      const rating = classifyMetric(latestMetrics.INP.value, INPThresholds);
      queueEvent({
        type: "web-vital",
        siteDomain,
        name: "INP",
        value: latestMetrics.INP.value,
        rating,
        id: latestMetrics.INP.id,
        delta: latestMetrics.INP.delta,
        attribution: {
          target: latestMetrics.INP.attribution.target,
          eventType: latestMetrics.INP.attribution.eventType,
          inputDelay: latestMetrics.INP.attribution.inputDelay,
          processingTime: latestMetrics.INP.attribution.processingTime,
          presentationDelay: latestMetrics.INP.attribution.presentationDelay,
        },
        timestamp: Date.now(),
      });
    }

    if (batchedData.length > 0) {
      const payload = JSON.stringify({
        sessionId,
        siteDomain,
        currentPage,
        previousPage,
        data: batchedData,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(CONFIG.API_URL, payload);
      } else {
        fetch(CONFIG.API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch((error) => {
          console.error("Failed to send metrics via fetch:", error);
        });
      }

      batchedData.length = 0;
    }
  } finally {
    isFlushing = false;
  }
}

window.addEventListener("beforeunload", flushMetrics);
