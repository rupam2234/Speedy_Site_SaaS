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

// For FCP and TTFB, web-vitals doesn't export thresholds, so we define them:
const FCPThresholds = [1800, 3000];
const TTFBThresholds = [800, 1800];

function classifyMetric(value, thresholds) {
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "needs improvement";
  return "poor";
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

  const enrichedMetric = {
    name: metric.name,
    value: metric.value,
    rating,
    id: metric.id,
    delta: metric.delta,
    attribution: metric.attribution, // includes element, load state, etc.
  };

  console.log(enrichedMetric);

  // Optionally send to your server
  // navigator.sendBeacon('https://yourdomain.com/api/vitals', JSON.stringify(enrichedMetric));
}

// Register metric observers with attribution support
onCLS(handleMetric, { reportAllChanges: true });
onINP(handleMetric, { reportAllChanges: true });
onLCP(handleMetric);
onFCP(handleMetric);
onTTFB(handleMetric);
