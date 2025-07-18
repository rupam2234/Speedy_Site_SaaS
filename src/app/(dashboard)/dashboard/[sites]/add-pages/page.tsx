"use client";
import React, { useEffect, useState } from "react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { Layers2, PlusCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { PlanValidation } from "@/components/utils/activePlanValidation";

export default function AddPagesManually() {
  const { selectedSite } = useSiteContext();
  const [pageUrls, setPageUrls] = useState([""]);
  const [activeUrls, setActiveUrls] = useState<number | null>(null);
  const [existingUrls, setExistingUrls] = useState<string[]>([]); // for duplicate url detection

  useEffect(() => {
    fetchPagesWithVitals();
  }, [selectedSite]);

  PlanValidation(); // redirect to billing if no active plan

  // function to fetch active urls
  async function fetchPagesWithVitals() {
    if (!selectedSite) return;

    const res = await fetch("/api/jobs/active_urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedSite),
    });

    const json = await res.json();

    if (
      !res.ok ||
      !json.data?.[0]?.urls ||
      json.data?.[0]?.urls.length === 0 ||
      (json.data?.[0]?.urls.length === 1 &&
        json.data?.[0]?.urls?.[0].length === 0)
    ) {
      setActiveUrls(0);
    } else {
      setActiveUrls(json.data?.[0]?.urls.length);
      setExistingUrls(json.data[0].urls);
    }
  }

  // Function to add a new empty URL input field
  const handleAddPage = () => {
    setPageUrls([...pageUrls, ""]);
  };

  // Function to remove a URL input field by index
  const handleRemovePage = (index: number) => {
    if (pageUrls.length > 1) {
      const newUrls = pageUrls.filter((_, i) => i !== index);
      setPageUrls(newUrls);
    } else {
      setPageUrls([""]);
    }
  };

  // Function to update the URL value at a specific index
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...pageUrls];
    newUrls[index] = value;
    setPageUrls(newUrls);
  };

  async function handleSubmit() {
    const response = await fetch("/api/jobs/add_urls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: selectedSite,
        newUrls: pageUrls,
      }),
    });

    if (response.ok) {
      toast("Your pages have been added successfully", {
        description: `Page added: ${pageUrls.length}`,
      });

      await fetchPagesWithVitals(); // refetch pages after submission
      setPageUrls([""]);
    } else {
      toast("Error Adding URLs", {
        description: "Please try again!",
      });
    }
  }

  // prepare duplicates
  const dbDuplicates = new Set(
    pageUrls
      .map((url) => url.trim())
      .filter((url) => existingUrls.includes(url))
  );

  const allAreDuplicates = pageUrls.every((url) =>
    dbDuplicates.has(url.trim())
  );

  return (
    <div className="m-5 border rounded-lg p-6 bg-white dark:bg-secondary-background">
      {/* Header Section */}
      <div className="border-b pb-4 mb-6 flex gap-2 justify-between items-center">
        <span className="flex gap-3 items-center">
          <Layers2 className="text-blue-600 dark:text-blue-400" size={28} />
          <h2 className="font-extrabold text-3xl text-gray-900 dark:text-white">
            {selectedSite}
          </h2>
        </span>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Add Pages Section */}
        <div className="col-span-1 md:col-span-7">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manually add specific URLs you want to monitor. Ensure they belong
            to the selected domain.
          </p>

          {/* Dynamic URL Input Fields */}
          <div className="space-y-4">
            {pageUrls.map((url, index) => (
              <div key={index}>
                {/* Input + remove button in flex */}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder={`e.g., https://${selectedSite}/your-page-path`}
                    className={`flex-grow p-3 rounded-md transition-all duration-200
            ${
              dbDuplicates.has(url.trim())
                ? "border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-500/10"
                : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-secondary-background/20"
            }
            text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent
          `}
                  />
                  {/* Remove Button */}
                  {pageUrls.length > 1 && (
                    <button
                      onClick={() => handleRemovePage(index)}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600
                       rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label={`Remove page ${index + 1}`}
                    >
                      <MinusCircle size={24} />
                    </button>
                  )}
                </div>

                {/* Duplicate warning below input */}
                {dbDuplicates.has(url.trim()) && (
                  <p className="text-sm text-red-500 mt-1 ml-1">
                    This URL is already being monitored.
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Add Page Button */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleAddPage}
              disabled={typeof activeUrls === "number" && activeUrls >= 10}
              className={`
                    flex cursor-pointer items-center justify-center gap-2 px-4 py-2
                    font-semibold rounded-md transition-colors duration-200 shadow-md focus:outline-none
                    focus:ring-2 focus:ring-offset-2
                    ${
                      typeof activeUrls === "number" && activeUrls >= 10
                        ? "bg-blue-300 cursor-not-allowed text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                    }
                    `}
            >
              <PlusCircle size={20} /> Add Another Page
            </button>

            <button
              onClick={handleSubmit}
              disabled={
                (typeof activeUrls === "number" && activeUrls >= 10) ||
                allAreDuplicates
              }
              className={`
                  flex items-center cursor-pointer justify-center gap-2 px-4 py-2
                  font-semibold rounded-md transition-colors duration-200 shadow-md focus:outline-none
                  focus:ring-2 focus:ring-offset-2
                  ${
                    typeof activeUrls === "number" && activeUrls >= 10
                      ? "bg-green-300 cursor-not-allowed text-white"
                      : "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
                  }
                `}
            >
              Confirm
            </button>
          </div>
        </div>

        {/* Quota View Section */}
        <div className="col-span-1 md:col-span-5 bg-gray-100 dark:bg-gray-500/20 p-5 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Monitoring Quota
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This section will display your current page monitoring quota and how
            many pages you have remaining. (e.g., 5/10 pages monitored).
          </p>
          <div className="mt-4 p-3 bg-white dark:bg-gray-700/20 rounded-md border border-gray-200 dark:border-gray-600 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 h-7 flex items-center justify-center">
              {activeUrls === null ? (
                <span className="w-24 h-6 bg-gray-300 dark:bg-gray-600/30 rounded animate-pulse" />
              ) : (
                `${activeUrls} / 10`
              )}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pages Being Monitored
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Currently, the default monitoring limit is 10 pages. If you try to
            add more pages than the remaining available slots, only the top
            entries (in order) will be added, up to the limit.
          </p>
        </div>
      </div>
    </div>
  );
}
