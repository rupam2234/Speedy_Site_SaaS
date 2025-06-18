"use client";

import { OrderData } from "@/app/api/dataTypes";
import React, { createContext, useContext, useState, useCallback } from "react";

type SiteContextType = {
  selectedSite: string;
  setSelectedSite: (site: string) => void;
  orders: OrderData[] | null;
  orderStatus: boolean;
  fetchOrders: (email: string, siteFromUrl?: string) => Promise<void>;
};

export const SiteContext = createContext<SiteContextType>({
  selectedSite: "",
  setSelectedSite: () => {},
  orders: null,
  orderStatus: false,
  fetchOrders: async () => {},
});

export default function SiteContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [orderStatus, setOrderStatus] = useState<boolean>(false);

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
          setOrders(data);
          setOrderStatus(true);

          const matched =
            siteFromUrl &&
            data.find((order: OrderData) => order.websiteName === siteFromUrl);

          setSelectedSite(matched?.websiteName || data[0].websiteName);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders(null);
        setOrderStatus(false);
      }
    },
    []
  );

  return (
    <SiteContext.Provider
      value={{
        selectedSite,
        setSelectedSite,
        orders,
        orderStatus,
        fetchOrders,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteContext = () => useContext(SiteContext);
