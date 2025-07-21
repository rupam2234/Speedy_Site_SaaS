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

function enrichWithPagePath(data) {
  return {
    ...data,
    currentPage,
    previousPage,
  };
}

function queueEvent(event) {
  batchedData.push(event);
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

  const enrichedMetric = enrichWithPagePath({
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

  queueEvent(enrichedMetric);
}

onCLS(
  (metric) => {
    handleMetric(metric);
    if (metric.attribution?.elements) {
      metric.attribution.elements.forEach((el) => {
        if (el?.node) {
          el.node.style.outline = "2px dashed red";
          el.node.title = `Shift impact: ${metric.value.toFixed(3)}`;
        }
      });
    }
  },
  { reportAllChanges: true }
);
onINP(handleMetric, { reportAllChanges: true });
onLCP(handleMetric);
onFCP(handleMetric);
onTTFB(handleMetric);

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (
      entry.initiatorType === "script" &&
      entry.name.includes("://") &&
      !entry.name.includes(location.hostname)
    ) {
      queueEvent(
        enrichWithPagePath({
          type: "third-party-script",
          src: entry.name,
          duration: entry.duration.toFixed(2),
          startTime: entry.startTime.toFixed(2),
          siteDomain,
          timestamp: Date.now(),
        })
      );
    }

    if (
      (entry.initiatorType === "fetch" ||
        entry.initiatorType === "xmlhttprequest") &&
      entry.duration > 500 &&
      !entry.name.includes("/api/collect-web-vitals")
    ) {
      queueEvent(
        enrichWithPagePath({
          type: "slow-api-call",
          url: entry.name,
          duration: entry.duration.toFixed(2),
          startTime: entry.startTime.toFixed(2),
          siteDomain,
          timestamp: Date.now(),
        })
      );
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

      const task = enrichWithPagePath({
        type: entry.duration > 100 ? "long-task-critical" : "long-task",
        siteDomain,
        name: entry.name,
        duration: Number(entry.duration.toFixed(2)),
        startTime: Number(entry.startTime.toFixed(2)),
        timestamp: Date.now(),
      });

      if (entry.duration > 100) {
        criticalLongTasks.push(task);
      }

      queueEvent(task);
    }
  }
}).observe({ type: "longtask", buffered: true });

window.addEventListener("beforeunload", () => {
  if (longTaskCount > 0) {
    queueEvent(
      enrichWithPagePath({
        type: "long-task-summary",
        siteDomain,
        total: longTaskCount,
        avgDuration: Number((totalLongTaskDuration / longTaskCount).toFixed(2)),
        totalDuration: Number(totalLongTaskDuration.toFixed(2)),
        critical: criticalLongTasks.length,
        timestamp: Date.now(),
      })
    );
  }

  if (batchedData.length > 0) {
    navigator.sendBeacon(
      "http://localhost:3000/api/collect-web-vitals",
      JSON.stringify(batchedData)
    );
  }
});

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
        queueEvent(
          enrichWithPagePath({
            type: "font-flash",
            invisibleDuration: invisibleTime,
            checks: checkCount,
            siteDomain,
            timestamp: Date.now(),
          })
        );
      }
    }
  }, 50);

  if (document.fonts) {
    document.fonts.ready.then(() => {
      // Optional: capture font load time
    });
  }
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
  queueEvent(enrichWithPagePath(clientMeta));

  fetch("https://ipapi.co/json/")
    .then((res) => res.json())
    .then((geo) => {
      queueEvent(enrichWithPagePath({ ...geo, type: "geo-info" }));
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
          queueEvent(
            enrichWithPagePath({
              type: "tracker-detected",
              url: url.hostname,
              siteDomain,
              timestamp: Date.now(),
            })
          );
        }
      }
    }
  });

  const storageUsage = {
    cookies: document.cookie.length,
    localStorageKeys: Object.keys(localStorage).length,
    sessionStorageKeys: Object.keys(sessionStorage).length,
  };

  queueEvent(
    enrichWithPagePath({
      type: "privacy-data",
      thirdPartyDomains: Array.from(thirdPartyDomains),
      storageUsage,
      siteDomain,
      timestamp: Date.now(),
    })
  );
})();
