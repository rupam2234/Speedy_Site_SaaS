import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import Image from "next/image";

export function SelectDemo({ collapsed = false }: { collapsed?: boolean }) {
  const { selectedSite, setSelectedSite, orders } = useSiteContext();

  const selectedOrder = orders?.find(
    (order) => order.websiteName === selectedSite
  );
  const selectedFavicon = selectedOrder?.favicon_file;

  return (
    <Select value={selectedSite} onValueChange={setSelectedSite}>
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
              className="w-4 h-4"
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
              <div className="flex items-center gap-2">
                <Image
                  src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons//${order.favicon_file}`}
                  alt="favicon"
                  className="w-4 h-4"
                />
                <span>{order.websiteName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
