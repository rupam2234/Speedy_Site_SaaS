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
  INP: null,
};

const geo = window.__GEO_INFO__;

let maxCustomEntry = null;
let webVitalsINP = null;

let worstLCP = null;
let worstCLS = null;

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
  return summary;
}

// to collect navigation timings
if ("PerformanceObserver" in window) {
  let navTimingQueued = false;

  const observer = new PerformanceObserver((list) => {
    if (navTimingQueued) return;

    const entry = list.getEntries()[0];
    if (!entry) return;



    queueEvent({
      type: "navigation-timing",
      navigationType: entry.type, // navigate | reload | back_forward | prerender
      incomplete:
        entry.loadEventEnd === 0 ||
        entry.domComplete === 0 ||
        entry.responseEnd === 0,
      raw: {
        startTime: entry.startTime,
        requestStart: entry.requestStart,
        responseStart: entry.responseStart,
        responseEnd: entry.responseEnd,
        domInteractive: entry.domInteractive,
        // domComplete: entry.domComplete,
        loadEventEnd: entry.loadEventEnd,
        // transferSize: entry.transferSize,
        // encodedBodySize: entry.encodedBodySize,
        // decodedBodySize: entry.decodedBodySize,
      },
      // timestamp: Date.now(),
    });

    navTimingQueued = true;
    observer.disconnect();
  });

  observer.observe({ type: "navigation", buffered: true });
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
      "PerformanceObserver or 'event' entry type not supported; INP tracking disabled.",
    );
    queueEvent({
      type: "error",
      message: "PerformanceObserver or 'event' entry type not supported",
      siteDomain,
      // timestamp: Date.now(),
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
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
  batchedData.push(event);
  // batchedData.push({ ...event, sessionId }); // adds session id into the event -> currently unnecessary
}

function handleCLS(metric) {
  // latestMetrics.CLS = metric.value;

  if(!worstCLS || metric.value > worstCLS.value){
    worstCLS = {
      type: "web-vital",
      siteDomain,
      name: "CLS",
      value: metric.value,
      rating: classifyMetric(metric.value, CLSThresholds),
      id: metric.id,
      delta: metric.delta,
      attribution: {
        largestShiftTarget: metric.attribution?.largestShiftTarget,
        largestShiftTime: metric.attribution?.largestShiftTime,
      },
    }
  }
  // queueEvent({
  //   type: "web-vital",
  //   siteDomain,
  //   name: "CLS",
  //   value: metric.value,
  //   rating,
  //   id: metric.id,
  //   delta: metric.delta,
  //   attribution: {
  //     largestShiftTarget: metric.attribution?.largestShiftTarget,
  //     largestShiftTime: metric.attribution?.largestShiftTime,
  //   },
  //   // timestamp: Date.now(),
  // });
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
      e.name.includes(metric.attribution?.url?.split("/").pop()),
    );

  const matchedEntry = entryByExactUrl || entryByLooseMatch;

  const findImage =
    isImage && metric.attribution?.target instanceof HTMLImageElement
      ? metric.attribution.target
      : (metric.attribution?.url &&
          document?.querySelector(`img[src="${metric.attribution?.url}"]`)) ||
        null;

  if(!worstLCP || metric.value > worstLCP.value){
    worstLCP = {type: "web-vital",
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
    }
  }      
}

function handleFCP(metric) {
  // latestMetrics.FCP = metric.value;
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
    // timestamp: Date.now(),
  });
}

function handleTTFB(metric) {
  // latestMetrics.TTFB = metric.value;
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
    // timestamp: Date.now(),
  });
}

function getDeviceType() {
  const w = window.innerWidth;
  return w <= 768 ? "mobile" : w <= 1024 ? "tablet" : "desktop";
}

function detectOriginHit() {
  const nav = performance.getEntriesByType("navigation")[0];
  if (!nav) return { type: "origin-info", detected: false, originHit: null, provider: null };

  const st = nav.serverTiming || [];

  // if cloudflare CDN
  const cfOrigin = st.find(x => x.name === "cfOrigin");
  if (cfOrigin) {
    return {
      type: "origin-info",
      detected: true,
      provider: "cloudflare",
      originHit: cfOrigin.duration > 0,
      originDuration: cfOrigin.duration,
      cacheStatus: null
    };
  }

  // generic CDN
  const genericOrigin = st.find(x => x.name === "origin");
  if (genericOrigin) {
    return {
      type: "origin-info",
      detected: true,
      provider: "generic-server-timing",
      originHit: genericOrigin.duration > 0,
      originDuration: genericOrigin.duration,
      cacheStatus: null
    };
  }

  // other CDNs
  const cacheTiming = st.find(x =>
    ["cache", "cdn-cache", "edgeCache"].includes(x.name)
  );

  if (cacheTiming?.description) {
    const status = cacheTiming.description.toUpperCase();
    const originHit = ["MISS", "REVALIDATED", "EXPIRED", "BYPASS"].includes(status);
    return {
      type: "origin-info",
      detected: true,
      provider: "generic-cache-status",
      originHit,
      originDuration: null,
      cacheStatus: status
    };
  }

  // no CDN 
  return {
    type: "origin-info",
    detected: false,
    originHit: null,
    originDuration: null,
    provider: null,
    cacheStatus: null
  };
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

let isFlushing = false;

function flushMetrics() {
  if (isFlushing) return;
  isFlushing = true;

  try {

    // aggregate INP
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
        // timestamp: Date.now(),
      });

      console.debug("INP event queued:", {
        value: inpValue,
        attribution: inpAttribution,
        source: webVitalsINP ? "web-vitals" : "custom",
      });
    } else {
      console.debug("No INP data available for queuing");
    }

    // aggregate CLS
    if(worstCLS) batchedData.push(worstCLS);

    //aggregate LCP
    if(worstLCP) batchedData.push(worstLCP);

    /**
     * origin hit detection
     */
    const originInfo = detectOriginHit();
    if (originInfo.originHit === null) {
      originInfo.originHit = true;
      originInfo.provider = "primary-server";
    }

    batchedData.push(originInfo);

    // then we prep the payload
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
    
    // clean up
    worstCLS = null;
    worstLCP = null;
  }
}

window.addEventListener("beforeunload", flushMetrics);

