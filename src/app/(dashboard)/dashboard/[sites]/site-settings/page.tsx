"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlanValidation } from "@/components/utils/activePlanValidation";
import { Copy, Settings2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderData } from "@/app/api/dataTypes";
import { useSiteContext } from "../../siteContext";
import { toast } from "sonner";
import TrackingIntegration from "./trackingIntegration";

const useUserPagesWithRunCounts = () => {
  return [
    { id: "1", url: "https://example.com/home", runsThisMonth: 120 },
    { id: "2", url: "https://example.com/about", runsThisMonth: 180 },
    { id: "3", url: "https://example.com/contact", runsThisMonth: 75 },
  ];
};

export default function Settings() {
  const [copied, setCopied] = useState("");
  const [siteData, setSiteData] = useState<OrderData>();
  const { selectedSite, fetchOrders } = useSiteContext();
  const [remainingTime, setRemainingTime] = useState(getTimeUntilNextTest());
  const [activeUrls, setActiveUrls] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const pages = useUserPagesWithRunCounts();
  const totalQuota = 1800;
  const totalUsage = pages.reduce((sum, p) => sum + p.runsThisMonth, 0);
  const totalRemaining = totalQuota - totalUsage;
  const totalUsedPercent = Math.min((totalUsage / totalQuota) * 100, 100);

  PlanValidation();

  useEffect(() => {
    fetchDomainData(selectedSite);
    fetchPagesWithVitals();
  }, [selectedSite]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(getTimeUntilNextTest());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    }
  );

  // calculate remaining time for next test
  function getTimeUntilNextTest() {
    const now = new Date(); // user's local time

    // next test UTC time (we run tests on 13:30 UTC)
    const targetUtc = new Date();
    targetUtc.setUTCHours(13, 30, 0, 0); // 13:30:00 UTC

    // If the target time is already passed today, schedule it for tomorrow
    if (targetUtc.getTime() <= now.getTime()) {
      targetUtc.setUTCDate(targetUtc.getUTCDate() + 1);
    }

    const diffMs = targetUtc.getTime() - now.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  // to manage website id copy state
  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    } catch (error) {
      console.log(error);
    }
  }

  // to fetch domain data
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

      const data = await response.json();
      setSiteData(data.data[0]);
    } catch (error) {
      console.error("Network or server error:", error);
      return null;
    }
  }

  // fetch how many urls being tracked
  async function fetchPagesWithVitals() {
    if (!selectedSite) return;

    const res = await fetch("/api/jobs/active_urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedSite),
    });

    const data = await res.json();

    if (data) {
      setActiveUrls(data.data?.[0]?.urls.length);
    }
  }

  const handleRefetch = () => {
    sessionStorage.removeItem("orders");
    fetchOrders(); // This refetch the orders
  };

  // website delete operation
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
    handleRefetch(); // refresh the orders
  }

  return (
    <>
      <div className="m-5 border rounded-sm p-4 bg-primary-foreground dark:bg-secondary-background">
        <div className="border-b flex gap-2 justify-between items-center">
          <span className="flex gap-2 items-center">
            <Settings2 />
            <h2 className="my-3 font-bold text-2xl">Domain Settings</h2>
          </span>
          {confirmingDelete ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="opacity-100"
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmingDelete(false)}
                className="opacity-70 hover:opacity-100"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  className="opacity-70 hover:opacity-100 cursor-pointer"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete Site
                </Button>
              </TooltipTrigger>

              <TooltipContent side="left">
                This action cannot be undone. All site data will be permanently
                removed.
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 my-5">
          <div className="col-span-1 md:col-span-6 order-2 md:order-1">
            <p className="text-primary/70 dark:text-primary/70 mb-4">
              Site related information
            </p>

            <div className="grid gap-4">
              <div>
                <Input
                  value={siteData?.website_name ?? ""}
                  readOnly
                  className="mt-1 bg-gray-100 ring-0 text-primary border-0 rounded-sm dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
              <div className="flex gap-2 items-center text-sm">
                <Label className="font-medium">Site ID:</Label>
                <div className="text-gray-400 dark:text-primary flex gap-2 items-center">
                  {siteData?.order_id
                    ? siteData.order_id.split("-")[0]
                    : "Loading..."}
                  <Copy
                    size={14}
                    onClick={() => handleCopy(siteData?.order_id ?? "")}
                    className="hover:text-blue-500 cursor-pointer"
                  />
                  {copied && <span className="text-green-500">Copied!</span>}
                </div>
              </div>
              <div className="flex gap-2 items-center text-sm">
                <Label className="font-medium">Created date:</Label>
                <div className="text-gray-400 dark:text-primary flex gap-2 items-center">
                  {formattedDate}
                </div>
              </div>
              <div className="flex gap-2 items-center text-sm">
                <Label className="font-medium">Monitoring status:</Label>
                <div className="text-gray-400 dark:text-primary flex gap-2 items-center">
                  {siteData?.order_status === true ? "Running" : "Stopped"}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-6 border-2 p-4 rounded-sm order-1 md:order-2">
            <h3 className="font-semibold text-primary/30 dark:text-primary/30 text-lg mb-2">
              Lab test volume
            </h3>

            <div className="mb-6">
              <div className="flex justify-between items-center text-sm mb-1 font-medium">
                <span>
                  Total Usage: {totalUsage} / {totalQuota}
                </span>
                <span className="text-[#55b943]">
                  Remaining: {totalRemaining}
                </span>
              </div>
              <div className="w-full mt-2 bg-gray-200 dark:bg-gray-700 rounded h-4">
                <div
                  className="h-4 rounded bg-[#55b943]"
                  style={{ width: `${totalUsedPercent}%` }}
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex gap-2 items-center text-sm">
                <Label className="font-medium">Next test starts at:</Label>
                <div className="text-gray-400 dark:text-primary flex gap-2 items-center">
                  {remainingTime}
                </div>
              </div>
              <div className="flex gap-2 items-center text-sm">
                <Label className="font-medium">
                  Active pages being monitored:
                </Label>
                <div className="text-gray-400 dark:text-primary flex gap-2 items-center">
                  {typeof activeUrls === "number"
                    ? `${activeUrls}/10`
                    : activeUrls === undefined
                    ? `0/10`
                    : "Loading..."}
                </div>
              </div>
              <div className="flex gap-2 items-center text-sm">
                <Label className="font-medium">Test runs per report:</Label>
                <div className="text-gray-400 dark:text-primary flex gap-2 items-center">
                  3
                </div>
              </div>
              <div className="flex gap-2 items-center text-sm">
                <Label className="font-medium">Test location:</Label>
                <div className="text-gray-400 dark:text-primary flex gap-2 items-center">
                  Canada, Ontario
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TrackingIntegration
        siteId={"3fdfsgfeqwf"}
        usage={420002}
        quota={10000000}
        nextTestIn={""}
        activePages={4}
      />
    </>
  );
}
