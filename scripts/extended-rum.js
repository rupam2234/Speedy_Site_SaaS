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
  API_URL: "https://buffer.speedy.site/collect",
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

let maxCustomEntry = null;
let webVitalsINP = null;

let worstLCP = null;
let worstCLS = null;

const elementSummaryCache = new WeakMap();

function summarizeElement(el) {
  if (!el || !el.tagName) {
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
        loadEventEnd: entry.loadEventEnd,
      },
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
    });
  }
}

// document.addEventListener("DOMContentLoaded", () => {
//   const raw = localStorage.getItem("unsentMetrics");
//   if (!raw) return;

//   try {
//     const { payload, timestamp } = JSON.parse(raw);

//     // Only retry if less than 30 seconds old
//     if (Date.now() - timestamp < 30000) {

//       const success = navigator.sendBeacon(
//         CONFIG.API_URL,
//         new Blob([payload], { type: "application/json" })
//       );

//       if (success) {
//         localStorage.removeItem("unsentMetrics");
//       }

//     } else {
//       // expired retry window
//       localStorage.removeItem("unsentMetrics");
//     }

//   } catch {
//     localStorage.removeItem("unsentMetrics");
//   }
// });

initializeWebVitals();

// Reset INP data on SPA navigation
window.addEventListener("popstate", () => {
  previousPage = currentPage;
  currentPage = location.pathname + location.search;

  maxCustomEntry = null;
  webVitalsINP = null;
  latestMetrics.INP = null;
});

function classifyMetric(value, thresholds) {
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "needs improvement";
  return "poor";
}

function queueEvent(event) {
  if (batchedData.length >= CONFIG.MAX_EVENTS_PER_SESSION) {
    console.warn("Event queue limit reached; flushing early.");
    flushMetrics();
  }
  batchedData.push(event);
}

function handleCLS(metric) {
  if (!worstCLS || metric.value > worstCLS.value) {
    worstCLS = {
      type: "web-vital",
      siteDomain,
      name: "CLS",
      value: metric.value,
      rating: classifyMetric(metric.value, CLSThresholds),
      attribution: {
        largestShiftTarget: metric.attribution?.largestShiftTarget,
        largestShiftTime: metric.attribution?.largestShiftTime,
      },
    };
  }
}

function handleINP(metric) {
  webVitalsINP = metric;
  latestMetrics.INP = metric.value;
}

function handleLCP(metric) {
  const rating = classifyMetric(metric.value, LCPThresholds);
  const resourceEntries = performance.getEntriesByType("resource");
  const targetEl = metric.attribution?.target;

  const isImage =
    targetEl?.tagName?.toLowerCase() === "img" ||
    metric.attribution?.url?.match(/\.(jpe?g|png|webp|gif|avif|svg)$/i);

  // image matching (always collect)
  const entryByExactUrl =
    metric.attribution?.url &&
    resourceEntries.find((e) => e.name === metric.attribution.url);

  const entryByLooseMatch =
    !entryByExactUrl &&
    resourceEntries.find((e) =>
      e.name.includes(metric.attribution?.url?.split("/").pop() || ""),
    );

  const matchedEntry = entryByExactUrl || entryByLooseMatch;

  const findImage =
    isImage && targetEl instanceof HTMLImageElement
      ? targetEl
      : (metric.attribution?.url &&
          document.querySelector(`img[src="${metric.attribution.url}"]`)) ||
        null;

  // worst LCP check
  if (!worstLCP || metric.value > worstLCP.value) {
    // font detection (only for worst LCP)
    let fontData = null;
    let fontResource = null;

    if (!isImage && targetEl instanceof Element) {
      const styles = getComputedStyle(targetEl);
      const fontFamily = styles.fontFamily
        ?.split(",")[0]
        ?.replace(/["']/g, "")
        .trim();

      fontData = {
        fontFamily,
        fontWeight: styles.fontWeight,
        fontSize: styles.fontSize,
      };

      fontResource = resourceEntries
        .filter((e) => e.initiatorType === "font")
        .find((e) => {
          const fileName = e.name.split("/").pop()?.toLowerCase() || "";
          return fontFamily && fileName.includes(fontFamily.toLowerCase());
        });
    }

    worstLCP = {
      type: "web-vital",
      siteDomain,
      name: "LCP",
      value: metric.value,
      rating,
      attribution: {
        target: summarizeElement(targetEl),
        resourceLoadDelay: metric.attribution?.resourceLoadDelay,
        resourceLoadDuration: metric.attribution?.resourceLoadDuration,
        elementRenderDelay: metric.attribution?.elementRenderDelay,
        timeToFirstByte: metric.attribution?.timeToFirstByte,
        url: metric.attribution?.url,

        // always include image info
        ...(isImage && {
          decodedBodySize: matchedEntry?.decodedBodySize ?? null,
          transferSize: matchedEntry?.transferSize ?? null,
          width: findImage?.width ?? null,
          height: findImage?.height ?? null,
          isLazy:
            findImage?.classList?.contains("lazyloaded") ||
            findImage?.classList?.contains("lazyload"),
        }),

        // font info only for worst LCP
        ...(fontData && {
          font: {
            family: fontData.fontFamily,
            weight: fontData.fontWeight,
            size: fontData.fontSize,
            url: fontResource?.name || null,
            transferSize: fontResource?.transferSize ?? null,
          },
        }),
      },
    };
  }
}

function handleFCP(metric) {
  const rating = classifyMetric(metric.value, FCPThresholds);
  queueEvent({
    type: "web-vital",
    siteDomain,
    name: "FCP",
    value: metric.value,
    rating,
    attribution: {},
  });
}

function handleTTFB(metric) {
  const rating = classifyMetric(metric.value, TTFBThresholds);
  const navEntry = performance.getEntriesByType("navigation")[0];
  queueEvent({
    type: "web-vital",
    siteDomain,
    name: "TTFB",
    value: metric.value,
    rating,
    attribution: {
      dnsLookup: navEntry?.domainLookupEnd - navEntry?.domainLookupStart,
      tcpConnection: navEntry?.connectEnd - navEntry?.connectStart,
      responseStart: navEntry?.responseStart,
      requestStart: navEntry?.requestStart,
    },
  });
}

function getDeviceType() {
  const w = window.innerWidth;
  return w <= 768 ? "mobile" : w <= 1024 ? "tablet" : "desktop";
}

function detectOriginHit() {
  const nav = performance.getEntriesByType("navigation")[0];
  if (!nav)
    return {
      type: "origin-info",
      detected: false,
      originHit: null,
      provider: null,
    };

  const st = nav.serverTiming || [];

  // if cloudflare CDN
  const cfOrigin = st.find((x) => x.name === "cfOrigin");
  if (cfOrigin) {
    return {
      type: "origin-info",
      detected: true,
      provider: "cloudflare",
      originHit: cfOrigin.duration > 0,
      originDuration: cfOrigin.duration,
      cacheStatus: null,
    };
  }

  // generic CDN
  const genericOrigin = st.find((x) => x.name === "origin");
  if (genericOrigin) {
    return {
      type: "origin-info",
      detected: true,
      provider: "generic-server-timing",
      originHit: genericOrigin.duration > 0,
      originDuration: genericOrigin.duration,
      cacheStatus: null,
    };
  }

  // other CDNs
  const cacheTiming = st.find((x) =>
    ["cache", "cdn-cache", "edgeCache"].includes(x.name),
  );

  if (cacheTiming?.description) {
    const status = cacheTiming.description.toUpperCase();
    const originHit = ["MISS", "REVALIDATED", "EXPIRED", "BYPASS"].includes(
      status,
    );
    return {
      type: "origin-info",
      detected: true,
      provider: "generic-cache-status",
      originHit,
      originDuration: null,
      cacheStatus: status,
    };
  }

  // no CDN
  return {
    type: "origin-info",
    detected: false,
    originHit: null,
    originDuration: null,
    provider: null,
    cacheStatus: null,
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
})();

function checkMetricsReady() {
  // this checks for completion of vitals data to send on page unload, tab shift or page change
  if (
    worstCLS !== null &&
    worstLCP !== null &&
    (webVitalsINP !== null || maxCustomEntry === null)
  ) {
    return true;
  }
}

let isFlushing = false;
let hasFlushed = false;

function flushMetrics() {
  if (isFlushing || hasFlushed) return;

  isFlushing = true;
  hasFlushed = true;

  try {
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
        const attr = webVitalsINP.attribution;

        inpAttribution = {
          target: summarizeElement(attr.target),
          interactionType: attr.interactionType,
          inputDelay: attr.inputDelay,
          processingDuration: attr.processingDuration,
          presentationDelay: attr.presentationDelay,
        };
      } else {
        inpAttribution = { target: "(unknown)", eventType: "unknown" };
      }

      let inpValue;

      if (webVitalsINP) {
        inpValue = webVitalsINP.value;
      } else if (maxCustomEntry) {
        inpValue = maxCustomEntry.duration;
      } else {
        return;
      }

      const rating = classifyMetric(inpValue, INPThresholds);
      queueEvent({
        type: "web-vital",
        siteDomain,
        name: "INP",
        value: inpValue,
        rating,
        attribution: inpAttribution,
      });
    }

    // aggregate CLS
    if (worstCLS) batchedData.push(worstCLS);

    //aggregate LCP
    if (worstLCP) batchedData.push(worstLCP);

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
        data: [...batchedData],
      });

      let success = false;

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        success = navigator.sendBeacon(CONFIG.API_URL, blob);
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
              // if (payload.length < 50000) { // avoids filling it with large payloads
              //   localStorage.setItem(
              //     "unsentMetrics",
              //     JSON.stringify({
              //       payload,
              //       timestamp: Date.now()
              //     })
              //   );
              // }
            });
        } catch (error) {
          console.error("Fetch error:", error);
          // if (payload.length < 50000) { // avoids filling it with large payloads
          //   localStorage.setItem(
          //     "unsentMetrics",
          //     JSON.stringify({
          //       payload,
          //       timestamp: Date.now()
          //     })
          //   );
          // }
        }
      }
    }
  } finally {
    batchedData.length = 0;
    worstCLS = null;
    worstLCP = null;
    isFlushing = false;
  }
}

setTimeout(() => {
  if (document.visibilityState === "visible") {
    const isReady = checkMetricsReady();
    if (isReady) flushMetrics();
  }
}, 15000); // flush after 15 seconds of page load

// iOS Safari and modern browsers
window.addEventListener("pagehide", () => {
  if (!hasFlushed) flushMetrics();
});

// Android/Chrome and most browsers
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && !hasFlushed) {
    flushMetrics();
  }
});

// fallback
// window.addEventListener("beforeunload", flushMetrics);
