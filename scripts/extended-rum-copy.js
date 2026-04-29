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

let maxCustomEntry = null;
let webVitalsINP = null;

let worstLCP = null;
let worstCLS = null;

let isFlushing = false;
let hasFlushed = false;

function createLongTaskTracker() {
  const buffer = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      buffer.push({
        start: entry.startTime,
        duration: entry.duration,
        name: entry.name,
      });

      if (buffer.length > 200) buffer.shift();
    }
  });

  if (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes?.includes("longtask")
  ) {
    observer.observe({ type: "longtask", buffered: true });
  }

  return {
    stop: () => observer.disconnect(),
    get: () => buffer,
    // flush: () => {
    //   const now = performance.now();
    //   const out = buffer.filter((t) => now - t.start < 5000);
    //   return out;
    // },
  };
}

const longTaskTracker = createLongTaskTracker();

function createCLSObserver() {
  const buffer = [];
  let worst = null;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;

      buffer.push(entry);
      if (buffer.length > 200) buffer.shift();

      if (!worst || entry.value > worst.value) {
        worst = entry;
      }
    }
  });

  if (PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) {
    observer.observe({ type: "layout-shift", buffered: true });
  }

  return {
    buffer,
    getWorst: () => worst,
    // flush: () => {
    //   const out = buffer.slice();
    //   buffer.length = 0;
    //   return out;
    // },
    stop: () => observer.disconnect(),
  };
}

const clsObserver = createCLSObserver();

function computeSessionCLS(entries) {
  let maxCLS = 0;
  let sessionValue = 0;
  let sessionStartTime = 0;
  let lastEntryTime = 0;

  for (const entry of entries) {
    if (
      sessionValue === 0 ||
      entry.startTime - lastEntryTime > 1000 ||
      entry.startTime - sessionStartTime > 5000
    ) {
      sessionValue = entry.value;
      sessionStartTime = entry.startTime;
    } else {
      sessionValue += entry.value;
    }

    lastEntryTime = entry.startTime;
    maxCLS = Math.max(maxCLS, sessionValue);
  }

  return maxCLS;
}

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

const elementSummaryCache = new Map();

function summarizeElement(el) {
  if (!el || !el.tagName) {
    return "(unknown)";
  }

  const key = el.tagName + "|" + (el.id || "") + "|" + (el.className || "");

  if (elementSummaryCache.has(key)) {
    return elementSummaryCache.get(key);
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

  elementSummaryCache.set(key, summary);

  return summary;
}

function initializeWebVitals() {
  onCLS(handleCLS, { reportAllChanges: true });
  onLCP(handleLCP, { reportAllChanges: true });
  onFCP(handleFCP);
  onTTFB(handleTTFB);
  onINP(handleINP, { reportAllChanges: true });

  const supported = PerformanceObserver.supportedEntryTypes || [];

  if (
    typeof PerformanceObserver !== "undefined" &&
    supported.includes("event")
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

function init() {
  initializeWebVitals();
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}

// Reset INP data on SPA navigation
window.addEventListener("popstate", () => {
  previousPage = currentPage;
  currentPage = location.pathname + location.search;

  maxCustomEntry = null;
  webVitalsINP = null;
  // latestMetrics.INP = null;
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
  const shifts = metric.attribution?.largestShiftEntries || [];

  const validShifts = shifts.filter((e) => e?.previousRect && e?.currentRect);

  let enrichedShifts = validShifts
    .map((entry) => {
      const prev = entry.previousRect;
      const curr = entry.currentRect;
      const node =
        entry.sources?.[0]?.node || entry.sources?.[0]?.element || null;

      if (!prev || !curr) return null;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;

      const areaBefore = prev.width * prev.height;
      const areaAfter = curr.width * curr.height;
      const viewportArea = window.innerWidth * window.innerHeight || 1;
      const distanceMoved = Math.sqrt(dx * dx + dy * dy);

      return {
        element: summarizeElement(node),
        shift: {
          dx,
          dy,
          direction: {
            horizontal: dx > 0 ? "right" : dx < 0 ? "left" : "none",
            vertical: dy > 0 ? "down" : dy < 0 ? "up" : "none",
          },
        },
        rect: { previous: prev, current: curr },
        impact: {
          areaBefore,
          distanceMoved,
          areaAfter,
          areaDelta: areaAfter - areaBefore,
          viewportRatio: areaBefore / viewportArea,
        },
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.impact.viewportRatio - a.impact.viewportRatio ||
        b.impact.distanceMoved - a.impact.distanceMoved ||
        b.rect.current.y - a.rect.current.y,
    );

  if (enrichedShifts.length === 0 && clsObserver) {
    const rawShifts = clsObserver.buffer;

    enrichedShifts = rawShifts
      .filter((e) => e.value > 0)
      .map((entry) => ({
        element: entry.sources?.[0]?.node
          ? summarizeElement(entry.sources[0].node)
          : "(unknown)",
        shift: null,
        rect: null,
        impact: {
          areaBefore: null,
          areaAfter: null,
          areaDelta: null,
          distanceMoved: null,
          viewportRatio: entry.value,
        },
        value: entry.value,
        time: entry.startTime,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  const rawBuffer = clsObserver?.buffer || [];

  const debug = {
    totalShifts: rawBuffer.length,
    cumulativeSessionValue: computeSessionCLS(rawBuffer),
    webVitalsValue: metric.value,
    worstSingleShift: clsObserver?.getWorst()?.value || 0,
    recentShifts: rawBuffer.slice(-5).map((e) => ({
      value: e.value,
      time: e.startTime,
    })),
  };

  const topShift = enrichedShifts[0];

  worstCLS = {
    type: "web-vital",
    siteDomain,
    name: "CLS",
    value: metric.value,
    rating: classifyMetric(metric.value, CLSThresholds),
    attribution: {
      largestShiftTarget: metric.attribution?.largestShiftTarget,
      largestShiftTime: metric.attribution?.largestShiftTime,
      loadState: metric.attribution?.loadState,
      shifts: enrichedShifts,
      summary: topShift
        ? {
            element: topShift.element,
            biggestShift: topShift.shift,
            impact: topShift.impact,
            rect: topShift.rect,
          }
        : null,
    },
    debug,
  };
}

async function handleINP(metric) {
  const isFirstParty = (url) => {
    try {
      const u = new URL(url);
      return u.hostname === location.hostname;
    } catch {
      return false;
    }
  };

  // latestMetrics.INP = metric.value;
  // if (!webVitalsINP) {
  //   webVitalsINP = { value: metric.value };
  // }

  // Expand interaction window slightly
  const BUFFER = 50;
  const interactionStart = metric.startTime - BUFFER;
  const interactionEnd = metric.startTime + metric.value + BUFFER;

  const longTasks = longTaskTracker.get();

  const relevantLongTasks = longTasks.filter((t) => {
    const taskStart = t.start;
    const taskEnd = t.start + t.duration;

    return taskEnd >= interactionStart && taskStart <= interactionEnd;
  });

  let mainThreadBreakdown = relevantLongTasks
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map((t) => ({
      task: "main-thread-block",
      duration: t.duration,
      start: t.start,
    }));

  const loafs = metric.attribution?.longAnimationFrameEntries || [];

  webVitalsINP = {
    ...metric,
    mainThreadBreakdown,
    loaf: loafs.map((loaf) => ({
      blockingDuration: loaf.blockingDuration,
      duration: loaf.duration,
      scripts: (loaf.scripts || [])
        .map((x) => ({
          sourceURL: x.sourceURL,
          isFirstParty: isFirstParty(x.sourceURL),
          duration: x.duration,
          entryType: x.entryType,
          type: x.invokerType,
          invoker: x.invoker,
          sourceCharPosition: x.sourceCharPosition,
          layoutImpact: x.forcedStyleAndLayoutDuration,
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5),
    })),
  };
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
      (res.name.includes(".css") || res.name.includes("fonts.googleapis.com"));

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
    (webVitalsINP !== null || maxCustomEntry !== null)
  ) {
    return true;
  }
}

function flushMetrics() {
  if (isFlushing || hasFlushed) return;

  isFlushing = true;
  hasFlushed = true;

  try {
    if (webVitalsINP || maxCustomEntry) {
      let inpAttribution = {};
      let inpValue = webVitalsINP
        ? webVitalsINP.value
        : maxCustomEntry
          ? maxCustomEntry.duration
          : null;
      const attr = webVitalsINP?.attribution;
      const topScript = getTopBlockingScript(webVitalsINP?.loaf || []);
      // const inpTime = webVitalsINP?.startTime ?? maxCustomEntry?.startTime;

      if (webVitalsINP?.attribution) {
        inpAttribution = {
          target: attr?.target ? summarizeElement(attr.target) : "(unknown)",
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
          target: maxCustomEntry?.target
            ? summarizeElement(maxCustomEntry.target)
            : "(unknown)",
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

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          CONFIG.API_URL,
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        fetch(CONFIG.API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
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
