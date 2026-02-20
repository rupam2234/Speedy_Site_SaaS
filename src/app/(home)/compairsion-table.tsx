import { Check, X } from "lucide-react";

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
    { itemName: "Element Debugging", GSC: { status: false }, SpeedySite: true },
    { itemName: "TTFB Monitoring", GSC: { status: false }, SpeedySite: true },
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
    { itemName: "LLM Analytics", GSC: { status: false }, SpeedySite: true },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-indigo-100 uppercase text-[10px] tracking-[0.2em] font-bold">
            <th className="px-6 py-6 font-medium">Platform Features</th>
            <th className="px-6 py-6 font-medium text-center">
              Google Search Console
            </th>
            <th className="px-6 py-6 font-medium text-center bg-white/5 rounded-t-2xl border-x border-t border-white/10">
              Speedy Site
            </th>
          </tr>
        </thead>
        <tbody className="text-white/90">
          {tableData.map((x, idx) => (
            <tr
              key={x.itemName}
              className="group border-b border-white/5 hover:bg-white/2 transition-colors"
            >
              {/* Feature Name */}
              <td className="px-6 py-5">
                <span className="font-semibold text-sm md:text-base group-hover:text-white transition-colors">
                  {x.itemName}
                </span>
              </td>

              {/* GSC Column */}
              <td className="px-6 py-5 text-center">
                <div className="flex flex-col items-center justify-center gap-1">
                  {x.GSC.status === false ? (
                    <X size={20} className="text-white" strokeWidth={1.5} />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Check
                        size={20}
                        className="text-indigo-100"
                        strokeWidth={3}
                      />
                      {x.GSC.comment && (
                        <span className="text-[12px] font-mono text-white bg-indigo-500/10 px-2 py-0.5 rounded">
                          {x.GSC.comment}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </td>

              {/* Speedy Site Column (The Highlighted Winner) */}
              <td className="px-6 py-5 text-center bg-white/5 border-x border-white/10 last:rounded-b-2xl">
                <div className="flex justify-center">
                  <div className="bg-emerald-500/20 p-1.5 rounded-full ring-4 ring-emerald-500/10">
                    <Check
                      size={18}
                      className="text-emerald-400"
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td />
            {/* This ensures the highlighted column shadow/border looks complete */}
            <td className="h-4 bg-white/5 rounded-b-2xl border-x border-b border-white/10" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
