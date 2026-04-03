"use client";

import TooltipIcon from "@/components/theme/customTooltip";
import { ClipboardList, InfoIcon, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSiteContext } from "../siteContext";
import { getRateLimiter, setRatelimiter } from "@/components/utils";
import { OrderData } from "@/app/api/dataTypes";
import { CustomTooltip } from "@/components/theme";

interface Props {
  siteData: OrderData | undefined;
  setSiteData?: (siteData: OrderData | undefined) => void;
  cfData: CfConnection;
  setCfData?: (cfData: CfConnection) => void;
}

export type CfConnection = {
  isConnected: boolean;
  key?: string | null;
};

type Status = {
  status: "success" | "idle" | "error" | "loading";
  comment?: string;
};

type Tabs = {
  name: string;
};

const tabs: Tabs[] = [
  { name: "Real User Monitoring" },
  { name: "Weekly Report" },
  { name: "Cloudflare" },
];

export default function Integrations({
  siteData,
  setSiteData,
  cfData,
  setCfData,
}: Props) {
  const { selectedSite } = useSiteContext();
  const [activeTab, setActiveTab] = useState<string>("Real User Monitoring");
  const [token, setToken] = useState<string>("");
  const [status, setStatus] = useState<Status>({ status: "idle" });
  const [rumScriptAvailable, setRumScript] = useState<{
    isAvailable: boolean;
    loading: boolean;
    isSet?: boolean;
  }>({ isAvailable: false, loading: false });

  const trackingScript = `<script src="https://rum.speedy.site/rum.js?v=0.0.1&id=${siteData?.order_id?.split("-")[0]}" defer></script>`;

  useEffect(() => {
    if (status.status === "success" || status.status === "error") {
      const timer = setTimeout(() => {
        setStatus({ status: "idle" });
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (rumScriptAvailable.isSet === false) return;

    const timer = setTimeout(() => {
      setRumScript({ isAvailable: false, loading: false, isSet: false });
    }, 5000);

    return () => clearTimeout(timer);
  }, [rumScriptAvailable.isSet]);

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
            onClick={() => setActiveTab(x.name)}
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
            <div className="flex items-center gap-3">
              <button
                className="px-2 py-1 bg-green-600 min-w-36 rounded-sm hover:bg-green-700 text-white cursor-pointer"
                onClick={() => validateScript()}
                disabled={rumScriptAvailable.loading}
              >
                {rumScriptAvailable.loading
                  ? "Checking..."
                  : "Validate connection"}
              </button>
              {rumScriptAvailable.loading === false &&
              rumScriptAvailable.isSet ? (
                <span
                  className={`px-2 py-1 text-primary/80 font-medium ${rumScriptAvailable.isAvailable ? "bg-green-200" : "bg-red-200"}`}
                >
                  {rumScriptAvailable.isAvailable
                    ? "RUM script found. You are all set."
                    : "RUM script not found!"}
                </span>
              ) : (
                <></>
              )}
            </div>
          </div>
          <div className="border-x border-b border-primary/10 px-4 py-2 text-sm space-y-3 bg-transparent">
            <p className="text-primary/70 leading-relaxed">
              This script collects{" "}
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
      ) : activeTab === "Cloudflare" ? (
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
            {cfData.isConnected == true ? (
              <>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
                  <span className="font-mono md:text-sm text-[12px] truncate overflow-hidden text-foreground">
                    {cfData.key}
                  </span>
                  <button
                    type="button"
                    className="ml-4 cursor-pointer hover:bg-primary/20 rounded border px-3 py-1 text-xs font-medium transition"
                    onClick={revokeCf}
                  >
                    {/* revoke yet to apply */}
                    Revoke
                  </button>
                </div>
              </>
            ) : (
              <>
                <form
                  className="flex gap-2 items-center"
                  onSubmit={(e) => {
                    e.preventDefault(); // this prevents the browser from reload after form submission
                    validateToken();
                  }}
                >
                  <input
                    placeholder="Cloudflare Token"
                    className="bg-primary/10 border w-full text-primary rounded-sm px-3 py-1"
                    value={token}
                    type="password"
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <button
                    className="rounded-sm bg-primary/80 px-3 py-1 w-50 text-primary-foreground cursor-pointer hover:bg-primary/70"
                    disabled={!token || status.status === "loading"}
                  >
                    {status.status === "loading" ? (
                      <>Connecting...</>
                    ) : (
                      <>Connect</>
                    )}
                  </button>
                </form>
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
              </>
            )}
          </div>
        </>
      ) : (
        <WeeklyReview
          weeklyEmail={siteData?.weekly_report}
          emailAddressForWeekly={siteData?.report_email}
          updateWeeklySetting={handleWeeklySetting}
        />
      )}
    </div>
  );

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

  async function validateToken() {
    if (!selectedSite) return;

    setStatus({ status: "loading" });

    const res = await fetch("/api/cloudflare/validate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, site: selectedSite }),
    });

    const data: any = await res.json();
    const status = data.valid === true ? "success" : "error";
    const message = data.message;

    // clear previous cache
    sessionStorage.removeItem(`${selectedSite}-cloudflare-status`);

    setStatus({ status: status, comment: message });
  }

  async function validateScript() {
    if (!selectedSite) {
      return;
    }

    const key = selectedSite;
    const FIVE_MINUTES = 5 * 60 * 1000;

    // rate limiting...
    const lastCall: boolean = getRateLimiter(key);

    if (lastCall) {
      console.log("API call skipped: still within 5 minutes window");
      setRumScript({ loading: false, isAvailable: lastCall, isSet: true });
      return;
    }

    setRumScript({ loading: true, isAvailable: false });

    try {
      const res = await fetch(
        "https://speedy-site-rum-check-production.up.railway.app/api/check-script",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain: selectedSite }),
        },
      );

      let body: any;
      try {
        body = await res.json();
      } catch {
        throw new Error(body?.message || `API returned status ${res.status}`);
      }

      const scriptExists = body.scriptExists;

      setRatelimiter({ key: key, ttl: FIVE_MINUTES, value: scriptExists });

      setRumScript({
        isAvailable: scriptExists,
        loading: false,
        isSet: true,
      });
    } catch (error: any) {
      setRumScript({ loading: false, isAvailable: false, isSet: true });
      console.error(error.message);
    }
  }

  async function revokeCf() {
    if (!selectedSite) return;

    try {
      const res = await fetch("/api/cloudflare/revoke-token", {
        method: "POST",
        headers: {
          "Content-Type": "appliaction/json",
        },
        body: JSON.stringify({ domain: siteData?.order_id }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        throw new Error(body.message);
      }

      setCfData?.({ isConnected: false, key: "" });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleWeeklySetting({
    sendEmail,
    address,
  }: {
    sendEmail: boolean | null | undefined;
    address: string | null | undefined;
  }) {
    // try to get the orders
    const cachedOrders = sessionStorage.getItem("orders");

    let updatedOrder: OrderData;

    if (cachedOrders) {
      const parsedOrders: OrderData[] = JSON.parse(cachedOrders);

      const existing = parsedOrders.find(
        (x) => x.website_name === selectedSite,
      );

      if (!existing) {
        console.error("Order not found");
        return;
      }

      updatedOrder = {
        ...existing,
        report_email: address,
        weekly_report: sendEmail,
      };

      // orders with updated data
      const newOrders = parsedOrders.map((x) =>
        x.website_name === updatedOrder.website_name ? updatedOrder : x,
      );

      sessionStorage.setItem("orders", JSON.stringify(newOrders));

      // update main data
      if (setSiteData) {
        setSiteData(updatedOrder);
      }

      // udpate on db
      try {
        const res = await fetch("/api/orders/update-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: updatedOrder }),
        });

        const body: any = await res.json();

        if (!res.ok) {
          throw new Error(body.message ?? "Error updating order!");
        }
      } catch (error: any) {
        console.error(
          error ?? "Error updating weekly review settings on order",
        );
      }
    }

    console.error("Error occured: weekly report settings");
  }
}

function WeeklyReview({
  weeklyEmail,
  emailAddressForWeekly,
  updateWeeklySetting,
}: {
  weeklyEmail: boolean | null | undefined;
  emailAddressForWeekly: string | null | undefined;
  updateWeeklySetting: ({
    sendEmail,
    address,
  }: {
    sendEmail: boolean | null | undefined;
    address: string | null | undefined;
  }) => void;
}) {
  const [emailReportCheck, setEmailReportCheck] = useState<
    boolean | null | undefined
  >(weeklyEmail);
  const [address, setEmailAddress] = useState<string | null | undefined>(
    emailAddressForWeekly,
  );
  const [displaySave, setSaveButton] = useState<boolean>(false);

  useEffect(() => {
    const normalizedAddress = address?.trim() || "";
    const originalAddress = emailAddressForWeekly?.trim() || "";

    const isChanged =
      emailReportCheck !== weeklyEmail || normalizedAddress !== originalAddress;

    setSaveButton(isChanged);
  }, [emailReportCheck, address, weeklyEmail, emailAddressForWeekly]);

  return (
    <div className="space-y-3 text-sm text-primary/80 border-x border-b border-primary/10 p-4">
      <p>Configure your weekly report preference.</p>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
        <input
          type="checkbox"
          checked={emailReportCheck !== null ? emailReportCheck : false}
          onChange={(e) => setEmailReportCheck(e.target.checked)}
        />
        <p>Report to email</p>
        {emailReportCheck && (
          <>
            <input
              type="text"
              value={address ?? ""}
              className="min-w-55 px-2 border border-primary/10 rounded-sm"
              placeholder="email address"
              onChange={(e) => setEmailAddress(e.target.value)}
            />
            <CustomTooltip
              content={
                <p>
                  Overrides your primary address for report delivery, keep it
                  blank if you want reports at primary email instead
                </p>
              }
              side="right"
              trigger={
                <InfoIcon
                  size={14}
                  className="text-primary/40 hover:text-primary/80 transition-all duration-300"
                />
              }
            />
          </>
        )}
      </div>
      {displaySave && (
        <button
          className="text-sm px-2 py-0.5 bg-blue-400 text-primary-foreground cursor-pointer hover:bg-blue-500 rounded-sm"
          onClick={() =>
            updateWeeklySetting({
              sendEmail: emailReportCheck,
              address: address,
            })
          }
        >
          Save
        </button>
      )}
    </div>
  );
}
