"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, LoaderIcon, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { OrderData } from "@/app/api/dataTypes";
import { useSiteContext } from "../siteContext";
import { toast } from "sonner";
import { LoadingAnimation } from "@/components/theme/loadingAnimation";
import Integrations, { CfConnection } from "./integrations";
import { getRateLimiter, setRatelimiter } from "@/components/utils";

export default function Main() {
  const [siteData, setSiteData] = useState<OrderData>();
  const { selectedSite } = useSiteContext();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [cloudflareStatus, setCloudflareStatus] = useState<CfConnection>({
    isConnected: false,
    key: "",
  });
  const [isDeleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    fetchDomainData(selectedSite);
  }, [selectedSite]);

  const formattedDate = new Date(siteData?.order_date ?? "").toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    },
  );

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="w-full p-5">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Site Info Card */}
        <div className="border rounded-sm p-4 bg-primary-foreground dark:bg-secondary-background text-sm col-span-1 md:col-span-4 relative h-fit">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Site Info</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Edit
                    size={16}
                    className="cursor-pointer text-muted-foreground hover:text-primary"
                    onClick={() => toast.info("Edit feature coming soon")}
                  />
                </TooltipTrigger>
                <TooltipContent>Edit Site</TooltipContent>
              </Tooltip>
            </div>

            {confirmingDelete ? (
              <div className="flex gap-1 items-center">
                <button
                  className="text-red-500 px-2 py-1 text-xs hover:text-white rounded-sm hover:bg-red-500 cursor-pointer"
                  onClick={deleteSite}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <LoaderIcon size={14} className="animate-spin" />
                  ) : (
                    "Confirm"
                  )}
                </button>
                <button
                  className="text-muted-foreground px-2 py-0 cursor-pointer hover:text-primary/80 text-xs"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Trash
                    size={16}
                    className="cursor-pointer text-muted-foreground hover:text-red-500"
                    onClick={() => setConfirmingDelete(true)}
                  />
                </TooltipTrigger>
                <TooltipContent>Delete site</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex flex-col space-y-3 text-sm">
            {/* Website */}
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Website</Label>
              {!siteData ? (
                <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
              ) : (
                <p className="text-primary font-medium">
                  {siteData?.website_name}
                </p>
              )}
            </div>

            {/* Created */}
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Created</Label>

              {!siteData ? (
                <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
              ) : (
                <span className="text-primary font-medium">
                  {formattedDate}
                </span>
              )}
            </div>

            {/*RUM connection Status */}
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">RUM Status</Label>
              {!siteData ? (
                <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
              ) : (
                <span
                  className={`font-medium ${
                    siteData?.rum_connection ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {siteData?.rum_connection ? "Running" : "Not connected"}
                </span>
              )}
            </div>

            {/* cloudflare connection */}
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">
                Cloudflare Integration
              </Label>

              {!siteData || cloudflareStatus === null ? (
                <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
              ) : cloudflareStatus.isConnected && cloudflareStatus.key ? (
                <span className="font-medium text-green-500">Connected</span>
              ) : (
                <span className="font-medium text-red-500">Not Connected</span>
              )}
            </div>
          </div>
        </div>

        {/* RUM Integration - Wider Section */}
        <div className="col-span-1 md:col-span-8">
          <Integrations
            siteId={siteData?.order_id}
            cfData={cloudflareStatus}
            setCfData={() => {
              setCloudflareStatus;
              sessionStorage.removeItem(`${selectedSite}-cloudflare-status`);
            }}
          />
        </div>
      </div>
    </div>
  );

  async function fetchDomainData(selectedSite: string) {
    if (!selectedSite) return;

    const siteKey = `${selectedSite}-domain-info`;
    const cfKey = `${selectedSite}-cloudflare-status`;
    const expiry = 5 * 60 * 1000; // five minutes

    // Check site data cache
    const cachedSiteData = getRateLimiter(siteKey);
    if (cachedSiteData) {
      setSiteData(cachedSiteData);
    } else {
      try {
        const siteRes = await fetch("/api/orders/get-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: selectedSite }),
        });

        const siteBody: { message?: string; data?: any[]; status: number } =
          await siteRes.json();

        if (!siteRes.ok || !siteBody.data || !siteBody.data.length) {
          setSiteData(undefined);
          setRatelimiter({ key: siteKey, ttl: expiry, value: undefined });
          throw new Error(siteBody.message || "Failed to fetch site data");
        }

        const siteData = siteBody.data[0];
        setSiteData(siteData);
        setRatelimiter({ key: siteKey, ttl: expiry, value: siteData });
      } catch (error) {
        console.error("Error fetching site data:", error);
        return;
      }
    }

    const siteData = getRateLimiter(siteKey); // guaranteed to exist here

    // Check Cloudflare status cache
    const cachedCFStatus = getRateLimiter(cfKey);

    if (cachedCFStatus) {
      setCloudflareStatus(cachedCFStatus);
    } else {
      try {
        const cfRes = await fetch("/api/cloudflare/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: siteData.user_id,
            site_id: siteData.order_id,
          }),
        });

        const cfData: { found?: boolean; key?: string; message?: string } =
          await cfRes.json();

        const status = { isConnected: cfData.found ?? false, key: cfData.key };

        console.log(cfData);

        setCloudflareStatus(status);
        setRatelimiter({ key: cfKey, ttl: expiry, value: status });

        if (!cfRes.ok) {
          throw new Error(
            cfData.message || "Failed to fetch Cloudflare status",
          );
        }
      } catch (error) {
        console.error("Error fetching Cloudflare status:", error);
      }
    }
  }

  async function deleteSite() {
    if (!selectedSite) return;

    setDeleting(true);

    try {
      const res = await fetch("/api/orders/delete-site", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ domain: selectedSite }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        toast.error("Error in deleting website", {
          style: { backgroundColor: "#FF9898", color: "white" },
        });
        setDeleting(false);
        throw new Error(body.message);
      }

      toast.success("Website deleted", {
        style: { backgroundColor: "#66cc8f", color: "white" },
      });

      // delete order cache
      sessionStorage.removeItem("orders");
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }
}
