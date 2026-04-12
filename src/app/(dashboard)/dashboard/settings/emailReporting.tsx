"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../siteContext";
import { CustomTooltip } from "@/components/theme";
import { InfoIcon } from "lucide-react";
import { OrderData } from "@/app/api/dataTypes";
import { cachedData } from "@/components/utils";
import {
  OriginalRefs,
  ReportVerbosty,
  ReportVerbostyTypes,
  SaveStates,
} from "./types";
import { EmailReporting as EmailConfigData } from "@/app/api/dataTypes";

export default function EmailReporting() {
  const { selectedSite } = useSiteContext();

  const [emailAddress, setEmailAddress] = useState<string>("");
  const [displaySave, setSaveButton] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<boolean>(false);
  const [summary, setSummary] = useState<boolean>(true);
  const [raw_data, setRawData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  // const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [saveState, setStates] = useState<SaveStates>(SaveStates.ready); // message from saving the email settings

  const originalRefs = useRef<OriginalRefs>({
    address: "",
    analytics: false,
    raw_data: false,
    summary: false,
  });

  useEffect(() => {
    if (!selectedSite) return;

    const cachedOrders = sessionStorage.getItem("orders");
    let activeOrderId: string | null = null;

    if (cachedOrders) {
      const parsedOrders: OrderData[] = JSON.parse(cachedOrders);

      activeOrderId = parsedOrders.filter(
        (x) => x.website_name === selectedSite,
      )[0].order_id!;
    }

    const cachedEmailObj = async () => {
      if (activeOrderId === null) return;

      setLoading(true);

      // TODO: implement multiple email sending with unique verbosity each
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/reports/get", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ order_id: activeOrderId }),
          });

          let body: any;

          if (!res.ok) {
            console.error("Error fetching weekly report settings");
            return null;
          } else {
            body = await res.json();
          }

          return body.data;
        },
        key: `weekly-report-settings:${selectedSite}`,
        session_Storage: true,
        ttl: 5 * 60 * 1000,
        useCache: true, // for debugging
      });

      if (!response) {
        setLoading(false);
        return;
      }

      const reportChecking = (verbosity: number, n: number) => {
        return Boolean(verbosity & n);
      };

      setEmailAddress(response.optional_email);
      setSummary(
        reportChecking(response.report_verbosity, ReportVerbosty.summary),
      );
      setAnalytics(
        reportChecking(response.report_verbosity, ReportVerbosty.analytics),
      );
      setRawData(
        reportChecking(response.report_verbosity, ReportVerbosty.raw_data),
      );

      // also save as original data for check later
      originalRefs.current.address = response.optional_email;
      originalRefs.current.summary = reportChecking(
        response.report_verbosity,
        ReportVerbosty.summary,
      );
      originalRefs.current.analytics = reportChecking(
        response.report_verbosity,
        ReportVerbosty.analytics,
      );
      originalRefs.current.raw_data = reportChecking(
        response.report_verbosity,
        ReportVerbosty.raw_data,
      );

      setLoading(false);
    };

    cachedEmailObj();
  }, [selectedSite]);

  useEffect(() => {
    const isChanged =
      originalRefs.current.address !== emailAddress ||
      originalRefs.current.analytics !== analytics ||
      originalRefs.current.raw_data !== raw_data ||
      originalRefs.current.summary !== summary;

    setSaveButton(isChanged);
  }, [emailAddress, analytics, summary, raw_data]);

  useEffect(() => {
    if (saveState !== SaveStates.success && saveState !== SaveStates.failed) {
      return;
    }

    const timer = setTimeout(() => {
      setStates(SaveStates.ready);
    }, 5000);

    return () => clearTimeout(timer);
  }, [saveState]);

  return (
    <div className="space-y-3 text-sm text-primary/80 border-x border-b border-primary/10 p-4">
      <p className="font-semibold">Configure your weekly report preference:</p>
      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
            {/* <input
              type="checkbox"
              checked={emailReportCheck !== null ? emailReportCheck : false}
              onChange={(e) => setEmailReportCheck(e.target.checked)}
            /> */}
            <p>Report to email</p>
            <input
              type="text"
              value={emailAddress ?? ""}
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
          </div>
          <div className="flex items-center justify-between gap-20">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={summary}
                onChange={(e) => setSummary(e.target.checked)}
              />{" "}
              <p>Summary</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />{" "}
              <p>Analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={raw_data}
                onChange={(e) => setRawData(e.target.checked)}
              />{" "}
              <p>Raw Data</p>
            </div>
          </div>
        </>
      )}

      {displaySave && (
        <div className="flex items-center gap-2">
          <button
            className={`text-sm px-2 py-0.5 bg-blue-400 text-primary-foreground cursor-pointer hover:bg-blue-500 rounded-sm`}
            onClick={() =>
              saveWeeklySettings({
                emailAddress,
                verbosity: { analytics, raw_data, summary },
                site: selectedSite,
                saving: setStates,
              })
            }
            disabled={saveState === SaveStates.saving}
          >
            {saveState === SaveStates.saving ? "Saving..." : "Save"}
          </button>
          <div className="font-medium">
            {saveState === SaveStates.success ? (
              <span className="text-green-500">Settings saved</span>
            ) : saveState === SaveStates.failed ? (
              <span className="text-red-500">Failed to save settings</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 animate-pulse">
        {/* Checkbox */}
        <div className="w-3.5 h-3.5 bg-gray-300 rounded-[2px]" />

        {/* Label */}
        <div className="h-4 w-27.5 bg-gray-300 rounded" />

        {/* Email input (only shows when checked in real UI, but keep subtle + exact) */}
        <div className="h-7 w-55 bg-gray-300 rounded-sm" />

        {/* Tooltip icon */}
        <div className="w-3.5 h-3.5 bg-gray-300 rounded-full" />
      </div>
      {/* TODO: implement multiple email sending with unique verbosity each */}
      <div className="flex items-center justify-between gap-20 mt-2 animate-pulse">
        {/* Summary */}
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-300 rounded-[2px]" />
          <div className="h-4 w-15 bg-gray-300 rounded" />
        </div>

        {/* Analytics */}
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-300 rounded-[2px]" />
          <div className="h-4 w-17.5 bg-gray-300 rounded" />
        </div>

        {/* Raw Data */}
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-300 rounded-[2px]" />
          <div className="h-4 w-16.25 bg-gray-300 rounded" />
        </div>
      </div>
    </>
  );
}

// TODO: implement multiple email sending with unique verbosity each
async function saveWeeklySettings({
  emailAddress,
  verbosity,
  site,
  saving,
}: {
  emailAddress: string;
  verbosity: ReportVerbostyTypes;
  site: string;
  saving: (b: SaveStates) => any;
}) {
  saving(SaveStates.saving);
  const cachedOrders = sessionStorage.getItem("orders");
  if (cachedOrders) {
    const parsedData: OrderData[] = JSON.parse(cachedOrders);

    const orderId = parsedData.filter((x) => x.website_name === site)[0]
      .order_id;

    if (!orderId) {
      return; // ***
    }

    const verbosityNumber =
      (verbosity.summary ? ReportVerbosty.summary : 0) |
      (verbosity.analytics ? ReportVerbosty.analytics : 0) |
      (verbosity.raw_data ? ReportVerbosty.raw_data : 0);

    const newEmailReportSetting: EmailConfigData = {
      order_id: orderId,
      report_verbosity: verbosityNumber,
      optional_email: emailAddress ? emailAddress : "null",
    };

    try {
      const res = await fetch("/api/reports/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(newEmailReportSetting),
      });

      const body: any = await res.json();

      if (!res.ok) {
        saving(SaveStates.failed);
        throw new Error(body.message);
      }

      // clear cache
      sessionStorage.removeItem(`weekly-report-settings:${site}`);
      saving(SaveStates.success);
    } catch (error: any) {
      saving(SaveStates.failed);
      console.error(error.message ?? "Error saving email configurations");
    }
  }
}
