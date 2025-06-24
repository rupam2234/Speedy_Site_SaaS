import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OrderData } from "@/app/api/dataTypes"; // adjust the path

type SiteStore = {
  orders: OrderData[] | null;
  setOrders: (orders: OrderData[] | null) => void;
  selectedSite: string;
  setSelectedSite: (site: string) => void;
  orderStatus: boolean;
  setOrderStatus: (status: boolean) => void;
};

export const useSiteStore = create<SiteStore>()(
  persist(
    (set) => ({
      orders: null,
      setOrders: (orders) => set({ orders }),
      selectedSite: "",
      setSelectedSite: (site) => set({ selectedSite: site }),
      orderStatus: false,
      setOrderStatus: (status) => set({ orderStatus: status }),
    }),
    {
      name: "websites_under_account", // storage key
      storage: createJSONStorage(() => sessionStorage), // ✅ use sessionStorage
    }
  )
);
