"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { CirclePlus } from "lucide-react";
import { AddWebsiteModal } from "./addWebsiteModal";
import { toast } from "sonner";

export function SelectSite({
  collapsed = false,
  disabled,
}: {
  collapsed?: boolean;
  disabled?: boolean;
}) {
  const { selectedSite, setSelectedSite, orders, setCollapsed } =
    useSiteContext();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();

  // managing the sidebar state (collapsed or open?)
  useEffect(() => {
    setCollapsed(collapsed);
  }, [collapsed]);

  const handleChange = (value: string) => {
    if (value === "__add__") {
      setShowAddModal(true);
      return;
    }

    setSelectedSite(value);
  };

  // when sites are available on order, auto select the first one
  useEffect(() => {
    if (selectedSite) return; // already selected, no need to auto-select
    if (!orders || orders.length === 0) return;

    const segments = pathname.split("/").filter(Boolean);
    const siteFromPath = segments[1]; // "/dashboard/[site]"

    const found = orders.find((o) => o.website_name === siteFromPath);

    if (found) {
      setSelectedSite(found.website_name);
    } else {
      setSelectedSite(orders[0].website_name);
    }
  }, [orders, pathname, selectedSite, setSelectedSite]);

  const selectedOrder = orders?.find(
    (order) => order.website_name === selectedSite
  );
  const selectedFavicon = selectedOrder?.favicon_file;

  return (
    <Select value={selectedSite} onValueChange={handleChange}>
      <SelectTrigger
        className={`${
          !collapsed
            ? "w-full border-2 border-gray-300 dark:border-muted gap-2"
            : "w-auto gap-0 pr-2 [&>svg]:hidden"
        } flex items-center pl-2 cursor-pointer ${
          disabled ? "opacity-50 pointer-events-none" : "mr-[-10px]"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedFavicon ? (
            <Image
              src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons/${selectedFavicon}`}
              alt="favicon"
              width={16}
              height={16}
              className="rounded"
            />
          ) : (
            <div className="w-4 h-4 flex items-center justify-center rounded bg-blue-400 text-primary text-xs font-semibold">
              {selectedSite?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          {!collapsed && (
            <span className="truncate text-sm">
              {selectedSite || "Select a Website"}
            </span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {orders?.map((order) => (
            <SelectItem key={order.website_name} value={order.website_name}>
              <span className="flex items-center gap-2">
                {order.favicon_file ? (
                  <Image
                    src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons/${order.favicon_file}`}
                    alt="favicon"
                    width={16}
                    height={16}
                    className="rounded"
                  />
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center rounded bg-blue-400 text-primary text-xs font-semibold">
                    {order.website_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <span>{order.website_name}</span>
              </span>
            </SelectItem>
          ))}
          <SelectItem
            value="__add__"
            className="text-blue-500 font-medium flex gap-1 items-center"
          >
            <CirclePlus />
            Add New Website
          </SelectItem>
          <AddWebsiteModal
            open={showAddModal}
            onOpenChange={setShowAddModal}
            onSuccess={() => {
              toast.success("Website added!", {
                style: { backgroundColor: "green", color: "white" },
              });
              router.push("/dashboard");
            }}
          />
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
