"use client";

import { useEffect, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { Loader2Icon } from "lucide-react";

interface TrafficSourceProps {
  activeDevice: string;
}

export default function TrafficSource({ activeDevice }: TrafficSourceProps) {
  const { selectedSite, selectedAnalyticsDate } = useSiteContext();
  const [originalTrafficData, setOriginalTrafficData] = useState<any[]>([]);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemPerPage = 7;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data: any = await getTrafficSource();
        setOriginalTrafficData(data);
      } catch (err) {
        console.error("Error fetching traffic data:", err);
        setOriginalTrafficData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedAnalyticsDate, selectedSite]);

  useEffect(() => {
    if (!originalTrafficData) return;

    const deviceType = activeDevice?.toLowerCase();
    const filteredData =
      deviceType !== "all"
        ? originalTrafficData
            .filter((x: any) => x.referral_domain !== selectedSite)
            .filter((x: any) => x.device_type.toLowerCase() === deviceType)
        : originalTrafficData.filter(
            (x: any) => x.referral_domain !== selectedSite
          );

    // add the repeated domain count
    const aggregatedData = Object.values(
      filteredData.reduce((acc: any, curr: any) => {
        const domain = curr.referral_domain;
        if (!acc[domain]) {
          acc[domain] = { ...curr }; // copy the current object
        } else {
          acc[domain].count += curr.count; // add count if domain repeats
        }
        return acc;
      }, {})
    );

    aggregatedData.sort((a: any, b: any) => b.count - a.count);

    setTrafficData(aggregatedData);
  }, [activeDevice, originalTrafficData]);

  const totalPage = Math.ceil(trafficData.length / itemPerPage);

  const paginatedData =
    trafficData.length > itemPerPage
      ? trafficData.slice(
          (currentPage - 1) * itemPerPage,
          currentPage * itemPerPage
        )
      : trafficData;

  const goToPage = (page: number) => {
    if (page <= 1) {
      page = 1;
    }
    if (page > totalPage) page = totalPage;
    setCurrentPage(page);
  };

  return (
    <div className="relative h-full">
      <div className="absolute z-20 left-2/4 top-1/4 items-center justify-center h-full">
        {loading ? (
          <Loader2Icon className="text-primary/20 animate-spin" />
        ) : paginatedData.length === 0 ? (
          <p>No data found.</p>
        ) : null}
      </div>

      {!loading && paginatedData.length > 0 && (
        <table className="w-full text-sm min-h-fit">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 px-2 font-medium">Referral Domain</th>
              <th className="py-2 px-2 font-medium text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                className={
                  idx % 2
                    ? "bg-primary-foreground dark:bg-secondary/20"
                    : undefined
                }
              >
                <td className="py-2 px-2">{row.referral_domain}</td>
                <td className="py-2 px-2 text-right">
                  {row.count >= 1000
                    ? (row.count / 1000).toFixed(1) + "k"
                    : row.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {totalPage > 1 && (
        <div className="absolute top-5/7 right-1 flex justify-end mt-4 space-x-2">
          <button
            className="px-3 py-[2px] border rounded disabled:opacity-50"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {Array.from({ length: totalPage }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`px-3 py-[2px] border rounded ${
                currentPage === page ? "bg-blue-500 text-white" : ""
              }`}
              onClick={() => goToPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            className="px-3 py-[2px] border rounded disabled:opacity-50"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPage}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  async function getTrafficSource() {
    const res = await fetch("/api/rum/analytics/traffic-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        range: selectedAnalyticsDate,
        domain: selectedSite,
        key: "secret_for_speedy_site",
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch traffic source data");
    }

    return res.json();
  }
}
