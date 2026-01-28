// "use client";

// import React, { useState } from "react";

// type TrafficEntry = {
//   device_type: "desktop" | "mobile" | "tablet" | "all";
//   country_distribution: string;
// };

// type Props = {
//   deviceType?: "desktop" | "mobile" | "tablet" | "all";
//   trafficData: TrafficEntry[];
// };

// const ITEMS_PER_PAGE = 9;

// export default function GeoDistBars({
//   deviceType = "all",
//   trafficData,
// }: Props) {
//   const [page, setPage] = useState(0);

//   const countryVisitors: Record<string, number> = React.useMemo(() => {
//     const entry = trafficData.find((d) => d.device_type === deviceType);
//     if (!entry?.country_distribution) return {};

//     try {
//       return JSON.parse(entry.country_distribution) as Record<string, number>;
//     } catch {
//       return {};
//     }
//   }, [deviceType, trafficData]);

//   const sortedCountries = React.useMemo(() => {
//     return Object.entries(countryVisitors).sort((a, b) => b[1] - a[1]);
//   }, [countryVisitors]);

//   const totalVisitors = React.useMemo(() => {
//     return Object.values(countryVisitors).reduce((sum, val) => sum + val, 0);
//   }, [countryVisitors]);

//   const pageCount = Math.ceil(sortedCountries.length / ITEMS_PER_PAGE);
//   const currentItems = sortedCountries.slice(
//     page * ITEMS_PER_PAGE,
//     page * ITEMS_PER_PAGE + ITEMS_PER_PAGE
//   );

//   const handlePrev = () => {
//     setPage((p) => Math.max(p - 1, 0));
//   };

//   const handleNext = () => {
//     setPage((p) => Math.min(p + 1, pageCount - 1));
//   };

//   return (
//     <div className="w-full space-y-1">
//       {sortedCountries.length === 0 && (
//         <div className="text-center text-gray-500">No data available.</div>
//       )}

//       {currentItems.map(([countryCode, visitors]) => {
//         const normalizedCode =
//           countryCode.length === 2 ? countryCode.toUpperCase() : "??";

//         // Function to convert country code to emoji flag
//         const flagEmoji =
//           normalizedCode !== "??"
//             ? normalizedCode
//                 .toUpperCase()
//                 .replace(/./g, (char) =>
//                   String.fromCodePoint(127397 + char.charCodeAt(0))
//                 )
//             : "🌐"; // default globe for unknown

//         const widthPercent = totalVisitors
//           ? (visitors / totalVisitors) * 100
//           : 0;
//         const percentage = widthPercent.toFixed(1);

//         return (
//           <div
//             key={countryCode}
//             className="flex items-center gap-3 mt-1.5"
//             style={{ fontFamily: "sans-serif" }}
//           >
//             <div className=" text-sm font-medium flex items-center space-x-2">
//               <span className="bg-primary/10 py-[3px] rounded px-3">
//                 {flagEmoji}
//               </span>
//               {/* <span>{normalizedCode}</span> */}
//             </div>

//             <div className="flex-1 bg-gray-200 dark:bg-black/20 rounded h-[26px] relative overflow-hidden">
//               <div
//                 className="bg-blue-500 opacity-20 h-full rounded"
//                 style={{ width: `${widthPercent}%` }}
//               ></div>
//               <div className="absolute right-2 top-0 bottom-0 flex items-center text-primary/50 text-xs font-semibold space-x-1">
//                 <span>{visitors.toLocaleString()}</span>
//                 <span>Visitors</span>
//                 <span>({percentage}%)</span>
//               </div>
//             </div>
//           </div>
//         );
//       })}

//       {pageCount > 1 && (
//         <div className="flex justify-center space-x-4 mt-6">
//           <button
//             onClick={handlePrev}
//             disabled={page === 0}
//             className={`px-3 py-[2px] rounded border ${
//               page === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
//             }`}
//           >
//             Previous
//           </button>
//           <span className="flex items-center">
//             Page {page + 1} of {pageCount}
//           </span>
//           <button
//             onClick={handleNext}
//             disabled={page === pageCount - 1}
//             className={`px-3 py-1 rounded border ${
//               page === pageCount - 1
//                 ? "opacity-50 cursor-not-allowed"
//                 : "hover:bg-gray-100"
//             }`}
//           >
//             Next
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
