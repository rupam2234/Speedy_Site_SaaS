if (
  "PerformanceObserver" in window &&
  PerformanceObserver.supportedEntryTypes.includes("event")
) {
  let maxINP = null;

  function summarizeElement(el) {
    if (!el || !el.tagName) return "(unknown)";

    let summary = `<${el.tagName.toLowerCase()}`;
    if (el.id) summary += ` id="${el.id}"`;
    if (el.className) summary += ` class="${el.className}"`;
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

          console.log(
            `🔥 New Max INP: Type=${
              entry.name
            }, Duration=${entry.duration.toFixed(2)}ms, ` +
              `Target=${summarizeElement(
                entry.target
              )}, TimeSinceLoad=${entry.startTime.toFixed(2)}ms`
          );
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
  console.log(
    'PerformanceObserver "event" entryType is NOT supported in this browser.'
  );
}
