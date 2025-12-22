import { Check } from "lucide-react";

interface TableData {
  itemName: string;
  GSC: { status: boolean; comment?: string };
  SpeedySite: boolean;
}

export default function ComparisonTable() {
  const tableData: TableData[] = [
    {
      itemName: "Real-Time User Experience",
      GSC: { status: false },
      SpeedySite: true,
    },
    {
      itemName: "Daily Core Web Vitals",
      GSC: { status: false },
      SpeedySite: true,
    },
    {
      itemName: "Problematic Page Groups",
      GSC: { status: true, comment: "Sample Pages Only" },
      SpeedySite: true,
    },
    {
      itemName: "Element Debugging",
      GSC: { status: false },
      SpeedySite: true,
    },
    {
      itemName: "TTFB Monitoring",
      GSC: { status: false },
      SpeedySite: true,
    },
    {
      itemName: "Automated LCP Image Detection",
      GSC: { status: false },
      SpeedySite: true,
    },
    {
      itemName: "Weekly Performance Overview & Alerts",
      GSC: { status: false },
      SpeedySite: true,
    },
    {
      itemName: "LLM Analytics",
      GSC: { status: false },
      SpeedySite: true,
    },
  ];

  return (
    <table className="w-full text-left overflow-hidden rounded-sm border [&_td]:border [&_td]:border-primary py-5 [&_th]:p-4 [&_th]:border-r [&_th]:border-primary/20 [&_t] [&_td]:p-4">
      <thead className="bg-gray-500">
        <tr className="text-sm">
          <th className="px-6">Features</th>
          <th>Google Search Console</th>
          <th>Speedy Site</th>
        </tr>
      </thead>
      <tbody className="py-4 bg-secondary-background">
        {tableData.map((x) => (
          <tr key={x.itemName}>
            <td className="px-6">{x.itemName}</td>
            <td>
              {x.GSC.status === false ? (
                <span className="text-red-500">X</span>
              ) : (
                <span className="flex gap-2 text-green-500 items-center">
                  <Check size={18} />
                  {x.GSC.comment ? x.GSC.comment : ""}
                </span>
              )}
            </td>
            <td>
              {x.SpeedySite === false ? (
                <span className="text-red-500">X</span>
              ) : (
                <Check size={18} className="text-green-500" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
