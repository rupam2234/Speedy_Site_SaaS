"use client";

import TooltipIcon from "@/components/utils/customTooltip";
import { ClipboardList, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  siteId: string | undefined;
}

type Tabs = {
  name: string;
};

const tabs: Tabs[] = [
  { name: "Real User Monitoring" },
  { name: "Image Optimization" },
];

export default function Integrations({ siteId }: Props) {
  const [activeTab, setActiveTab] = useState<string>("Real User Monitoring");
  const trackingScript = `<script src="https://rum.speedy.site/rum.js?v=0.0.1&id=${siteId?.split("-")[0]}" defer></script>`;

  return (
    <div className="border rounded-sm px-4 pb-4 bg-primary-foreground dark:bg-secondary-background">
      <div className="flex gap-2 text-primary/80 items-center">
        <Settings2 />
        <h2 className="my-3 font-bold text-lg">Integrations</h2>
      </div>
      <div className="border-b border-primary/10 flex gap-2 items-center">
        {tabs?.map((x) => (
          <button
            className={`px-2 cursor-pointer py-1 text-sm hover:bg-primary/10 ${activeTab === x.name ? "bg-primary/10" : ""}`}
            onClick={() => handleActiveTab(x.name)}
          >
            {x.name}
          </button>
        ))}
      </div>
      {activeTab === "Real User Monitoring" ? (
        <>
          <div className="border-x border-primary/10 px-4 py-4 text-sm space-y-4">
            <p className="text-primary/80 leading-relaxed">
              Real User Monitoring (RUM) collects performance and user
              experience data from real browsing sessions. To set it up, place
              the following script inside your site&apos;s{" "}
              <strong>&lt;head&gt;&lt;/head&gt;</strong> tags.
            </p>

            <div className="flex items-center justify-between gap-2 rounded-sm border border-primary/10 bg-muted/30 px-2 py-1">
              <div className="font-mono text-xs overflow-x-auto">
                {trackingScript}
              </div>

              <TooltipIcon
                trigger={
                  <ClipboardList
                    size={20}
                    className="cursor-pointer text-violet-500 font-bold p-1 rounded-sm hover:bg-primary/10 transition"
                    onClick={() => handleCopy(trackingScript)}
                  />
                }
                content={"Copy to clipboard"}
                side="left"
              />
            </div>
          </div>
          <div className="border-x border-b border-primary/10 px-4 py-2 text-sm space-y-3 bg-muted/30">
            <p className="text-primary/70 leading-relaxed">
              This script collects only{" "}
              <strong>anonymous performance metrics</strong>:
            </p>

            <ul className="list-disc list-inside text-primary/70 space-y-1">
              <li>Page load timings (FCP, LCP, TTFB)</li>
              <li>Layout shift &amp; rendering instability</li>
              <li>Resource load timings</li>
              <li>Navigation timings</li>
              <li>Browser type and device characteristics</li>
              <li>Backtrack the previous page</li>
              <li>User&apos;s country</li>
              <li>Screen size and network type (if available)</li>
            </ul>

            <p className="text-primary/70 leading-relaxed">
              <strong>No personal data is collected.</strong> We do not store IP
              addresses, cookies, session recordings, or any user-identifiable
              information.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full border border-primary/10 px-2 py-0.5 text-xs">
                No cookies
              </span>
              <span className="rounded-full border border-primary/10 px-2 py-0.5 text-xs">
                Anonymous only
              </span>
              <span className="rounded-full border border-primary/10 px-2 py-0.5 text-xs">
                Performance metrics
              </span>
              <span className="rounded-full border border-primary/10 px-2 py-0.5 text-xs">
                GDPR-friendly
              </span>
            </div>
          </div>
        </>
      ) : (
        <></>
      )}
    </div>
  );

  function handleActiveTab(name: string) {
    setActiveTab(name);
  }

  function handleCopy(value: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        toast.success("Copied to clipboard", {
          style: { backgroundColor: "green", color: "white" },
        });
      })
      .catch(() => {
        toast.error("Failed to Copy", {
          style: { backgroundColor: "red", color: "white" },
        });
      });
  }
}
