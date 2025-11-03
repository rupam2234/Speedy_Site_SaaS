"use client";

import React from "react";

// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import { useSiteContext } from "../../siteContext";
// import {
//   Images,
//   Download,
//   TrendingUp,
//   AlertCircle,
//   CheckCircle,
//   Info,
//   Filter,
// } from "lucide-react";
// import BeatLoader from "react-spinners/BeatLoader";
// import { LoadingAnimation } from "@/components/utils/loadingAnimation";
// import DashboardToolbar from "@/components/utils/toolbar";
// import SuggestionsToggle from "../helpers/suggestion_toggle";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";

// Custom Badge component
// const Badge = ({
//   variant = "default",
//   children,
//   className = "",
// }: {
//   variant?: "default" | "secondary" | "destructive" | "outline";
//   children: React.ReactNode;
//   className?: string;
// }) => {
//   const baseClasses =
//     "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

//   let variantClasses = "";
//   switch (variant) {
//     case "default":
//       variantClasses = "bg-blue-500 text-white";
//       break;
//     case "secondary":
//       variantClasses =
//         "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
//       break;
//     case "destructive":
//       variantClasses = "bg-red-500 text-white";
//       break;
//     case "outline":
//       variantClasses =
//         "border border-gray-300 bg-transparent text-gray-800 dark:border-gray-600 dark:text-gray-200";
//       break;
//   }

//   return (
//     <span className={`${baseClasses} ${variantClasses} ${className}`}>
//       {children}
//     </span>
//   );
// };

export interface LcpImageMetric {
  period: string;
  domain_name: string;
  device_type: string;
  image_url: string;
  occurrence_count: number;
  avg_lcp_ms: number | null;
  min_lcp_ms: number | null;
  max_lcp_ms: number | null;
  p75_lcp_ms: number | null;
  pct_exceeding_cwv: number | null;
  avg_decoded_body_size: number | null;
  avg_element_render_delay: number | null;
  avg_height: number | null;
  avg_resource_load_delay: number | null;
  avg_resource_load_duration: number | null;
  avg_time_to_first_byte: number | null;
  avg_transfer_size: number | null;
  avg_width: number | null;
  pct_lazy: number | null;
}

// interface LcpTrendData {
//   date: string;
//   avg_lcp_ms: number;
// }

export default function LcpImageDebugger() {
  // const [rawLcpImageData, setRawLcpImageData] = useState<LcpImageMetric[]>([]);
  // const [selectedImage, setSelectedImage] = useState<LcpImageMetric | null>(
  //   null
  // );
  // const [sortBy, setSortBy] = useState<"avg_lcp" | "occurrence">("avg_lcp");
  // const [filterText, setFilterText] = useState<string>("");
  // const [isLoading, setIsLoading] = useState<boolean>(true);
  // const [, setLcpTrendData] = useState<LcpTrendData[]>([]);
  // const [comparisonImage, setComparisonImage] = useState<LcpImageMetric | null>(
  //   null
  // );
  // const { selectedSite, rumDateRange, selectedDevice } = useSiteContext();

  // // Constants for LCP thresholds
  // const LCP_THRESHOLDS = {
  //   GOOD: 2500, // ms
  //   NEEDS_IMPROVEMENT: 4000, // ms
  // };

  // useEffect(() => {
  //   if (selectedSite.length > 0) {
  //     fetchLcpImages();
  //     fetchLcpTrendData();
  //   }
  // }, [selectedSite, rumDateRange]);

  // function isImageUrl(url: string): boolean {
  //   return /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(url);
  // }

  // // Recompute sorted + filtered data only when inputs change
  // const lcpImageData = useMemo(() => {
  //   let filtered = rawLcpImageData
  //     .filter((item) => item.device_type === selectedDevice || !selectedDevice)
  //     .filter((item) => isImageUrl(item.image_url));

  //   // Apply text filter if provided
  //   if (filterText) {
  //     const lowerFilter = filterText.toLowerCase();
  //     filtered = filtered.filter(
  //       (item) =>
  //         item.image_url.toLowerCase().includes(lowerFilter) ||
  //         (item.avg_lcp_ms && item.avg_lcp_ms.toString().includes(lowerFilter))
  //     );
  //   }

  //   const sorted = [...filtered].sort((a, b) => {
  //     if (sortBy === "avg_lcp") {
  //       return (
  //         parseFloat(b.avg_lcp_ms as unknown as string) -
  //         parseFloat(a.avg_lcp_ms as unknown as string)
  //       );
  //     } else {
  //       return b.occurrence_count - a.occurrence_count;
  //     }
  //   });

  //   return sorted;
  // }, [rawLcpImageData, selectedDevice, sortBy, filterText]);

  // // Auto-select the first image on data change
  // useEffect(() => {
  //   if (lcpImageData.length > 0) {
  //     setSelectedImage(lcpImageData[0]);
  //   } else {
  //     setSelectedImage(null);
  //   }
  // }, [lcpImageData]);

  // async function fetchLcpImages() {
  //   setIsLoading(true);
  //   try {
  //     const res = await fetch("/api/rum/lcp-images", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         domain_name: selectedSite,
  //         date_range: rumDateRange || "24hours",
  //       }),
  //     });

  //     if (res.ok) {
  //       const data: any = await res.json();
  //       const metrics: LcpImageMetric[] = data.metrics || [];
  //       setRawLcpImageData(metrics);
  //     } else {
  //       setRawLcpImageData([]);
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch LCP image metrics:", error);
  //     setRawLcpImageData([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }

  // async function fetchLcpTrendData() {
  //   try {
  //     const res = await fetch("/api/rum/lcp-trend", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         domain_name: selectedSite,
  //         date_range: rumDateRange || "24hours",
  //       }),
  //     });

  //     if (res.ok) {
  //       const data: any = await res.json();
  //       const trendData: LcpTrendData[] = data.trend || [];
  //       setLcpTrendData(trendData);
  //     } else {
  //       setLcpTrendData([]);
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch LCP trend data:", error);
  //     setLcpTrendData([]);
  //   }
  // }

  // const getLcpStatus = (lcp: number) => {
  //   if (lcp <= LCP_THRESHOLDS.GOOD) return "good";
  //   if (lcp <= LCP_THRESHOLDS.NEEDS_IMPROVEMENT) return "needs-improvement";
  //   return "poor";
  // };

  // const getLcpStatusColor = (lcp: number) => {
  //   const status = getLcpStatus(lcp);
  //   switch (status) {
  //     case "good":
  //       return "text-green-600";
  //     case "needs-improvement":
  //       return "text-yellow-600";
  //     case "poor":
  //       return "text-red-600";
  //     default:
  //       return "text-gray-600";
  //   }
  // };

  // const getLcpStatusIcon = (lcp: number) => {
  //   const status = getLcpStatus(lcp);
  //   switch (status) {
  //     case "good":
  //       return <CheckCircle className="h-4 w-4 text-green-600" />;
  //     case "needs-improvement":
  //       return <AlertCircle className="h-4 w-4 text-yellow-600" />;
  //     case "poor":
  //       return <AlertCircle className="h-4 w-4 text-red-600" />;
  //     default:
  //       return <Info className="h-4 w-4 text-gray-600" />;
  //   }
  // };

  // const getBarColor = (lcp: number) => {
  //   const status = getLcpStatus(lcp);
  //   switch (status) {
  //     case "good":
  //       return "#66cc8f";
  //     case "needs-improvement":
  //       return "#FFEEA9";
  //     case "poor":
  //       return "#FF9898";
  //     default:
  //       return "#cccccc";
  //   }
  // };

  // const formatFileSize = (bytes: number | null) => {
  //   if (!bytes) return "N/A";
  //   return (bytes / 1024).toFixed(2) + " KB";
  // };

  // const exportData = useCallback(() => {
  //   if (!selectedImage) return;

  //   const dataStr = JSON.stringify(selectedImage, null, 2);
  //   const dataUri =
  //     "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  //   const exportFileDefaultName = `lcp-image-metrics-${new Date()
  //     .toISOString()
  //     .slice(0, 10)}.json`;

  //   const linkElement = document.createElement("a");
  //   linkElement.setAttribute("href", dataUri);
  //   linkElement.setAttribute("download", exportFileDefaultName);
  //   linkElement.click();
  // }, [selectedImage]);

  // const addImageToComparison = useCallback(() => {
  //   if (selectedImage) {
  //     setComparisonImage(selectedImage);
  //   }
  // }, [selectedImage]);

  // if (!selectedSite) {
  //   return (
  //     <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
  //       <LoadingAnimation />
  //       <p className="mt-4 text-muted-foreground">
  //         Please select a site to view LCP image data
  //       </p>
  //     </div>
  //   );
  // }

  // return (
  //   <>
  //     <DashboardToolbar />
  //     <div className="flex flex-col gap-6 p-5 min-h-screen">
  //       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
  //         <div className="flex items-center gap-2">
  //           <Images className="fill-orange-300/50" />
  //           <h1 className="text-xl font-bold">LCP Image Debugger</h1>
  //           {isLoading && <BeatLoader color="#888888" size={8} />}
  //         </div>

  //         <div className="flex flex-wrap gap-3">
  //           <div className="relative">
  //             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
  //             <Input
  //               type="text"
  //               placeholder="Filter images..."
  //               value={filterText}
  //               onChange={(e) => setFilterText(e.target.value)}
  //               className="w-full md:w-64 pl-10"
  //             />
  //           </div>

  //           <Select
  //             value={sortBy}
  //             onValueChange={(value) =>
  //               setSortBy(value as "avg_lcp" | "occurrence")
  //             }
  //           >
  //             <SelectTrigger className="w-48">
  //               <SelectValue />
  //             </SelectTrigger>
  //             <SelectContent>
  //               <SelectItem value="avg_lcp">Sort by Avg LCP</SelectItem>
  //               <SelectItem value="occurrence">Sort by Occurrences</SelectItem>
  //             </SelectContent>
  //           </Select>
  //         </div>
  //       </div>

  //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  //         {/* Left: Image List */}
  //         <div className="lg:col-span-2 space-y-4">
  //           <div className="border rounded-sm p-4">
  //             <div className="mb-4 flex items-center justify-between">
  //               <div className="flex items-center gap-2">
  //                 {/* <Images className="h-5 w-5" />
  //                 <h2 className="text-lg font-semibold">
  //                   Top Images Responsible for LCP
  //                 </h2> */}
  //                 <p className="text-sm text-muted-foreground">
  //                   Images that impact your Largest Contentful Paint metric
  //                 </p>
  //                 <Badge variant="outline">{lcpImageData.length} images</Badge>
  //               </div>
  //             </div>

  //             <div className="space-y-3">
  //               {lcpImageData.length === 0 ? (
  //                 <div className="text-center py-8 text-muted-foreground">
  //                   {isLoading
  //                     ? "Loading images..."
  //                     : "No LCP image data found"}
  //                 </div>
  //               ) : (
  //                 lcpImageData.map((metric, index) => {
  //                   const lcpValue = parseFloat(
  //                     metric.avg_lcp_ms as unknown as string
  //                   );
  //                   const barWidth = Math.min(lcpValue / 50, 100); // Adjusted for better visualization
  //                   const status = getLcpStatus(lcpValue);

  //                   return (
  //                     <div
  //                       key={index}
  //                       className={`flex items-center gap-3 p-3 rounded-sm border transition-all cursor-pointer hover:bg-muted/50 ${
  //                         selectedImage?.image_url === metric.image_url
  //                           ? "border-primary/30 dark:bg-secondary-background"
  //                           : "border-border"
  //                       }`}
  //                       onClick={() => setSelectedImage(metric)}
  //                     >
  //                       <div className="relative">
  //                         <img
  //                           src={metric.image_url}
  //                           alt={`LCP image ${index}`}
  //                           className="object-cover rounded-sm border w-16 h-16"
  //                           loading="lazy"
  //                         />
  //                         <div className="absolute -top-1 -right-1">
  //                           {getLcpStatusIcon(lcpValue)}
  //                         </div>
  //                       </div>

  //                       <div className="flex-1 min-w-0">
  //                         <div className="flex justify-between items-start mb-1">
  //                           <Link
  //                             href={metric.image_url}
  //                             target="_blank"
  //                             rel="noopener noreferrer"
  //                             className="text-sm font-medium hover:underline truncate"
  //                           >
  //                             {metric.image_url.split("/").pop() ||
  //                               "Unknown Image"}
  //                           </Link>
  //                           <Badge
  //                             variant={
  //                               status === "good"
  //                                 ? "default"
  //                                 : status === "needs-improvement"
  //                                 ? "secondary"
  //                                 : "destructive"
  //                             }
  //                             className="ml-2 text-xs"
  //                           >
  //                             {lcpValue.toFixed(0)}ms
  //                           </Badge>
  //                         </div>

  //                         <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-2">
  //                           <div
  //                             className="h-full rounded-full"
  //                             style={{
  //                               width: `${barWidth}%`,
  //                               backgroundColor: getBarColor(lcpValue),
  //                             }}
  //                           />
  //                         </div>

  //                         <div className="flex justify-between text-xs text-muted-foreground mt-1">
  //                           <span>{metric.occurrence_count} occurrences</span>
  //                           <span>
  //                             {formatFileSize(metric.avg_transfer_size)}
  //                           </span>
  //                         </div>
  //                       </div>
  //                     </div>
  //                   );
  //                 })
  //               )}
  //             </div>
  //           </div>
  //         </div>

  //         {/* Right: Details */}
  //         <div className="space-y-6">
  //           {selectedImage ? (
  //             <>
  //               <div className="border rounded-sm p-4">
  //                 <div className="flex justify-between items-start mb-4">
  //                   <div>
  //                     <h2 className="text-lg font-semibold">Image Details</h2>
  //                     <p className="text-sm text-muted-foreground">
  //                       {selectedImage.period} — {selectedImage.device_type}
  //                     </p>
  //                   </div>
  //                   <div className="flex gap-2">
  //                     <Button
  //                       variant="outline"
  //                       size="sm"
  //                       onClick={addImageToComparison}
  //                     >
  //                       Compare
  //                     </Button>
  //                     <Button variant="outline" size="sm" onClick={exportData}>
  //                       <Download className="h-4 w-4" />
  //                     </Button>
  //                   </div>
  //                 </div>

  //                 <div className="space-y-4">
  //                   <div className="overflow-hidden rounded-sm border">
  //                     <img
  //                       src={selectedImage.image_url}
  //                       alt="Selected LCP image"
  //                       className="w-full h-48 object-contain bg-muted"
  //                     />
  //                   </div>

  //                   <Tabs defaultValue="metrics" className="w-full">
  //                     <TabsList className="grid w-full grid-cols-2">
  //                       <TabsTrigger value="metrics">Metrics</TabsTrigger>
  //                       <TabsTrigger value="performance">
  //                         Performance
  //                       </TabsTrigger>
  //                     </TabsList>

  //                     <TabsContent value="metrics" className="space-y-3 mt-4">
  //                       <div className="grid grid-cols-2 gap-3">
  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Avg LCP
  //                           </div>
  //                           <div
  //                             className={`font-semibold ${getLcpStatusColor(
  //                               parseFloat(
  //                                 selectedImage.avg_lcp_ms as unknown as string
  //                               )
  //                             )}`}
  //                           >
  //                             {selectedImage.avg_lcp_ms} ms
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Occurrences
  //                           </div>
  //                           <div className="font-semibold">
  //                             {selectedImage.occurrence_count}
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Min LCP
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.min_lcp_ms} ms
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Max LCP
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.max_lcp_ms} ms
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             P75 LCP
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.p75_lcp_ms} ms
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Exceeding CWV
  //                           </div>
  //                           <div
  //                             className={`font-medium ${
  //                               parseFloat(
  //                                 selectedImage.pct_exceeding_cwv as unknown as string
  //                               ) > 0
  //                                 ? "text-red-600"
  //                                 : "text-green-600"
  //                             }`}
  //                           >
  //                             {selectedImage.pct_exceeding_cwv}%
  //                           </div>
  //                         </div>
  //                       </div>

  //                       {selectedImage.avg_height &&
  //                         selectedImage.avg_width && (
  //                           <div className="pt-2 border-t">
  //                             <div className="text-xs text-muted-foreground">
  //                               Avg Rendered Size
  //                             </div>
  //                             <div className="font-medium">
  //                               {selectedImage.avg_width} ×{" "}
  //                               {selectedImage.avg_height} px
  //                             </div>
  //                           </div>
  //                         )}
  //                     </TabsContent>

  //                     <TabsContent
  //                       value="performance"
  //                       className="space-y-3 mt-4"
  //                     >
  //                       <div className="grid grid-cols-2 gap-3">
  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Transfer Size
  //                           </div>
  //                           <div className="font-medium">
  //                             {formatFileSize(selectedImage.avg_transfer_size)}
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Decoded Size
  //                           </div>
  //                           <div className="font-medium">
  //                             {formatFileSize(
  //                               selectedImage.avg_decoded_body_size
  //                             )}
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Resource Load Delay
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.avg_resource_load_delay} ms
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Resource Load Duration
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.avg_resource_load_duration} ms
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Element Render Delay
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.avg_element_render_delay} ms
  //                           </div>
  //                         </div>

  //                         <div className="space-y-1">
  //                           <div className="text-xs text-muted-foreground">
  //                             Time to First Byte
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.avg_time_to_first_byte} ms
  //                           </div>
  //                         </div>
  //                       </div>

  //                       <div className="pt-2 border-t">
  //                         <div className="flex items-center gap-2">
  //                           <div className="text-xs text-muted-foreground">
  //                             Lazy Loaded:
  //                           </div>
  //                           <div className="font-medium">
  //                             {selectedImage.pct_lazy === 0 ? (
  //                               <Badge
  //                                 variant="outline"
  //                                 className="text-green-600"
  //                               >
  //                                 Yes
  //                               </Badge>
  //                             ) : (
  //                               <Badge
  //                                 variant="outline"
  //                                 className="text-red-600"
  //                               >
  //                                 No
  //                               </Badge>
  //                             )}
  //                           </div>
  //                         </div>
  //                       </div>
  //                     </TabsContent>
  //                   </Tabs>
  //                 </div>
  //               </div>

  //               {/* Comparison Card */}
  //               {comparisonImage && (
  //                 <div className="border rounded-sm p-4">
  //                   <div className="flex items-center gap-2 mb-4">
  //                     <TrendingUp className="h-5 w-5" />
  //                     <h2 className="text-lg font-semibold">Comparison</h2>
  //                   </div>

  //                   <div className="space-y-3">
  //                     <div className="flex items-center gap-2">
  //                       <img
  //                         src={comparisonImage.image_url}
  //                         alt="Comparison image"
  //                         className="object-cover rounded-sm border w-10 h-10"
  //                       />
  //                       <div className="text-sm font-medium truncate">
  //                         {comparisonImage.image_url.split("/").pop()}
  //                       </div>
  //                       <Button
  //                         variant="ghost"
  //                         size="sm"
  //                         onClick={() => setComparisonImage(null)}
  //                         className="ml-auto"
  //                       >
  //                         Clear
  //                       </Button>
  //                     </div>

  //                     <div className="space-y-2">
  //                       <div className="flex justify-between text-sm">
  //                         <span className="text-muted-foreground">
  //                           LCP Difference:
  //                         </span>
  //                         <span
  //                           className={
  //                             parseFloat(
  //                               selectedImage.avg_lcp_ms as unknown as string
  //                             ) >
  //                             parseFloat(
  //                               comparisonImage.avg_lcp_ms as unknown as string
  //                             )
  //                               ? "text-red-600"
  //                               : "text-green-600"
  //                           }
  //                         >
  //                           {Math.abs(
  //                             parseFloat(
  //                               selectedImage.avg_lcp_ms as unknown as string
  //                             ) -
  //                               parseFloat(
  //                                 comparisonImage.avg_lcp_ms as unknown as string
  //                               )
  //                           ).toFixed(0)}
  //                           ms
  //                         </span>
  //                       </div>

  //                       <div className="flex justify-between text-sm">
  //                         <span className="text-muted-foreground">
  //                           Size Difference:
  //                         </span>
  //                         <span>
  //                           {Math.abs(
  //                             (selectedImage.avg_transfer_size || 0) -
  //                               (comparisonImage.avg_transfer_size || 0)
  //                           ) / 1024}
  //                           KB
  //                         </span>
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </div>
  //               )}

  //               {/* Suggestions Card */}
  //               <div className="border rounded-sm p-4">
  //                 <h2 className="text-lg font-semibold mb-4">
  //                   Optimization Suggestions
  //                 </h2>
  //                 <SuggestionsToggle
  //                   selectedImage={selectedImage}
  //                   showHardcoded={
  //                     parseFloat(
  //                       selectedImage?.pct_exceeding_cwv?.toString() || "0"
  //                     ) > 0
  //                   }
  //                 />
  //               </div>
  //             </>
  //           ) : (
  //             <div className="border rounded-sm p-4 flex flex-col items-center justify-center h-64">
  //               {isLoading ? (
  //                 <BeatLoader color="#888888" />
  //               ) : (
  //                 <div className="text-center text-muted-foreground">
  //                   <Images className="h-12 w-12 mx-auto mb-2 opacity-50" />
  //                   <p>Select an image to view details</p>
  //                 </div>
  //               )}
  //             </div>
  //           )}
  //         </div>
  //       </div>
  //     </div>
  //   </>
  // );

  return <></>;
}
