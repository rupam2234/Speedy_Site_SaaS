import { createContext, useContext, useState, ReactNode } from "react";

interface WebVitalContextType {
  startDate?: Date;
  endDate?: Date;
  setStartDate: (d?: Date) => void;
  setEndDate: (d?: Date) => void;
}

const WebVitalContext = createContext<WebVitalContextType | undefined>(
  undefined,
);

export const useWebVitalContext = () => {
  const ctx = useContext(WebVitalContext);
  if (!ctx)
    throw new Error(
      "useWebVitalContext must be used inside WebVitalContextProvider",
    );
  return ctx;
};

export function WebVitalContextProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  return (
    <WebVitalContext.Provider
      value={{ startDate, endDate, setStartDate, setEndDate }}
    >
      {children}
    </WebVitalContext.Provider>
  );
}
