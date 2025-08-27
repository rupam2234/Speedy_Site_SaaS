// import { Button } from "@/components/ui/button";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";
// import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
// import TimingPieChart from "../charts/docTimingChart";
// import LCPPieChart from "../charts/lcpTimingChart";
// import PageTimingChart from "../charts/pageTimingChart";

interface TimingProps {
  pageData: any;
}

// const TimingType = [
//   {
//     key: "Document Timing",
//     tooltip:
//       "Breakdown of how the main HTML document loads, from request to render.",
//   },
//   {
//     key: "Page Timing",
//     tooltip:
//       "Overall page load metrics including front-end, back-end, and total load time.",
//   },
//   {
//     key: "LCP Timing",
//     tooltip:
//       "Detailed view of the Largest Contentful Paint (LCP) timing phases and resource types.",
//   },
// ];

export default function Timings({}: TimingProps) {
  // const { activeTimingMetric, setActiveTimingMetric } = useSiteContext();

  // function handleActiveAsset(
  //   key: "Document Timing" | "Page Timing" | "LCP Timing"
  // ) {
  //   // setActiveTimingMetric(key);
  // }

  return (
    <div className="p-4 h-max">
      {/* <div className="grid md:grid-cols-12 gap-3 grid-cols-1">
        <div className="col-span-1 md:col-span-9 mt-3">
          {activeTimingMetric === "Document Timing" ? (
            <TimingPieChart
              pageData={pageData}
              activeModule={activeTimingMetric}
            />
          ) : activeTimingMetric === "LCP Timing" ? (
            <LCPPieChart
              pageData={pageData}
              activeModule={activeTimingMetric}
            />
          ) : activeTimingMetric === "Page Timing" ? (
            <PageTimingChart
              pageData={pageData}
              activeModule={activeTimingMetric}
            />
          ) : (
            <></>
          )}
        </div>
        <div className="col-span-1 md:col-span-3">
          {TimingType.map((x: any) => (
            <Tooltip key={x.key}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleActiveAsset(x.key)}
                  className={`p-4 cursor-pointer mt-3 shadow-none hover:dark:bg-transparent dark:bg-secondary ${
                    activeTimingMetric === x.key
                      ? "dark:bg-transparent bg-transparent"
                      : "bg-gray-500/10"
                  }  hover:bg-transparent text-primary rounded-[2px] min-w-full`}
                >
                  {x.key}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{x.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div> */}
    </div>
  );
}
