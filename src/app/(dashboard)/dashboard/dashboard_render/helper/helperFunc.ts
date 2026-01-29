// import { fetchDailyCrux } from "@/app/api/external/fetch_crux";
// import { DailyCruxData } from "@/data-types";
// import { CruxData, DailyCrux, Metric } from "@/data-types/cruxData";

// export class Helpers {
//   constructor() {}

//   // fetch daily crux data for a metric via crux api
//   public getDailyCrux = (
//     selectedSite: string,
//     setDailyCrux: (data: DailyCrux[]) => void
//   ) => {
//     if (selectedSite) {
//       fetchDailyCrux(selectedSite, setDailyCrux);
//     }
//   };

//   // extract data by device
//   public findDataByDevice = (
//     data: DailyCruxData[],
//     device: "Desktop" | "Mobile" | "Tablet" | "All"
//   ) => {
//     return data.find((crux) => crux[0].record.key.formFactor === device);
//   };

//   // prepare the latest cwv metric
//   public getMetricValue = (
//     metricKey: string | undefined,
//     device: "Desktop" | "Mobile" | "Tablet" | "All",
//     data: DailyCruxData[]
//   ) => {
//     if (!metricKey) return null;

//     const currentCrux = this.findDataByDevice(data, device);

//     const metric = currentCrux?.record.metrics?.[metricKey];
//     return this.getLatestP75(metric);
//   };

//   // get the latest
//   public getLatestP75 = (metric?: Metric): number | "--" => {
//     if (!metric) return "--";

//     const timeseriesP75 = metric.percentilesTimeseries?.p75s?.at(-1);
//     const staticP75 = (metric as any)?.percentiles?.p75;

//     const numericP75 = timeseriesP75 ?? staticP75;

//     if (numericP75 === null || numericP75 === undefined) return "--";

//     // Ensure the return is always a number if valid
//     const parsed = Number(numericP75);
//     return isNaN(parsed) ? "--" : parsed;
//   };

//   // calculate change
//   public calculateChange(
//     cruxData: CruxData[],
//     device_type: "Desktop" | "Mobile" | "Tablet" | "All",
//     metricKey: string,
//     dailyData: DailyCrux[]
//   ): number {
//     // find out the last history value of crux
//     const lastCruxValue = cruxData
//       .flat()
//       .filter(
//         (d) =>
//           d.record.key?.formFactor ===
//           (device_type === "Desktop" ? "DESKTOP" : "PHONE")
//       )[0]
//       ?.record?.metrics[metricKey]?.percentilesTimeseries?.p75s.at(-1);

//     const CruxValueToday = dailyData.find((x) => x.device_type === device_type)
//       ?.record?.metrics[metricKey]?.percentiles?.p75;

//     if (CruxValueToday && lastCruxValue) {
//       const calculateChange = parseFloat(
//         (((CruxValueToday - lastCruxValue) / lastCruxValue) * 100).toFixed(2)
//       );

//       if (calculateChange) return calculateChange;
//     }

//     return 0;
//   }

//   // create date from year, month and day (comes at the crux dataset)
//   public createDate(year: number, month: number, day: number): string {
//     if (year !== null && month !== null && day !== null) {
//       if (month > 12 || month < 0 || day < 0 || day > 31) {
//         throw new Error("invalid date values");
//       }

//       return `${year}-${month.toString().padStart(2, "0")}-${day
//         .toString()
//         .padStart(2, "0")}`;
//     }

//     return "invalid date!!!";
//   }
// }
