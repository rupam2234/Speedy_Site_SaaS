import {
  onCLS,
  onLCP,
  onFCP,
  onINP,
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
    domContentLoaded: 0.15,
    ttfb: 0.15,
    semanticMarkupScore: 0.25,
    headingScore: 0.15,
    structuredDataPresent: 0.1,
    docSizeScore: 0.1,
    langTagPresent: 0.05,
    titleDescriptionPresent: 0.05,
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
  sessionId = crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; // Fallback for older browsers
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
  headingScore: null,
  structuredDataPresent: null,
  docSize: null,
  langTagPresent: null,
  titleDescriptionPresent: null,
};

const geo = window.__GEO_INFO__;

let maxCustomEntry = null;
let webVitalsINP = null;
const elementSummaryCache = new WeakMap();

function summarizeElement(el) {
  if (!el || !el.tagName) {
    console.debug("summarizeElement: Invalid or null element", el);
    return "(unknown)";
  }
  if (elementSummaryCache.has(el)) {
    return elementSummaryCache.get(el);
  }

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

  if (!currentEl || !currentEl.tagName) {
    console.debug("summarizeElement: No significant element found", el);
    return "(unknown)";
  }

  let summary = `<${currentEl.tagName.toLowerCase()}`;
  if (currentEl.id) summary += ` id="${currentEl.id}"`;
  if (currentEl.className && typeof currentEl.className === "string")
    summary += ` class="${currentEl.className}"`;
  summary += ">";
  elementSummaryCache.set(el, summary);
  console.debug("summarizeElement: Generated summary", summary);
  return summary;
}

function initializeWebVitals() {
  onCLS(handleCLS, { reportAllChanges: true });
  onLCP(handleLCP, { reportAllChanges: true });
  onFCP(handleFCP);
  onTTFB(handleTTFB);
  onINP(handleINP, { reportAllChanges: true });

  if (
    "PerformanceObserver" in window &&
    PerformanceObserver.supportedEntryTypes.includes("event")
  ) {
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
          if (!maxCustomEntry || entry.duration > maxCustomEntry.duration) {
            maxCustomEntry = entry;
            console.debug("Updated maxCustomEntry:", {
              duration: entry.duration,
              eventType: entry.name,
              target: summarizeElement(entry.target),
            });
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
  const unsent = localStorage.getItem("unsentMetrics");
  if (unsent) {
    navigator.sendBeacon(CONFIG.API_URL, unsent);
    localStorage.removeItem("unsentMetrics");
    console.debug("Retried unsent metrics from localStorage");
  }
});

initializeWebVitals();

// Reset INP data on SPA navigation
window.addEventListener("popstate", () => {
  maxCustomEntry = null;
  webVitalsINP = null;
  latestMetrics.INP = null;
  console.debug("Reset INP data for SPA navigation");
});

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

function computeHeadingScore() {
  const h1 = document.querySelectorAll("h1").length;
  const h2 = document.querySelectorAll("h2").length;
  const h3 = document.querySelectorAll("h3").length;

  const score = (h1 > 0 ? 0.4 : 0) + (h2 > 0 ? 0.3 : 0) + (h3 > 0 ? 0.3 : 0);
  return Math.min(score, 1);
}

function checkStructuredDataPresent() {
  return !!document.querySelector('script[type="application/ld+json"]');
}

function checkLangTagPresent() {
  return document.documentElement.hasAttribute("lang");
}

function checkTitleAndDescriptionPresent() {
  const title = document.querySelector("title");
  const desc = document.querySelector('meta[name="description"]');
  return !!title && !!desc;
}

function computeAICitationScore(m) {
  const weights = CONFIG.AI_CITATION_WEIGHTS;

  const dom = 1 - Math.min(m.domContentLoaded ?? 10000, 10000) / 10000;
  const ttfb = 1 - Math.min(m.ttfb ?? 2000, 2000) / 2000;
  const semantic = computeSemanticMarkupScore();
  const heading = computeHeadingScore();
  const structured = checkStructuredDataPresent() ? 1 : 0;
  const doc = getDocSizeScore();
  const lang = checkLangTagPresent() ? 1 : 0;
  const titleDesc = checkTitleAndDescriptionPresent() ? 1 : 0;

  const score =
    dom * weights.domContentLoaded +
    ttfb * weights.ttfb +
    semantic * weights.semanticMarkupScore +
    heading * weights.headingScore +
    structured * weights.structuredDataPresent +
    doc * weights.docSizeScore +
    lang * weights.langTagPresent +
    titleDesc * weights.titleDescriptionPresent;

  return Math.round(score * 100);
}

function runAICitation() {
  if (aiCitationMetrics.ttfb == null) return;
  if (aiCitationMetrics.domContentLoaded == null) {
    aiCitationMetrics.domContentLoaded = performance.now();
  }

  aiCitationMetrics.semanticMarkupScore = computeSemanticMarkupScore();
  aiCitationMetrics.docSize = getDocSizeScore();
  aiCitationMetrics.headingScore = computeHeadingScore();
  aiCitationMetrics.structuredDataPresent = checkStructuredDataPresent();
  aiCitationMetrics.langTagPresent = checkLangTagPresent();
  aiCitationMetrics.titleDescriptionPresent = checkTitleAndDescriptionPresent();

  const score = computeAICitationScore(aiCitationMetrics);

  queueEvent({
    type: "ai-citation-ready",
    siteDomain,
    score,
    domContentLoaded: aiCitationMetrics.domContentLoaded,
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

function handleINP(metric) {
  webVitalsINP = metric;
  latestMetrics.INP = metric.value;
  console.debug("Web Vitals INP updated:", {
    value: metric.value,
    id: metric.id,
    attribution: metric.attribution,
  });
}

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

const thirdPartyAssetDomains = new Set();
const thirdPartyAssetTypes = new Set();
const thirdPartyDomainTimings = {};

function isProblematicDomain(data) {
  return (
    data.count > 0 &&
    (data.averageDuration > 3000 ||
      data.maxDuration > 5000 ||
      data.averageTTFB > 800 ||
      data.maxTTFB > 1500 ||
      data.totalTransferSize > 500000)
  );
}

function safeTTFB(entry) {
  if (
    typeof entry.responseStart === "number" &&
    typeof entry.fetchStart === "number"
  ) {
    const ttfb = entry.responseStart - entry.fetchStart;
    return ttfb >= 0 && isFinite(ttfb) ? ttfb : null;
  }
  return null;
}

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const { name, initiatorType } = entry;

    if (
      name.includes("://") &&
      !name.includes(location.hostname) &&
      ["script", "img", "link", "iframe", "font", "video", "audio"].includes(
        initiatorType
      )
    ) {
      try {
        const url = new URL(name);
        const domain = url.hostname;
        if (!domain) continue;

        // Initialize if first time
        if (!thirdPartyDomainTimings[domain]) {
          thirdPartyDomainTimings[domain] = {
            count: 0,
            totalDuration: 0,
            maxDuration: 0,
            totalTransferSize: 0,
            totalEncodedBodySize: 0,
            totalTTFB: 0,
            maxTTFB: 0,
            countTTFB: 0,
          };
        }

        const ttfb = safeTTFB(entry);
        const duration = entry.duration || 0;
        const transferSize = entry.transferSize || 0;
        const encodedSize = entry.encodedBodySize || 0;

        const domainData = thirdPartyDomainTimings[domain];
        domainData.count += 1;
        domainData.totalDuration += duration;
        domainData.maxDuration = Math.max(domainData.maxDuration, duration);
        domainData.totalTransferSize += transferSize;
        domainData.totalEncodedBodySize += encodedSize;

        if (ttfb !== null) {
          domainData.totalTTFB += ttfb;
          domainData.maxTTFB = Math.max(domainData.maxTTFB, ttfb);
          domainData.countTTFB += 1;
        }

        // Calculate averages for filtering
        const averageDuration = domainData.totalDuration / domainData.count;
        const averageTTFB = domainData.countTTFB
          ? domainData.totalTTFB / domainData.countTTFB
          : 0;

        // Create a temporary data object to check if domain is problematic
        const checkData = {
          count: domainData.count,
          averageDuration,
          maxDuration: domainData.maxDuration,
          totalTransferSize: domainData.totalTransferSize,
          averageTTFB,
          maxTTFB: domainData.maxTTFB,
        };

        if (isProblematicDomain(checkData)) {
          thirdPartyAssetDomains.add(domain);
          thirdPartyAssetTypes.add(initiatorType);
        } else {
          // Remove domain if no longer problematic
          thirdPartyAssetDomains.delete(domain);
          // Optionally remove types if no domains left for that type (optional)
          // You could add logic here if needed
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
  });

  if (geo) {
    const { country, region, city, timezone, continent, org } = geo;
    queueEvent({
      type: "geo-info",
      siteDomain,
      country,
      region,
      city,
      timezone,
      continent,
      org,
      timestamp: Date.now(),
    });
  } else {
    console.warn("No __GEO_INFO__ found on window");
    queueEvent({
      type: "geo-info",
      siteDomain,
      message: "No geo data available",
      timestamp: Date.now(),
    });
  }
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
      const domains = Array.from(thirdPartyAssetDomains)
        .map((domain) => {
          const data = thirdPartyDomainTimings[domain];
          return {
            domain,
            count: data?.count ?? 0,
            averageDuration: data ? data.totalDuration / data.count : 0,
            maxDuration: data?.maxDuration ?? 0,
            totalTransferSize: data?.totalTransferSize ?? 0,
            totalEncodedBodySize: data?.totalEncodedBodySize ?? 0,
            averageTTFB:
              data && data.countTTFB > 0 ? data.totalTTFB / data.countTTFB : 0,
            maxTTFB: data?.maxTTFB ?? 0,
          };
        })
        .filter(isProblematicDomain);

      if (domains.length > 0) {
        queueEvent({
          type: "third-party-asset-summary",
          count: domains.length,
          assetTypes: Array.from(thirdPartyAssetTypes),
          domains,
          siteDomain,
          timestamp: Date.now(),
        });
        assetSummarySent = true;
      }
    }

    if (latestMetrics.INP || maxCustomEntry) {
      let inpAttribution = {};
      if (maxCustomEntry && maxCustomEntry.target) {
        const inputDelay =
          maxCustomEntry.processingStart - maxCustomEntry.startTime;
        const processingTime = maxCustomEntry.duration - inputDelay;
        inpAttribution = {
          target: summarizeElement(maxCustomEntry.target),
          eventType: maxCustomEntry.name,
          inputDelay: isNaN(inputDelay) || inputDelay < 0 ? 0 : inputDelay,
          processingTime:
            isNaN(processingTime) || processingTime < 0 ? 0 : processingTime,
          presentationDelay: 0,
        };
      } else if (webVitalsINP && webVitalsINP.attribution) {
        inpAttribution = webVitalsINP.attribution;
      } else {
        console.debug("No valid INP attribution available");
        inpAttribution = { target: "(unknown)", eventType: "unknown" };
      }

      let inpValue, inpDelta, inpId;
      if (webVitalsINP) {
        inpValue = webVitalsINP.value;
        inpDelta = webVitalsINP.delta;
        inpId = webVitalsINP.id;
      } else if (maxCustomEntry) {
        inpValue = maxCustomEntry.duration;
        inpDelta = maxCustomEntry.duration;
        inpId = sessionId;
      } else {
        console.debug("No INP data available to queue");
        return;
      }

      const rating = classifyMetric(inpValue, INPThresholds);
      queueEvent({
        type: "web-vital",
        siteDomain,
        name: "INP",
        value: inpValue,
        rating,
        id: inpId,
        delta: inpDelta,
        attribution: inpAttribution,
        timestamp: Date.now(),
      });

      console.debug("INP event queued:", {
        value: inpValue,
        attribution: inpAttribution,
        source: webVitalsINP ? "web-vitals" : "custom",
      });
    } else {
      console.debug("No INP data available for queuing");
    }

    if (batchedData.length > 0) {
      const payload = JSON.stringify({
        sessionId,
        siteDomain,
        currentPage,
        previousPage,
        data: batchedData,
      });
      let success = false;
      if (navigator.sendBeacon) {
        success = navigator.sendBeacon(CONFIG.API_URL, payload);
      }
      if (!success) {
        try {
          fetch(CONFIG.API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          })
            .then(() => {
              success = true;
            })
            .catch((error) => {
              console.error("Failed to send metrics via fetch:", error);
              localStorage.setItem("unsentMetrics", payload);
            });
        } catch (error) {
          console.error("Fetch error:", error);
          localStorage.setItem("unsentMetrics", payload);
        }
      }
      if (success) {
        batchedData.length = 0;
      }
    }
  } finally {
    isFlushing = false;
  }
}

window.addEventListener("beforeunload", flushMetrics);
