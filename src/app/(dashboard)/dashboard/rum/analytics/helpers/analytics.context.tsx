"use client";

import { createContext, ReactNode, useContext, useState, useMemo } from "react";

type AnalyticsContextType = {
  selectedGeoType: "Visitors" | "By Countries" | "User Happiness";
  setSelectedGeoType: (
    selectedGeoType: "Visitors" | "By Countries" | "User Happiness"
  ) => void;
  selectedDate:
    | "yesterday"
    | "last7days"
    | "30days"
    | "thisMonth"
    | "lastMonth"
    | "last6Months"
    | "year"
    | "today"
    | "thisYear";
  setSelectedDate: (
    selectedDate:
      | "yesterday"
      | "last7days"
      | "30days"
      | "thisMonth"
      | "lastMonth"
      | "last6Months"
      | "year"
      | "today"
      | "thisYear"
  ) => void;
};

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export default function AnalyticsContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedGeoType, setSelectedGeoType] = useState<
    "Visitors" | "By Countries" | "User Happiness"
  >("Visitors");
  const [selectedDate, setSelectedDate] = useState<
    | "yesterday"
    | "last7days"
    | "30days"
    | "thisMonth"
    | "lastMonth"
    | "last6Months"
    | "year"
    | "today"
    | "thisYear"
  >("30days");

  const contextValue = useMemo(
    () => ({
      selectedGeoType,
      setSelectedGeoType,
      selectedDate,
      setSelectedDate,
    }),
    [selectedGeoType, selectedDate]
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export const useAnalyticsContext = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error(
      "useAnalyticsContext must be used within <AnalyticsContextProvider>"
    );
  }
  return context;
};
