"use client";

import { OrderData } from "@/app/api";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { CruxData, DailyCruxData } from "@/data-types/index";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSearchParams } from "next/navigation";

type SiteContextType = {
  selectedSite: string;
  setSelectedSite: (site: string) => void;
  orders: OrderData[] | null;
  isLoadingOrders: boolean;
  setOrders: (orders: OrderData[] | null) => void;
  fetchOrders: (siteFromUrl?: string, userId?: string) => Promise<void>;
  dailyCrux: DailyCruxData | null;
  setDailyCrux: (dailyData: DailyCruxData | null) => void;
  cruxData: CruxData[];
  setCruxData: (crux: CruxData[]) => void;
  selectedDevice: "Desktop" | "Mobile" | "Tablet" | "All";
  setSelectedDevice: (device: "Desktop" | "Tablet" | "Mobile" | "All") => void;
  collapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
  experienceType: "Percentile" | "Distribution";
  setExperienceType: (experienceType: "Percentile" | "Distribution") => void;
  rumDistribution: "p50" | "p75" | "p90" | "p95" | "p99";
  setRumDistribution: (rumDist: "p50" | "p75" | "p90" | "p95" | "p99") => void;
  startDate?: Date;
  endDate?: Date;
  setStartDate: (d?: Date) => void;
  setEndDate: (d?: Date) => void;
  plan: string | null;
  setPlan: (plan: string | null) => void;
};

export const SiteContext = createContext<SiteContextType>({
  selectedSite: "",
  setSelectedSite: () => {},
  orders: null,
  isLoadingOrders: true,
  setOrders: () => {},
  fetchOrders: async () => {},
  dailyCrux: null,
  setDailyCrux: () => {},
  selectedDevice: "Desktop",
  setSelectedDevice: () => {},
  cruxData: [],
  setCruxData: () => {},
  collapsed: false,
  setCollapsed: () => {},
  experienceType: "Percentile",
  setExperienceType: () => {},
  rumDistribution: "p75",
  setRumDistribution: () => {},
  setStartDate: () => {},
  setEndDate: () => {},
  plan: "",
  setPlan: () => {},
});

export default function SiteContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  const [dailyCrux, setDailyCrux] = useState<DailyCruxData | null>(null);
  const [cruxData, setCruxData] = useState<CruxData[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<
    "Desktop" | "Mobile" | "Tablet" | "All"
  >("Desktop");

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [experienceType, setExperienceType] = useState<
    "Percentile" | "Distribution"
  >("Percentile");
  const [rumDistribution, setRumDistribution] = useState<
    "p50" | "p75" | "p90" | "p95" | "p99"
  >("p75");

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [plan, setPlan] = useState<string | null>(null);

  const user = useSupabaseUser();
  const searchParams = useSearchParams();
  const fetchCalledRef = useRef<{
    userId?: string;
    siteFromUrl?: string | null;
  } | null>(null);

  const handleInitialSiteSelection = useCallback(
    (orderList: OrderData[], siteFromUrl?: string) => {
      setSelectedSite((prev) => {
        // If the user already has a site selected in state, don't override it
        if (prev) return prev;

        // If a site is provided in the URL, try to match it
        if (
          siteFromUrl &&
          orderList.some((o) => o.website_name === siteFromUrl)
        ) {
          return siteFromUrl;
        }

        // Default to the first site in the array
        return orderList[0]?.website_name || "";
      });
    },
    [],
  );

  // Restore selected site from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("selected-site");
    if (stored) {
      setSelectedSite(stored);
    }
    setHydrated(true);
  }, []);

  // Persist selected site whenever it changes
  useEffect(() => {
    if (selectedSite) {
      sessionStorage.setItem("selected-site", selectedSite);
    }
  }, [selectedSite]);

  // The Fetch Logic
  const fetchOrders = useCallback(
    async (siteFromUrl?: string, userId?: string) => {
      if (!userId) {
        setIsLoadingOrders(false);
        return;
      }

      setIsLoadingOrders(true);
      const now = Date.now();
      const cachedOrders = sessionStorage.getItem("orders");
      const cachedTime = sessionStorage.getItem("orders-ts");

      // Check Cache (5 minute TTL)
      if (
        cachedOrders &&
        cachedTime &&
        now - parseInt(cachedTime) < 5 * 60 * 1000
      ) {
        const parsedOrders: OrderData[] = JSON.parse(cachedOrders);
        setOrders(parsedOrders);
        handleInitialSiteSelection(parsedOrders, siteFromUrl);
        setIsLoadingOrders(false);
        return;
      }

      try {
        const response = await fetch("/api/orders/fetchOrder");
        if (!response.ok) throw new Error("Failed to fetch orders");

        const { data }: { data: OrderData[] } = await response.json();

        if (data && data.length > 0) {
          sessionStorage.setItem("orders", JSON.stringify(data));
          sessionStorage.setItem("orders-ts", Date.now().toString());
          setOrders(data);
          handleInitialSiteSelection(data, siteFromUrl);
        } else {
          // Explicitly set to empty array if no orders found in DB
          setOrders([]);
          setSelectedSite("");
          sessionStorage.removeItem("orders");
          sessionStorage.removeItem("orders-ts");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]); // Fallback to empty to stop loading state
      } finally {
        setIsLoadingOrders(false);
      }
    },
    [handleInitialSiteSelection],
  );

  // Trigger fetch on user load or URL change
  useEffect(() => {
    if (!user?.id || !hydrated) return;

    const siteFromUrl = searchParams.get("site");

    // Prevent duplicate calls if params haven't changed
    if (
      fetchCalledRef.current?.userId === user.id &&
      fetchCalledRef.current?.siteFromUrl === siteFromUrl
    ) {
      return;
    }

    fetchOrders(siteFromUrl ?? "", user.id);

    fetchCalledRef.current = {
      userId: user.id,
      siteFromUrl,
    };
  }, [user?.id, hydrated, searchParams, fetchOrders]);

  return (
    <SiteContext.Provider
      value={{
        orders,
        isLoadingOrders,
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
        collapsed,
        setCollapsed,
        experienceType,
        setExperienceType,
        rumDistribution,
        setRumDistribution,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        plan,
        setPlan,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteContext = () => useContext(SiteContext);
