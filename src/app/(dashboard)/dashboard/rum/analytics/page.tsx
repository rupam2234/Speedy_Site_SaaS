import AnalyticsContextProvider from "./helpers/analytics.context";
import AnalyticsDashboard from "./helpers/analyticsDashboard";

export default function AnalyticsPage() {
  return (
    <AnalyticsContextProvider>
      <AnalyticsDashboard />
    </AnalyticsContextProvider>
  );
}
