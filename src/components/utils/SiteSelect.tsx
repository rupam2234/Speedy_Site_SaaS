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
import { useEffect } from "react";
import { useSiteContext } from "@/app/(dashboard)/siteContext";

export function SelectSite({ collapsed = false }: { collapsed?: boolean }) {
  const { selectedSite, setSelectedSite, orders, setCollapsed } =
    useSiteContext();
  const pathname = usePathname();
  const router = useRouter();

  // managing the sidebar state (collapsed or open?)
  useEffect(() => {
    setCollapsed(collapsed);
  }, [collapsed]);

  const handleChange = (value: string) => {
    setSelectedSite(value);
  };

  useEffect(() => {
    if (!selectedSite) return;

    const segments = pathname.split("/").filter(Boolean);

    const currentSite = segments[1]; // dynamic site is in the second segment

    if (segments[0] === "dashboard" && currentSite !== selectedSite) {
      const newPath = `/${[
        "dashboard",
        selectedSite,
        ...segments.slice(2),
      ].join("/")}`;
      router.replace(newPath);
    }
  }, [selectedSite, pathname, router]);

  const selectedOrder = orders?.find(
    (order) => order.websiteName === selectedSite
  );
  const selectedFavicon = selectedOrder?.favicon_file;

  return (
    <Select value={selectedSite} onValueChange={handleChange}>
      <SelectTrigger
        className={`${
          !collapsed
            ? "w-full border-2 border-gray-300 dark:border-muted gap-2"
            : "w-auto gap-0 pr-2 [&>svg]:hidden"
        } flex items-center pl-2 cursor-pointer`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedFavicon ? (
            <Image
              src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons//${selectedFavicon}`}
              alt="favicon"
              width={16}
              height={16}
              className="rounded"
            />
          ) : (
            <span className="w-4 h-4 bg-gray-300 rounded" />
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
            <SelectItem key={order.websiteName} value={order.websiteName}>
              <span className="flex items-center gap-2">
                <Image
                  src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons//${order.favicon_file}`}
                  alt="favicon"
                  width={16}
                  height={16}
                  className="rounded"
                />
                <span>{order.websiteName}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
