import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type PageCachedMetrics = {
  pageMetric: any[] | null;
  metricSite: string | null;
  setPageMetric: (site: string, data: any[] | null) => void;
  reset: () => void;

  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  _lastUpdated: number;
};

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export const pageMetricCache = create<PageCachedMetrics>()(
  persist<PageCachedMetrics>(
    (set) => ({
      pageMetric: null,
      metricSite: null,
      setPageMetric: (site, metric) =>
        set({ pageMetric: metric, metricSite: site, _lastUpdated: Date.now() }),
      reset: () => set({ pageMetric: null, metricSite: null, _lastUpdated: 0 }),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // We'll store last updated timestamp here too
      _lastUpdated: 0,
    }),
    {
      name: "page_metric_cache",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return sessionStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Clear cache if expired
        const now = Date.now();
        if (now - (state._lastUpdated || 0) > CACHE_EXPIRY_MS) {
          state.reset();
        }

        state.setHasHydrated(true);
      },
    }
  )
);
