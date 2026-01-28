// "use client";

// import { useEffect, useRef, useState, useCallback } from "react";
// import * as echarts from "echarts/core";
// import { TooltipComponent, TitleComponent } from "echarts/components";
// import { TreemapChart } from "echarts/charts";
// import { CanvasRenderer } from "echarts/renderers";
// import { UniversalTransition } from "echarts/features";

// echarts.use([
//   TooltipComponent,
//   TitleComponent,
//   TreemapChart,
//   CanvasRenderer,
//   UniversalTransition,
// ]);

// type ExperienceQuality = "Good" | "Okay" | "Poor";

// export interface ExperienceData {
//   device_type: string;
//   experience_quality: ExperienceQuality;
//   session_count: number;
//   avg_fcp: number;
//   avg_cls: number;
//   avg_ttfb: number;
//   avg_lcp: number;
//   avg_inp: number;
//   avg_performance_score: number;
//   avg_long_tasks: number;
//   avg_slow_api_calls: number;
//   avg_trackers: number;
//   percentage_in_device_type: number;
//   country_count: number;
// }

// interface ExperienceBarChartProps {
//   data: ExperienceData[];
//   deviceType: string;
//   height?: number;
//   showTitle?: boolean;
//   onQualityClick?: (quality: ExperienceQuality) => void;
// }

// // Original color scheme maintained
// const COLORS: Record<ExperienceQuality, string> = {
//   Good: "#66cc8f",
//   Okay: "#ffeea9",
//   Poor: "#FF9898",
// };

// // Metric thresholds
// const METRIC_THRESHOLDS = {
//   fcp: 1800,
//   cls: 0.25,
//   ttfb: 800,
//   lcp: 2500,
//   inp: 200,
// } as const;

// const formatMs = (value: number | null | undefined): string => {
//   if (value == null || isNaN(value)) return "-";
//   return value >= 1000
//     ? `${(value / 1000).toFixed(2)} s`
//     : `${Math.round(value)} ms`;
// };

// const colorMetric = (
//   value: number,
//   threshold: number,
//   good = "green",
//   bad = "red"
// ) => {
//   const color = value > threshold ? bad : good;
//   return `<span style="color:${color}; font-weight:500;">${formatMs(
//     value
//   )}</span>`;
// };

// // Enhanced tooltip generation
// const generateTooltipContent = (item: ExperienceData): string => {
//   const tooltipLines = [
//     `<div style="margin-bottom:6px;">
//       <strong>${item.experience_quality}</strong> – ${
//       item.session_count
//     } sessions
//       (${item.percentage_in_device_type.toFixed(1)}% of ${item.device_type})
//     </div>`,
//   ];

//   if (item.avg_fcp != null)
//     tooltipLines.push(
//       `<div>Avg FCP: ${colorMetric(item.avg_fcp, METRIC_THRESHOLDS.fcp)}</div>`
//     );
//   if (item.avg_cls != null)
//     tooltipLines.push(
//       `<div>Avg CLS: <span style="color:${
//         item.avg_cls > METRIC_THRESHOLDS.cls ? "red" : "green"
//       }">${item.avg_cls.toFixed(3)}</span></div>`
//     );
//   if (item.avg_ttfb != null)
//     tooltipLines.push(
//       `<div>Avg TTFB: ${colorMetric(
//         item.avg_ttfb,
//         METRIC_THRESHOLDS.ttfb
//       )}</div>`
//     );
//   if (item.avg_lcp != null)
//     tooltipLines.push(
//       `<div>Avg LCP: ${colorMetric(item.avg_lcp, METRIC_THRESHOLDS.lcp)}</div>`
//     );
//   if (item.avg_inp != null)
//     tooltipLines.push(
//       `<div>Avg INP: ${colorMetric(item.avg_inp, METRIC_THRESHOLDS.inp)}</div>`
//     );
//   if (item.avg_performance_score != null)
//     tooltipLines.push(
//       `<div>Performance Score: <strong>${item.avg_performance_score.toFixed(
//         0
//       )}</strong></div>`
//     );

//   const warningCount = [
//     item.avg_fcp > METRIC_THRESHOLDS.fcp,
//     item.avg_cls > METRIC_THRESHOLDS.cls,
//     item.avg_ttfb > METRIC_THRESHOLDS.ttfb,
//     item.avg_lcp > METRIC_THRESHOLDS.lcp,
//     item.avg_inp > METRIC_THRESHOLDS.inp,
//   ].filter(Boolean).length;

//   if (warningCount >= 2) {
//     tooltipLines.push(
//       `<div style="margin-top:6px; color:orange;">⚠️ ${warningCount} metrics are degraded</div>`
//     );
//   }

//   return tooltipLines.join("");
// };

// export default function ExperienceBar({
//   data,
//   deviceType,
//   height = 50,
//   showTitle = false,
//   onQualityClick,
// }: ExperienceBarChartProps) {
//   const chartRef = useRef<HTMLDivElement>(null);
//   const chartInstanceRef = useRef<echarts.ECharts | null>(null);
//   const resizeObserverRef = useRef<ResizeObserver | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const filteredData = useCallback(
//     () =>
//       data.filter(
//         (d) => d.device_type.toLowerCase() === deviceType.toLowerCase()
//       ),
//     [data, deviceType]
//   );

//   const initChart = useCallback(() => {
//     if (!chartRef.current) return;

//     try {
//       if (chartInstanceRef.current) {
//         chartInstanceRef.current.dispose();
//       }

//       chartInstanceRef.current = echarts.init(chartRef.current);
//       const chart = chartInstanceRef.current;
//       const filtered = filteredData();

//       const children = filtered.map((item) => {
//         const labelEmoji =
//           item.experience_quality === "Poor"
//             ? "🔴"
//             : item.experience_quality === "Okay"
//             ? "🟡"
//             : "🟢";

//         return {
//           name: `${labelEmoji} ${
//             item.experience_quality
//           } (${item.percentage_in_device_type.toFixed(0)}%)`,
//           value: item.session_count,
//           itemStyle: {
//             color: COLORS[item.experience_quality],
//           },
//           tooltip: {
//             formatter: `
//               <div style="padding:6px 8px; font-size:13px;">
//                 ${generateTooltipContent(item)}
//               </div>
//             `,
//           },
//           ...(onQualityClick && {
//             emphasis: {
//               itemStyle: {
//                 shadowBlur: 10,
//                 shadowColor: "rgba(0, 0, 0, 0.3)",
//               },
//             },
//           }),
//         };
//       });

//       const option: echarts.EChartsCoreOption = {
//         ...(showTitle && {
//           title: {
//             text: `User Experience by Quality - ${deviceType}`,
//             left: "center",
//             textStyle: {
//               fontSize: 14,
//               fontWeight: "normal",
//             },
//           },
//         }),
//         tooltip: {
//           trigger: "item",
//           confine: false,
//           appendToBody: true,
//           backgroundColor: "rgba(30,30,30,0.85)",
//           borderColor: "rgba(255,255,255,0.1)",
//           borderWidth: 1,
//           textStyle: {
//             color: "#fff",
//           },
//           formatter: (params: any) => params?.data?.tooltip?.formatter || "",
//         },
//         series: [
//           {
//             type: "treemap",
//             roam: false,
//             nodeClick: onQualityClick ? "click" : false,
//             left: 15,
//             right: 15,
//             top: showTitle ? 30 : 0,
//             bottom: 0,
//             label: {
//               show: true,
//               formatter: "{b}",
//               color: "#000",
//               fontSize: 12,
//             },
//             upperLabel: { show: false, height: 0 },
//             breadcrumb: { show: false },
//             data: [
//               {
//                 children,
//               },
//             ],
//             animation: true,
//             animationDuration: 500,
//           },
//         ],
//       };

//       chart.setOption(option);

//       if (onQualityClick) {
//         chart.on("click", (params: any) => {
//           const quality = params.data.name.match(
//             /(Good|Okay|Poor)/
//           )?.[0] as ExperienceQuality;
//           if (quality) {
//             onQualityClick(quality);
//           }
//         });
//       }

//       setIsLoading(false);
//       setError(null);
//     } catch (err) {
//       console.error("Error initializing chart:", err);
//       setError("Failed to initialize chart");
//       setIsLoading(false);
//     }
//   }, [filteredData, deviceType, showTitle, onQualityClick]);

//   const handleResize = useCallback(() => {
//     if (chartInstanceRef.current) {
//       chartInstanceRef.current.resize();
//     }
//   }, []);

//   useEffect(() => {
//     initChart();

//     if (chartRef.current && !resizeObserverRef.current) {
//       resizeObserverRef.current = new ResizeObserver(handleResize);
//       resizeObserverRef.current.observe(chartRef.current);
//     }

//     return () => {
//       if (chartInstanceRef.current) {
//         chartInstanceRef.current.dispose();
//         chartInstanceRef.current = null;
//       }
//       if (resizeObserverRef.current) {
//         resizeObserverRef.current.disconnect();
//         resizeObserverRef.current = null;
//       }
//     };
//   }, [initChart, handleResize]);

//   useEffect(() => {
//     if (chartInstanceRef.current) {
//       initChart();
//     }
//   }, [data, deviceType, initChart]);

//   return (
//     <div
//       className="w-full relative bg-transparent"
//       style={{ overflow: "visible" }}
//       role="img"
//       aria-label={`User experience quality distribution for ${deviceType}`}
//     >
//       {isLoading && (
//         <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-10">
//           <div className="text-sm text-gray-600 dark:text-gray-300">
//             Loading chart...
//           </div>
//         </div>
//       )}
//       {error && (
//         <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-10">
//           <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
//         </div>
//       )}
//       <div
//         ref={chartRef}
//         style={{
//           width: "100%",
//           left: "-20px",
//           height: `${height}px`,
//           backgroundColor: "transparent",
//           marginTop: "20px",
//           marginBottom: "10px",
//           // borderRadius: "10px",
//         }}
//         className="rounded-md"
//       />
//     </div>
//   );
// }
