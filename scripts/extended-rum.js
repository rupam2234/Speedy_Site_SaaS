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

// Set a sessionId only once per browser session.
// Automatically reuse the same sessionId for all analytics events in that session.
// Automatically clear it when the browser is closed.
function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function setCookie(name, value) {
  // No expiration = session cookie
  document.cookie = `${name}=${value}; path=/`;
}

let sessionId = getCookie("sessionId");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  setCookie("sessionId", sessionId);
}

const batchedData = [];

function updatePagePath(newPath) {
  previousPage = currentPage;
  currentPage = newPath;
}

window.addEventListener("popstate", () => {
  updatePagePath(location.pathname + location.search);
});

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
      rating = classifyMetric(metric.value, CLSThresholds);
      break;
    case "INP":
      rating = classifyMetric(metric.value, INPThresholds);
      break;
    case "LCP":
      rating = classifyMetric(metric.value, LCPThresholds);
      break;
    case "FCP":
      rating = classifyMetric(metric.value, FCPThresholds);
      break;
    case "TTFB":
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
      // NO individual queueEvent for 3rd party asset here anymore
    }

    // Keep slow API calls as-is
    if (
      (entry.initiatorType === "fetch" ||
        entry.initiatorType === "xmlhttprequest") &&
      entry.duration > 500 &&
      !entry.name.includes("/api/collect-web-vitals")
    ) {
      queueEvent({
        type: "slow-api-call",
        url: entry.name,
        duration: entry.duration.toFixed(2),
        startTime: entry.startTime.toFixed(2),
        siteDomain,
        timestamp: Date.now(),
      });
    }
  }
}).observe({ type: "resource", buffered: true });

let longTaskCount = 0;
let totalLongTaskDuration = 0;
const criticalLongTasks = [];

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === "self" && entry.duration > 50) {
      longTaskCount++;
      totalLongTaskDuration += entry.duration;

      const task = {
        type: entry.duration > 100 ? "long-task-critical" : "long-task",
        siteDomain,
        name: entry.name,
        duration: Number(entry.duration.toFixed(2)),
        startTime: Number(entry.startTime.toFixed(2)),
        timestamp: Date.now(),
      };

      if (entry.duration > 100) criticalLongTasks.push(task);
      queueEvent(task);
    }
  }
}).observe({ type: "longtask", buffered: true });

(function detectFontFlash() {
  const headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
  let invisibleTime = 0;
  let checkCount = 0;
  const start = performance.now();
  const interval = setInterval(() => {
    let invisible = 0;
    headings.forEach((el) => {
      const color = window.getComputedStyle(el).color;
      if (
        color === "rgba(0, 0, 0, 0)" ||
        getComputedStyle(el).visibility === "hidden"
      ) {
        invisible++;
      }
    });
    checkCount++;
    if (invisible > 0) invisibleTime += 50;
    if (performance.now() - start > 3000 || checkCount > 60) {
      clearInterval(interval);
      if (invisibleTime > 100) {
        queueEvent({
          type: "font-flash",
          invisibleDuration: invisibleTime,
          checks: checkCount,
          siteDomain,
          timestamp: Date.now(),
        });
      }
    }
  }, 50);
})();

(function collectClientMeta() {
  const clientMeta = {
    type: "client-info",
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
      queueEvent({ ...geo, type: "geo-info" });
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
    thirdPartyDomains: Array.from(thirdPartyDomains),
    storageUsage,
    siteDomain,
    timestamp: Date.now(),
  });
})();

window.addEventListener("beforeunload", () => {
  if (longTaskCount > 0) {
    queueEvent({
      type: "long-task-summary",
      siteDomain,
      total: longTaskCount,
      avgDuration: Number((totalLongTaskDuration / longTaskCount).toFixed(2)),
      totalDuration: Number(totalLongTaskDuration.toFixed(2)),
      critical: criticalLongTasks.length,
      timestamp: Date.now(),
    });
  }

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
