"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Edit, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderData } from "@/app/api/dataTypes";
import { useSiteContext } from "../siteContext";
import { toast } from "sonner";
import TrackingIntegration from "./trackingIntegration";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";

export default function SettingsPage() {
  const [copied, setCopied] = useState("");
  const [siteData, setSiteData] = useState<OrderData>();
  const { selectedSite, fetchOrders } = useSiteContext();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    fetchDomainData(selectedSite);
  }, [selectedSite]);

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
                  className="text-red-500 px-2 py-0 text-xs hover:font-semibold cursor-pointer"
                  onClick={handleDelete}
                >
                  Confirm
                </button>
                <button
                  className="text-muted-foreground px-2 py-0 cursor-pointer hover:font-semibold text-xs"
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

          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Website</Label>
              <Input
                value={siteData?.website_name ?? ""}
                readOnly
                className="mt-1 bg-gray-100 dark:bg-gray-800 border-0 text-primary text-sm"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Site ID</Label>
                <div className="flex items-center gap-2 text-primary">
                  <span>{siteData?.order_id?.split("-")[0]}</span>
                  <Copy
                    size={14}
                    onClick={() => handleCopy(siteData?.order_id ?? "")}
                    className="cursor-pointer hover:text-blue-500"
                  />
                  {copied && (
                    <span className="text-green-500 text-xs">Copied!</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Label className="text-muted-foreground">Created</Label>
                <span className="text-primary">{formattedDate}</span>
              </div>

              <div className="flex justify-between">
                <Label className="text-muted-foreground">Status</Label>
                <span className="text-primary">
                  {siteData?.order_status === true ? "Running" : "Stopped"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RUM Integration - Wider Section */}
        <div className="col-span-1 md:col-span-8">
          <TrackingIntegration />
        </div>
      </div>
    </div>
  );

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    } catch (error) {
      console.log(error);
    }
  }

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
      setSiteData(data.data[0]);
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
