"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Hourglass,
  Pencil,
  Trash,
} from "lucide-react";
import DashboardToolbar from "@/components/utils/toolbar";
import { useSiteContext } from "../siteContext";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { useRouter } from "next/navigation";

// interface CompletedStep {
//   id: string;
//   name: string;
//   timestamp: number;
// }

// interface Measure {
//   name: string;
//   entryType: string;
//   startTime: number;
//   duration: number;
// }

// interface JourneyResult {
//   sessionId: string;
//   pagePath: string;
//   status: string;
//   completedSteps: CompletedStep[];
//   totalDuration: number;
//   measure: Measure;
// }

interface AggregatedJourneyData {
  name: string;
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageDuration: number | null;
  successRate: string | null;
}

const formatDuration = (ms: number | null) => {
  if (ms === null || isNaN(ms)) return "--";
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
};

// const aggregateJourneyData = (
//   data: JourneyResult[],
//   names: string[]
// ): AggregatedJourneyData[] => {
//   const aggregatedMap = new Map<
//     string,
//     {
//       totalSessions: number;
//       successfulSessions: number;
//       failedSessions: number;
//       totalDurationSum: number;
//     }
//   >();

//   data.forEach((journey) => {
//     if (!aggregatedMap.has(journey.pagePath)) {
//       aggregatedMap.set(journey.pagePath, {
//         totalSessions: 0,
//         successfulSessions: 0,
//         failedSessions: 0,
//         totalDurationSum: 0,
//       });
//     }

//     const agg = aggregatedMap.get(journey.pagePath)!;
//     agg.totalSessions++;
//     agg.totalDurationSum += journey.totalDuration;

//     if (journey.status === "success") {
//       agg.successfulSessions++;
//     } else {
//       agg.failedSessions++;
//     }
//   });

//   return Array.from(aggregatedMap.entries()).map(([pagePath, agg], idx) => {
//     const avgDuration =
//       agg.totalSessions > 0 ? agg.totalDurationSum / agg.totalSessions : null;

//     const rate =
//       agg.totalSessions > 0
//         ? ((agg.successfulSessions / agg.totalSessions) * 100).toFixed(2) + "%"
//         : null;

//     return {
//       name: names[idx] || pagePath,
//       totalSessions: agg.totalSessions,
//       successfulSessions: agg.successfulSessions,
//       failedSessions: agg.failedSessions,
//       averageDuration: avgDuration,
//       successRate: rate,
//     };
//   });
// };

const AggregatedJourneyCard: React.FC<{
  journey: AggregatedJourneyData;
  selectedSite: string;
  journeyId: number;
}> = ({ journey, selectedSite, journeyId }) => {
  const route = useRouter();
  const rateValue = journey.successRate
    ? parseFloat(journey.successRate)
    : null;

  const successIcon =
    rateValue !== null && rateValue >= 70 ? (
      <TrendingUp className="text-teal-400 animate-pulse" size={14} />
    ) : rateValue !== null && rateValue < 40 ? (
      <TrendingDown className="text-coral-400 animate-pulse" size={14} />
    ) : (
      <BarChart2 className="text-amber-400 animate-pulse" size={14} />
    );

  const [confirmingEdit, setConfirmingEdit] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleEditConfirm = () => {
    setConfirmingEdit(false);
    const siteParam = encodeURIComponent(selectedSite); // your current site
    const journeyIdParam = encodeURIComponent(journeyId); // or journey.name or id

    route.push(
      `/dashboard/funnels/configure?site=${siteParam}&journeyId=${journeyIdParam}`
    );
  };

  const handleDeleteConfirm = () => {
    setConfirmingDelete(false);
    // Add delete logic here
    console.log("Delete:", journey.name);
  };

  return (
    <div className="relative bg-white dark:bg-secondary-background p-4 rounded border border-primary/10 dark:border-primary/10 transition-all duration-300 group">
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-900/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded pointer-events-none" />

      {/* Top-right icons and confirm buttons */}
      <div className="absolute top-5 right-3 flex flex-col gap-2 z-10 items-end">
        {confirmingEdit ? (
          <div className="flex gap-1 text-xs">
            <button
              onClick={handleEditConfirm}
              className="text-indigo-600 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmingEdit(false)}
              className="text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setConfirmingEdit(true);
              setConfirmingDelete(false);
            }}
            className="text-primary/20 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
          >
            <Pencil size={16} />
          </button>
        )}

        {confirmingDelete ? (
          <div className="flex gap-1 text-xs">
            <button
              onClick={handleDeleteConfirm}
              className="text-red-600 hover:underline"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setConfirmingDelete(true);
              setConfirmingEdit(false);
            }}
            className="text-primary/20 hover:text-red-500 dark:hover:text-red-400 transition"
          >
            <Trash size={16} />
          </button>
        )}
      </div>

      {/* Card Content */}
      <h3 className="relative text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mb-3 truncate">
        <Hourglass size={14} className="text-indigo-500 dark:text-indigo-400" />
        {journey.name}
      </h3>

      <div className="relative space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
        <p className="flex items-center gap-1">
          <BarChart2 size={12} className="text-gray-400 dark:text-gray-500" />
          Total:{" "}
          <span className="font-medium">{journey.totalSessions ?? "--"}</span>
        </p>
        <p className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-teal-400" />
          Success:{" "}
          <span className="font-medium text-teal-500 dark:text-teal-400">
            {journey.successfulSessions ?? "--"}
          </span>
        </p>
        <p className="flex items-center gap-1">
          <XCircle size={12} className="text-coral-400" />
          Failed:{" "}
          <span className="font-medium text-coral-500 dark:text-coral-400">
            {journey.failedSessions ?? "--"}
          </span>
        </p>
        <p className="flex items-center gap-1">
          {successIcon}
          Rate:{" "}
          <span className="font-medium text-indigo-500 dark:text-indigo-400">
            {journey.successRate ?? "--"}
          </span>
        </p>
        <p className="flex items-center gap-1">
          <Hourglass
            size={12}
            className="text-indigo-500 dark:text-indigo-400"
          />
          Avg:{" "}
          <span className="font-medium">
            {formatDuration(journey.averageDuration)}
          </span>
        </p>
      </div>
    </div>
  );
};

type journeyData = {
  name: string;
  id: number;
  created_at: string;
};

type JourneyConfig = {
  JourneyCount: number | null;
  journeyData: journeyData[];
};

export default function Journeys() {
  const [journeyConfig, setJourneyConfig] = useState<JourneyConfig | null>(
    null
  );
  const { selectedSite } = useSiteContext();

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        const res = await fetch("/api/journey/get-all", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain: selectedSite }),
        });

        if (!res.ok) throw new Error("Failed to fetch");

        const data: JourneyConfig = await res.json();
        if (data) {
          setJourneyConfig(data);
        }
      } catch (err) {
        console.error("Error loading journey data", err);
      }
    };

    if (selectedSite) fetchJourneys();
  }, [selectedSite]);

  if (!journeyConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <DashboardToolbar />
      <div className="min-h-screen p-5 transition-colors duration-300">
        <div className="w-full">
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {journeyConfig.journeyData.map((journey, index) => {
                const placeholderData: AggregatedJourneyData = {
                  name: journey.name,
                  totalSessions: 0,
                  successfulSessions: 0,
                  failedSessions: 0,
                  averageDuration: null,
                  successRate: null,
                };

                return (
                  <div
                    key={`${journey.name}-${index}`}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <AggregatedJourneyCard
                      journey={placeholderData}
                      selectedSite={selectedSite}
                      journeyId={journey.id}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
