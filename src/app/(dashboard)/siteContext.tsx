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
});

export default function SiteContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ungrouped state
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

  const pathname = usePathname();

  // Load state from sessionStorage once on mount
  useEffect(() => {
    const storedOrders = sessionStorage.getItem("orders");
    const storedSite = sessionStorage.getItem("selectedSite");

    if (storedOrders) setOrders(JSON.parse(storedOrders));
    if (storedSite) setSelectedSite(storedSite);
  }, []);

  // Save to sessionStorage when relevant states change
  useEffect(() => {
    if (orders) sessionStorage.setItem("orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (selectedSite) sessionStorage.setItem("selectedSite", selectedSite);
  }, [selectedSite]);

  const updateDateRange = (startDate: string, endDate: string) => {
    setDateRange((prev) => {
      if (prev[0] === startDate && prev[1] === endDate) return prev;
      return [startDate, endDate];
    });
  };

  // Fetch orders logic
  const fetchOrders = useCallback(
    async (email: string, siteFromUrl?: string) => {
      try {
        const response = await fetch("/api/orders/fetchOrder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(email),
        });

        if (!response.ok) throw new Error("Failed to fetch orders");

        const { data } = await response.json();

        if (data?.length) {
          const matchedSite =
            siteFromUrl &&
            data.some((o: OrderData) => o.websiteName === siteFromUrl)
              ? siteFromUrl
              : data[0].websiteName;

          setOrders(data);

          // if url already have a site set and user is signed in
          const segments = pathname.split("/").filter(Boolean);
          const currentSite = segments[1];

          if (currentSite) {
            if (selectedSite !== currentSite) {
              setSelectedSite(currentSite);
            }
          }

          // Only set selectedSite if not already set or it's invalid
          setSelectedSite((prev) =>
            data.some((o: any) => o.websiteName === prev) ? prev : matchedSite
          );
        } else if (data?.length === 0) {
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders(null);
        setSelectedSite("");
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
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteContext = () => useContext(SiteContext);
