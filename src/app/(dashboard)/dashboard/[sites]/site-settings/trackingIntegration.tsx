"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface TrackingIntegrationProps {
  siteId: string;
  usage: number;
  quota: number;
  nextTestIn: string;
  activePages: number;
}

export default function TrackingIntegration({
  siteId,
  usage,
  quota,
  nextTestIn,
  activePages,
}: TrackingIntegrationProps) {
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);

  const remaining = quota - usage;
  const percentUsed = Math.min((usage / quota) * 100, 100).toFixed(0);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const trackingScript = `<script src="https://yourcdn.com/tracker.js" data-site-id="${siteId}" async></script>`;

  return (
    <div className="m-5 border rounded-sm p-4 bg-primary-foreground dark:bg-secondary-background">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Side: Integration Instructions */}
        <div className="col-span-1 md:col-span-6">
          <h3 className="font-bold text-lg mb-2">Tracking Integration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Copy and paste this script into your website&apos;s &lt;head&gt;
            tag, or use the WordPress plugin.
          </p>

          <Label className="text-sm font-medium mb-1">Script for Header</Label>
          <div className="relative">
            <Input
              className="bg-gray-100 dark:bg-gray-800 text-xs font-mono pr-10"
              value={trackingScript}
              readOnly
            />
            <Copy
              size={16}
              className="absolute right-2 top-2.5 cursor-pointer hover:text-blue-500"
              onClick={() => handleCopy(trackingScript)}
            />
          </div>
          {copied && <p className="text-green-500 text-xs mt-1">Copied!</p>}

          <div className="mt-6">
            <Button
              variant="secondary"
              onClick={() => setReveal(!reveal)}
              className="text-sm"
            >
              {reveal ? "Hide Secret ID" : "Reveal Secret Site ID"}
            </Button>

            {reveal && (
              <div className="mt-2 font-mono text-sm text-gray-600 dark:text-gray-300">
                {siteId}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Stats Card */}
        <div className="col-span-1 md:col-span-6 border-2 p-4 rounded-sm">
          <h3 className="font-semibold text-primary/30 dark:text-primary/30 text-lg mb-2">
            Lab test volume
          </h3>

          <div className="mb-6">
            <div className="flex justify-between items-center text-sm mb-1 font-medium">
              <span>
                Total Usage: {usage} / {quota}
              </span>
              <span className="text-[#55b943]">Remaining: {remaining}</span>
            </div>
            <div className="w-full mt-2 bg-gray-200 dark:bg-gray-700 rounded h-4">
              <div
                className="h-4 rounded bg-[#55b943]"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex gap-2 items-center text-sm">
              <Label className="font-medium">Next test starts at:</Label>
              <div className="text-gray-400 dark:text-primary">
                {nextTestIn}
              </div>
            </div>
            <div className="flex gap-2 items-center text-sm">
              <Label className="font-medium">Active pages monitored:</Label>
              <div className="text-gray-400 dark:text-primary">
                {activePages}/10
              </div>
            </div>
            <div className="flex gap-2 items-center text-sm">
              <Label className="font-medium">Test runs per report:</Label>
              <div className="text-gray-400 dark:text-primary">3</div>
            </div>
            <div className="flex gap-2 items-center text-sm">
              <Label className="font-medium">Test location:</Label>
              <div className="text-gray-400 dark:text-primary">
                Canada, Ontario
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
