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

const batchedData = [];
const latestMetrics = {
  INP: null,
};

let maxCustomEntry = null;
let webVitalsINP = null;

let worstLCP = null;
let worstCLS = null;

let isFlushing = false;
let hasFlushed = false;

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

// for main thread profiling (INP)
let profiler;
if ("Profiler" in window) {
  try {
    profiler = new Profiler({ sampleInterval: 10, maxBufferSize: 10000 });
  } catch (e) {
    console.warn("JS Profiling is disabled by Document Policy.");
  }
}

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
// if ("PerformanceObserver" in window) {
//   let navTimingQueued = false;

//   const observer = new PerformanceObserver((list) => {
//     if (navTimingQueued) return;

//     const entry = list.getEntries()[0];
//     if (!entry) return;

//     queueEvent({
//       type: "navigation-timing",
//       navigationType: entry.type, // navigate | reload | back_forward | prerender
//       incomplete:
//         entry.loadEventEnd === 0 ||
//         entry.domComplete === 0 ||
//         entry.responseEnd === 0,
//       raw: {
//         startTime: entry.startTime,
//         requestStart: entry.requestStart,
//         responseStart: entry.responseStart,
//         responseEnd: entry.responseEnd,
//         domInteractive: entry.domInteractive,
//         loadEventEnd: entry.loadEventEnd,
//       },
//     });

//     navTimingQueued = true;
//     observer.disconnect();
//   });

//   observer.observe({ type: "navigation", buffered: true });
// }

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

// function handleINP(metric) {
//   webVitalsINP = metric;
//   latestMetrics.INP = metric.value;
// }

async function handleINP(metric) {
  const primaryAddress = location.hostname;

  // Stop the profiler to get the samples
  const trace = profiler ? await profiler.stop() : null;
  const interactionStart = metric.startTime;
  const interactionEnd = metric.startTime + metric.value;

  let mainThreadBreakdown = [];

  if (trace) {
    // Filter and Map samples
    const filteredSamples = trace.samples.filter(
      (s) => s.timestamp >= interactionStart && s.timestamp <= interactionEnd,
    );

    // Deduplicate functions (so we don't send 1000 identical "react-dom" entries)
    const uniqueFunctions = new Set();
    mainThreadBreakdown = filteredSamples
      .map((sample) => {
        const frame = trace.frames[sample.frameId];
        const script = trace.scripts[frame.scriptId];
        const identifier = `${frame.name}-${script?.url}-${frame.line}`;

        if (uniqueFunctions.has(identifier)) return null;
        uniqueFunctions.add(identifier);

        return {
          fn: frame.name,
          file: script?.url || "inline/eval",
          isFirstParty: script?.url?.includes(primaryAddress),
          line: frame.line,
          col: frame.column,
        };
      })
      .filter(Boolean); // Remove nulls (duplicates)
  }

  const loafs = metric.attribution?.longAnimationFrameEntries || [];

  webVitalsINP = {
    ...metric,
    mainThreadBreakdown,
    loaf: loafs.map((loaf) => ({
      blockingDuration: loaf.blockingDuration,
      duration: loaf.duration,
      scripts:
        loaf.scripts?.map((x) => ({
          sourceURL: x.sourceURL,
          isFirstParty: x.sourceURL?.includes(primaryAddress),
          duration: x.duration,
          entryType: x.entryType,
          type: x.invokerType,
          invoker: x.invoker,
          sourceCharPosition: x.sourceCharPosition,
          layoutImpact: x.forcedStyleAndLayoutDuration,
        })) || [],
    })),
  };

  latestMetrics.INP = metric.value;

  if ("Profiler" in window) {
    profiler = new Profiler({ sampleInterval: 10, maxBufferSize: 10000 });
  }
}

function handleLCP(metric) {
  const rating = classifyMetric(metric.value, LCPThresholds);
  const resourceEntries = performance.getEntriesByType("resource");

  let targetEl = metric.attribution?.target;

  if (typeof targetEl === "string") {
    try {
      targetEl =
        document.querySelector(targetEl) ||
        document.querySelector(targetEl.split(">").pop());
    } catch {
      targetEl = null;
    }
  }

  const isImage =
    targetEl?.tagName?.toLowerCase() === "img" ||
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
    isImage && targetEl instanceof HTMLImageElement
      ? targetEl
      : (metric.attribution?.url &&
          document?.querySelector(`img[src="${metric.attribution?.url}"]`)) ||
        null;

  let fontAttribution = null;

  if (!isImage && targetEl instanceof Element) {
    const styles = getComputedStyle(targetEl);

    const fontFamily = styles.fontFamily
      ?.split(",")[0]
      ?.replace(/["']/g, "")
      .trim();

    const normalize = (str) => str.toLowerCase().replace(/[\s_\-\+]+/g, "-");

    const fontResource = performance
      .getEntriesByType("resource")
      .filter((x) => normalize(x.name).includes(normalize(fontFamily)));

    fontAttribution = {
      family: fontFamily,
      weight: styles.fontWeight,
      size: styles.fontSize,
      fontData: fontResource.map((x) => ({
        url: x.name ?? null,
        transferSize: x.transferSize ?? null,
      })),
    };
  }

  if (!worstLCP || metric.value > worstLCP.value) {
    worstLCP = {
      type: "web-vital",
      siteDomain,
      name: "LCP",
      value: metric.value,
      rating,
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

        ...(fontAttribution && {
          font: fontAttribution,
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

function collectPerformanceMetrics() {
  const nav = performance.getEntriesByType("navigation")[0];

  if (!nav) return null;

  const dnsLookup = nav.domainLookupEnd - nav.domainLookupStart;
  const tcpConnectionTime = nav.connectEnd - nav.connectStart;
  const requestQueueTime = nav.requestStart - nav.connectEnd;
  const timeToFirstByte = nav.responseStart - nav.requestStart;

  const userConnectionTime = dnsLookup + tcpConnectionTime;

  // Estimated backend/CDN processing time
  const serverProcessingTime = Math.max(
    0,
    timeToFirstByte - userConnectionTime - requestQueueTime,
  );

  // Optional cache signal
  let cacheStatus = null;
  const serverTiming = nav.serverTiming || [];
  const cacheEntry = serverTiming.find((x) => x.name === "cache");
  if (cacheEntry?.description) {
    cacheStatus = cacheEntry.description;
  }

  // Experience classification
  let experienceCategory = "good";
  if (userConnectionTime > 200) {
    experienceCategory = "poor_connection";
  } else if (timeToFirstByte > 600) {
    experienceCategory = "slow_server";
  }

  return {
    type: "navigation-timings",
    timeToFirstByte,
    serverProcessingTime,
    userConnectionTime,
    dnsLookup,
    tcpConnectionTime,
    requestQueueTime,
    experienceCategory,
    cacheStatus,
  };
}

// for INP
function getTopBlockingScript(loafEntries) {
  let maxScript = null;

  loafEntries.forEach((loaf) => {
    loaf.scripts?.forEach((script) => {
      if (!maxScript || script.duration > maxScript.duration) {
        maxScript = script;
      }
    });
  });

  return maxScript;
}

function getRenderBlockers() {
  const paintEntries = performance.getEntriesByType("paint");
  const fcpEntries = paintEntries.find(
    (x) => x.name === "first-contentful-paint",
  );

  if (!fcpEntries) {
    return; // no FCP reached yet
  }

  const fcpTime = fcpEntries.startTime;

  const resources = performance.getEntriesByType("resource");

  const blockers = resources.filter((res) => {
    if (res.renderBlockingStatus === "blocking") return true;

    const isBeforeFCP = res.responseEnd < fcpTime;
    const isSyncJS =
      res.initiatorType === "script" &&
      !res.name.includes("async") &&
      !res.name.includes("defer");
    const isCSS =
      res.initiatorType === "link" &&
      (res.name.includes(".css") || res.name.includes("fonts.googleapis"));

    return isBeforeFCP && (isSyncJS || isCSS);
  });

  const report = blockers.map((res) => {
    const fcpDelayVal = fcpTime - res.responseEnd;

    return {
      type: "render-blocking-scripts",
      URL: res.name,
      "Finish Time": res.responseEnd.toFixed(2) + "ms",
      "FCP Delay":
        fcpDelayVal > 0 ? fcpDelayVal.toFixed(2) + "ms" : "Critical Path",
    };
  });

  if (report.length > 0) {
    return report;
  } else {
    console.log("No render-blocking resources found | by Speedy Site.");
  }
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

function flushMetrics() {
  if (isFlushing || hasFlushed) return;

  isFlushing = true;
  hasFlushed = true;

  try {
    if (latestMetrics.INP || maxCustomEntry) {
      let inpAttribution = {};
      let inpValue = webVitalsINP
        ? webVitalsINP.value
        : maxCustomEntry
          ? maxCustomEntry.duration
          : null;
      const attr = webVitalsINP?.attribution;
      const topScript = getTopBlockingScript(webVitalsINP?.loaf || []);
      const inpTime = webVitalsINP?.startTime ?? maxCustomEntry?.startTime;

      if (webVitalsINP?.attribution) {
        inpAttribution = {
          target: summarizeElement(attr.target),
          eventType: attr.interactionType,
          inputDelay: attr.inputDelay,
          processingDuration: attr.processingDuration,
          presentationDelay: attr.presentationDelay,
          mainThreadFunctions: webVitalsINP.mainThreadBreakdown,
          loaf: topScript
            ? {
                sourceURL: topScript.sourceURL,
                duration: topScript.duration,
                invoker: topScript.invoker,
                type: topScript.type,
                sourceCharPosition: topScript.sourceCharPosition,
                layoutImpact: topScript.layoutImpact,
                isFirstParty: topScript.isFirstParty,
              }
            : null,
        };
      } else if (maxCustomEntry && maxCustomEntry.target) {
        const inputDelay =
          maxCustomEntry.processingStart - maxCustomEntry.startTime;
        const processingTime = maxCustomEntry.duration - inputDelay;

        inpAttribution = {
          target: summarizeElement(maxCustomEntry.target),
          eventType: maxCustomEntry.name,
          inputDelay: inputDelay,
          processingDuration: processingTime,
          loaf: topScript
            ? {
                sourceURL: topScript.sourceURL,
                duration: topScript.duration,
                invoker: topScript.invoker,
                type: topScript.type,
                sourceCharPosition: topScript.sourceCharPosition,
                layoutImpact: topScript.layoutImpact,
                isFirstParty: topScript.isFirstParty,
              }
            : null,
        };
      } else {
        inpAttribution = { target: "(unknown)", eventType: "unknown" };
      }

      if (inpValue !== null) {
        queueEvent({
          type: "web-vital",
          siteDomain,
          name: "INP",
          value: inpValue,
          rating: classifyMetric(inpValue, INPThresholds),
          attribution: inpAttribution,
        });
      }
    }

    // aggregate CLS
    if (worstCLS) batchedData.push(worstCLS);

    //aggregate LCP
    if (worstLCP) batchedData.push(worstLCP);

    const navigationTimingInfo = collectPerformanceMetrics();

    if (navigationTimingInfo != null) {
      batchedData.push(navigationTimingInfo);
    }

    const r_blockings = getRenderBlockers();

    if (r_blockings) {
      batchedData.push(r_blockings);
    }

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
