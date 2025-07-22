interface DashboardProps {
  siteId: string;
}

export default function RumDashboard({ siteId }: DashboardProps) {
  return <>RUM DASHBOARD for {siteId}</>;
}
