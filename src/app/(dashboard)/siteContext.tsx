"use client";

import { OrderData } from "@/app/api/dataTypes";
import { CruxData, DailyCrux } from "@/data/cruxData";
import { usePathname } from "next/navigation";
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
  fetchOrders: (email: string, siteFromUrl?: string) => Promise<void>;
  dailyCrux: DailyCrux[];
  setDailyCrux: (dailyData: DailyCrux[]) => void;
  cruxData: CruxData[];
  setCruxData: (crux: CruxData[]) => void;
  selectedDevice: "Desktop" | "Mobile";
  setSelectedDevice: (device: "Desktop" | "Mobile") => void;
  dateRange: [string, string];
  setDateRange: (startDate: string, endDate: string) => void | [string, string];
  collapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
  experienceType: "p75" | "Distribution";
  setExperienceType: (experienceType: "p75" | "Distribution") => void;
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
  const [selectedDevice, setSelectedDevice] = useState<"Desktop" | "Mobile">(
    "Desktop"
  );
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

  const pathname = usePathname();

  // Load from sessionStorage only if it matches the current user email

  useEffect(() => {
    const storedOrders = sessionStorage.getItem("orders");
    const storedSite = sessionStorage.getItem("selectedSite");
    const storedEmail = sessionStorage.getItem("ordersEmail");

    if (storedOrders && storedEmail) {
      setOrders(JSON.parse(storedOrders));
    }

    const pathname = window.location.pathname;
    const pathSegments = pathname.split("/").filter(Boolean);
    const hasSiteSegment =
      pathSegments.length >= 2 && pathSegments[0] === "dashboard";

    const activeEmail =
      typeof window !== "undefined"
        ? JSON.parse(sessionStorage.getItem("__clerk_db") || "{}")?.user
            ?.primaryEmailAddress?.emailAddress
        : "";

    // Only set selectedSite if storedSite exists AND email matches
    if (
      storedSite &&
      hasSiteSegment &&
      storedEmail &&
      activeEmail &&
      storedEmail === activeEmail
    ) {
      setSelectedSite(storedSite);
    }
  }, []);

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

  const updateDateRange = (startDate: string, endDate: string) => {
    setDateRange((prev) => {
      if (prev[0] === startDate && prev[1] === endDate) return prev;
      return [startDate, endDate];
    });
  };

  const fetchOrders = useCallback(
    async (email: string, siteFromUrl?: string) => {
      // Skip API call if we already fetched orders for this email
      const storedOrders = sessionStorage.getItem("orders");
      const storedEmail = sessionStorage.getItem("ordersEmail");

      if (storedOrders && storedEmail === email) {
        const parsedOrders = JSON.parse(storedOrders);
        if (parsedOrders?.length > 0) {
          setOrders(parsedOrders);

          if (
            siteFromUrl &&
            parsedOrders.some((o: OrderData) => o.websiteName === siteFromUrl)
          ) {
            setSelectedSite(siteFromUrl);
          } else {
            setSelectedSite("");
          }

          return;
        }
      }

      // Fresh fetch if orders are not cached or email has changed
      try {
        const response = await fetch("/api/orders/fetchOrder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(email),
        });

        if (!response.ok) throw new Error("Failed to fetch orders");

        const { data } = await response.json();

        if (data?.length > 0) {
          sessionStorage.setItem("orders", JSON.stringify(data));
          sessionStorage.setItem("ordersEmail", email);
          setOrders(data);

          if (
            siteFromUrl &&
            data.some((o: OrderData) => o.websiteName === siteFromUrl)
          ) {
            setSelectedSite(siteFromUrl);
          } else {
            setSelectedSite("");
          }
        } else {
          // No orders: clear everything
          setOrders(null);
          setSelectedSite("");
          sessionStorage.removeItem("orders");
          sessionStorage.removeItem("ordersEmail");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders(null);
        setSelectedSite("");
        sessionStorage.removeItem("orders");
        sessionStorage.removeItem("ordersEmail");
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
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteContext = () => useContext(SiteContext);
