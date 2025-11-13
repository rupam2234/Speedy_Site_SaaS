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
import { CirclePlus } from "lucide-react";
import { AddWebsiteModal } from "./addWebsiteModal";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { toast } from "sonner";

export function SelectSite({
  collapsed = false,
  disabled = false,
}: {
  collapsed?: boolean;
  disabled?: boolean;
}) {
  const { selectedSite, setSelectedSite, orders, setCollapsed } =
    useSiteContext();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Only update collapsed if it actually changes
  React.useEffect(() => {
    setCollapsed(collapsed);
  }, [collapsed, setCollapsed]);

  // Auto-select best-matching site only once
  React.useEffect(() => {
    if (!orders?.length || selectedSite) return;

    const siteFromPath = pathname.split("/")[2]; // e.g. /dashboard/[site]
    const match = orders.find((o) => o.website_name === siteFromPath);
    const siteToSelect = match?.website_name || orders[0]?.website_name;

    if (siteToSelect) {
      setSelectedSite(siteToSelect);
    }
  }, [orders, pathname, selectedSite, setSelectedSite]);

  const handleChange = React.useCallback(
    (value: string) => {
      if (value === "__add__") {
        setShowAddModal(true);
      } else {
        setSelectedSite(value);
        // sync URL so deep linking works
        router.push(`/dashboard/${value}`);
      }
    },
    [setSelectedSite, router]
  );

  // Memoize derived data to prevent re-renders
  const selectedOrder = React.useMemo(
    () => orders?.find((o) => o.website_name === selectedSite),
    [orders, selectedSite]
  );

  const selectedFavicon = selectedOrder?.favicon_file;

  // Handle loading or empty state
  if (!orders) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        Loading your websites…
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div
        className="text-blue-500 text-sm flex items-center gap-1 cursor-pointer"
        onClick={() => setShowAddModal(true)}
      >
        <CirclePlus className="w-4 h-4" /> Add your first website
      </div>
    );
  }

  return (
    <>
      <Select value={selectedSite} onValueChange={handleChange}>
        <SelectTrigger
          className={`flex items-center pl-2 ${
            !collapsed
              ? "w-full border-2 border-gray-300 dark:border-muted gap-2"
              : "w-auto gap-0 pr-2 [&>svg]:hidden"
          } ${disabled ? "opacity-50 pointer-events-none" : "mr-[-10px]"}`}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedFavicon ? (
              <Image
                src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons/${selectedFavicon}`}
                alt="favicon"
                width={16}
                height={16}
                className="rounded"
                loading="lazy"
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
            {orders.map((order) => (
              <SelectItem
                key={order.website_name}
                value={order.website_name}
                className="flex items-center gap-2"
              >
                {order.favicon_file ? (
                  <Image
                    src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons/${order.favicon_file}`}
                    alt="favicon"
                    width={16}
                    height={16}
                    className="rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center rounded bg-blue-400 text-primary text-xs font-semibold">
                    {order.website_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <span>{order.website_name}</span>
              </SelectItem>
            ))}

            <SelectItem
              value="__add__"
              className="text-blue-500 font-medium flex gap-1 items-center"
            >
              <CirclePlus /> Add New Website
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* ✅ Move modal outside SelectContent to avoid re-render issues */}
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
    </>
  );
}
