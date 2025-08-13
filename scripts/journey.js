(function () {
  if (window.trackUserJourney && window.trackUserJourney.__initialized) {
    console.warn("[Journey] trackUserJourney already initialized, skipping.");
    return;
  }

  function trackUserJourney(opts) {
    var steps = opts.steps || [];
    var containerSelector = opts.containerSelector || "body";
    var sessionKey = opts.sessionKey || "user-journey-session-id";
    var analyticsEndpoint = opts.analyticsEndpoint || null;
    var debug = opts.debug || false;
    var maxObserverTimeout = opts.maxObserverTimeout || 10000;

    function logDebug() {
      if (debug) {
        console.log.apply(
          console,
          ["[Journey Debug]"].concat(Array.prototype.slice.call(arguments))
        );
      }
    }

    logDebug("🚀 Initializing trackUserJourney");

    if (!Array.isArray(steps) || steps.length === 0) {
      logDebug("❌ Invalid or empty steps array");
      return;
    }

    var normalizedSteps = steps.map(function (step, index) {
      var s = typeof step === "string" ? { value: step } : step;
      return {
        id: "step-" + index + "-" + Date.now(),
        trigger: s.trigger || "text",
        event: s.event || null, // we will auto-assign if null
        pagePath: s.pagePath || null,
        value: (s.value || "").trim(),
        selector: s.selector || null,
        matchType: s.matchType || null,
      };
    });

    var sessionId =
      localStorage.getItem(sessionKey) ||
      (function () {
        var id =
          "session-" + Date.now() + "-" + Math.random().toString(36).slice(2);
        localStorage.setItem(sessionKey, id);
        return id;
      })();

    var journeyKey = sessionKey + "-progress";
    var journeyProgress = JSON.parse(
      localStorage.getItem(journeyKey) || "null"
    ) || {
      currentStep: 0,
      completedSteps: [],
      startTime: Date.now(),
    };

    if (
      journeyProgress.currentStep < 0 ||
      journeyProgress.currentStep >= normalizedSteps.length
    ) {
      journeyProgress.currentStep = 0;
    }

    var analyticsData = [];

    function resetJourney() {
      journeyProgress = {
        currentStep: 0,
        completedSteps: [],
        startTime: Date.now(),
      };
      analyticsData = [];
      localStorage.setItem(journeyKey, JSON.stringify(journeyProgress));
      performance.clearMarks();
      performance.clearMeasures();
      cleanupListeners();
      logDebug("🔄 Journey reset");
    }

    function sendToAnalytics(data) {
      if (!Array.isArray(analyticsData)) {
        logDebug("⚠️ analyticsData was undefined, reinitializing");
        analyticsData = [];
      }

      analyticsData.push(data);

      if (analyticsEndpoint) {
        fetch(analyticsEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).catch(function (err) {
          logDebug("Analytics error:", err);
        });
      }

      logDebug("Analytics data:", data);
    }

    function logFinalJourney(statusObj) {
      var status = statusObj.status,
        measureName = statusObj.measureName;
      var entry = measureName
        ? performance.getEntriesByName(measureName)[0]
        : null;

      var result = {
        sessionId: sessionId,
        pagePath: window.location.pathname,
        status: status,
        completedSteps: journeyProgress.completedSteps,
        totalDuration: entry ? Math.round(entry.duration) : null,
        measure: entry
          ? {
              name: entry.name,
              entryType: entry.entryType,
              startTime: entry.startTime,
              duration: Math.round(entry.duration),
            }
          : null,
      };

      sendToAnalytics(result);
    }

    function cleanupListeners() {
      var container = document.querySelector(containerSelector);
      if (!container) {
        logDebug("❌ No container found for cleanup");
        return;
      }

      var elements = container.querySelectorAll("[data-journey-listener]");
      logDebug("🧹 Cleaning up " + elements.length + " listeners");
      elements.forEach(function (element) {
        var eventType = element.dataset.journeyListener;
        var handler = element.__journeyHandler;
        if (eventType && handler) {
          element.removeEventListener(eventType, handler);
          delete element.__journeyHandler;
          element.removeAttribute("data-journey-listener");
          logDebug("Removed listener for " + eventType + " on element");
        }
      });
    }

    // Generic finder by value or selector
    function findElementByStep(step, container) {
      // If selector provided, try that first
      if (step.selector) {
        const el = container.querySelector(step.selector);
        if (el) return el;
      }

      const value = step.value.toLowerCase();

      // Try buttons, links, combobox, role buttons, etc.
      const clickable = Array.from(
        container.querySelectorAll(
          'button, a, [role="button"], [role="combobox"], [role="option"]'
        )
      );
      const foundByText = clickable.find((el) => {
        return (
          el.textContent && el.textContent.trim().toLowerCase().includes(value)
        );
      });
      if (foundByText) return foundByText;

      // Try inputs/selects by value, placeholder, aria-label
      const inputs = Array.from(
        container.querySelectorAll("input, select, textarea")
      );
      for (const input of inputs) {
        // Match by matchType if set, else try multiple
        if (step.matchType === "class") {
          const classes = input.className.split(/\s+/);
          if (classes.includes(step.value)) return input;
        } else if (step.matchType === "text") {
          if (
            input.textContent &&
            input.textContent.trim().toLowerCase() === value
          )
            return input;
        } else {
          // Default match by value attribute or placeholder or aria-label
          if (
            (input.value && input.value.toLowerCase() === value) ||
            (input.placeholder &&
              input.placeholder.toLowerCase().includes(value)) ||
            (input.getAttribute("aria-label") &&
              input.getAttribute("aria-label").toLowerCase().includes(value))
          ) {
            return input;
          }
        }
      }

      // Try matching by class name on any element
      const classMatch = container.querySelector("." + step.value);
      if (classMatch) return classMatch;

      return null;
    }

    function attachListeners() {
      var container = document.querySelector(containerSelector);
      if (!container) {
        logDebug("❌ Container not found:", containerSelector);
        return false;
      }

      var currentPath = window.location.pathname;
      var step = normalizedSteps[journeyProgress.currentStep];
      if (!step) {
        logDebug("❌ No step found at index:", journeyProgress.currentStep);
        return false;
      }

      if (step.pagePath && step.pagePath !== currentPath) {
        logDebug(
          "❌ Skipping: Step " +
            journeyProgress.currentStep +
            " not for this page (" +
            currentPath +
            ")"
        );
        return false;
      }

      // Handle custom event trigger separately
      if (step.trigger === "custom") {
        document.addEventListener(
          step.value,
          function () {
            handleStep(step);
          },
          { once: true }
        );
        return true;
      }

      var element = findElementByStep(step, container);

      if (!element) {
        logDebug(
          "⚠️ Element not found for step value: '" +
            step.value +
            "' selector: " +
            (step.selector || "N/A")
        );
        return false;
      }

      if (element.dataset.journeyListener) {
        logDebug("⚠️ Listener already attached for step: " + step.value);
        return false;
      }

      // Determine event type smartly if not set explicitly
      var eventType = step.event;
      if (!eventType) {
        if (element.tagName === "SELECT") eventType = "change";
        else if (element.tagName === "INPUT" || element.tagName === "TEXTAREA")
          eventType = "input";
        else if (
          element.getAttribute("role") === "combobox" ||
          element.getAttribute("role") === "option"
        )
          eventType = "click"; // Usually clicks for these
        else eventType = "click";
      }

      // For input trigger, also handle immediate matching for select/input values
      if (step.trigger === "input") {
        function checkMatch() {
          let currentVal = "";

          if (step.matchType === "text") {
            currentVal = element.textContent?.trim() || "";
          } else if (step.matchType === "class") {
            const classList = element.className.split(/\s+/);
            return classList.includes(step.value);
          } else {
            currentVal = element.value?.trim() || "";
          }

          return currentVal.toLowerCase() === step.value.toLowerCase();
        }

        if (checkMatch()) {
          logDebug("✅ Input already matched:", step.value);
          handleStep(step);
          return true;
        }

        const observer = new MutationObserver(() => {
          if (checkMatch()) {
            logDebug("🎯 Mutation matched input:", step.value);
            observer.disconnect();
            handleStep(step);
          }
        });

        observer.observe(element, {
          childList: true,
          characterData: true,
          subtree: true,
        });

        logDebug(`👁️ Watching for changes on input matching "${step.value}"`);

        return true;
      }

      // Attach event listener normally
      logDebug(
        `✅ Listener attached for step "${step.value}" [${eventType}] on element:`,
        element
      );

      var handler = function () {
        handleStep(step);
      };
      element.addEventListener(eventType, handler, { once: true });
      element.__journeyHandler = handler;
      element.dataset.journeyListener = eventType;

      return true;
    }

    function handleStep(step) {
      if (!Array.isArray(analyticsData)) {
        logDebug("⚠️ analyticsData undefined in handleStep. Reinitializing.");
        analyticsData = [];
      }

      var expected = normalizedSteps[journeyProgress.currentStep];
      if (!expected || step.value !== expected.value) {
        logDebug(
          '❌ Mismatch: Triggered "' +
            step.value +
            '", Expected "' +
            (expected ? expected.value : "") +
            '"'
        );
        return;
      }

      var markName = "Step-" + step.id + "-" + sessionId;
      performance.mark(markName);

      if (!Array.isArray(journeyProgress.completedSteps)) {
        journeyProgress.completedSteps = [];
      }

      journeyProgress.completedSteps.push({
        id: step.id || "",
        name: step.value,
        timestamp: performance.now(),
      });

      if (journeyProgress.currentStep > 0) {
        var prevStep = normalizedSteps[journeyProgress.currentStep - 1];
        var prevMark = "Step-" + prevStep.id + "-" + sessionId;
        if (performance.getEntriesByName(prevMark).length > 0) {
          var measureName = "Delay: " + prevStep.value + " → " + step.value;
          performance.measure(measureName, prevMark, markName);
          var measureEntry = performance.getEntriesByName(measureName)[0];
          sendToAnalytics({
            sessionId: sessionId,
            step: measureName,
            duration: measureEntry ? Math.round(measureEntry.duration) : null,
            timestamp: performance.now(),
          });
        }
      }

      journeyProgress.currentStep++;
      localStorage.setItem(journeyKey, JSON.stringify(journeyProgress));

      if (journeyProgress.currentStep === normalizedSteps.length) {
        var firstMark = "Step-" + normalizedSteps[0].id + "-" + sessionId;
        var completedMark = "Journey Completed - " + sessionId;
        performance.mark(completedMark);

        if (performance.getEntriesByName(firstMark).length > 0) {
          var measureName = "Journey Duration - " + sessionId;
          performance.measure(measureName, firstMark, completedMark);
          logFinalJourney({ status: "success", measureName: measureName });
        } else {
          logFinalJourney({ status: "success", measureName: null });
        }
        resetJourney();
      } else {
        attachListeners();
      }
    }

    function setupObserver() {
      var container =
        document.querySelector(containerSelector) || document.body;
      var observer = new MutationObserver(function (_, obs) {
        if (attachListeners()) {
          obs.disconnect();
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      return function () {
        observer.disconnect();
      };
    }

    if (!attachListeners()) {
      var disconnectObserver = setupObserver();
      setTimeout(disconnectObserver, maxObserverTimeout);
    }

    window.addEventListener("popstate", function () {
      cleanupListeners();
      attachListeners();
    });

    window.addEventListener("hashchange", function () {
      cleanupListeners();
      attachListeners();
    });

    window.addEventListener("beforeunload", function () {
      if (
        journeyProgress.currentStep > 0 &&
        journeyProgress.currentStep < normalizedSteps.length
      ) {
        var cancelledMark = "Journey Cancelled - " + sessionId;
        var firstMark = "Step-" + normalizedSteps[0].id + "-" + sessionId;
        performance.mark(cancelledMark);

        var measureName = null;
        if (performance.getEntriesByName(firstMark).length > 0) {
          measureName = "Journey Cancelled Duration - " + sessionId;
          performance.measure(measureName, firstMark, cancelledMark);
        }

        logFinalJourney({ status: "canceled", measureName: measureName });
        resetJourney();
      }
    });
  }

  window.trackUserJourney = trackUserJourney;
  window.trackUserJourney.__initialized = true;
})();
