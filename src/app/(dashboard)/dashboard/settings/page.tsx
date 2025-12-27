"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { OrderData } from "@/app/api/dataTypes";
import { useSiteContext } from "../siteContext";
import { toast } from "sonner";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import Integrations from "./integrations";
import { sendRenewalSuccessEmail } from "@/app/api/emails/renewalSuccess";

export default function SettingsPage() {
  const [siteData, setSiteData] = useState<OrderData>();
  const { selectedSite, fetchOrders } = useSiteContext();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [cloudflareStatus, setCloudflareStatus] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    fetchDomainData(selectedSite);
  }, [selectedSite]);

  // useEffect(() => {
  //   getUserData();
  // }, []);

  // async function getUserData() {
  //   await fetch("/api/test");
  // }

  const handleRefetch = () => {
    sessionStorage.removeItem("orders");
    fetchOrders();
  };

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
                  className="text-red-500 px-2 py-0 text-xs hover:text-red-600 cursor-pointer"
                  onClick={handleDelete}
                >
                  Confirm
                </button>
                <button
                  className="text-muted-foreground px-2 py-0 cursor-pointer hover:text-primary/80 text-xs"
                  onClick={() => setConfirmingDelete(false)}
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

            {/* Status */}
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">RUM Status</Label>
              {!siteData ? (
                <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
              ) : (
                <span
                  className={`font-medium ${
                    siteData?.order_status ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {siteData?.order_status ? "Running" : "Stopped"}
                </span>
              )}
            </div>

            {/* cloudflare connection */}
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Cloudflare Status</Label>

              {!siteData || cloudflareStatus === null ? (
                <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
              ) : cloudflareStatus ? (
                <span className="font-medium text-green-500">Connected</span>
              ) : (
                <span className="font-medium text-red-500">Not Connected</span>
              )}
            </div>
          </div>
        </div>

        {/* RUM Integration - Wider Section */}
        <div className="col-span-1 md:col-span-8">
          <Integrations siteId={siteData?.order_id} />
        </div>
      </div>
    </div>
  );

  async function fetchDomainData(selectedSite: string) {
    if (!selectedSite) return;

    try {
      const response = await fetch("/api/orders/get-single-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedSite }),
      });

      if (!response.ok) {
        console.error("Error fetching site data:", response.statusText);
        setSiteData(undefined);
        return;
      }

      const data: any = await response.json();
      const siteData = data.data[0];

      setSiteData(siteData);

      setCloudflareStatus(null);

      const res = await fetch("/api/cloudflare/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: siteData.user_id,
          site_id: siteData.order_id,
        }),
      });

      if (!res.ok) {
        console.log("Failed to retrieve Cloudflare status");
      }

      const cfData: any = await res.json();
      setCloudflareStatus(cfData.found);
    } catch (error) {
      console.error("Network or server error:", error);
    }
  }

  async function handleDelete() {
    if (!selectedSite) return;

    const res = await fetch("/api/orders/delete-site", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ domain: selectedSite }),
    });

    if (!res.ok) {
      toast.error("Unexpected error in deleting website", {
        style: { backgroundColor: "#FF9898", color: "white" },
      });
      return;
    }

    toast.success("Website deleted", {
      style: { backgroundColor: "#66cc8f", color: "white" },
    });
    handleRefetch();
  }
}
