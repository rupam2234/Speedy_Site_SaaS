"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../siteContext";
import { CustomTooltip } from "@/components/theme";
import { cachedData } from "@/components/utils";
import { ReportVerbosity, ReportVerbosityTypes, SaveStates } from "./types";
import { OrderData } from "@/app/api";
import {
  EmailReportingEntry,
  EmailReportingUpdate,
} from "@/app/api/helpers/dataTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MailingEntry {
  emailAddress: string;
  verbosity: ReportVerbosityTypes;
}

export default function EmailReporting() {
  const { selectedSite } = useSiteContext();

  const [mailingList, setMailingList] = useState<MailingEntry[]>([
    {
      emailAddress: "",
      verbosity: { summary: false, analytics: false, raw_data: false },
    },
  ]);
  const [displaySave, setSaveButton] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [saveState, setStates] = useState<SaveStates>(SaveStates.ready);

  // Keeps track of the deep stringified state from the API to evaluate changes cleanly
  const originalSnapshot = useRef<string>("");

  useEffect(() => {
    if (!selectedSite) return;

    const cachedOrders = sessionStorage.getItem("orders");
    let activeOrderId: string | null = null;

    if (cachedOrders) {
      const parsedOrders: OrderData[] = JSON.parse(cachedOrders);
      const matchedOrder = parsedOrders.find(
        (x) => x.website_name === selectedSite,
      );
      if (matchedOrder) {
        activeOrderId = matchedOrder.order_id!;
      }
    }

    const cachedEmailObj = async () => {
      if (activeOrderId === null) return;

      setLoading(true);

      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch(
            `/api/mailing/weekly-reports?order_id=${activeOrderId}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            },
          );

          if (!res.ok) {
            console.error("Error fetching weekly report settings");
            return null;
          }
          const parsed: { data?: EmailReportingEntry[] } = await readJson(res);
          return parsed?.data ?? [];
        },
        key: `weekly-report-settings:${selectedSite}`,
        session_Storage: true,
        ttl: 5 * 60 * 1000,
        useCache: true,
      });

      if (!response) {
        setLoading(false);
        return;
      }

      const reportChecking = (verbosity: number, n: number) => {
        return Boolean(verbosity & n);
      };

      // Normalize single API object or multiple array values into UI state array structure
      let parsedEntries: MailingEntry[] = [];
      if (Array.isArray(response)) {
        parsedEntries = response.map(
          ({ report_verbosity, optional_email }) => ({
            emailAddress: optional_email || "",
            verbosity: {
              summary: reportChecking(
                report_verbosity,
                ReportVerbosity.summary,
              ),
              analytics: reportChecking(
                report_verbosity,
                ReportVerbosity.analytics,
              ),
              raw_data: reportChecking(
                report_verbosity,
                ReportVerbosity.raw_data,
              ),
            },
          }),
        );
      }

      if (parsedEntries.length === 0) {
        parsedEntries = [
          {
            emailAddress: "",
            verbosity: {
              summary: false,
              analytics: false,
              raw_data: false,
            },
          },
        ];
      }

      setMailingList(parsedEntries);
      originalSnapshot.current = JSON.stringify(parsedEntries);
      setLoading(false);
    };

    cachedEmailObj();
  }, [selectedSite]);

  // Dirty state checking via deep evaluation
  useEffect(() => {
    const currentSnapshot = JSON.stringify(mailingList);
    setSaveButton(currentSnapshot !== originalSnapshot.current);
  }, [mailingList]);

  useEffect(() => {
    if (saveState !== SaveStates.success && saveState !== SaveStates.failed) {
      return;
    }

    const timer = setTimeout(() => {
      setStates(SaveStates.ready);
    }, 5000);

    return () => clearTimeout(timer);
  }, [saveState]);

  const addRow = () => {
    setMailingList((prev) => [
      ...prev,
      {
        emailAddress: "",
        verbosity: { summary: true, analytics: false, raw_data: false },
      },
    ]);
  };

  const removeRow = (index: number) => {
    setMailingList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, val: string) => {
    setMailingList((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, emailAddress: val } : item,
      ),
    );
  };

  const updateVerbosity = (
    index: number,
    type: keyof ReportVerbosityTypes,
    val: boolean,
  ) => {
    setMailingList((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              verbosity: { ...item.verbosity, [type]: val },
            }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            Report recipients
          </h4>
          <p className="text-xs text-muted-foreground">
            Add one or more addresses and choose what each report should
            include. Leave an address blank to use your primary account email.
          </p>
        </div>
        {!loading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="shrink-0"
          >
            Add Email
          </Button>
        )}
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : mailingList.length === 0 ? (
        <div className="rounded-sm border border-dashed p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No recipients configured
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add an email address to start receiving weekly reports.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mailingList.map(({ emailAddress, verbosity }, index) => (
            <div key={index} className="rounded-sm border bg-muted/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1 space-y-1.5">
                  <CustomTooltip
                    content={
                      <p>
                        Overrides your primary address for report delivery. Keep
                        it blank if you want reports at the primary email instead.
                      </p>
                    }
                    side="right"
                    trigger={
                      <Label
                        htmlFor={`weekly-report-email-${index}`}
                        className="text-muted-foreground"
                      >
                        Email address
                      </Label>
                    }
                  />
                  <Input
                    id={`weekly-report-email-${index}`}
                    type="email"
                    value={emailAddress}
                    className="max-w-sm"
                    placeholder="name@example.com"
                    onChange={(e) => updateEmail(index, e.target.value)}
                  />
                </div>

                {mailingList.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                    className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:gap-6">
                <span className="text-xs font-medium text-muted-foreground sm:w-28">
                  Report includes
                </span>
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`weekly-report-summary-${index}`}
                      checked={verbosity.summary}
                      onCheckedChange={(checked) =>
                        updateVerbosity(index, "summary", checked === true)
                      }
                    />
                    <Label
                      htmlFor={`weekly-report-summary-${index}`}
                      className="cursor-pointer"
                    >
                      Summary
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`weekly-report-analytics-${index}`}
                      checked={verbosity.analytics}
                      onCheckedChange={(checked) =>
                        updateVerbosity(index, "analytics", checked === true)
                      }
                    />
                    <Label
                      htmlFor={`weekly-report-analytics-${index}`}
                      className="cursor-pointer"
                    >
                      Analytics
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`weekly-report-raw-${index}`}
                      checked={verbosity.raw_data}
                      onCheckedChange={(checked) =>
                        updateVerbosity(index, "raw_data", checked === true)
                      }
                    />
                    <Label
                      htmlFor={`weekly-report-raw-${index}`}
                      className="cursor-pointer"
                    >
                      Raw Data
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {displaySave && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button
            size="sm"
            onClick={() =>
              saveWeeklySettings({
                mailing_list: mailingList,
                site: selectedSite,
                saving: setStates,
              })
            }
            disabled={saveState === SaveStates.saving}
          >
            {saveState === SaveStates.saving
              ? "Saving..."
              : "Save configuration"}
          </Button>

          {saveState === SaveStates.success && (
            <span className="text-xs font-medium text-green-600 dark:text-green-500">
              Settings saved successfully
            </span>
          )}

          {saveState === SaveStates.failed && (
            <span className="text-xs font-medium text-destructive">
              Failed to save settings
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-3">
      <div className="rounded-sm border bg-muted/40 p-4 animate-pulse">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-2 h-9 w-full max-w-sm rounded-md bg-muted" />
        <div className="mt-4 flex flex-wrap items-center gap-5 border-t pt-4">
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

async function saveWeeklySettings({
  mailing_list,
  site,
  saving,
}: {
  mailing_list: {
    emailAddress: string;
    verbosity: ReportVerbosityTypes;
  }[];
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

    const payload: EmailReportingUpdate = {
      entries: mailing_list
        .map(({ emailAddress, verbosity }) => {
          const verbosityNumber =
            (verbosity.summary ? ReportVerbosity.summary : 0) |
            (verbosity.analytics ? ReportVerbosity.analytics : 0) |
            (verbosity.raw_data ? ReportVerbosity.raw_data : 0);
          return {
            report_verbosity: verbosityNumber,
            optional_email: emailAddress as string,
          };
        })
        .filter(({ report_verbosity }) => {
          return report_verbosity !== 0;
        }),
      order_id: orderId,
    };

    try {
      const res = await fetch(`/api/mailing/weekly-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body: any = await readJson(res);

      if (!res.ok) {
        saving(SaveStates.failed);
        throw new Error(body?.message ?? "Failed to save settings");
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
/**
 * Reads a fetch response as JSON without throwing when the body is not JSON.
 * A crashed handler answers with plain text ("Internal Server Error"), which
 * otherwise surfaces as a raw "Unexpected token" error.
 */
async function readJson(res: Response): Promise<any> {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
