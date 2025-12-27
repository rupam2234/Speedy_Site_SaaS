"use client";

import TooltipIcon from "@/components/utils/customTooltip";
import { ClipboardList, LoaderIcon, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSiteContext } from "../siteContext";

interface Props {
  siteId: string | undefined;
}

type Status = {
  status: string;
  comment?: string;
};

type Tabs = {
  name: string;
};

const tabs: Tabs[] = [
  { name: "Real User Monitoring" },
  { name: "Cloudflare Authentication" },
];

export default function Integrations({ siteId }: Props) {
  const { selectedSite } = useSiteContext();
  const [activeTab, setActiveTab] = useState<string>("Real User Monitoring");
  const [token, setToken] = useState<string>("");
  const [status, setStatus] = useState<Status>({ status: "idle" });

  const trackingScript = `<script src="https://rum.speedy.site/rum.js?v=0.0.1&id=${siteId?.split("-")[0]}" defer></script>`;

  const validateToken = async () => {
    setStatus({ status: "loading" });

    const res = await fetch("/api/cloudflare/validate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, site: selectedSite }),
    });

    const data: any = await res.json();
    const status = data.valid === true ? "success" : "error";
    const message = data.message;

    console.log(data);

    if (res.ok) {
      setStatus({ status: status, comment: message });
    } else {
      setStatus({ status: status, comment: message });
    }
  };

  useEffect(() => {
    if (status.status === "success" || status.status === "error") {
      const timer = setTimeout(() => {
        setStatus({ status: "idle" });
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="border rounded-sm px-4 pb-4 bg-primary-foreground dark:bg-secondary-background">
      <div className="flex gap-2 text-primary/80 items-center">
        <Settings2 />
        <h2 className="my-3 font-bold text-lg">Integrations</h2>
      </div>
      <div className="border-b border-primary/10 flex gap-2 items-center">
        {tabs?.map((x) => (
          <button
            key={x.name}
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

            <div className="flex items-center justify-between gap-2 rounded-sm border border-primary/10 bg-primary/10 px-2 py-1">
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
          <div className="border-x border-b border-primary/10 px-4 py-2 text-sm space-y-3 bg-transparent">
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
        <>
          <div className="border-x border-primary/10 px-4 py-4 text-sm space-y-4">
            <p className="text-primary/80 leading-relaxed">
              Cloudflare Lab works to reduce your site&apos;s server response
              time (TTFB), helping your pages load faster for visitors. To
              optimize, our tool needs your cloudflare API with limited
              permissions.
            </p>
            <p className="text-primary/80 leading-relaxed">
              You must have a <strong>Cloudflare account</strong> and{" "}
              <strong>a website active on Speedy.site</strong> linked to it for
              us to apply optimizations and custom cache rules.
            </p>
            <p className="text-primary/80 leading-relaxed">
              First, check the Cloudflare connection status on the status card
              to the left. If it shows “<strong>Not Connected</strong>”,
              you&apos;ll need to generate a Cloudflare API token. If the status
              shows otherwise, you can skip the steps below.
            </p>
            <p className="text-primary/80 leading-relaxed">
              In case you have to generate a token, head over to{" "}
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="nofollow"
                className="hover:bg-blue-300 text-blue-500"
              >
                Cloudflare API Management
              </a>{" "}
              and then{" "}
              <a
                href="#"
                target="_blank"
                rel="nofollow"
                className="hover:bg-blue-300 text-blue-500"
              >
                follow this guide
              </a>{" "}
              to create a custom token and then connect to Speedy Site for a
              working setup.
            </p>
            <div className="flex gap-2 items-center">
              <input
                placeholder="Cloudflare Token"
                className="bg-primary/10 border w-full text-primary rounded-sm px-3 py-1"
                value={token}
                type="password"
                onChange={(e) => setToken(e.target.value)}
              />
              <button
                className="rounded-sm bg-primary/80 px-3 py-1 w-[200px] text-primary-foreground cursor-pointer hover:bg-primary/70"
                onClick={() => validateToken()}
                disabled={!token || status.status === "loading"}
              >
                {status.status === "loading" ? (
                  <>Connecting...</>
                ) : (
                  <>Connect</>
                )}
              </button>
            </div>
            <div className="">
              {status.status === "success" ? (
                <p className="text-green-500 font-semibold ">
                  Connection succesful
                </p>
              ) : status.status === "error" ? (
                <p className="text-red-500 font-semibold ">
                  Connection Failed:{" "}
                  <span className="font-mono bg-red-100 px-2 text-primary/80 py-1">
                    {status.comment}
                  </span>
                </p>
              ) : (
                <></>
              )}
            </div>
          </div>
        </>
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
