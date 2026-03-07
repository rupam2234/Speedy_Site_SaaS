"use client";

import * as React from "react";
import { ArrowRight, CirclePlus, PlusCircle } from "lucide-react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { AddNewWebsite, CustomTooltip } from "../theme";
import Image from "next/image";

export function SelectSite({ collapsed = false }: { collapsed?: boolean }) {
  const { selectedSite, setSelectedSite, orders, setCollapsed } =
    useSiteContext();
  const [isOpen, setOpen] = React.useState<boolean>(false);
  const [displayModal, setDisplayModal] = React.useState<boolean>(false);

  const selectorRef = React.useRef<HTMLDivElement | null>(null);

  // Only update collapsed if it actually changes
  React.useEffect(() => {
    setCollapsed(collapsed);
  }, [collapsed, setCollapsed]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOrder = orders?.find((o) => o.website_name === selectedSite);

  const selectedFavicon = {
    fav: selectedOrder?.favicon_file,
    site: selectedOrder?.website_name,
  };

  if (!orders) {
    return (
      <div className="text-sm text-muted-foreground p-2">Loading websites…</div>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        <div
          className="text-blue-500 font-medium text-sm flex p-2 items-center gap-1 cursor-pointer min-w-30"
          onClick={() => setDisplayModal(true)}
        >
          {collapsed ? (
            <CustomTooltip
              content={"Add website"}
              side="right"
              trigger={<CirclePlus className="w-4 h-4" />}
            />
          ) : (
            <>
              <CirclePlus className="w-4 h-4" /> Add website
            </>
          )}
        </div>

        {displayModal && (
          <AddNewWebsite
            setDisplay={({ display }) => setDisplayModal(display)}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative" ref={selectorRef}>
      <div
        className={`border-2 text-sm text-primary/80
           font-medium border-primary/30 px-2 py-0.5 outline-none 
           appearance-none relative cursor-pointer
            ${collapsed ? "w-8.25 rounded-md" : "w-full "}
            ${isOpen ? "rounded-tl-md rounded-tr-md" : "rounded-md"}
           `}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedSite !== undefined ? (
          <div className="flex items-center justify-between min-h-6.25">
            {collapsed ? (
              <CustomTooltip
                content={selectedSite}
                side="right"
                trigger={
                  <Image
                    src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons/${selectedFavicon.fav}`}
                    alt={`${selectedFavicon.site}_logo`}
                    width={16}
                    height={16}
                    className="rounded"
                    loading="lazy"
                  />
                }
              />
            ) : (
              <div className="flex items-center gap-1">
                {selectedFavicon.fav === null ? (
                  <div className="w-4 h-4 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">
                    ?
                  </div>
                ) : (
                  <Image
                    src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons/${selectedFavicon.fav}`}
                    alt={`${selectedFavicon.site}_logo`}
                    width={16}
                    height={16}
                    className="rounded"
                    loading="lazy"
                  />
                )}

                <span className="truncate">{selectedSite}</span>
              </div>
            )}

            <ArrowRight
              size={16}
              className={`text-primary/80 transition-all duration-200 ${
                !collapsed && isOpen ? "rotate-90" : ""
              } ${!collapsed ? "block" : "hidden"}`}
            />
          </div>
        ) : (
          "Select a website"
        )}
      </div>

      {isOpen && !collapsed && (
        <div className="absolute dark:bg-gray-600 top-[110%] left-0 w-full bg-primary-foreground shadow-md z-10 border-2 border-primary/30 rounded-bl-md rounded-br-md py-0.5">
          {orders.map((x, i) => {
            return (
              <div
                key={i}
                className="flex items-center gap-2 py-1 text-sm px-2 hover:bg-primary/5 dark:hover:bg-secondary-background cursor-pointer"
                onClick={() => {
                  setSelectedSite(x.website_name);
                  setOpen(false);
                }}
              >
                {x.favicon_file === null || x.favicon_file === undefined ? (
                  <div className="w-4 h-4 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">
                    ?
                  </div>
                ) : (
                  <Image
                    src={`https://tmpvygehhshrgsqxzaty.supabase.co/storage/v1/object/public/favicons/${x.favicon_file}`}
                    alt={`${x.website_name}_logo`}
                    width={16}
                    height={16}
                    className="rounded"
                    loading="lazy"
                  />
                )}

                <p>{x.website_name}</p>
              </div>
            );
          })}
          <div
            className="flex items-center gap-2 py-1 text-sm px-2 hover:bg-primary/5 dark:hover:bg-secondary-background cursor-pointer"
            onClick={() => setDisplayModal(true)}
          >
            <PlusCircle size={16} className="text-primary/80" />
            Add a new site
          </div>
        </div>
      )}

      {displayModal && (
        <AddNewWebsite setDisplay={({ display }) => setDisplayModal(display)} />
      )}
    </div>
  );
}
