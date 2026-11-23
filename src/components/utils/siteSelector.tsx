"use client";

import * as React from "react";
import { ArrowRight, CirclePlus, PlusCircle } from "lucide-react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { CustomTooltip } from "../theme";
import { SiteIcon } from "./siteIcon";
import { isSetupComplete } from "@/lib/setupProgress";
import { useRouter } from "next/navigation";

export function SelectSite({ collapsed = false }: { collapsed?: boolean }) {
  const { selectedSite, setSelectedSite, orders, setCollapsed } =
    useSiteContext();
  const [isOpen, setOpen] = React.useState<boolean>(false);
  const router = useRouter();

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

  // An order row only means "live site" once payment completed: rows are
  // created unpaid while the site is being connected (order_status = false)
  // and flip to true when the Stripe webhook / reconcile endpoint processes
  // the payment. Pending sites are shown, but they route to their setup page
  // instead of being treated as a fully active site.
  const isPaid = (order?: { order_status?: boolean }) =>
    order?.order_status === true;

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
          onClick={() => router.push("/dashboard/onboarding?intent=new-site")}
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
                  <SiteIcon
                    favicon={selectedFavicon.fav}
                    site={selectedFavicon.site}
                  />
                }
              />
            ) : (
              <div className="flex items-center gap-1 min-w-0">
                <SiteIcon
                  favicon={selectedFavicon.fav}
                  site={selectedFavicon.site}
                />

                <span className="truncate">{selectedSite}</span>
                {!isPaid(selectedOrder) && (
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
                    Pending
                  </span>
                )}
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
                  setOpen(false);
                  setSelectedSite(x.website_name);
                  // Incomplete setup resumes the onboarding panel. A completed
                  // site stays on the dashboard instead of reopening setup.
                  if (!isSetupComplete(x)) {
                    router.push(
                      `/dashboard/onboarding?site=${encodeURIComponent(x.website_name)}`,
                    );
                  }
                }}
              >
                <SiteIcon favicon={x.favicon_file} site={x.website_name} />

                <p className="truncate">{x.website_name}</p>
                {!isPaid(x) && (
                  <span className="ml-auto shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
                    Pending payment
                  </span>
                )}
              </div>
            );
          })}
          <div
            className="flex items-center gap-2 py-1 text-sm px-2 hover:bg-primary/5 dark:hover:bg-secondary-background cursor-pointer"
            onClick={() => router.push("/dashboard/onboarding?intent=new-site")}
          >
            <PlusCircle size={16} className="text-primary/80" />
            Add a new site
          </div>
        </div>
      )}


    </div>
  );
}
