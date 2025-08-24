"use client";

import { OrderData } from "@/app/api/dataTypes";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { CruxData, DailyCrux } from "@/data/cruxData";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

type SiteContextType = {
  selectedSite: string;
  setSelectedSite: (site: string) => void;
  orders: OrderData[] | null;
  setOrders: (orders: OrderData[] | null) => void;
  fetchOrders: (siteFromUrl?: string, userId?: string) => Promise<void>;
  dailyCrux: DailyCrux[];
  setDailyCrux: (dailyData: DailyCrux[]) => void;
  cruxData: CruxData[];
  setCruxData: (crux: CruxData[]) => void;
  selectedDevice: "Desktop" | "Mobile" | "Tablet" | "All";
  setSelectedDevice: (device: "Desktop" | "Tablet" | "Mobile" | "All") => void;
  dateRange: [string, string];
  setDateRange: (startDate: string, endDate: string) => void | [string, string];
  rumDateRange: "24hours" | "7days" | "30days" | "90days";
  setRumDateRange: (
    dateRange: "24hours" | "7days" | "30days" | "90days"
  ) => void;
  collapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
  experienceType: "p75" | "Distribution";
  setExperienceType: (experienceType: "p75" | "Distribution") => void;
  rumDistribution: "p50" | "p75" | "p90" | "p95" | "p99";
  setRumDistribution: (rumDist: "p50" | "p75" | "p90" | "p95" | "p99") => void;
  activeLabMetric: "Web Vitals" | "Page Weight" | "Timings";
  setActiveLabMetric: (
    metric: "Web Vitals" | "Page Weight" | "Timings"
  ) => void;
  activeCWVMetric:
    | "Largest Contentful Paint (LCP)"
    | "Interaction to Next Paint (INP)"
    | "Cumulative Layout Shift (CLS)"
    | "First Contentful Paint (FCP)";
  setActiveCWVMetric: (
    metric:
      | "Largest Contentful Paint (LCP)"
      | "Interaction to Next Paint (INP)"
      | "Cumulative Layout Shift (CLS)"
      | "First Contentful Paint (FCP)"
  ) => void;
  activeAssetMetric: "Content Size" | "Transfer Size" | "Requests Count";
  setActiveAssetMetric: (
    metric: "Content Size" | "Transfer Size" | "Requests Count"
  ) => void;
  activeTimingMetric: "Document Timing" | "LCP Timing" | "Page Timing";
  setActiveTimingMetric: (
    metric: "Document Timing" | "LCP Timing" | "Page Timing"
  ) => void;
};

export const SiteContext = createContext<SiteContextType>({
  selectedSite: "",
  setSelectedSite: () => {},
  orders: null,
  setOrders: () => {},
  fetchOrders: async () => {},
  dailyCrux: [],
  setDailyCrux: () => {},
  selectedDevice: "Desktop",
  setSelectedDevice: () => {},
  cruxData: [],
  setCruxData: () => {},
  dateRange: ["", ""],
  setDateRange: () => {},
  collapsed: false,
  setCollapsed: () => {},
  experienceType: "p75",
  setExperienceType: () => {},
  activeLabMetric: "Web Vitals",
  setActiveLabMetric: () => {},
  activeCWVMetric: "Largest Contentful Paint (LCP)",
  setActiveCWVMetric: () => {},
  activeAssetMetric: "Content Size",
  setActiveAssetMetric: () => {},
  activeTimingMetric: "Document Timing",
  setActiveTimingMetric: () => {},
  rumDistribution: "p75",
  setRumDistribution: () => {},
  rumDateRange: "7days",
  setRumDateRange: () => {},
});

export default function SiteContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [dailyCrux, setDailyCrux] = useState<DailyCrux[]>([]);
  const [cruxData, setCruxData] = useState<CruxData[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<
    "Desktop" | "Mobile" | "Tablet" | "All"
  >("Desktop");
  const [dateRange, setDateRange] = useState<[string, string]>(["", ""]);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [experienceType, setExperienceType] = useState<"p75" | "Distribution">(
    "p75"
  );
  const [activeLabMetric, setActiveLabMetric] = useState<
    "Web Vitals" | "Page Weight" | "Timings"
  >("Web Vitals");
  const [activeCWVMetric, setActiveCWVMetric] = useState<
    | "Largest Contentful Paint (LCP)"
    | "Interaction to Next Paint (INP)"
    | "Cumulative Layout Shift (CLS)"
    | "First Contentful Paint (FCP)"
  >("Largest Contentful Paint (LCP)");
  const [activeAssetMetric, setActiveAssetMetric] = useState<
    "Content Size" | "Transfer Size" | "Requests Count"
  >("Content Size");
  const [activeTimingMetric, setActiveTimingMetric] = useState<
    "Document Timing" | "LCP Timing" | "Page Timing"
  >("Document Timing");

  const [rumDistribution, setRumDistribution] = useState<
    "p50" | "p75" | "p90" | "p95" | "p99"
  >("p75");
  const [rumDateRange, setRumDateRange] = useState<
    "24hours" | "7days" | "30days" | "90days"
  >("30days");

  const user = useSupabaseUser();

  useEffect(() => {
    if (orders?.length !== undefined && orders?.length > 0) {
      sessionStorage.setItem("orders", JSON.stringify(orders));
    }
  }, [orders]);

  useEffect(() => {
    if (selectedSite) {
      sessionStorage.setItem("selectedSite", selectedSite);
    }
  }, [selectedSite]);

  useEffect(() => {
    if (!user?.id) return;

    const siteFromUrl = new URLSearchParams(window.location.search).get("site");
    fetchOrders(siteFromUrl ?? "", user.id);
  }, [user?.id]);

  const updateDateRange = (startDate: string, endDate: string) => {
    setDateRange((prev) => {
      if (prev[0] === startDate && prev[1] === endDate) return prev;
      return [startDate, endDate];
    });
  };

  // Fetch fresh data from server
  const fetchOrders = useCallback(
    async (siteFromUrl?: string, userId?: string) => {
      if (!userId) {
        console.warn("User ID not available, skipping fetchOrders");
        return;
      }

      // Show cached orders immediately if available
      const storedOrders = sessionStorage.getItem("orders");

      if (storedOrders) {
        const parsedOrders = JSON.parse(storedOrders);
        if (parsedOrders?.length > 0) {
          setOrders(parsedOrders);

          if (
            siteFromUrl &&
            parsedOrders.some((o: OrderData) => o.website_name === siteFromUrl)
          ) {
            setSelectedSite(siteFromUrl);
          } else {
            setSelectedSite("");
          }
          // Continue to fetch fresh data
        }
      }

      try {
        const response = await fetch("/api/orders/fetchOrder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });

        if (!response.ok) throw new Error("Failed to fetch orders");

        const { data }: any = await response.json();

        if (data?.length > 0) {
          sessionStorage.setItem("orders", JSON.stringify(data));
          setOrders(data);

          if (
            siteFromUrl &&
            data.some((o: OrderData) => o.website_name === siteFromUrl)
          ) {
            setSelectedSite(siteFromUrl);
          } else {
            setSelectedSite("");
          }
        } else {
          setOrders(null);
          setSelectedSite("");
          sessionStorage.removeItem("orders");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders(null);
        setSelectedSite("");
        sessionStorage.removeItem("orders");
      }
    },
    []
  );

  return (
    <SiteContext.Provider
      value={{
        orders,
        setOrders,
        selectedSite,
        setSelectedSite,
        fetchOrders,
        dailyCrux,
        setDailyCrux,
        selectedDevice,
        setSelectedDevice,
        cruxData,
        setCruxData,
        dateRange,
        setDateRange: updateDateRange,
        collapsed,
        setCollapsed,
        experienceType,
        setExperienceType,
        activeLabMetric,
        setActiveLabMetric,
        activeCWVMetric,
        setActiveCWVMetric,
        activeAssetMetric,
        setActiveAssetMetric,
        activeTimingMetric,
        setActiveTimingMetric,
        rumDistribution,
        setRumDistribution,
        rumDateRange,
        setRumDateRange,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteContext = () => useContext(SiteContext);
