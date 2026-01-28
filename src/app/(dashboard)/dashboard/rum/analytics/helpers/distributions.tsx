// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";
// import React from "react";

// interface WebVitalsBarProps {
//   metricName: string;
//   goodPercent: number;
//   needsImprovementPercent: number;
//   poorPercent: number;
//   minValue: number;
//   maxValue: number;
//   percentileValue?: number;
//   percentileLabel?: string;
// }

// const WebVitalsBar: React.FC<WebVitalsBarProps> = ({
//   goodPercent,
//   needsImprovementPercent,
//   poorPercent,
// }) => {
//   const total = goodPercent + needsImprovementPercent + poorPercent;

//   const normalized =
//     total !== 100 && total > 0
//       ? {
//           good: (goodPercent / total) * 100,
//           okay: (needsImprovementPercent / total) * 100,
//           bad: (poorPercent / total) * 100,
//         }
//       : {
//           good: goodPercent,
//           okay: needsImprovementPercent,
//           bad: poorPercent,
//         };

//   const sections = [
//     {
//       label: "good",
//       value: goodPercent,
//       width: normalized.good,
//       color: "#66cc8f",
//     },
//     {
//       label: "okay",
//       value: needsImprovementPercent,
//       width: normalized.okay,
//       color: "#FFEEA9",
//     },
//     {
//       label: "poor",
//       value: poorPercent,
//       width: normalized.bad,
//       color: "#FF9898",
//     },
//   ];

//   // Calculate marker position (as % from left) only if valid
//   // const markerLeftPercent =
//   //   typeof percentileValue === "number" &&
//   //   maxValue > minValue &&
//   //   percentileValue >= minValue &&
//   //   percentileValue <= maxValue
//   //     ? ((percentileValue - minValue) / (maxValue - minValue)) * 100
//   //     : null;

//   return (
//     <div className="w-full mt-3 h-4 relative flex overflow-visible bg-neutral-200 rounded">
//       {/* Colored segments */}
//       {sections.map((section, index) => (
//         <Tooltip key={index}>
//           <TooltipTrigger asChild>
//             <div
//               className="h-full group relative transition-all duration-200 ease-in-out cursor-help"
//               style={{ width: `${section.width}%` }}
//             >
//               <div
//                 className="h-full w-full transition-transform duration-200 ease-in-out group-hover:scale-y-[1.10] group-hover:shadow-md"
//                 style={{ backgroundColor: section.color }}
//               />
//             </div>
//           </TooltipTrigger>
//           <TooltipContent side="top">
//             <span>
//               {section.value.toFixed(1)}% of users had a {section.label}{" "}
//               experience
//             </span>
//           </TooltipContent>
//         </Tooltip>
//       ))}

//       {/* Optional percentile marker */}
//       {/* {markerLeftPercent !== null && (
//         <Tooltip>
//           <TooltipTrigger asChild>
//             <div
//               className="absolute top-0 bottom-0 w-[3px] cursor-pointer bg-primary/70 rounded-full hover:bg-primary/50 transition-colors duration-200"
//               style={{
//                 left: `${markerLeftPercent}%`,
//                 transform: "translateX(-50%)",
//                 transition: "left 0.3s ease",
//               }}
//               tabIndex={0} // makes it keyboard focusable
//               aria-label={`${percentileLabel}: ${percentileValue}`}
//             />
//           </TooltipTrigger>
//           <TooltipContent side="top">
//             <span>
//               {percentileLabel}: {percentileValue}
//             </span>
//           </TooltipContent>
//         </Tooltip>
//       )} */}
//     </div>
//   );
// };

// export default WebVitalsBar;
