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
  headingScore: null,
  structuredDataPresent: null,
  docSize: null,
  langTagPresent: null,
  titleDescriptionPresent: null,
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
  const semantic = computeSemanticMarkupScore(); // already cached
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

  return Math.round(score * 100); // returns 0–100
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
    ...aiCitationMetrics.domContentLoaded,
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

const thirdPartyDomainTimings = {};

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

          if (!thirdPartyDomainTimings[url.hostname]) {
            thirdPartyDomainTimings[url.hostname] = {
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

          const domainData = thirdPartyDomainTimings[url.hostname];
          domainData.count += 1;
          domainData.totalDuration += entry.duration || 0;
          domainData.maxDuration = Math.max(domainData.maxDuration, entry.duration || 0);
          domainData.totalTransferSize += entry.transferSize || 0;
          domainData.totalEncodedBodySize += entry.encodedBodySize || 0;

          const resourceTTFB = (entry.responseStart && entry.fetchStart) 
            ? (entry.responseStart - entry.fetchStart) 
            : 0;

          domainData.totalTTFB += resourceTTFB;
          domainData.maxTTFB = Math.max(domainData.maxTTFB, resourceTTFB);
          domainData.countTTFB += 1;

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
      const assetTypes = Array.from(thirdPartyAssetTypes);

      const domains = Array.from(thirdPartyAssetDomains).map((domain) => {
        const data = thirdPartyDomainTimings[domain];
        return {
          count: data?.count ?? 0,
          averageDuration: data ? data.totalDuration / data.count : 0,
          maxDuration: data?.maxDuration ?? 0,
          totalTransferSize: data?.totalTransferSize ?? 0,
          totalEncodedBodySize: data?.totalEncodedBodySize ?? 0,
          averageTTFB:
            data && data.countTTFB > 0 ? data.totalTTFB / data.countTTFB : 0,
          maxTTFB: data?.maxTTFB ?? 0,
        };
      });

      queueEvent({
        type: "third-party-asset-summary",
        count: domains.length,
        assetTypes,
        domains,
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
