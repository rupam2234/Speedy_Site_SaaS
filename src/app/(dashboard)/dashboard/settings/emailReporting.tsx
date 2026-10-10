"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../siteContext";
import { CustomTooltip } from "@/components/theme";
import { InfoIcon, Plus, Trash2 } from "lucide-react";
import { cachedData } from "@/components/utils";
import { ReportVerbosity, ReportVerbosityTypes, SaveStates } from "./types";
import { OrderData } from "@/app/api";
import {
    EmailReportingEntry,
    EmailReportingUpdate,
} from "@/app/api/helpers/dataTypes";

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
                    const { data }: { data: EmailReportingEntry[] } =
                        await res.json();
                    return data;
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
        if (
            saveState !== SaveStates.success &&
            saveState !== SaveStates.failed
        ) {
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
        <div className="space-y-4 text-sm text-primary/80 border-x border-b border-primary/10 p-4">
            <div className="flex items-center justify-between">
                <p className="font-semibold">
                    Configure your weekly report preference:
                </p>
                {!loading && (
                    <button
                        type="button"
                        onClick={addRow}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/5 hover:bg-primary/10 rounded-sm border border-primary/10 transition-colors cursor-pointer"
                    >
                        <Plus size={14} /> Add Email
                    </button>
                )}
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : (
                <div className="space-y-4 division-y division-primary/5">
                    {mailingList.map(({ emailAddress, verbosity }, index) => (
                        <div
                            key={index}
                            className="flex flex-col gap-3 p-3 bg-primary/2 border border-primary/5 rounded-sm relative"
                        >
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                                <p className="min-w-24">Report to email</p>
                                <input
                                    type="text"
                                    value={emailAddress}
                                    className="min-w-55 px-2 py-0.5 border border-primary/10 rounded-sm bg-background text-foreground"
                                    placeholder="email address"
                                    onChange={(e) =>
                                        updateEmail(index, e.target.value)
                                    }
                                />
                                <CustomTooltip
                                    content={
                                        <p>
                                            Overrides your primary address for
                                            report delivery. Keep it blank if
                                            you want reports at the primary
                                            email instead.
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
                                {mailingList.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeRow(index)}
                                        className="md:ml-auto text-red-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                        title="Remove configuration"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-6 pl-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={verbosity.summary}
                                        onChange={(e) =>
                                            updateVerbosity(
                                                index,
                                                "summary",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <span>Summary</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={verbosity.analytics}
                                        onChange={(e) =>
                                            updateVerbosity(
                                                index,
                                                "analytics",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <span>Analytics</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={verbosity.raw_data}
                                        onChange={(e) =>
                                            updateVerbosity(
                                                index,
                                                "raw_data",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <span>Raw Data</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {displaySave && (
                <div className="flex items-center gap-2 pt-2">
                    <button
                        className="text-sm px-3 py-1 bg-blue-400 text-white font-medium cursor-pointer hover:bg-blue-500 rounded-sm disabled:opacity-50 transition-colors"
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
                            : "Save Configuration"}
                    </button>
                    <div className="font-medium">
                        {saveState === SaveStates.success ? (
                            <span className="text-green-500">
                                Settings saved successfully
                            </span>
                        ) : saveState === SaveStates.failed ? (
                            <span className="text-red-500">
                                Failed to save settings
                            </span>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}

function SkeletonLoader() {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 p-3 border border-primary/5 rounded-sm animate-pulse">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                    <div className="h-4 w-24 bg-gray-300 dark:bg-zinc-700 rounded" />
                    <div className="h-7 w-55 bg-gray-300 dark:bg-zinc-700 rounded-sm" />
                    <div className="w-3.5 h-3.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
                </div>
                <div className="flex items-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-gray-300 dark:bg-zinc-700 rounded-[2px]" />
                        <div className="h-4 w-14 bg-gray-300 dark:bg-zinc-700 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-gray-300 dark:bg-zinc-700 rounded-[2px]" />
                        <div className="h-4 w-16 bg-gray-300 dark:bg-zinc-700 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-gray-300 dark:bg-zinc-700 rounded-[2px]" />
                        <div className="h-4 w-16 bg-gray-300 dark:bg-zinc-700 rounded" />
                    </div>
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
