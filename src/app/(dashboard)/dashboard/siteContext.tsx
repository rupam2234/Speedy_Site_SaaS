"use client";

import { OrderData } from "@/app/api/dataTypes";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { CruxData, DailyCruxData } from "@/data-types/index";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

type SiteContextType = {
  selectedSite: string;
  setSelectedSite: (site: string) => void;
  orders: OrderData[] | null;
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
  experienceType: "p75" | "Distribution";
  setExperienceType: (experienceType: "p75" | "Distribution") => void;
  rumDistribution: "p50" | "p75" | "p90" | "p95" | "p99";
  setRumDistribution: (rumDist: "p50" | "p75" | "p90" | "p95" | "p99") => void;
  selectedGeoType: "Visitors" | "UX Experience";
  setSelectedGeoType: (selectedGeoType: "Visitors" | "UX Experience") => void;
  startDate?: Date;
  endDate?: Date;
  setStartDate: (d?: Date) => void;
  setEndDate: (d?: Date) => void;
};

export const SiteContext = createContext<SiteContextType>({
  selectedSite: "",
  setSelectedSite: () => {},
  orders: null,
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
  experienceType: "p75",
  setExperienceType: () => {},
  rumDistribution: "p75",
  setRumDistribution: () => {},
  selectedGeoType: "Visitors",
  setSelectedGeoType: () => {},
  setStartDate: () => {},
  setEndDate: () => {},
});

export default function SiteContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [dailyCrux, setDailyCrux] = useState<any | null>(null);
  const [cruxData, setCruxData] = useState<CruxData[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<
    "Desktop" | "Mobile" | "Tablet" | "All"
  >("Desktop");
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [experienceType, setExperienceType] = useState<"p75" | "Distribution">(
    "p75",
  );
  const [rumDistribution, setRumDistribution] = useState<
    "p50" | "p75" | "p90" | "p95" | "p99"
  >("p75");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedGeoType, setSelectedGeoType] = useState<
    "Visitors" | "UX Experience"
  >("Visitors");

  const user = useSupabaseUser();
  const fetchCalledRef = useRef<{
    userId: string;
    siteFromUrl: string | null;
  } | null>(null);

  const fetchOrders = useCallback(
    async (siteFromUrl?: string, userId?: string) => {
      if (!userId) return;

      const now = Date.now();
      const cachedOrders = sessionStorage.getItem("orders");
      const cachedTime = sessionStorage.getItem("orders-ts");

      if (
        cachedOrders &&
        cachedTime &&
        now - parseInt(cachedTime) < 5 * 60 * 1000
      ) {
        const parsedOrders = JSON.parse(cachedOrders);
        setOrders(parsedOrders);
        const defaultSite =
          siteFromUrl &&
          parsedOrders.some((o: OrderData) => o.website_name === siteFromUrl)
            ? siteFromUrl
            : parsedOrders[0].website_name;
        setSelectedSite(defaultSite);
        return; // skip network call
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
          sessionStorage.setItem("orders-ts", Date.now().toString());
          setOrders(data);

          const defaultSite =
            siteFromUrl &&
            data.some((o: OrderData) => o.website_name === siteFromUrl)
              ? siteFromUrl
              : data[0].website_name;
          setSelectedSite(defaultSite);
        } else {
          setOrders([]);
          setSelectedSite("");
          sessionStorage.removeItem("orders");
          sessionStorage.removeItem("orders-ts");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders(null);
        setSelectedSite("");
        sessionStorage.removeItem("orders");
        sessionStorage.removeItem("orders-ts");
      }
    },
    [],
  );

  useEffect(() => {
    if (!user?.id) return;

    const siteFromUrl = new URL(window.location.href).searchParams.get("site");

    if (
      fetchCalledRef.current?.userId === user.id &&
      fetchCalledRef.current?.siteFromUrl === siteFromUrl
    )
      return; // already fetched

    fetchCalledRef.current = { userId: user.id, siteFromUrl };
    fetchOrders(siteFromUrl ?? "", user.id);
  }, [user?.id, fetchOrders]);

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
        collapsed,
        setCollapsed,
        experienceType,
        setExperienceType,
        rumDistribution,
        setRumDistribution,
        selectedGeoType,
        setSelectedGeoType,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteContext = () => useContext(SiteContext);
