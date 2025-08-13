"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Hourglass,
} from "lucide-react";
import DashboardToolbar from "@/components/utils/toolbar";

interface CompletedStep {
  id: string;
  name: string;
  timestamp: number;
}

interface Measure {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

interface JourneyData {
  sessionId: string;
  pagePath: string;
  status: string;
  completedSteps: CompletedStep[];
  totalDuration: number;
  measure: Measure;
}

interface AggregatedJourneyData {
  pagePath: string;
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageDuration: number;
  successRate: string;
}

const mockJourneyData: JourneyData[] = [
  {
    sessionId: "session-1",
    pagePath: "/dashboard/rum/cwv",
    status: "success",
    completedSteps: [{ id: "s1", name: "Step A", timestamp: 1000 }],
    totalDuration: 5000,
    measure: { name: "", entryType: "", startTime: 0, duration: 5000 },
  },
  {
    sessionId: "session-2",
    pagePath: "/dashboard/rum/cwv",
    status: "failed",
    completedSteps: [{ id: "s2", name: "Step A", timestamp: 1000 }],
    totalDuration: 6000,
    measure: { name: "", entryType: "", startTime: 0, duration: 6000 },
  },
  {
    sessionId: "session-3",
    pagePath: "/dashboard/rum/cwv",
    status: "success",
    completedSteps: [{ id: "s3", name: "Step A", timestamp: 1000 }],
    totalDuration: 5500,
    measure: { name: "", entryType: "", startTime: 0, duration: 5500 },
  },
  {
    sessionId: "session-9",
    pagePath: "/dashboard/rum/cwv",
    status: "success",
    completedSteps: [{ id: "s9", name: "Step A", timestamp: 1000 }],
    totalDuration: 4800,
    measure: { name: "", entryType: "", startTime: 0, duration: 4800 },
  },
  {
    sessionId: "session-4",
    pagePath: "/settings/profile",
    status: "success",
    completedSteps: [{ id: "s4", name: "Login", timestamp: 500 }],
    totalDuration: 3000,
    measure: { name: "", entryType: "", startTime: 0, duration: 3000 },
  },
  {
    sessionId: "session-5",
    pagePath: "/settings/profile",
    status: "failed",
    completedSteps: [{ id: "s5", name: "Login", timestamp: 500 }],
    totalDuration: 4000,
    measure: { name: "", entryType: "", startTime: 0, duration: 4000 },
  },
  {
    sessionId: "session-10",
    pagePath: "/settings/profile",
    status: "success",
    completedSteps: [{ id: "s10", name: "Login", timestamp: 500 }],
    totalDuration: 3500,
    measure: { name: "", entryType: "", startTime: 0, duration: 3500 },
  },
  {
    sessionId: "session-6",
    pagePath: "/product/detail/123",
    status: "success",
    completedSteps: [{ id: "s6", name: "View Product", timestamp: 200 }],
    totalDuration: 4500,
    measure: { name: "", entryType: "", startTime: 0, duration: 4500 },
  },
  {
    sessionId: "session-7",
    pagePath: "/product/detail/123",
    status: "success",
    completedSteps: [{ id: "s7", name: "View Product", timestamp: 200 }],
    totalDuration: 4800,
    measure: { name: "", entryType: "", startTime: 0, duration: 4800 },
  },
  {
    sessionId: "session-8",
    pagePath: "/product/detail/123",
    status: "failed",
    completedSteps: [{ id: "s8", name: "View Product", timestamp: 200 }],
    totalDuration: 4200,
    measure: { name: "", entryType: "", startTime: 0, duration: 4200 },
  },
  {
    sessionId: "session-11",
    pagePath: "/product/detail/123",
    status: "success",
    completedSteps: [{ id: "s11", name: "View Product", timestamp: 200 }],
    totalDuration: 5000,
    measure: { name: "", entryType: "", startTime: 0, duration: 5000 },
  },
];

const formatDuration = (ms: number) => {
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
};

const aggregateJourneyData = (data: JourneyData[]): AggregatedJourneyData[] => {
  const aggregatedMap = new Map<
    string,
    {
      totalSessions: number;
      successfulSessions: number;
      failedSessions: number;
      totalDurationSum: number;
    }
  >();

  data.forEach((journey) => {
    if (!aggregatedMap.has(journey.pagePath)) {
      aggregatedMap.set(journey.pagePath, {
        totalSessions: 0,
        successfulSessions: 0,
        failedSessions: 0,
        totalDurationSum: 0,
      });
    }
    const currentAggregate = aggregatedMap.get(journey.pagePath)!;
    currentAggregate.totalSessions++;
    currentAggregate.totalDurationSum += journey.totalDuration;
    if (journey.status === "success") {
      currentAggregate.successfulSessions++;
    } else {
      currentAggregate.failedSessions++;
    }
  });

  return Array.from(aggregatedMap.entries()).map(([pagePath, aggregate]) => {
    const averageDuration =
      aggregate.totalSessions > 0
        ? aggregate.totalDurationSum / aggregate.totalSessions
        : 0;
    const successRate =
      aggregate.totalSessions > 0
        ? (
            (aggregate.successfulSessions / aggregate.totalSessions) *
            100
          ).toFixed(2) + "%"
        : "N/A";
    return {
      pagePath,
      totalSessions: aggregate.totalSessions,
      successfulSessions: aggregate.successfulSessions,
      failedSessions: aggregate.failedSessions,
      averageDuration,
      successRate,
    };
  });
};

const AggregatedJourneyCard: React.FC<{ journey: AggregatedJourneyData }> = ({
  journey,
}) => {
  const successRateValue = parseFloat(journey.successRate);
  const successIcon =
    successRateValue >= 70 ? (
      <TrendingUp className="text-teal-400 animate-pulse" size={14} />
    ) : successRateValue < 40 ? (
      <TrendingDown className="text-coral-400 animate-pulse" size={14} />
    ) : (
      <BarChart2 className="text-amber-400 animate-pulse" size={14} />
    );

  return (
    <div className="relative bg-white dark:bg-secondary-background p-4 rounded border border-primary/10 dark:border-primary/10 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
      <div className="absolute inset-0 bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-900/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded"></div>
      <h3 className="relative text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mb-3 truncate">
        <Hourglass size={14} className="text-indigo-500 dark:text-indigo-400" />
        {journey.pagePath}
      </h3>
      <div className="relative space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
        <p className="flex items-center gap-1">
          <BarChart2 size={12} className="text-gray-400 dark:text-gray-500" />
          Total: <span className="font-medium">{journey.totalSessions}</span>
        </p>
        <p className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-teal-400" />
          Success:{" "}
          <span className="font-medium text-teal-500 dark:text-teal-400">
            {journey.successfulSessions}
          </span>
        </p>
        <p className="flex items-center gap-1">
          <XCircle size={12} className="text-coral-400" />
          Failed:{" "}
          <span className="font-medium text-coral-500 dark:text-coral-400">
            {journey.failedSessions}
          </span>
        </p>
        <p className="flex items-center gap-1">
          {successIcon}
          Rate:{" "}
          <span className="font-medium text-indigo-500 dark:text-indigo-400">
            {journey.successRate}
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

export default function Journeys() {
  const aggregatedJourneys = aggregateJourneyData(mockJourneyData);

  return (
    <>
      <DashboardToolbar />
      <div className={`min-h-screen p-5 transition-colors duration-300`}>
        <div className="w-full">
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aggregatedJourneys.map((journey, index) => (
                <div
                  key={journey.pagePath}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <AggregatedJourneyCard journey={journey} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
